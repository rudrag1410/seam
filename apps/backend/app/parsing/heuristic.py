import re

from app.schemas.parsed import (
    ParsedEducation,
    ParsedOther,
    ParsedProject,
    ParsedResume,
    ParsedRole,
    ParsedSkillGroup,
)
from app.schemas.resume_ast import Contact

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?:\+?\d[\d\s().-]{8,}\d)")
LINK = re.compile(r"(?:https?://)?(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com)/[\w./-]+", re.I)
BULLET = re.compile(r"^\s*[•\-*–·▪●◦]\s*")
TECH = re.compile(r"^\s*(?:[•\-*–·▪●◦]\s*)?tech(?:nolog(?:y|ies))?\s*stack\s*:", re.I)

_MONTH = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?"
_YEAR = r"(?:['’]\d{2}|\d{4})"
DATE = rf"(?:{_MONTH}\s*)?{_YEAR}"
RANGE = re.compile(rf"({DATE})\s*(?:-|–|—|to)\s*({DATE}|present|current|now)", re.I)
_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

HEADINGS = {
    "summary": r"(professional |career )?(summary|profile|objective)|about( me)?",
    "experience": r"(work |professional |relevant )?experience|employment( history)?|work history",
    "education": r"education|academic.*",
    "skills": r"(technical |key |core )?skills|technologies|tech stack",
    "projects": r"(personal |side |selected |key )?projects",
}
_DEGREE = re.compile(
    r"bachelor|master|b\.?\s?tech|m\.?\s?tech|\bb\.?e\b|\bm\.?e\b|\bb\.?sc|\bm\.?sc|\bmba\b|\bbca\b|\bmca\b|ph\.?d|diploma",
    re.I,
)
_INSTITUTION = re.compile(
    r"univers|institut|college|school|academy|polytechnic|\biit\b|\bnit\b|\biiit\b", re.I
)
_TITLE = re.compile(
    r"engineer|developer|manager|designer|analyst|lead|intern|architect|consultant|director|scientist|"
    r"specialist|officer|head|sde|founder|associate|administrator|programmer|tester|qa\b",
    re.I,
)


def _heading_kind(line: str) -> str | None:
    clean = line.strip().rstrip(":").strip()
    if not clean or len(clean) > 40 or BULLET.match(line):
        return None
    for kind, pattern in HEADINGS.items():
        if re.fullmatch(pattern, clean, re.I):
            return kind
    if clean.isupper() and 2 < len(clean) < 30 and not re.search(r"\d", clean):
        return "other"
    return None


def _norm_date(raw: str) -> str:
    if re.fullmatch(r"present|current|now", raw.strip(), re.I):
        return "present"
    m = re.search(rf"({_MONTH})?\s*['’]?(\d{{2,4}})", raw, re.I)
    if not m:
        return raw.strip()
    year = m.group(2)
    if len(year) == 2:
        year = ("20" if int(year) < 70 else "19") + year
    if m.group(1):
        return f"{year}-{_MONTHS.index(m.group(1)[:3].lower()) + 1:02d}"
    return year


def _looks_like_title(s: str) -> bool:
    return bool(_TITLE.search(s))


def _split_header(text: str) -> tuple[str, str]:
    text = text.strip(" ,|-–—·")
    for sep in (" — ", " – ", " | ", " - ", " at ", ", "):
        if sep in text:
            a, b = text.split(sep, 1)
            return a.strip(), b.strip()
    return text, ""


def _split_gap(text: str) -> tuple[str, str]:
    parts = re.split(r"\s{2,}|\s[|·•]\s", text.strip(), maxsplit=1)
    return parts[0].strip(), (parts[1].strip() if len(parts) > 1 else "")


