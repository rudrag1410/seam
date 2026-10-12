from collections.abc import AsyncIterator

from app.ai.gateway import AIGateway
from app.ai.gateway.router import Task
from app.ai.limits import clip
from app.ai.prompts.registry import render
from app.ai.scoring.keywords import resume_text
from app.core.config import Settings
from app.schemas.jd import JDAnalysis


async def stream_cover_letter(
    ai: AIGateway,
    settings: Settings,
    *,
    document: dict,
    jd: JDAnalysis,
    tone: str,
    length: str,
    notice_period_days: int | None,
) -> AsyncIterator[str]:
    system = render(
        settings.prompt_version,
        "cover_letter",
        tone=tone,
        length=length,
        notice_period_days=notice_period_days,
    )
    must = "\n".join(f"- {r.text}" for r in jd.must_haves)
    user = (
        f"Role: {jd.title or 'the role'} at {jd.company or 'the company'}\n"
        f"<job_description>\nKey requirements:\n{must}\n</job_description>\n\n"
        f"<resume>\n{clip(resume_text(document), settings.llm_max_resume_tokens)}\n</resume>"
    )
    context = {
        "title": jd.title,
        "company": jd.company,
        "name": document["contact"].get("name", ""),
        "highlight": jd.must_haves[0].text if jd.must_haves else "",
    }
    async for chunk in ai.generate.stream_text(Task.COVER_LETTER, system=system, user=user, context=context):
        yield chunk
