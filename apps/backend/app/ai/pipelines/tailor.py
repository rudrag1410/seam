"""Tailoring pipeline.

OpenAI proposes typed patch ops per section (in parallel). Code and Jev then decide what the user
sees: references are checked, new claims are caught by string guards, and a second model grades
every text change against the original and the candidate's evidence.
"""

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from app.ai.decisions.coverage import coverage_battery
from app.ai.decisions.grounding import grounding_battery
from app.ai.decisions.intent import INTENT_TEMPLATES, intent_battery
from app.ai.decisions.thresholds import Band, band
from app.ai.gateway import AIGateway
from app.ai.gateway.router import Task
from app.ai.guards.fabrication import check_fabrication
from app.ai.guards.references import bullet_text, is_valid_reference, node_index, scrub_evidence
from app.ai.limits import clip
from app.ai.ops.apply_ops import apply_ops
from app.ai.prompts.registry import render
from app.ai.scoring.experience import estimate_years
from app.ai.scoring.keywords import canonicalize, find_keywords, resume_text
from app.ai.scoring.match import Coverage, compute_match, keyword_coverage
from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.jd import JDAnalysis
from app.schemas.scores import MatchScore
from app.schemas.suggestion import ModelSuggestion, ModelSuggestionBatch

log = logging.getLogger("seam.tailor")

CONCURRENCY = 6
TEXT_OPS = {"replace_text", "rewrite_summary", "insert_bullet"}
SKILL_OPS = {"add_skill", "remove_skill"}
SECTION_LABEL = {
    "summary": "Summary",
    "skills": "Skills",
    "experience": "Experience",
    "projects": "Projects",
}


@dataclass
class SectionTask:
    section: str  # summary | skills | experience | projects
    nodes: list[dict]
    instruction: str | None = None


@dataclass
class TailorInputs:
    resume: dict
    jd: JDAnalysis
    sections: list[str]
    intensity: str


def build_tasks(resume: dict, sections: list[str]) -> list[SectionTask]:
    tasks: list[SectionTask] = []
    for s in resume["sections"]:
        if s["type"] not in sections:
            continue
        if s["type"] == "summary":
            tasks.append(SectionTask("summary", [{"id": s["id"], "text": s["text"]}]))
        elif s["type"] == "skills":
            tasks.append(
                SectionTask(
                    "skills", [{"id": g["id"], "label": g["label"], "items": g["items"]} for g in s["groups"]]
                )
            )
        elif s["type"] in ("experience", "projects"):
            for it in s["items"]:
                head = it.get("title") or it.get("subtitle") or ""
                name = it.get("company") or it.get("name") or ""
                tasks.append(
                    SectionTask(
                        s["type"],
                        [
                            {
                                "id": it["id"],
                                "company": name,
                                "title": head,
                                "bullets": [{"id": b["id"], "text": b["text"]} for b in it["bullets"]],
                            }
                        ],
                    )
                )
    return tasks


async def get_coverage(ai: AIGateway, document: dict, jd: JDAnalysis) -> tuple[Coverage, bool]:
    """Jev rates every requirement in one request; falls back to keyword matching."""
    reqs = jd.requirements()
    answers = await ai.jev.ask({"resume": resume_text(document)}, coverage_battery(reqs))
    if answers is None:
        return keyword_coverage(document, reqs), True
    return {r.id: answers.score(r.id) for r in reqs}, False


async def score_document(ai: AIGateway, settings: Settings, document: dict, jd: JDAnalysis):
    coverage, degraded = await get_coverage(ai, document, jd)
    match = compute_match(document, jd, coverage, low_confidence=settings.jev_confidence_low)
    return match, degraded


def _requirement_lines(jd: JDAnalysis) -> list[dict]:
    must = {r.id for r in jd.must_haves}
    return [{"id": r.id, "text": r.text, "must": r.id in must} for r in jd.requirements()]


def _analysis_json(jd: JDAnalysis) -> str:
    slim = jd.model_dump(exclude={"facet_confidence"}, exclude_none=True)
    return json.dumps(slim, ensure_ascii=False)


async def _generate_stream(
    ai: AIGateway, settings: Settings, inp: TailorInputs, task: SectionTask
) -> AsyncIterator[dict]:
    """The model's raw suggestions, one at a time, as soon as each is written."""
    reqs = _requirement_lines(inp.jd)
    context_text = clip(resume_text(inp.resume), settings.llm_max_resume_tokens)
    user = render(
        settings.prompt_version,
        "tailor_section",
        section_label=SECTION_LABEL[task.section],
        intensity=inp.intensity,
        instruction=task.instruction,
        analysis_json=_analysis_json(inp.jd),
        requirements=reqs,
        nodes_json=json.dumps(task.nodes, ensure_ascii=False),
        context_text=context_text,
    )
    async for raw in ai.generate.stream_objects(
        Task.REGENERATE if task.instruction else Task.TAILOR_SECTION,
        system=render(settings.prompt_version, "tailor_system"),
        user=user,
        schema=ModelSuggestionBatch,
        context={
            "section": task.section,
            "nodes": task.nodes,
            "keywords": inp.jd.keywords,
            "requirements": reqs,
            "context_text": context_text,
        },
    ):
        yield raw


