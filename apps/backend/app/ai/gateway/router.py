from dataclasses import dataclass
from enum import StrEnum

from app.core.config import Settings


class Task(StrEnum):
    PARSE_STRUCTURE = "parse_structure"
    PARSE_VISION = "parse_vision"
    JD_ANALYZE = "jd_analyze"
    TAILOR_SECTION = "tailor_section"
    REGENERATE = "regenerate"
    COVER_LETTER = "cover_letter"
    INTERVIEW_PREP = "interview_prep"


@dataclass(frozen=True)
class Route:
    model: str
    fallback: str | None
    timeout_s: float
    max_output: int  # tokens; reasoning tokens count toward this on reasoning models
    # extraction needs little thinking; None means "use the configured LLM_REASONING_EFFORT"
    effort: str | None = None


def route_for(task: Task, s: Settings) -> Route:
    fast, strong, vision = s.llm_model_openai_fast, s.llm_model_openai_strong, s.llm_model_openai_vision
    return {
        Task.PARSE_STRUCTURE: Route(fast, strong, 45, 6000, effort="minimal"),
        Task.PARSE_VISION: Route(vision, None, 90, 6000),
        Task.JD_ANALYZE: Route(fast, strong, 40, 3000, effort="minimal"),
        Task.TAILOR_SECTION: Route(strong, fast, 90, 4000),
        Task.REGENERATE: Route(strong, fast, 60, 2500),
        Task.COVER_LETTER: Route(strong, fast, 90, 1500),
        Task.INTERVIEW_PREP: Route(fast, strong, 45, 3000, effort="minimal"),
    }[task]
