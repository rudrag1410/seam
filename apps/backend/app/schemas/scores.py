from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.enums import Verdict


class RequirementCoverage(ApiModel):
    id: str
    text: str
    must_have: bool
    level: float  # 0..4, fractional
    confidence: float | None = None
    verdict: Verdict


class MatchScore(ApiModel):
    total: float
    must_have_coverage: float
    nice_to_have_coverage: float
    keyword_alignment: float
    seniority_fit: float
    section_completeness: float
    requirements: list[RequirementCoverage] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    matched_keywords: list[str] = Field(default_factory=list)


class AtsCheck(ApiModel):
    key: str
    label: str
    passed: bool
    weight: float
    hint: str | None = None


class AtsScore(ApiModel):
    total: float
    checks: list[AtsCheck] = Field(default_factory=list)