def _before_of(s: ModelSuggestion, texts: dict[str, str], doc: dict) -> dict | None:
    if s.op in ("replace_text", "rewrite_summary", "remove_bullet"):
        return {"text": texts.get(s.target, "")}
    if s.op == "reorder":
        for sec in doc["sections"]:
            for it in sec.get("items", []):
                if it["id"] == s.target:
                    return {"order": [b["id"] for b in it["bullets"]]}
    return None


def _payload_of(s: ModelSuggestion, seq_hint: str) -> dict:
    if s.op in ("replace_text", "rewrite_summary"):
        return {"after": s.after}
    if s.op == "insert_bullet":
        return {"after": s.after, "new_id": f"{s.target}.n{seq_hint}"}
    if s.op == "reorder":
        return {"order": s.order}
    if s.op in ("add_skill", "remove_skill"):
        return {"value": (s.value or "").strip()}
    return {}


def _estimate_delta(s: ModelSuggestion, jd: JDAnalysis, before_text: str, after_text: str) -> float:
    """Keyword-based fallback estimate of the match-score change, in points."""
    if not jd.keywords:
        return 0.0
    wanted = {canonicalize(k) for k in jd.keywords}
    if s.op == "reorder":
        return 0.3
    before_kw, after_kw = set(find_keywords(before_text)), set(find_keywords(after_text))
    gained = len((after_kw - before_kw) & wanted)
    return round(15 * gained / len(wanted), 1)


def _delta_from_fit(jd: JDAnalysis, req_id: str, fit_original: float, fit_rewrite: float) -> float:
    reqs = jd.must_haves if any(r.id == req_id for r in jd.must_haves) else jd.nice_to_haves
    group_w = 0.50 if reqs is jd.must_haves else 0.15
    total_w = sum(r.weight for r in reqs) or 1.0
    req = next((r for r in reqs if r.id == req_id), None)
    if req is None:
        return 0.0
    return round(100 * group_w * (req.weight / total_w) * (fit_rewrite - fit_original) / 4, 1)


def _guard(
    s: ModelSuggestion,
    n: int,
    task: SectionTask,
    inp: TailorInputs,
    texts: dict[str, str],
    full_text: str,
    years: float,
) -> dict | None:
    """Deterministic checks: new numbers and technologies are flagged, no-ops are dropped."""
    flag: str | None = None
    needs = s.requires_confirmation
    before_text = texts.get(s.target, "")
    after_text = s.after or ""

    if s.op in TEXT_OPS and s.after:
        evidence = "\n".join(texts.get(e, "") for e in s.evidence)
        if s.op == "rewrite_summary" or not evidence:
            evidence = full_text
        res = check_fabrication(s.after, evidence_text=evidence, resume_text=full_text, estimated_years=years)
        s.after = res.after
        after_text = res.after
        if res.requires_confirmation:
            needs, flag = True, res.reason
        if s.op == "replace_text" and s.after.strip() == before_text.strip():
            return None
    if s.op == "insert_bullet":
        needs = True
        flag = flag or "New content. Only accept if it's true."
    if s.op == "add_skill" and s.value:
        known = canonicalize(s.value) in set(find_keywords(full_text)) or s.value.lower() in full_text.lower()
        needs = not known
        if needs:
            flag = "Not on your resume yet. Add it only if you have used it."
        after_text = s.value

    return {
        "section": task.section,
        "op": s.op,
        "target": s.target,
        "payload": _payload_of(s, str(n)),
        "before": _before_of(s, texts, inp.resume),
        "rationale": s.rationale.strip(),
        "addresses": list(s.addresses),
        "evidence": s.evidence,
        "confidence": s.confidence,
        "requires_confirmation": needs,
        "flag_reason": flag,
        "score_delta": _estimate_delta(s, inp.jd, before_text, after_text),
        "checks": {},
    }


