import json

from app.ai.gateway import AIGateway
from app.ai.gateway.router import Task
from app.ai.limits import clip
from app.ai.prompts.registry import render
from app.ai.scoring.keywords import resume_text
from app.core.config import Settings
from app.schemas.jd import JDAnalysis
from app.schemas.version import InterviewPrep


async def interview_prep(ai: AIGateway, settings: Settings, document: dict, jd: JDAnalysis) -> InterviewPrep:
    reqs = [{"id": r.id, "text": r.text} for r in jd.requirements()]
    return await ai.generate.structured(
        Task.INTERVIEW_PREP,
        system=render(settings.prompt_version, "interview_prep"),
        user=f"<analysis>\n{json.dumps(reqs)}\n</analysis>\n\n<resume>\n{clip(resume_text(document), settings.llm_max_resume_tokens)}\n</resume>",
        schema=InterviewPrep,
        context={"requirements": reqs},
    )
