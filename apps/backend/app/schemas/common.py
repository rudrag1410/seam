import re
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.schemas.base import ApiModel
from app.schemas.enums import ActivityKind, EmploymentType, EntityType, Seniority, WorkMode


class OrmModel(ApiModel):
    model_config = {"from_attributes": True}


class SignupRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    full_name: str = Field(min_length=1, max_length=200)


class LoginRequest(ApiModel):
    email: EmailStr
    password: str


class UserOut(OrmModel):
    id: str
    email: str
    full_name: str
    onboarded: bool
    has_resume: bool


LINK_PATTERN = re.compile(r"^(https?://)?[^\s/.]+\.\S{2,}$", re.IGNORECASE)


class ProfileIO(ApiModel):
    full_name: str = ""
    phone: str | None = None
    location: str | None = None
    headline: str | None = None
    current_title: str | None = None
    current_company: str | None = None
    years_experience: float | None = None
    links: dict[str, str] = Field(default_factory=dict)
    current_ctc: float | None = None
    expected_ctc: float | None = None
    ctc_currency: str = "INR"
    notice_period_days: int | None = None

    @field_validator("links")
    @classmethod
    def _links_are_urls(cls, links: dict[str, str]) -> dict[str, str]:
        for name, value in links.items():
            if not LINK_PATTERN.match(value.strip()):
                raise ValueError(f"{name} must be a link, like linkedin.com/in/you")
        return {name: value.strip() for name, value in links.items()}


class PreferencesIO(ApiModel):
    target_roles: list[str] = Field(default_factory=list)
    seniority: Seniority | None = None
    job_types: list[EmploymentType] = Field(default_factory=list)
    work_modes: list[WorkMode] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    open_to_relocation: bool = False
    industries: list[str] = Field(default_factory=list)
    preferred_tech: list[str] = Field(default_factory=list)
    avoid_tech: list[str] = Field(default_factory=list)
    work_authorization: str | None = None


class ActivityOut(ApiModel):
    id: int
    type: ActivityKind
    entity_type: EntityType | None
    entity_id: str | None
    summary: str
    created_at: datetime


class ActivityPage(ApiModel):
    items: list[ActivityOut]
    next_cursor: int | None = None
