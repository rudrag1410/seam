"""Every closed set of values the API speaks, in one place.

These are string enums, so they compare equal to their values, serialise as plain strings, and
reach the generated TypeScript client as real enums. Use the members, never the bare strings."""

from enum import StrEnum
from typing import Any

from pydantic import GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema


def _pascal(name: str) -> str:
    return "".join(part.capitalize() for part in name.split("_"))


class ApiEnum(StrEnum):
    """A string enum that reaches the generated TypeScript client as a real `enum`, with members in
    PascalCase (`Decision.Pending`). The OpenAPI document carries the member names in the
    `x-enum-varnames` extension, which the client generator reads."""

    @classmethod
    def __get_pydantic_json_schema__(
        cls, schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        json_schema: dict[str, Any] = handler(schema)
        resolved = handler.resolve_ref_schema(json_schema)
        resolved["x-enum-varnames"] = [_pascal(name) for name in cls.__members__]
        return json_schema


class SessionStatus(ApiEnum):
    QUEUED = "queued"
    RUNNING = "running"
    READY = "ready"
    FAILED = "failed"
    FINALIZED = "finalized"


ACTIVE_STATUSES = frozenset({SessionStatus.QUEUED, SessionStatus.RUNNING})
REVIEWABLE_STATUSES = frozenset({SessionStatus.READY, SessionStatus.FINALIZED})


class Decision(ApiEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EDITED = "edited"


KEPT_DECISIONS = frozenset({Decision.ACCEPTED, Decision.EDITED})


class OpName(ApiEnum):
    REPLACE_TEXT = "replace_text"
    REORDER = "reorder"
    INSERT_BULLET = "insert_bullet"
    REMOVE_BULLET = "remove_bullet"
    ADD_SKILL = "add_skill"
    REMOVE_SKILL = "remove_skill"
    REWRITE_SUMMARY = "rewrite_summary"


TEXT_OPS = frozenset({OpName.REPLACE_TEXT, OpName.REWRITE_SUMMARY, OpName.INSERT_BULLET})
SKILL_OPS = frozenset({OpName.ADD_SKILL, OpName.REMOVE_SKILL})


class SectionName(ApiEnum):
    """The sections a user can ask to have tailored."""

    SUMMARY = "summary"
    SKILLS = "skills"
    EXPERIENCE = "experience"
    PROJECTS = "projects"


class SectionType(StrEnum):
    """Every kind of section a resume can hold."""

    SUMMARY = "summary"
    SKILLS = "skills"
    EXPERIENCE = "experience"
    PROJECTS = "projects"
    EDUCATION = "education"
    OTHER = "other"


class Intensity(ApiEnum):
    LIGHT = "light"
    BALANCED = "balanced"
    BOLD = "bold"


class StreamEvent(ApiEnum):
    """The events a tailoring run publishes, in the order they first appear."""

    STAGE = "stage"
    JD = "jd"
    SCORE = "score"
    SUGGESTION = "suggestion"
    WARNING = "warning"
    DONE = "done"
    ERROR = "error"
    CHUNK = "chunk"


class Stage(ApiEnum):
    READING = "reading"
    ANALYZING = "analyzing"
    TAILORING = "tailoring"


class WarningCode(ApiEnum):
    JD_NOTICE = "JD_NOTICE"
    PARTIAL = "PARTIAL"
    DEGRADED_CHECKS = "DEGRADED_CHECKS"


class WorkMode(ApiEnum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    UNSPECIFIED = "unspecified"


class EmploymentType(ApiEnum):
    FULL_TIME = "full_time"
    CONTRACT = "contract"
    PART_TIME = "part_time"
    INTERNSHIP = "internship"
    FREELANCE = "freelance"
    UNSPECIFIED = "unspecified"


class Seniority(ApiEnum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"
    LEAD = "lead"
    UNSPECIFIED = "unspecified"


SENIORITY_LADDER = [Seniority.JUNIOR, Seniority.MID, Seniority.SENIOR, Seniority.STAFF, Seniority.LEAD]


class SalaryPeriod(ApiEnum):
    YEAR = "year"
    MONTH = "month"


class FitKey(ApiEnum):
    WORK_MODE = "work_mode"
    LOCATION = "location"
    JOB_TYPE = "job_type"
    COMPENSATION = "compensation"
    SENIORITY = "seniority"


class FitStatus(ApiEnum):
    OK = "ok"
    WARN = "warn"
    UNCLEAR = "unclear"


class ChangeKind(ApiEnum):
    ADDED = "added"
    REMOVED = "removed"
    CHANGED = "changed"
    MOVED = "moved"


class Tone(ApiEnum):
    PROFESSIONAL = "professional"
    WARM = "warm"
    DIRECT = "direct"


class LetterLength(ApiEnum):
    SHORT = "short"
    STANDARD = "standard"


class Verdict(ApiEnum):
    """How well the resume shows a requirement."""

    DEMONSTRATED = "demonstrated"
    LISTED = "listed"
    MISSING = "missing"
    UNSURE = "unsure"


class BlockKind(StrEnum):
    """The kinds of line an exported resume is made of."""

    NAME = "name"
    CONTACT = "contact"
    HEADING = "heading"
    ROLE = "role"
    LINE = "line"
    BULLET = "bullet"


class ExportFormat(ApiEnum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"


class ExportTemplate(ApiEnum):
    CLASSIC = "classic"
    MODERN = "modern"


class Facet(StrEnum):
    """The parts of a job posting that are read as a fixed choice."""

    WORK_MODE = "work_mode"
    EMPLOYMENT_TYPE = "employment_type"
    SENIORITY = "seniority"


class DocumentKind(StrEnum):
    """What a pasted block of text turned out to be."""

    JOB_DESCRIPTION = "job_description"
    RESUME = "resume"
    OTHER = "other"


class ActivityGroup(ApiEnum):
    """The first part of an activity kind, for filtering the feed ("resume" matches "resume.uploaded")."""

    RESUME = "resume"
    JD = "jd"
    TAILOR = "tailor"
    REVIEW = "review"
    VERSION = "version"
    COVER_LETTER = "cover_letter"
    PROFILE = "profile"


class ActivityKind(ApiEnum):
    """What an entry in the activity feed records."""

    RESUME_UPLOADED = "resume.uploaded"
    JD_ANALYZED = "jd.analyzed"
    TAILOR_COMPLETED = "tailor.completed"
    REVIEW_FINALIZED = "review.finalized"
    VERSION_EXPORTED = "version.exported"
    COVER_LETTER_GENERATED = "cover_letter.generated"
    PROFILE_UPDATED = "profile.updated"

    @property
    def group(self) -> ActivityGroup:
        return ActivityGroup(self.value.split(".", 1)[0])


class EntityType(ApiEnum):
    """The kind of thing an activity entry points at."""

    SESSION = "session"
    VERSION = "version"
    RESUME = "resume"
    JD = "jd"


class ParsePath(ApiEnum):
    """How a resume was read: its text, its page images, or the built-in parser without AI."""

    TEXT = "text"
    VISION = "vision"
    BASIC = "basic"


class FileKind(StrEnum):
    """The kinds of resume file that can be uploaded."""

    PDF = "pdf"
    DOCX = "docx"