def _norm_link(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", url.strip()).rstrip("/")


def merge_links(*groups: list[str]) -> list[str]:
    seen: dict[str, str] = {}
    for url in (u for g in groups for u in g):
        key = _norm_link(url).lower()
        if key and key not in seen:
            seen[key] = _norm_link(url)
    return list(seen.values())


def parse_contact(lines: list[str]) -> Contact:
    head = "\n".join(lines[:8])
    name_idx = next(
        (
            i
            for i, ln in enumerate(lines[:4])
            if ln.strip() and not EMAIL.search(ln) and not re.search(r"\d{4}", ln)
        ),
        0,
    )
    name = lines[name_idx].strip() if lines else ""
    email = EMAIL.search(head)
    phone = PHONE.search(head)
    links = [m.group().rstrip(".,") for m in LINK.finditer(head)]
    location = None
    for ln in lines[:6]:
        for part in re.split(r"\s*[|•·]\s*", ln):
            if re.fullmatch(r"[A-Z][A-Za-z .]+,\s*[A-Z][A-Za-z .]+", part.strip()):
                location = part.strip()
                break
    headline = None
    nxt = lines[name_idx + 1].strip() if len(lines) > name_idx + 1 else ""
    if nxt and len(nxt) < 70 and not re.search(r"[@\d•|]", nxt) and not _heading_kind(nxt):
        headline = nxt
    return Contact(
        name=name.title() if name.isupper() else name,
        headline=headline,
        email=email.group() if email else None,
        phone=phone.group().strip() if phone else None,
        location=location,
        links=merge_links(links),
    )


def heuristic_parse(text: str, links: list[str] | None = None) -> ParsedResume:
    lines = [ln.rstrip() for ln in text.replace("\r", "").split("\n")]
    nonblank = [ln for ln in lines if ln.strip()]
    contact = parse_contact(nonblank)
    contact.links = merge_links(contact.links, links or [])

    blocks: list[tuple[str, str, list[str]]] = []
    current: tuple[str, str, list[str]] | None = None
    first = next((i for i, ln in enumerate(lines) if ln.strip()), 0)
    for i, ln in enumerate(lines):
        kind = None if i == first else _heading_kind(ln)
        if kind:
            current = (kind, ln.strip().rstrip(":"), [])
            blocks.append(current)
        elif current is not None and ln.strip():
            current[2].append(ln)

    result = ParsedResume(contact=contact)
    for kind, title, body in blocks:
        if kind == "summary":
            result.summary = " ".join(s.strip() for s in body)
        elif kind == "skills":
            result.skills = _parse_skills(body)
        elif kind == "experience":
            result.experience = _parse_roles(body)
        elif kind == "projects":
            result.projects = _parse_projects(body)
        elif kind == "education":
            result.education = _parse_education(body)
        else:
            result.other.append(
                ParsedOther(title=title.title(), lines=[BULLET.sub("", b).strip() for b in body])
            )
    return result


def _items(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"\s{2,}|[,;|•·]", text) if s.strip()]


def _parse_skills(body: list[str]) -> list[ParsedSkillGroup]:
    groups: list[ParsedSkillGroup] = []
    for ln in body:
        clean = BULLET.sub("", ln).strip()
        if re.match(r"^[A-Za-z][\w &/+-]{1,30}:\s", clean + " "):
            label, rest = clean.split(":", 1)
            groups.append(ParsedSkillGroup(label=label.strip(), items=_items(rest)))
        elif groups and groups[-1].label == "Skills":
            groups[-1].items += _items(clean)
        else:
            groups.append(ParsedSkillGroup(label="Skills", items=_items(clean)))
    return [g for g in groups if g.items]


def _flush(bullets: list[str], buf: list[str]) -> None:
    if buf:
        text = " ".join(buf).strip()
        bullets.append(re.sub(r"(\w)- (?=[a-z])", r"\1-", text))
        buf.clear()


def _is_continuation(line: str) -> bool:
    return line[:1].isspace() or line.lstrip()[:1].islower()


def _dated(line: str) -> re.Match[str] | None:
    if BULLET.match(line) or TECH.match(line):
        return None
    m = RANGE.search(line)
    return m if m and len(line[m.end() :].strip()) <= 12 and len(line) <= 200 else None


def _head_of(line: str, m: re.Match[str]) -> str:
    return (line[: m.start()] + " " + line[m.end() :]).strip(" |,-–—·")


def _is_title_above(line: str, following: str | None) -> bool:
    nxt = _dated(following) if following is not None else None
    return bool(
        nxt
        and not BULLET.match(line)
        and not TECH.match(line)
        and len(line.strip()) <= 80
        and not line.rstrip().endswith(".")
        and not _is_continuation(line)
        and _looks_like_title(line)
        and not _looks_like_title(_head_of(following or "", nxt))
    )


