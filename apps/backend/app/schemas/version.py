from datetime import datetime

from pydantic import Field

from app.schemas.base import ApiModel
from app.schemas.enums import ChangeKind, LetterLength, Tone
from app.schemas.resume_ast import Resume
from app.schemas.scores import AtsScore, MatchScore


class VersionOut(ApiModel):
    id: str
    label: str
    parent_version_id: str | None
    session_id: str | None
    jd_title: str | None
    jd_company: str | None
    match_score: float | None
    ats_score: float | None
    created_at: datetime


class VersionDetail(VersionOut):
    document: Resume
    ats: AtsScore | None = None
    match: MatchScore | None = None


class NodeChange(ApiModel):
    node_id: str
    kind: ChangeKind
    section: str
    before: str | None = None
    after: str | None = None


class VersionCompare(ApiModel):
    a: VersionDetail
    b: VersionDetail
    changes: list[NodeChange]
    match_delta: float | None
    ats_delta: float | None


class CoverLetterIn(ApiModel):
    tone: Tone = Tone.PROFESSIONAL
    length: LetterLength = LetterLength.STANDARD
    include_notice_period: bool = False


class CoverLetterOut(ApiModel):
    id: str
    version_id: str
    tone: str
    length: str
    body: str
    created_at: datetime


class InterviewQuestion(ApiModel):
    question: str
    why: str
    talking_points: list[str] = Field(default_factory=list)


class InterviewPrep(ApiModel):
    questions: list[InterviewQuestion]
