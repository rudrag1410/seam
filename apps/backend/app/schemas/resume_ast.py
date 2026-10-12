"""Resume AST. Every node has a stable id so the model can reference nodes instead of rewriting
the whole document. Mirrored by `packages/resume-core/src/ast.ts`.

The `type` tags stay plain literals, not `SectionType` members, so that the generated TypeScript
union narrows on them. `SectionType` has the same values for use in code."""

from typing import Annotated, Literal

from pydantic import Field

from app.schemas.base import ApiModel


class Contact(ApiModel):
    name: str = ""
    headline: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[str] = Field(default_factory=list)


class Bullet(ApiModel):
    id: str
    text: str


class SummarySection(ApiModel):
    id: str = "summary"
    type: Literal["summary"] = "summary"
    text: str = ""


class SkillGroup(ApiModel):
    id: str
    label: str
    items: list[str] = Field(default_factory=list)


class SkillsSection(ApiModel):
    id: str = "skills"
    type: Literal["skills"] = "skills"
    groups: list[SkillGroup] = Field(default_factory=list)


class ExperienceItem(ApiModel):
    id: str
    company: str
    title: str = ""
    location: str | None = None
    start: str | None = None
    end: str | None = None
    bullets: list[Bullet] = Field(default_factory=list)


class ExperienceSection(ApiModel):
    id: str = "experience"
    type: Literal["experience"] = "experience"
    items: list[ExperienceItem] = Field(default_factory=list)


class ProjectItem(ApiModel):
    id: str
    name: str
    subtitle: str | None = None
    bullets: list[Bullet] = Field(default_factory=list)


class ProjectsSection(ApiModel):
    id: str = "projects"
    type: Literal["projects"] = "projects"
    items: list[ProjectItem] = Field(default_factory=list)


class EducationItem(ApiModel):
    id: str
    school: str
    degree: str = ""
    start: str | None = None
    end: str | None = None
    details: str | None = None


class EducationSection(ApiModel):
    id: str = "education"
    type: Literal["education"] = "education"
    items: list[EducationItem] = Field(default_factory=list)


class OtherSection(ApiModel):
    id: str
    type: Literal["other"] = "other"
    title: str
    lines: list[str] = Field(default_factory=list)


Section = Annotated[
    SummarySection | SkillsSection | ExperienceSection | ProjectsSection | EducationSection | OtherSection,
    Field(discriminator="type"),
]

TAILORABLE_SECTIONS = ("summary", "skills", "experience", "projects")


class Resume(ApiModel):
    contact: Contact = Field(default_factory=Contact)
    sections: list[Section] = Field(default_factory=list)

    def section(self, type_: str):
        return next((s for s in self.sections if s.type == type_), None)
