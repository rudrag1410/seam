from enum import StrEnum
from typing import Any

from pydantic import GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema


def _pascal(name: str) -> str:
    return "".join(part.capitalize() for part in name.split("_"))


class ApiEnum(StrEnum):
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
    SUMMARY = "summary"
    SKILLS = "skills"
    EXPERIENCE = "experience"
    PROJECTS = "projects"


class SectionType(StrEnum):
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
    DEMONSTRATED = "demonstrated"
    LISTED = "listed"
    MISSING = "missing"
    UNSURE = "unsure"


class BlockKind(StrEnum):
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
    WORK_MODE = "work_mode"
    EMPLOYMENT_TYPE = "employment_type"
    SENIORITY = "seniority"


class DocumentKind(StrEnum):
    JOB_DESCRIPTION = "job_description"
    RESUME = "resume"
    OTHER = "other"


class ActivityGroup(ApiEnum):
    RESUME = "resume"
    JD = "jd"
    TAILOR = "tailor"
    REVIEW = "review"
    VERSION = "version"
    COVER_LETTER = "cover_letter"
    PROFILE = "profile"


class ActivityKind(ApiEnum):
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
    SESSION = "session"
    VERSION = "version"
    RESUME = "resume"
    JD = "jd"


class ParsePath(ApiEnum):
    TEXT = "text"
    VISION = "vision"
    BASIC = "basic"


class FileKind(StrEnum):
    PDF = "pdf"
    DOCX = "docx"
