from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.base import ApiModel


class OrmModel(ApiModel):
    model_config = {"from_attributes": True}


class ErrorBody(ApiModel):
    code: str
    message: str
    hint: str | None = None
    retryable: bool = False


class ErrorResponse(ApiModel):
    error: ErrorBody


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


class PreferencesIO(ApiModel):
    target_roles: list[str] = Field(default_factory=list)
    seniority: str | None = None
    job_types: list[str] = Field(default_factory=list)
    work_modes: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    open_to_relocation: bool = False
    industries: list[str] = Field(default_factory=list)
    preferred_tech: list[str] = Field(default_factory=list)
    avoid_tech: list[str] = Field(default_factory=list)
    work_authorization: str | None = None


class ActivityOut(ApiModel):
    id: int
    type: str
    entity_type: str | None
    entity_id: str | None
    summary: str
    created_at: datetime


class ActivityPage(ApiModel):
    items: list[ActivityOut]
    next_cursor: int | None = None