async def _ground(
    ai: AIGateway, settings: Settings, inp: TailorInputs, it: dict, texts: dict[str, str], full_text: str
) -> tuple[dict | None, bool]:
    """Jev grades one text change against the original and the evidence. Returns (item or None, degraded)."""
    if it["op"] not in TEXT_OPS:
        return it, False
    reqs_by_id = {r.id: r.text for r in inp.jd.requirements()}
    req_id = next((a for a in it["addresses"] if a in reqs_by_id), None)
    state = {
        "s0": {
            "original": (it["before"] or {}).get("text", ""),
            "rewrite": it["payload"]["after"],
            "evidence": [texts.get(e, "") for e in it["evidence"]] or [full_text[:1500]],
            "requirement": reqs_by_id.get(req_id or "", "the job's overall requirements"),
        }
    }
    answers = await ai.jev.ask(state, grounding_battery(["s0"]))
    if answers is None:
        return it, True  # the string-level guard is the only check

    relation, rel_conf = answers.choice("s0__relation")
    fit_o, fo_conf = answers.score("s0__fit_original")
    fit_r, fr_conf = answers.score("s0__fit_rewrite")
    same = answers.noul("s0__same_work")
    rel_band = band(rel_conf, settings)
    it["checks"] = {
        "relation": relation,
        "relation_confidence": round(rel_conf, 2),
        "fit_original": round(fit_o, 2),
        "fit_rewrite": round(fit_r, 2),
        "same_work": round(same, 2),
        "band": rel_band.value,
    }
    if rel_band is Band.LOW:
        it["requires_confirmation"] = True
        it["flag_reason"] = it["flag_reason"] or "We couldn't verify this one. Check it's true."
    elif relation == "contradicts":
        return None, False
    elif relation in ("overstated", "unsupported"):
        it["requires_confirmation"] = True
        it["flag_reason"] = it["flag_reason"] or (
            "Inflates scope compared with your resume."
            if relation == "overstated"
            else "Adds details your resume doesn't mention."
        )
    elif rel_band is Band.MEDIUM and not it["flag_reason"]:
        it["flag_reason"] = "Check this one before accepting."

    high = settings.jev_confidence_high
    if it["op"] == "replace_text" and ((fit_r < fit_o and fo_conf >= high and fr_conf >= high) or same < 0.5):
        return None, False
    if req_id:
        it["score_delta"] = _delta_from_fit(inp.jd, req_id, fit_o, fit_r)
    return it, False


async def _process_stream(
    ai: AIGateway, settings: Settings, inp: TailorInputs, task: SectionTask
) -> AsyncIterator[tuple[dict, bool]]:
    """Generate, validate, guard and ground one section's suggestions, yielding each the moment it
    clears every check. Yields (suggestion, degraded)."""
    doc = inp.resume
    index, texts = node_index(doc), bullet_text(doc)
    full_text = resume_text(doc)
    years = estimate_years(doc)
    # the model may only touch nodes it was shown
    allowed = {n["id"] for n in task.nodes} | {b["id"] for n in task.nodes for b in n.get("bullets", [])}

    seen: set[str] = set()
    n = 0
    async for raw in _generate_stream(ai, settings, inp, task):
        try:
            s = ModelSuggestion.model_validate(raw)
        except ValidationError:
            continue
        # one edit per node, except skills: several different skills may be added to the same group
        key = f"{s.op}:{s.target}:{(s.value or '').strip().lower()}" if s.op in SKILL_OPS else s.target
        if key in seen or s.target not in allowed or not is_valid_reference(s, index, {task.section}):
            continue
        seen.add(key)
        scrub_evidence(s, index)
        n += 1
        item = _guard(s, n, task, inp, texts, full_text, years)
        if item is None:
            continue
        item, degraded = await _ground(ai, settings, inp, item, texts, full_text)
        if item is not None:
            yield item, degraded


WorkQueue = asyncio.Queue[tuple[str, SectionTask, Any, bool]]


async def _section_worker(
    ai: AIGateway,
    settings: Settings,
    inp: TailorInputs,
    task: SectionTask,
    queue: WorkQueue,
    sem: asyncio.Semaphore,
) -> None:
    """Writes one piece of the resume, handing each suggestion to the queue as it is ready."""
    try:
        async with sem:
            async for item, deg in _process_stream(ai, settings, inp, task):
                await queue.put(("item", task, item, deg))
    except asyncio.CancelledError:
        raise
    except Exception as exc:  # one bad section must not sink the run
        if not isinstance(exc, AppError):
            log.exception("tailor task failed")
        await queue.put(("error", task, exc, False))
    finally:
        await queue.put(("done", task, None, False))


