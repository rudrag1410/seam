from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.enums import Decision, OpName, SectionName


class ModelSuggestion(ApiModel):
    op: OpName
    target: str
    after: str | None = None
    order: list[str] | None = None
    value: str | None = None
    rationale: str = ""
    addresses: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    confidence: float | None = None
    requires_confirmation: bool = False


class ModelSuggestionBatch(ApiModel):
    suggestions: list[ModelSuggestion] = Field(default_factory=list)


class SuggestionOut(ApiModel):
    id: str
    seq: int
    section: SectionName
    op: OpName
    target: str
    payload: dict
    before: dict | None = None
    rationale: str | None = None
    addresses: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    confidence: float | None = None
    requires_confirmation: bool = False
    flag_reason: str | None = None
    score_delta: float | None = None
    checks: dict = Field(default_factory=dict)
    status: Decision = Decision.PENDING
    edited_text: str | None = None
