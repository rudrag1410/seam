import logging
import re
from dataclasses import dataclass, field

from pydantic import BaseModel, Field

from app.ai.decisions.input_gate import input_gate_battery
from app.ai.gateway import AIGateway
from app.ai.gateway.router import Task
from app.ai.guards.injection import looks_injected, sanitize, strip_suspicious_lines
from app.ai.prompts.registry import render
from app.ai.scoring.keywords import canonicalize
from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.jd import JDAnalysis, Requirement, SalaryRange

log = logging.getLogger("seam.jd")

_JD_TERMS = re.compile(
    r"responsibilit|requirements?|qualifications?|you will|we are looking|about the role|"
    r"what you'll|benefits|apply|join (us|our)|years of experience|nice to have|preferred",
    re.I,
)
_RESUME_TERMS = re.compile(
    r"\beducation\b|\breferences\b|\bobjective\b|career summary|work experience|"
    r"professional experience|\bcgpa\b|b\.?tech|curriculum vitae",
    re.I,
)


class _DraftRequirement(BaseModel):
    text: str
    keywords: list[str] = Field(default_factory=list)
    weight: float = 1.0


class JDDraft(BaseModel):
    title: str = ""
    company: str = ""
    seniority: str = "unspecified"
    employment_type: str = "unspecified"
    work_mode: str = "unspecified"
    location: str = ""
    salary_range: SalaryRange | None = None
    must_haves: list[_DraftRequirement] = Field(default_factory=list)
    nice_to_haves: list[_DraftRequirement] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


@dataclass
class AnalysisResult:
    analysis: JDAnalysis
    text: str
    warnings: list[str] = field(default_factory=list)
    degraded: bool = False


def _heuristic_kind(text: str) -> str:
    jd, resume = len(_JD_TERMS.findall(text)), len(_RESUME_TERMS.findall(text))
    return "resume" if resume >= 3 and resume > jd else "job_description"


def _valid(value: str, allowed: set[str]) -> str:
    return value if value in allowed else "unspecified"


def _requirements(draft: list[_DraftRequirement], prefix: str) -> list[Requirement]:
    return [
        Requirement(
            id=f"{prefix}_{i}",
            text=r.text.strip(),
            keywords=[canonicalize(k) for k in dict.fromkeys(r.keywords)],
            weight=min(max(r.weight, 0.1), 1.0),
        )
        for i, r in enumerate(draft, 1)
        if r.text.strip()
    ]


def check_jd_length(text: str, settings: Settings) -> None:
    """Bounds what a job description can cost: too short to analyse, or too long to send."""
    if len(text) < settings.min_jd_chars:
        raise AppError(
            "JD_TOO_SHORT",
            f"That's {len(text)} characters. Paste the full job description (at least {settings.min_jd_chars}).",
        )
    if len(text) > settings.max_jd_chars:
        raise AppError(
            "JD_TOO_LONG",
            f"That's {len(text):,} characters. The limit is {settings.max_jd_chars:,}.",
            status=413,
            hint="Paste just the job posting, without the company boilerplate.",
        )


async def analyze_jd(ai: AIGateway, settings: Settings, raw: str) -> AnalysisResult:
    text = sanitize(raw)
    check_jd_length(text, settings)

    warnings: list[str] = []
    facets: dict[str, tuple[str, float]] = {}
    gate = await ai.jev.ask(text, input_gate_battery())
    degraded = gate is None

    if gate is not None:
        kind, kind_conf = gate.choice("kind")
        if kind != "job_description" and kind_conf >= settings.jev_confidence_low:
            raise _not_a_jd(kind)
        injected = gate.noul("injection") >= 0.7
        facets = {k: gate.choice(k) for k in ("work_mode", "employment_type", "seniority")}
    else:
        if _heuristic_kind(text) == "resume":
            raise _not_a_jd("resume")
        injected = False

    if injected or looks_injected(text):
        text, removed = strip_suspicious_lines(text)
        if removed:
            warnings.append("We removed lines that looked like instructions to an AI system.")

    draft = await ai.generate.structured(
        Task.JD_ANALYZE,
        system=render(settings.prompt_version, "jd_analyze"),
        user=f"<job_description>\n{text}\n</job_description>",
        schema=JDDraft,
        context={"text": text},
    )

    modes = {"remote", "hybrid", "onsite", "unspecified"}
    types = {"full_time", "contract", "part_time", "internship", "freelance", "unspecified"}
    levels = {"junior", "mid", "senior", "staff", "lead", "unspecified"}
    work_mode, employment_type, seniority = (
        _valid(draft.work_mode, modes),
        _valid(draft.employment_type, types),
        _valid(draft.seniority, levels),
    )
    confidence: dict[str, float] = {}
    for key, allowed in (("work_mode", modes), ("employment_type", types), ("seniority", levels)):
        if key in facets and facets[key][1] >= settings.jev_confidence_low and facets[key][0] in allowed:
            label, conf = facets[key]
            confidence[key] = conf
            if key == "work_mode":
                work_mode = label
            elif key == "employment_type":
                employment_type = label
            else:
                seniority = label
        elif key in facets:
            confidence[key] = facets[key][1]  # low: the fit check shows "unclear"

    analysis = JDAnalysis(
        title=draft.title.strip(),
        company=draft.company.strip(),
        seniority=seniority,  # type: ignore[arg-type]
        employment_type=employment_type,  # type: ignore[arg-type]
        work_mode=work_mode,  # type: ignore[arg-type]
        location=draft.location.strip(),
        salary_range=draft.salary_range,
        must_haves=_requirements(draft.must_haves, "req"),
        nice_to_haves=_requirements(draft.nice_to_haves, "nice"),
        responsibilities=draft.responsibilities[:8],
        keywords=list(dict.fromkeys(canonicalize(k) for k in draft.keywords))[:20],
        facet_confidence=confidence,
    )
    if not analysis.must_haves and not analysis.nice_to_haves:
        raise AppError(
            "JD_UNREADABLE",
            "We couldn't find any requirements in that text.",
            hint="Paste the full posting, including the requirements section.",
        )
    return AnalysisResult(analysis, text, warnings, degraded)


def _not_a_jd(kind: str) -> AppError:
    msg = (
        "This looks like a resume, not a job description."
        if kind == "resume"
        else "This doesn't look like a job description."
    )
    return AppError("JD_NOT_A_JD", msg, hint="Paste the job posting you want to tailor for.")