class _RoleParser:
    def __init__(self) -> None:
        self.roles: list[ParsedRole] = []
        self._role: ParsedRole | None = None
        self._head = ""
        self._resolved = True
        self._buf: list[str] = []
        self._title_above = ""

    def parse(self, body: list[str]) -> list[ParsedRole]:
        for i, line in enumerate(body):
            self._feed(line, body[i + 1] if i + 1 < len(body) else None)
        if self._role:
            _flush(self._role.bullets, self._buf)
        self._resolve_alone()
        return self.roles

    def _feed(self, line: str, following: str | None) -> None:
        m = _dated(line)
        if m:
            self._start_role(line, m)
        elif _is_title_above(line, following):
            self._title_above = line.strip()
        elif self._role is None:
            return
        elif BULLET.match(line) or TECH.match(line):
            self._resolve_alone()
            _flush(self._role.bullets, self._buf)
            self._buf.append(BULLET.sub("", line).strip())
        elif self._buf:
            self._buf.append(line.strip())
        elif not self._resolved:
            self._second_header_line(self._role, line)
        elif not self._role.location:
            self._role.location = line.strip()

    def _start_role(self, line: str, m: re.Match[str]) -> None:
        if self._role:
            _flush(self._role.bullets, self._buf)
        self._resolve_alone()
        self._head = _head_of(line, m)
        role = ParsedRole(start=_norm_date(m.group(1)), end=_norm_date(m.group(2)))
        self.roles.append(role)
        self._role, self._resolved = role, False
        if self._title_above:
            company, location = _split_header(self._head)
            role.title, role.company, role.location = self._title_above, company, location or None
            self._title_above, self._resolved = "", True

    def _resolve_alone(self) -> None:
        if self._role is None or self._resolved:
            return
        a, b = _split_header(self._head)
        if b and not _looks_like_title(b) and _looks_like_title(a):
            a, b = b, a
        if not b and _looks_like_title(a):
            a, b = "", a
        self._role.company, self._role.title = a, b
        self._resolved = True

    def _second_header_line(self, role: ParsedRole, line: str) -> None:
        left, right = _split_gap(line)
        a, b = _split_header(self._head)
        if b and (_looks_like_title(a) != _looks_like_title(b)):
            self._resolve_alone()
            role.location = line.strip()
            return
        if _looks_like_title(self._head):
            role.title, role.company, role.location = self._head, left, right or None
        else:
            role.company = self._head
            if _looks_like_title(left):
                role.title, role.location = left, right or None
            else:
                role.location = line.strip()
        self._resolved = True


def _parse_roles(body: list[str]) -> list[ParsedRole]:
    return _RoleParser().parse(body)


def _parse_projects(body: list[str]) -> list[ParsedProject]:
    projects: list[ParsedProject] = []
    proj: ParsedProject | None = None
    described = False
    buf: list[str] = []
    for ln in body:
        if BULLET.match(ln) or TECH.match(ln):
            if proj is None:
                proj = ParsedProject(name="Projects")
                projects.append(proj)
            _flush(proj.bullets, buf)
            buf.append(BULLET.sub("", ln).strip())
        elif buf and _is_continuation(ln):
            buf.append(ln.strip())
        elif proj is not None and not proj.bullets and not buf and not described:
            proj.subtitle = " · ".join(x for x in [proj.subtitle, ln.strip()] if x)
            described = True
        else:
            if proj:
                _flush(proj.bullets, buf)
            name, sub = _split_header(ln)
            proj = ParsedProject(name=name, subtitle=sub or None)
            projects.append(proj)
            described = False
    if proj:
        _flush(proj.bullets, buf)
    return projects


def _parse_education(body: list[str]) -> list[ParsedEducation]:
    items: list[ParsedEducation] = []
    for ln in body:
        m = RANGE.search(ln)
        year = re.search(r"\b(19|20)\d{2}\b", ln)
        text = (ln[: m.start()] + ln[m.end() :]).strip(" ,|-–—") if m else ln.strip()
        if _DEGREE.search(text):
            a, b = _split_header(text)
            if b and (_INSTITUTION.search(b) or (_INSTITUTION.search(a) and not _DEGREE.search(b))):
                degree, school = (a, b) if _DEGREE.search(a) else (b, a)
            else:
                degree, school = text, ""
            item = ParsedEducation(school=school, degree=degree)
            if m:
                item.start, item.end = _norm_date(m.group(1)), _norm_date(m.group(2))
            elif year:
                item.end = year.group()
            items.append(item)
        elif items and not items[-1].school:
            school, _ = _split_gap(text)
            items[-1].school = school
            if m:
                items[-1].start, items[-1].end = _norm_date(m.group(1)), _norm_date(m.group(2))
            elif year and not items[-1].end:
                items[-1].end = year.group()
        elif items:
            items[-1].details = (items[-1].details + " " if items[-1].details else "") + text
        else:
            school, _ = _split_gap(text)
            items.append(ParsedEducation(school=school))
    return items
