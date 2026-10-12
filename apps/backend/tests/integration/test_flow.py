"""End-to-end API flow in mock AI mode: upload -> analyze -> tailor (SSE) -> review -> finalize -> export."""

import json

from app.ai.gateway.openai_client import LLM_UNAVAILABLE
from tests.conftest import text_to_pdf


def _sse(client, url) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    with client.stream("GET", url) as r:
        assert r.status_code == 200
        name = None
        for line in r.iter_lines():
            if line.startswith("event: "):
                name = line[7:]
            elif line.startswith("data: ") and name:
                events.append((name, json.loads(line[6:])))
                if name in ("done", "error"):
                    break
    return events


def _upload(client, pdf: bytes):
    return client.post("/v1/resumes", files={"file": ("aarav.pdf", pdf, "application/pdf")})


def test_requires_auth(client):
    r = client.get("/v1/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHORIZED"


def test_signup_login_logout(client):
    body = {"email": "a@b.co", "password": "longenough", "full_name": "A B"}
    assert client.post("/v1/auth/signup", json=body).status_code == 201
    assert client.post("/v1/auth/signup", json=body).json()["error"]["code"] == "EMAIL_TAKEN"
    client.post("/v1/auth/logout")
    bad = client.post("/v1/auth/login", json={**body, "password": "wrong-password"})
    assert bad.status_code == 401
    assert client.post("/v1/auth/login", json=body).status_code == 200
    assert client.get("/v1/me").json()["email"] == "a@b.co"


def test_expired_access_is_refreshed_silently(authed):
    authed.cookies.delete("seam_access")
    assert authed.get("/v1/me").status_code == 200


def test_upload_errors_are_typed(authed):
    r = authed.post("/v1/resumes", files={"file": ("x.png", b"\x89PNG\r\n\x1a\n" + b"0" * 50, "image/png")})
    assert r.status_code == 415 and r.json()["error"]["code"] == "FILE_TYPE_UNSUPPORTED"
    r = authed.post(
        "/v1/resumes", files={"file": ("big.pdf", b"%PDF-" + b"0" * (6 * 1024 * 1024), "application/pdf")}
    )
    assert r.status_code == 413 and r.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_jd_validation(authed, resume_pdf):
    assert (
        authed.post("/v1/jobs/analyze", json={"text": "too short"}).json()["error"]["code"] == "JD_TOO_SHORT"
    )
    resume_text = (
        "AARAV MEHTA Education B.Tech CGPA 8.4 References available. Work Experience Professional Experience. "
        "Objective: a frontend role. " * 6
    )
    r = authed.post("/v1/jobs/analyze", json={"text": resume_text})
    assert r.json()["error"]["code"] == "JD_NOT_A_JD"


def test_full_tailoring_flow(authed, resume_pdf, jd_text):
    r = _upload(authed, resume_pdf)
    assert r.status_code == 201, r.text
    resume = r.json()
    assert resume["filename"] == "aarav.pdf" and resume["parse_path"] == "text"
    assert resume["prefill"]["full_name"] == "Aarav Mehta"
    assert _upload(authed, resume_pdf).json()["id"] == resume["id"]  # content-addressed re-upload

    jd = authed.post("/v1/jobs/analyze", json={"text": jd_text})
    assert jd.status_code == 200, jd.text
    jd = jd.json()
    assert jd["title"].startswith("Senior Frontend") and len(jd["analysis"]["must_haves"]) >= 4
    again = authed.post("/v1/jobs/analyze", json={"text": jd_text}).json()
    assert again["id"] == jd["id"]  # cached by hash

    created = authed.post(
        "/v1/tailor-sessions",
        json={
            "resume_id": resume["id"],
            "jd_id": jd["id"],
            "sections": ["summary", "skills", "experience"],
            "intensity": "balanced",
        },
    )
    assert created.status_code == 202
    sid = created.json()["id"]

    events = _sse(authed, f"/v1/tailor-sessions/{sid}/stream")
    names = [n for n, _ in events]
    assert names[0] == "stage" and names[-1] == "done"
    assert "suggestion" in names and "score" in names
    suggestions = [d for n, d in events if n == "suggestion"]
    ops = {s["op"] for s in suggestions}
    assert "reorder" in ops and "add_skill" in ops

    # a reconnect after completion replays from the database
    replay = _sse(authed, f"/v1/tailor-sessions/{sid}/stream")
    assert [d["id"] for n, d in replay if n == "suggestion"] == [s["id"] for s in suggestions]

    session = authed.get(f"/v1/tailor-sessions/{sid}").json()
    assert session["status"] == "ready" and session["score_before"]["total"] >= 0
    assert session["fit"]["items"]

    decisions = [
        {"id": s["id"], "status": "rejected" if s["requires_confirmation"] else "accepted"}
        for s in session["suggestions"]
    ]
    assert (
        authed.patch(f"/v1/tailor-sessions/{sid}/suggestions", json={"decisions": decisions}).status_code
        == 204
    )

    fin = authed.post(f"/v1/tailor-sessions/{sid}/finalize")
    assert fin.status_code == 200, fin.text
    vid = fin.json()["version_id"]
    assert authed.post(f"/v1/tailor-sessions/{sid}/finalize").json()["version_id"] == vid  # idempotent

    version = authed.get(f"/v1/versions/{vid}").json()
    assert version["ats"]["total"] > 0 and version["match_score"] is not None

    assert "OTHER" not in authed.get(f"/v1/versions/{vid}/export", params={"format": "txt"}).text
    for fmt, sig in (("pdf", b"%PDF-"), ("docx", b"PK"), ("txt", b"Aarav Mehta")):
        out = authed.get(f"/v1/versions/{vid}/export", params={"format": fmt, "template": "classic"})
        assert out.status_code == 200 and out.content.startswith(sig), fmt
    assert authed.get(f"/v1/versions/{vid}/export", params={"format": "exe"}).status_code == 400

    cmp = authed.get(f"/v1/versions/{vid}/compare/{vid}").json()
    assert cmp["changes"] == []

    assert authed.get("/v1/applications").status_code == 404  # the tracker is gone

    feed = authed.get("/v1/activity").json()["items"]
    assert feed[0]["created_at"].endswith(("Z", "+00:00")), "timestamps must be explicit UTC"
    kinds = {e["type"] for e in feed}
    assert {
        "resume.uploaded",
        "jd.analyzed",
        "tailor.completed",
        "review.finalized",
        "version.exported",
    } <= kinds

    letter = []
    with authed.stream("POST", f"/v1/versions/{vid}/cover-letter", json={"tone": "warm"}) as r:
        for line in r.iter_lines():
            if line.startswith("data: ") and "text" in line:
                letter.append(json.loads(line[6:])["text"])
    assert "Dear Hiring Team" in "".join(letter)
    assert len(authed.get(f"/v1/versions/{vid}/cover-letters").json()) == 1

    prep = authed.post(f"/v1/versions/{vid}/interview-prep")
    assert prep.status_code == 200 and prep.json()["questions"]


def test_data_is_isolated_between_users(client, resume_pdf):
    client.post("/v1/auth/signup", json={"email": "u1@x.co", "password": "longenough", "full_name": "U1"})
    rid = _upload(client, resume_pdf).json()["id"]
    client.post("/v1/auth/logout")
    client.cookies.clear()
    client.post("/v1/auth/signup", json={"email": "u2@x.co", "password": "longenough", "full_name": "U2"})
    assert client.get(f"/v1/resumes/{rid}").status_code == 404


def test_profile_ctc_is_encrypted_at_rest(authed):
    body = {"full_name": "Aarav", "current_ctc": 1800000, "expected_ctc": 2500000, "ctc_currency": "INR"}
    assert authed.put("/v1/me/profile", json=body).json()["expected_ctc"] == 2500000
    assert authed.get("/v1/me/profile").json()["current_ctc"] == 1800000


def test_unreadable_pdf_gets_a_clear_error(authed):
    r = _upload(authed, text_to_pdf("hi"))
    assert r.status_code in (400, 422) and r.json()["error"]["code"] == "RESUME_UNREADABLE"


# --- no AI key: the first-run experience -------------------------------------------------------


def _live_client(settings, **overrides):
    from fastapi.testclient import TestClient

    from app.main import create_app

    live = settings.model_copy(
        update={"ai_mode": "live", "openai_api_key": "", "typesafe_api_key": "", **overrides}
    )
    return TestClient(create_app(live))


def _real_world_pdf() -> bytes:
    from tests.conftest import fixture_text

    return text_to_pdf(fixture_text("resumes/two_digit_years.txt"), size=5.5, max_chars=260)


def test_upload_and_autofill_work_without_an_ai_key(settings):
    with _live_client(settings) as c:
        c.post("/v1/auth/signup", json={"email": "j@x.co", "password": "longenough", "full_name": "Jane"})
        r = c.post("/v1/resumes", files={"file": ("jane.pdf", _real_world_pdf(), "application/pdf")})
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["parse_path"] == "basic"  # read by the built-in parser, no model involved
        pre = body["prefill"]
        assert pre["full_name"] == "Jane Doe" and pre["headline"] == "Full Stack Developer"
        assert pre["phone"] == "+91 9000000001" and pre["location"] == "Pune, India"
        assert pre["current_company"] == "examplecorp.io"
        assert pre["current_title"] == "Founding Engineer"  # first of "A | B"
        assert pre["years_experience"] and pre["years_experience"] >= 4
        exp = next(s for s in body["document"]["sections"] if s["type"] == "experience")
        assert [i["company"] for i in exp["items"]] == ["examplecorp.io", "Acme Technology"]


def test_ai_steps_say_why_they_cannot_run(settings, jd_text):
    with _live_client(settings) as c:
        c.post("/v1/auth/signup", json={"email": "j@x.co", "password": "longenough", "full_name": "Jane"})
        r = c.post("/v1/jobs/analyze", json={"text": jd_text})
        err = r.json()["error"]
        assert r.status_code == 503 and err["code"] == "LLM_NOT_CONFIGURED"
        assert "OPENAI_API_KEY" in err["hint"] and err["retryable"] is False


class _GeneratorDown:
    """A generator whose every call fails the way an OpenAI outage does."""

    breaker_open = False

    async def structured(self, *a, **k):
        raise LLM_UNAVAILABLE


def test_upload_survives_an_ai_outage(settings):
    with _live_client(settings, openai_api_key="sk-test") as c:
        c.app.state.ai.generate = _GeneratorDown()  # type: ignore[attr-defined]
        c.post("/v1/auth/signup", json={"email": "j@x.co", "password": "longenough", "full_name": "Jane"})
        r = c.post("/v1/resumes", files={"file": ("jane.pdf", _real_world_pdf(), "application/pdf")})
        assert r.status_code == 201 and r.json()["parse_path"] == "basic"


# --- start from raw job text: the analysis streams inside the session ---------------------------


def _start(client, resume_id, **jd):
    return client.post(
        "/v1/tailor-sessions",
        json={"resume_id": resume_id, "sections": ["summary", "skills", "experience"], **jd},
    )


def test_session_starts_from_pasted_text_and_streams_the_analysis(authed, resume_pdf, jd_text):
    rid = _upload(authed, resume_pdf).json()["id"]
    created = _start(authed, rid, jd_text=jd_text)
    assert created.status_code == 202, created.text  # returns immediately; no analysis blocked it
    sid = created.json()["id"]

    events = _sse(authed, f"/v1/tailor-sessions/{sid}/stream")
    names = [n for n, _ in events]
    # reading the job comes first, then the analysis, then suggestions stream in
    assert names[0] == "stage" and events[0][1]["stage"] == "reading"
    assert names.index("jd") < names.index("suggestion") < names.index("done")
    jd_event = next(d for n, d in events if n == "jd")
    assert jd_event["title"].startswith("Senior Frontend") and jd_event["analysis"]["must_haves"]
    assert jd_event["fit"]["items"]

    # the plan says how many pieces each section has, and every piece reports back when it finishes,
    # which is what lets the client tick sections off one by one
    plan = next(d["tasks"] for n, d in events if n == "stage" and "tasks" in d)
    finished = [d["section"] for n, d in events if n == "stage" and "section" in d]
    assert plan and all(finished.count(section) == pieces for section, pieces in plan.items())

    # a reconnect shortly after replays the live log; once that is gone it replays from the database
    live = [n for n, _ in _sse(authed, f"/v1/tailor-sessions/{sid}/stream")]
    assert live == names
    authed.app.state.broker._streams.clear()  # type: ignore[attr-defined]
    stored = [n for n, _ in _sse(authed, f"/v1/tailor-sessions/{sid}/stream")]
    assert stored[0] == "jd" and stored[-1] == "done" and "suggestion" in stored

    session = authed.get(f"/v1/tailor-sessions/{sid}").json()
    assert session["status"] == "ready" and session["jd"]["title"].startswith("Senior Frontend")
    # the conversation shows what the user sent, including after a reload
    assert session["jd_text"] == jd_text.strip() and session["jd_url"] is None


def test_same_pasted_text_reuses_the_cached_analysis(authed, resume_pdf, jd_text):
    rid = _upload(authed, resume_pdf).json()["id"]
    first = authed.get(f"/v1/tailor-sessions/{_start(authed, rid, jd_text=jd_text).json()['id']}").json()
    second = authed.get(
        f"/v1/tailor-sessions/{_start(authed, rid, jd_text=jd_text + '  ').json()['id']}"
    ).json()
    assert first["jd_id"] == second["jd_id"]


def test_bad_job_text_is_rejected_instantly(authed, resume_pdf):
    rid = _upload(authed, resume_pdf).json()["id"]
    short = _start(authed, rid, jd_text="too short")
    assert short.status_code == 400 and short.json()["error"]["code"] == "JD_TOO_SHORT"
    long = _start(authed, rid, jd_text="Senior engineer. " * 2000)  # ~34k chars, over the cap
    assert long.status_code == 413 and long.json()["error"]["code"] == "JD_TOO_LONG"
    assert _start(authed, rid).status_code == 422  # a job source is required
    assert _start(authed, rid, jd_text="x" * 400, jd_url="https://x.co").status_code == 422  # but only one


def test_a_resume_pasted_as_the_job_fails_in_the_stream_with_a_clear_error(authed, resume_pdf):
    rid = _upload(authed, resume_pdf).json()["id"]
    not_a_jd = (
        "AARAV MEHTA Education B.Tech CGPA 8.4 References available. Work Experience Professional Experience. "
        "Objective: a frontend role. "
    ) * 6
    sid = _start(authed, rid, jd_text=not_a_jd).json()["id"]
    events = _sse(authed, f"/v1/tailor-sessions/{sid}/stream")
    assert events[-1][0] == "error" and events[-1][1]["code"] == "JD_NOT_A_JD"
    session = authed.get(f"/v1/tailor-sessions/{sid}").json()
    assert session["status"] == "failed" and session["error_code"] == "JD_NOT_A_JD"


# --- expired sessions -----------------------------------------------------------------------------


def test_a_dead_session_clears_its_cookies_so_the_client_can_sign_in_again(authed):
    authed.post("/v1/auth/logout")  # revokes the refresh token server-side
    stale = authed.cookies  # a client still holding the old cookies
    authed.cookies.set("seam_access", "not-a-valid-jwt")
    authed.cookies.set("seam_refresh", "revoked-or-unknown-token")
    r = authed.get("/v1/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHORIZED"
    cleared = r.headers.get_list("set-cookie")
    assert any(c.startswith("seam_access=") and "Max-Age=0" in c for c in cleared)
    assert any(c.startswith("seam_refresh=") and "Max-Age=0" in c for c in cleared)
    assert stale is not None


def test_requests_without_any_cookie_are_just_401(client):
    r = client.get("/v1/me")
    assert r.status_code == 401 and not r.headers.get_list("set-cookie")
