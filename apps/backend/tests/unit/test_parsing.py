import pytest

from app.core.config import Settings
from app.core.errors import AppError
from app.parsing.heuristic import heuristic_parse
from app.parsing.ids import build_resume
from app.parsing.pdf import extract_pdf
from app.parsing.validate import validate_upload
from tests.conftest import fixture_text, text_to_pdf

S = Settings(ai_mode="mock")


def test_heuristic_parse_extracts_structure():
    parsed = heuristic_parse(fixture_text("resumes/aarav_mehta.txt"))
    assert parsed.contact.name == "Aarav Mehta"
    assert parsed.contact.email == "aarav.mehta@example.com"
    assert [r.company for r in parsed.experience] == ["Acme Commerce", "Finlytics"]
    assert parsed.experience[0].title == "SDE II"
    assert parsed.experience[0].end == "present"
    assert len(parsed.experience[0].bullets) == 4
    assert parsed.skills[0].label == "Languages" and "TypeScript" in parsed.skills[0].items
    assert parsed.education[0].school.startswith("Vellore")


def test_build_resume_assigns_stable_ids():
    resume = build_resume(heuristic_parse(fixture_text("resumes/aarav_mehta.txt")))
    exp = resume.section("experience")
    assert exp.items[0].id == "exp_1" and exp.items[0].bullets[1].id == "exp_1.b2"


def test_pdf_roundtrip_text():
    doc = extract_pdf(text_to_pdf(fixture_text("resumes/aarav_mehta.txt")), S)
    assert "Acme Commerce" in doc.text and doc.page_count == 1


def test_validate_rejects_wrong_type():
    with pytest.raises(AppError) as e:
        validate_upload(b"\x89PNG\r\n\x1a\n....", "me.pdf", S)
    assert e.value.code == "FILE_TYPE_UNSUPPORTED" and "PNG" in e.value.message


def test_validate_rejects_large_and_empty():
    with pytest.raises(AppError) as e:
        validate_upload(b"%PDF-" + b"0" * (6 * 1024 * 1024), "a.pdf", S)
    assert e.value.code == "FILE_TOO_LARGE"
    with pytest.raises(AppError) as e:
        validate_upload(b"", "a.pdf", S)
    assert e.value.code == "FILE_EMPTY"


def test_real_world_layout():
    p = heuristic_parse(fixture_text("resumes/two_digit_years.txt"), ["https://www.linkedin.com/in/jane-doe"])
    assert p.contact.name == "Jane Doe" and p.contact.headline == "Full Stack Developer"
    assert p.contact.phone == "+91 9000000001" and p.contact.location == "Pune, India"
    assert p.contact.links == ["linkedin.com/in/jane-doe"]

    first, second = p.experience
    assert (first.title, first.company, first.location) == (
        "Founding Engineer | Full Stack Engineer",
        "examplecorp.io",
        "Bengaluru (Remote)",
    )
    assert (first.start, first.end) == ("2024-01", "present")
    assert (second.title, second.company, second.start, second.end) == (
        "Associate Software Engineer",
        "Acme Technology",
        "2021-07",
        "2023-12",
    )

    assert "with Redis caching under high concurrency" in first.bullets[1]
    assert any("lead-acquisition efficiency" in b for b in second.bullets)
    assert first.bullets[-1].startswith("Tech Stack:") and not first.bullets[-2].startswith("Tech Stack")

    assert [x.name for x in p.projects] == ["Sample Assistant"] and len(p.projects[0].bullets) == 3
    assert "Retrieval-augmented" in (p.projects[0].subtitle or "")

    edu = p.education[0]
    assert edu.degree == "Bachelor of Engineering — Computer Science"
    assert edu.school == "Example Institute of Technology, Pune, India"

    skills = p.skills[0].items
    assert len(skills) == 15 and "Node JS" in skills and "REST API" in skills


def test_years_dates_normalise():
    from app.parsing.heuristic import _norm_date

    assert _norm_date("Jan '24") == "2024-01" and _norm_date("Jul ’21") == "2021-07"
    assert _norm_date("2016") == "2016" and _norm_date("Present") == "present"
    assert _norm_date("Mar '99") == "1999-03"


def test_pdf_hyperlinks_are_extracted():
    import io

    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 750, "Jane Doe  Linkedin")
    c.linkURL("https://www.linkedin.com/in/jane-doe", (72, 740, 200, 760))
    c.drawString(72, 700, "x" * 300)
    c.save()
    assert extract_pdf(buf.getvalue(), S).links == ["https://www.linkedin.com/in/jane-doe"]


def test_title_on_its_own_line_above_the_company_and_dates():
    text = """Maya Fernandez
maya@example.com

EXPERIENCE
Senior Backend Engineer
Northwind Logistics | Mar 2021 - Present
- Built a shipment tracking API in Python.
- Mentored 4 engineers and ran the weekly design review.

Backend Engineer
Brightside Health, Austin | Jun 2018 - Feb 2021
- Wrote appointment scheduling services in Go.
"""
    roles = heuristic_parse(text).experience
    assert [(r.title, r.company, r.location) for r in roles] == [
        ("Senior Backend Engineer", "Northwind Logistics", None),
        ("Backend Engineer", "Brightside Health", "Austin"),
    ]
    assert roles[0].bullets[-1] == "Mentored 4 engineers and ran the weekly design review."
    assert roles[1].start == "2018-06" and roles[1].end == "2021-02"
