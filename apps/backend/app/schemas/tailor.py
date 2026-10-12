from datetime import datetime

from pydantic import Field, model_validator

from app.core.errors import ErrorCode
from app.schemas.base import ApiModel
from app.schemas.enums import Decision, Intensity, SectionName, SessionStatus
from app.schemas.jd import FitCheck, JDAnalysis
from app.schemas.resume_ast import Resume
from app.schemas.scores import MatchScore
from app.schemas.suggestion import SuggestionOut


def _default_sections() -> list[SectionName]:
    return [SectionName.SUMMARY, SectionName.SKILLS, SectionName.EXPERIENCE]


class TailorCreate(ApiModel):
    resume_id: str
    jd_text: str | None = None
    jd_id: str | None = None
    sections: list[SectionName] = Field(default_factory=_default_sections, min_length=1)
    intensity: Intensity = Intensity.BALANCED
    base_version_id: str | None = None

    @model_validator(mode="after")
    def _one_job_source(self) -> "TailorCreate":
        if sum(bool(x) for x in (self.jd_text, self.jd_id)) != 1:
            raise ValueError("Provide exactly one of jd_text or jd_id.")
        return self


class TailorCreated(ApiModel):
    id: str


class TailorSessionOut(ApiModel):
    id: str
    status: SessionStatus
    intensity: Intensity
    sections: list[SectionName]
    degraded: bool
    error_code: ErrorCode | None
    error_message: str | None = None
    resume_id: str
    jd_id: str
    jd_title: str | None
    jd_company: str | None
    jd_text: str = ""
    jd: JDAnalysis | None
    fit: FitCheck | None = None
    resume: Resume
    suggestions: list[SuggestionOut]
    score_before: MatchScore | None
    score_after: MatchScore | None
    version_id: str | None = None
    created_at: datetime


class DecisionIn(ApiModel):
    id: str
    status: Decision
    edited_text: str | None = None


class DecisionsPatch(ApiModel):
    decisions: list[DecisionIn]


class RegenerateIn(ApiModel):
    instruction: str = Field(min_length=2, max_length=300)


class FinalizeOut(ApiModel):
    version_id: str


class SessionListItem(ApiModel):
    id: str
    status: SessionStatus
    jd_title: str | None
    jd_company: str | None
    suggestion_count: int
    decided_count: int
    match_before: float | None
    match_after: float | None
    created_at: datetime
