from app.schemas.parsed import ParsedResume
from app.schemas.resume_ast import (
    Bullet,
    EducationItem,
    EducationSection,
    ExperienceItem,
    ExperienceSection,
    OtherSection,
    ProjectItem,
    ProjectsSection,
    Resume,
    SkillGroup,
    SkillsSection,
    SummarySection,
)


def build_resume(p: ParsedResume) -> Resume:
    sections: list = []
    if p.summary and p.summary.strip():
        sections.append(SummarySection(text=p.summary.strip()))
    if p.skills:
        sections.append(
            SkillsSection(
                groups=[
                    SkillGroup(id=f"sk_{i}", label=g.label, items=[s for s in g.items if s])
                    for i, g in enumerate(p.skills, 1)
                ]
            )
        )
    if p.experience:
        items = []
        for i, r in enumerate(p.experience, 1):
            items.append(
                ExperienceItem(
                    id=f"exp_{i}",
                    company=r.company,
                    title=r.title,
                    location=r.location,
                    start=r.start,
                    end=r.end,
                    bullets=[Bullet(id=f"exp_{i}.b{j}", text=t) for j, t in enumerate(r.bullets, 1)],
                )
            )
        sections.append(ExperienceSection(items=items))
    if p.projects:
        sections.append(
            ProjectsSection(
                items=[
                    ProjectItem(
                        id=f"proj_{i}",
                        name=pr.name,
                        subtitle=pr.subtitle,
                        bullets=[Bullet(id=f"proj_{i}.b{j}", text=t) for j, t in enumerate(pr.bullets, 1)],
                    )
                    for i, pr in enumerate(p.projects, 1)
                ]
            )
        )
    if p.education:
        sections.append(
            EducationSection(
                items=[
                    EducationItem(
                        id=f"edu_{i}",
                        school=e.school,
                        degree=e.degree,
                        start=e.start,
                        end=e.end,
                        details=e.details,
                    )
                    for i, e in enumerate(p.education, 1)
                ]
            )
        )
    for i, o in enumerate(p.other, 1):
        sections.append(OtherSection(id=f"other_{i}", title=o.title, lines=o.lines))
    return Resume(contact=p.contact, sections=sections)