async def run_tailor(ai: AIGateway, settings: Settings, inp: TailorInputs) -> AsyncIterator[dict[str, Any]]:
    """Yields SSE-shaped events: stage, score, suggestion, warning, done.

    Sections run in parallel and each suggestion is emitted the moment it is ready, so the first
    one appears after a single model call's first few seconds rather than after the whole run."""
    degraded = False
    yield {"event": "stage", "data": {"stage": "analyzing", "progress": 0.05}}
    # the "before" score runs alongside generation instead of blocking it
    before_task = asyncio.create_task(score_document(ai, settings, inp.resume, inp.jd))

    tasks = build_tasks(inp.resume, inp.sections)
    total = len(tasks)
    # how many pieces each section is split into, so the client can show per-section progress
    plan: dict[str, int] = {}
    for t in tasks:
        plan[t.section] = plan.get(t.section, 0) + 1
    yield {"event": "stage", "data": {"stage": "tailoring", "progress": 0.1, "tasks": plan}}

    queue: WorkQueue = asyncio.Queue()
    sem = asyncio.Semaphore(CONCURRENCY)

    workers = [asyncio.create_task(_section_worker(ai, settings, inp, t, queue, sem)) for t in tasks]
    produced: list[dict] = []
    failures: list[Exception] = []
    before: MatchScore | None = None
    finished = 0
    next_event = asyncio.create_task(queue.get())
    try:
        # wait on the queue and the "before" score together, so each is sent the moment it is ready
        while finished < total or before is None:
            waiting: set[asyncio.Task] = set()
            if finished < total:
                waiting.add(next_event)
            if before is None:
                waiting.add(before_task)
            await asyncio.wait(waiting, return_when=asyncio.FIRST_COMPLETED)

            if before is None and before_task.done():
                before, d = before_task.result()
                degraded |= d
                yield {"event": "score", "data": {"before": before.model_dump()}}
            if finished < total and next_event.done():
                kind, task, payload, deg = next_event.result()
                next_event = asyncio.create_task(queue.get())
                if kind == "item":
                    degraded |= deg
                    produced.append(payload)
                    yield {"event": "suggestion", "data": payload}
                elif kind == "error":
                    failures.append(payload)
                else:
                    finished += 1
                    yield {
                        "event": "stage",
                        "data": {
                            "stage": "tailoring",
                            "section": task.section,
                            "progress": 0.1 + 0.8 * finished / max(total, 1),
                        },
                    }
    finally:
        for w in workers:
            w.cancel()
        next_event.cancel()
        before_task.cancel()

    if tasks and len(failures) == len(tasks) and not produced:
        raise (
            failures[0]
            if isinstance(failures[0], AppError)
            else AppError(
                "TAILOR_FAILED", "We couldn't generate suggestions right now.", status=500, retryable=True
            )
        )
    if failures:
        yield {
            "event": "warning",
            "data": {
                "code": "PARTIAL",
                "message": "Some sections couldn't be generated. You can retry them.",
            },
        }

    ops = [
        {"op": it["op"], "target": it["target"], "payload": it["payload"]}
        for it in produced
        if not it["requires_confirmation"]
    ]
    projected_doc = apply_ops(inp.resume, ops)
    projected, deg = await score_document(ai, settings, projected_doc, inp.jd)
    degraded |= deg
    if degraded:
        yield {
            "event": "warning",
            "data": {"code": "DEGRADED_CHECKS", "message": "Some checks are running in basic mode."},
        }
    yield {"event": "score", "data": {"before": before.model_dump(), "projected": projected.model_dump()}}
    yield {"event": "done", "data": {"count": len(produced), "degraded": degraded}}


async def regenerate_one(
    ai: AIGateway, settings: Settings, inp: TailorInputs, target: str, section: str, instruction: str
) -> dict:
    """Re-run a single node with a user instruction. Jev maps the instruction to a template."""
    answers = await ai.jev.ask(instruction, intent_battery())
    text = f'User instruction: "{instruction}".'
    if answers is not None:
        label, conf = answers.choice("intent")
        if label in INTENT_TEMPLATES and conf >= settings.jev_confidence_low:
            text = f'{INTENT_TEMPLATES[label]} (User said: "{instruction}")'

    full = build_tasks(inp.resume, [section])
    task = next(
        (
            t
            for t in full
            if any(n["id"] == target or any(b["id"] == target for b in n.get("bullets", [])) for n in t.nodes)
        ),
        None,
    )
    if task is None:
        raise AppError("NOT_FOUND", "That part of the resume no longer exists.", status=404)
    task.instruction = f"{text} Edit only the node with id {target}; return at most one suggestion for it."
    items = [item async for item, _ in _process_stream(ai, settings, inp, task)]
    match = next((i for i in items if i["target"] == target), None)
    if match is None:
        raise AppError(
            "REGENERATE_EMPTY",
            "We couldn't improve on that one with that instruction.",
            hint="Try different wording.",
            retryable=True,
        )
    return match
