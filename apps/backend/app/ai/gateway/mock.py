"""Deterministic offline generator for tests and `AI_MODE=mock` demos. No network, no keys.

It consumes the same `context` the real prompts are built from, so the pipelines run unchanged.
"""

import asyncio
import re
from collections.abc import AsyncIterator
from typing import TypeVar

from pydantic import BaseModel

from app.ai.gateway.router import Task
from app.ai.scoring.keywords import canonicalize, find_keywords
from app.parsing.heuristic import BULLET, heuristic_parse
from app.schemas.suggestion import ModelSuggestion, ModelSuggestionBatch

T = TypeVar("T", bound=BaseModel)

_NICE = re.compile(r"preferred|nice to have|bonus|plus\b|good to have", re.I)


def _mock_jd(text: str) -> dict:
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    title = next((ln for ln in lines if len(ln) < 90), "")
    company_match = re.search(r"\bat\s+([A-Z][\w&.]+(?:\s[A-Z][\w&.]+)?)", title) or re.search(
        r"(?:@|join)\s+([A-Z][\w&.]+)", text
    )
    must, nice, duties = [], [], []
    bucket = None
    for ln in lines:
        if not BULLET.match(ln):
            if re.match(r"(responsibilit|what you.ll do|the role)", ln, re.I):
                bucket = "duties"
            elif _NICE.search(ln):
                bucket = "nice"
            elif re.match(r"(requirements|qualifications|what you|must)", ln, re.I):
                bucket = "must"
            continue
        item = {"text": BULLET.sub("", ln)[:140], "keywords": find_keywords(ln), "weight": 1.0}
        if bucket == "duties":
            duties.append(item["text"])
        elif bucket == "nice":
            nice.append(item)
        else:
            must.append(item)
    salary = re.search(r"(INR|USD|EUR|GBP)\s*([\d,]+)\s*(?:to|-)\s*(?:\1\s*)?([\d,]+)", text)
    return {
        "title": re.sub(r"\s+at\s+.*$", "", title),
        "company": company_match.group(1) if company_match else "",
        "must_haves": must[:8],
        "nice_to_haves": nice[:6],
        "responsibilities": duties[:8],
        "keywords": find_keywords(text)[:20],
        "seniority": "senior" if re.search(r"senior|sr\.", text, re.I) else "unspecified",
        "work_mode": "remote"
        if re.search(r"\bremote\b", text, re.I)
        else "hybrid"
        if re.search(r"hybrid", text, re.I)
        else "unspecified",
        "employment_type": "full_time" if re.search(r"full[- ]time", text, re.I) else "unspecified",
        "location": "Bengaluru" if "Bengaluru" in text else "",
        "salary_range": {
            "min": float(salary.group(2).replace(",", "")),
            "max": float(salary.group(3).replace(",", "")),
            "currency": salary.group(1),
            "period": "year",
        }
        if salary
        else None,
    }


def _overlap(text: str, keywords: list[str]) -> int:
    have = set(find_keywords(text))
    return sum(canonicalize(k) in have for k in keywords)


def _mock_tailor(ctx: dict) -> ModelSuggestionBatch:
    section, nodes, jd_kw = ctx["section"], ctx["nodes"], ctx.get("keywords", [])
    out: list[ModelSuggestion] = []
    req_ids = [r["id"] for r in ctx.get("requirements", [])][:2]
    if section == "summary" and nodes:
        node = nodes[0]
        top = [k for k in jd_kw if k in set(find_keywords(ctx["context_text"]))][:3]
        if top and "hands-on strength in" not in node["text"]:
            joined = ", ".join(top[:-1]) + (f" and {top[-1]}" if len(top) > 1 else top[0])
            out.append(
                ModelSuggestion(
                    op="rewrite_summary",
                    target=node["id"],
                    after=f"{node['text'].rstrip('. ')}, with hands-on strength in {joined}.",
                    rationale="Surfaces the stack the role asks for, using skills already on your resume.",
                    addresses=req_ids,
                    evidence=[node["id"]],
                    confidence=0.7,
                )
            )
    elif section == "skills":
        have = set(find_keywords(ctx["context_text"]))
        for group in nodes[:1]:
            for kw in [k for k in jd_kw if canonicalize(k) not in have][:3]:
                out.append(
                    ModelSuggestion(
                        op="add_skill",
                        target=group["id"],
                        value=kw,
                        requires_confirmation=True,
                        rationale=f"The role asks for {kw}. Add it only if you have used it.",
                        addresses=req_ids,
                        evidence=[],
                        confidence=0.5,
                    )
                )
    elif section in ("experience", "projects"):
        for item in nodes:
            bullets = item["bullets"]
            # most relevant first; ties keep their original order
            relevance = [_overlap(b["text"], jd_kw) for b in bullets]
            order = sorted(range(len(bullets)), key=relevance.__getitem__, reverse=True)
            ranked = [bullets[i] for i in order]
            if [b["id"] for b in ranked] != [b["id"] for b in bullets] and len(bullets) > 1:
                out.append(
                    ModelSuggestion(
                        op="reorder",
                        target=item["id"],
                        order=[b["id"] for b in ranked],
                        rationale="Moves the work closest to the job's requirements to the top.",
                        addresses=req_ids,
                        evidence=[b["id"] for b in ranked[:1]],
                        confidence=0.75,
                    )
                )
    return ModelSuggestionBatch(suggestions=out)


class MockGenerator:
    breaker_open = False

    def __init__(self, stream_delay_s: float = 0.1) -> None:
        self._delay = stream_delay_s

    async def structured(
        self, task: Task, *, system: str, user: str, schema: type[T], context: dict | None = None
    ) -> T:
        ctx = context or {}
        if task == Task.PARSE_STRUCTURE:
            return schema.model_validate(heuristic_parse(ctx["text"]).model_dump())
        if task == Task.JD_ANALYZE:
            return schema.model_validate(_mock_jd(ctx["text"]))
        if task in (Task.TAILOR_SECTION, Task.REGENERATE):
            return schema.model_validate(_mock_tailor(ctx).model_dump())
        if task == Task.INTERVIEW_PREP:
            qs = [
                {
                    "question": f"Tell me about your experience with {r['text']}.",
                    "why": "Checks depth on a stated requirement.",
                    "talking_points": ["Pick one concrete project from your resume.", "State the outcome."],
                }
                for r in ctx.get("requirements", [])[:6]
            ]
            return schema.model_validate({"questions": qs})
        raise NotImplementedError(task)

    async def stream_objects(
        self, task: Task, *, system: str, user: str, schema: type[T], context: dict | None = None
    ) -> AsyncIterator[dict]:
        for suggestion in _mock_tailor(context or {}).suggestions:
            await asyncio.sleep(self._delay)  # visible, like a model writing one suggestion at a time
            yield suggestion.model_dump()

    async def vision_structured(
        self, task: Task, *, system: str, user: str, images: list[bytes], schema: type[T]
    ) -> T:
        raise NotImplementedError("vision is unavailable in mock mode")

    async def stream_text(
        self, task: Task, *, system: str, user: str, context: dict | None = None
    ) -> AsyncIterator[str]:
        ctx = context or {}
        text = (
            f"Dear Hiring Team,\n\nI am applying for the {ctx.get('title') or 'open'} role"
            f"{' at ' + ctx['company'] if ctx.get('company') else ''}. {ctx.get('highlight', '')}\n\n"
            "My recent work maps directly to what you describe, and I would welcome the chance to "
            f"talk it through.\n\nBest regards,\n{ctx.get('name', '')}"
        )
        for word in re.findall(r"\S+\s*", text):
            yield word
