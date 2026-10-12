import asyncio
import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from enum import Enum
from typing import Any, TypedDict

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
from app.core.errors import AppError, ErrorCode
from app.schemas.enums import (
    SKILL_OPS,
    TEXT_OPS,
    Intensity,
    OpName,
    SectionName,
    SectionType,
    Stage,
    StreamEvent,
    WarningCode,
)
from app.schemas.jd import JDAnalysis
from app.schemas.scores import MatchScore
from app.schemas.suggestion import ModelSuggestion, ModelSuggestionBatch

log = logging.getLogger("seam.tailor")

CONCURRENCY = 6
SECTION_LABEL = {
    SectionName.SUMMARY: "Summary",
    SectionName.SKILLS: "Skills",
    SectionName.EXPERIENCE: "Experience",
    SectionName.PROJECTS: "Projects",
}


class RunEvent(TypedDict):
    event: StreamEvent
    data: dict[str, Any]


@dataclass
class SectionTask:
    section: SectionName
    nodes: list[dict]
    instruction: str | None = None


@dataclass
class TailorInputs:
    resume: dict
    jd: JDAnalysis
    sections: list[SectionName]
    intensity: Intensity


def build_tasks(resume: dict, sections: list[SectionName]) -> list[SectionTask]:
    tasks: list[SectionTask] = []
    for s in resume["sections"]:
        if s["type"] not in sections:
            continue
        if s["type"] == SectionType.SUMMARY:
            tasks.append(SectionTask(SectionName.SUMMARY, [{"id": s["id"], "text": s["text"]}]))
        elif s["type"] == SectionType.SKILLS:
            tasks.append(
                SectionTask(
                    SectionName.SKILLS,
                    [{"id": g["id"], "label": g["label"], "items": g["items"]} for g in s["groups"]],
                )
            )
        elif s["type"] in (SectionType.EXPERIENCE, SectionType.PROJECTS):
            for it in s["items"]:
                head = it.get("title") or it.get("subtitle") or ""
                name = it.get("company") or it.get("name") or ""
                tasks.append(
                    SectionTask(
                        SectionName(s["type"]),
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
    if s.op in (OpName.REPLACE_TEXT, OpName.REWRITE_SUMMARY, OpName.REMOVE_BULLET):
        return {"text": texts.get(s.target, "")}
    if s.op == OpName.REORDER:
        for sec in doc["sections"]:
            for it in sec.get("items", []):
                if it["id"] == s.target:
                    return {"order": [b["id"] for b in it["bullets"]]}
    return None


def _payload_of(s: ModelSuggestion, seq_hint: str) -> dict:
    if s.op in (OpName.REPLACE_TEXT, OpName.REWRITE_SUMMARY):
        return {"after": s.after}
    if s.op == OpName.INSERT_BULLET:
        return {"after": s.after, "new_id": f"{s.target}.n{seq_hint}"}
    if s.op == OpName.REORDER:
        return {"order": s.order}
    if s.op in (OpName.ADD_SKILL, OpName.REMOVE_SKILL):
        return {"value": (s.value or "").strip()}
    return {}


def _estimate_delta(s: ModelSuggestion, jd: JDAnalysis, before_text: str, after_text: str) -> float:
    if not jd.keywords:
        return 0.0
    wanted = {canonicalize(k) for k in jd.keywords}
    if s.op == OpName.REORDER:
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
    flag: str | None = None
    needs = s.requires_confirmation
    before_text = texts.get(s.target, "")
    after_text = s.after or ""

    if s.op in TEXT_OPS and s.after:
        evidence = "\n".join(texts.get(e, "") for e in s.evidence)
        if s.op == OpName.REWRITE_SUMMARY or not evidence:
            evidence = full_text
        res = check_fabrication(s.after, evidence_text=evidence, resume_text=full_text, estimated_years=years)
        s.after = res.after
        after_text = res.after
        if res.requires_confirmation:
            needs, flag = True, res.reason
        if s.op == OpName.REPLACE_TEXT and s.after.strip() == before_text.strip():
            return None
    if s.op == OpName.INSERT_BULLET:
        needs = True
        flag = flag or "New content. Only accept if it's true."
    if s.op == OpName.ADD_SKILL and s.value:
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
        return it, True

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
    if it["op"] == OpName.REPLACE_TEXT and (
        (fit_r < fit_o and fo_conf >= high and fr_conf >= high) or same < 0.5
    ):
        return None, False
    if req_id:
        it["score_delta"] = _delta_from_fit(inp.jd, req_id, fit_o, fit_r)
    return it, False


async def _process_stream(
    ai: AIGateway, settings: Settings, inp: TailorInputs, task: SectionTask
) -> AsyncIterator[tuple[dict, bool]]:
    doc = inp.resume
    index, texts = node_index(doc), bullet_text(doc)
    full_text = resume_text(doc)
    years = estimate_years(doc)
    allowed = {n["id"] for n in task.nodes} | {b["id"] for n in task.nodes for b in n.get("bullets", [])}

    seen: set[str] = set()
    n = 0
    async for raw in _generate_stream(ai, settings, inp, task):
        try:
            s = ModelSuggestion.model_validate(raw)
        except ValidationError:
            continue
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


class WorkKind(Enum):
    ITEM = "item"
    FAILED = "failed"
    FINISHED = "finished"


@dataclass(frozen=True)
class WorkMessage:
    kind: WorkKind
    task: SectionTask
    payload: Any = None
    degraded: bool = False


WorkQueue = asyncio.Queue[WorkMessage]


async def _section_worker(
    ai: AIGateway,
    settings: Settings,
    inp: TailorInputs,
    task: SectionTask,
    queue: WorkQueue,
    sem: asyncio.Semaphore,
) -> None:
    try:
        async with sem:
            async for item, deg in _process_stream(ai, settings, inp, task):
                await queue.put(WorkMessage(WorkKind.ITEM, task, item, deg))
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        if not isinstance(exc, AppError):
            log.exception("tailor task failed")
        await queue.put(WorkMessage(WorkKind.FAILED, task, exc))
    finally:
        await queue.put(WorkMessage(WorkKind.FINISHED, task))


async def run_tailor(ai: AIGateway, settings: Settings, inp: TailorInputs) -> AsyncIterator[RunEvent]:
    degraded = False
    yield {"event": StreamEvent.STAGE, "data": {"stage": Stage.ANALYZING, "progress": 0.05}}
    before_task = asyncio.create_task(score_document(ai, settings, inp.resume, inp.jd))

    tasks = build_tasks(inp.resume, inp.sections)
    total = len(tasks)
    plan: dict[SectionName, int] = {}
    for t in tasks:
        plan[t.section] = plan.get(t.section, 0) + 1
    yield {"event": StreamEvent.STAGE, "data": {"stage": Stage.TAILORING, "progress": 0.1, "tasks": plan}}

    queue: WorkQueue = asyncio.Queue()
    sem = asyncio.Semaphore(CONCURRENCY)

    workers = [asyncio.create_task(_section_worker(ai, settings, inp, t, queue, sem)) for t in tasks]
    produced: list[dict] = []
    failures: list[Exception] = []
    before: MatchScore | None = None
    finished = 0
    next_event = asyncio.create_task(queue.get())
    try:
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
                yield {"event": StreamEvent.SCORE, "data": {"before": before.model_dump()}}
            if finished < total and next_event.done():
                msg = next_event.result()
                next_event = asyncio.create_task(queue.get())
                if msg.kind is WorkKind.ITEM:
                    degraded |= msg.degraded
                    produced.append(msg.payload)
                    yield {"event": StreamEvent.SUGGESTION, "data": msg.payload}
                elif msg.kind is WorkKind.FAILED:
                    failures.append(msg.payload)
                else:
                    finished += 1
                    yield {
                        "event": StreamEvent.STAGE,
                        "data": {
                            "stage": Stage.TAILORING,
                            "section": msg.task.section,
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
                ErrorCode.TAILOR_FAILED,
                "We couldn't generate suggestions right now.",
                status=500,
                retryable=True,
            )
        )
    if failures:
        yield {
            "event": StreamEvent.WARNING,
            "data": {
                "code": WarningCode.PARTIAL,
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
            "event": StreamEvent.WARNING,
            "data": {
                "code": WarningCode.DEGRADED_CHECKS,
                "message": "Some checks are running in basic mode.",
            },
        }
    yield {
        "event": StreamEvent.SCORE,
        "data": {"before": before.model_dump(), "projected": projected.model_dump()},
    }
    yield {"event": StreamEvent.DONE, "data": {"count": len(produced), "degraded": degraded}}


async def regenerate_one(
    ai: AIGateway, settings: Settings, inp: TailorInputs, target: str, section: SectionName, instruction: str
) -> dict:
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
        raise AppError(ErrorCode.NOT_FOUND, "That part of the resume no longer exists.", status=404)
    task.instruction = f"{text} Edit only the node with id {target}; return at most one suggestion for it."
    items = [item async for item, _ in _process_stream(ai, settings, inp, task)]
    match = next((i for i in items if i["target"] == target), None)
    if match is None:
        raise AppError(
            ErrorCode.REGENERATE_EMPTY,
            "We couldn't improve on that one with that instruction.",
            hint="Try different wording.",
            retryable=True,
        )
    return match
