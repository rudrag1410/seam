from pydantic import BaseModel

from app.core.errors import ErrorCode
from app.schemas.base import ApiModel
from app.schemas.enums import SectionName, Stage, StreamEvent, WarningCode
from app.schemas.jd import FitCheck, JDAnalysis
from app.schemas.scores import MatchScore
from app.schemas.suggestion import SuggestionOut


class StageData(ApiModel):
    stage: Stage
    progress: float
    section: SectionName | None = None
    tasks: dict[SectionName, int] | None = None


class JobData(ApiModel):
    title: str
    company: str
    analysis: JDAnalysis
    fit: FitCheck


class ScoreData(ApiModel):
    before: MatchScore
    projected: MatchScore | None = None


class WarningData(ApiModel):
    code: WarningCode
    message: str


class DoneData(ApiModel):
    count: int
    degraded: bool
    duration_ms: int | None = None


class ErrorData(ApiModel):
    code: ErrorCode
    message: str
    hint: str | None = None
    retryable: bool = False


class ChunkData(ApiModel):
    text: str


class LetterSavedData(ApiModel):
    id: str


TAILOR_EVENTS: dict[StreamEvent, type[BaseModel]] = {
    StreamEvent.STAGE: StageData,
    StreamEvent.JD: JobData,
    StreamEvent.SCORE: ScoreData,
    StreamEvent.SUGGESTION: SuggestionOut,
    StreamEvent.WARNING: WarningData,
    StreamEvent.DONE: DoneData,
    StreamEvent.ERROR: ErrorData,
}


class TailorEvents(ApiModel):
    stage: StageData
    jd: JobData
    score: ScoreData
    suggestion: SuggestionOut
    warning: WarningData
    done: DoneData
    error: ErrorData


class ErrorBody(ApiModel):
    code: ErrorCode
    message: str
    hint: str | None = None
    retryable: bool = False


class ErrorEnvelope(ApiModel):
    error: ErrorBody


class LetterEvents(ApiModel):
    chunk: ChunkData
    done: LetterSavedData
    error: ErrorData
