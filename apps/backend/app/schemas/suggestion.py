from typing import Literal

from pydantic import Field

from app.schemas.base import ApiModel

OpName = Literal[
    "replace_text",
    "reorder",
    "insert_bullet",
    "remove_bullet",
    "add_skill",
    "remove_skill",
    "rewrite_summary",
]
Decision = Literal["pending", "accepted", "rejected", "edited"]


class ModelSuggestion(ApiModel):
    """The strict contract the generator must follow. Anything else is dropped."""

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
    section: str
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
    status: Decision = "pending"
    edited_text: str | None = None
