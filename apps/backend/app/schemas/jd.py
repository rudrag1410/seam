from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.enums import EmploymentType, FitKey, FitStatus, SalaryPeriod, Seniority, WorkMode


class Requirement(ApiModel):
    id: str
    text: str
    keywords: list[str] = Field(default_factory=list)
    weight: float = 1.0


class SalaryRange(ApiModel):
    min: float | None = None
    max: float | None = None
    currency: str | None = None
    period: SalaryPeriod = SalaryPeriod.YEAR


class JDAnalysis(ApiModel):
    title: str = ""
    company: str = ""
    seniority: Seniority = Seniority.UNSPECIFIED
    employment_type: EmploymentType = EmploymentType.UNSPECIFIED
    work_mode: WorkMode = WorkMode.UNSPECIFIED
    location: str = ""
    salary_range: SalaryRange | None = None
    must_haves: list[Requirement] = Field(default_factory=list)
    nice_to_haves: list[Requirement] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    facet_confidence: dict[str, float] = Field(default_factory=dict)

    def requirements(self) -> list[Requirement]:
        return [*self.must_haves, *self.nice_to_haves]


class FitItem(ApiModel):
    key: FitKey
    label: str
    status: FitStatus
    detail: str


class FitCheck(ApiModel):
    items: list[FitItem] = Field(default_factory=list)


class JDAnalyzeRequest(ApiModel):
    text: str | None = None
    url: str | None = None


class JDAnalyzeResponse(ApiModel):
    id: str
    title: str
    company: str
    analysis: JDAnalysis
    fit: FitCheck
    warnings: list[str] = Field(default_factory=list)
    degraded: bool = False
