from app.ai.scoring.ats import bullet_strength, compute_ats
from app.ai.scoring.fit import compute_fit
from app.ai.scoring.match import compute_match
from app.parsing.heuristic import heuristic_parse
from app.parsing.ids import build_resume
from app.schemas.jd import JDAnalysis, Requirement, SalaryRange
from tests.conftest import fixture_text


def _doc() -> dict:
    return build_resume(heuristic_parse(fixture_text("resumes/aarav_mehta.txt"))).model_dump()


def _jd() -> JDAnalysis:
    return JDAnalysis(
        seniority="senior",
        must_haves=[
            Requirement(id="req_1", text="React and TypeScript", keywords=["React", "TypeScript"]),
            Requirement(id="req_2", text="GraphQL APIs", keywords=["GraphQL"]),
        ],
        keywords=["React", "TypeScript", "GraphQL", "Next.js"],
    )


def test_match_is_explainable_and_bounded():
    m = compute_match(_doc(), _jd())
    assert 0 <= m.total <= 100
    verdicts = {r.id: r.verdict for r in m.requirements}
    assert verdicts["req_1"] == "demonstrated" and verdicts["req_2"] == "missing"
    assert m.missing_keywords == ["GraphQL"]


def test_ats_flags_weak_bullets():
    assert bullet_strength("Cut LCP by 38% using server-side rendering") >= 0.8
    assert bullet_strength("Responsible for stuff") < 0.4
    ats = compute_ats(_doc(), ["React"])
    assert {c.key for c in ats.checks} >= {"headings", "contact", "dates", "bullets", "keywords"}


def test_fit_compares_compensation_in_code():
    jd = _jd().model_copy(update={"salary_range": SalaryRange(min=1_000_000, max=2_000_000, currency="INR")})
    fit = compute_fit(jd, {}, expected_ctc=3_000_000, ctc_currency="INR", years=4)
    comp = next(i for i in fit.items if i.key == "compensation")
    assert comp.status == "warn" and "33%" in comp.detail
