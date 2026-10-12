"""What the structuring step returns. Ids are assigned by code afterwards, never by the model."""

from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.resume_ast import Contact


class ParsedSkillGroup(ApiModel):
    label: str = "Skills"
    items: list[str] = Field(default_factory=list)


class ParsedRole(ApiModel):
    company: str = ""
    title: str = ""
    location: str | None = None
    start: str | None = None
    end: str | None = None
    bullets: list[str] = Field(default_factory=list)


class ParsedProject(ApiModel):
    name: str = ""
    subtitle: str | None = None
    bullets: list[str] = Field(default_factory=list)


class ParsedEducation(ApiModel):
    school: str = ""
    degree: str = ""
    start: str | None = None
    end: str | None = None
    details: str | None = None


class ParsedOther(ApiModel):
    title: str
    lines: list[str] = Field(default_factory=list)


class ParsedResume(ApiModel):
    contact: Contact = Field(default_factory=Contact)
    summary: str | None = None
    skills: list[ParsedSkillGroup] = Field(default_factory=list)
    experience: list[ParsedRole] = Field(default_factory=list)
    projects: list[ParsedProject] = Field(default_factory=list)
    education: list[ParsedEducation] = Field(default_factory=list)
    other: list[ParsedOther] = Field(default_factory=list)
