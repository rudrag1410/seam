"""Choose between the text path and the vision path for structuring a resume."""

import re

from app.ai.decisions.reading_order import reading_order_battery
from app.ai.gateway import AIGateway
from app.schemas.enums import ParsePath

MIN_CHARS_PER_PAGE = 200
_LIGATURES = re.compile("[ﬀ-ﬆ�]")


def heuristics_say_vision(text: str, pages: int) -> bool:
    if len(text) / max(pages, 1) < MIN_CHARS_PER_PAGE:
        return True  # probably scanned
    lines = [ln for ln in text.split("\n") if ln.strip()]
    if not lines:
        return True
    tiny = sum(1 for ln in lines if len(ln.strip()) == 1) / len(lines)
    broken = len(_LIGATURES.findall(text)) / max(len(text), 1)
    return tiny > 0.3 or broken > 0.01


async def choose_path(ai: AIGateway, text: str, pages: int) -> ParsePath:
    if heuristics_say_vision(text, pages):
        return ParsePath.VISION
    answers = await ai.jev.ask(text[:2000], reading_order_battery())
    if answers is not None and answers.noul("coherent") < 0.5:
        return ParsePath.VISION
    return ParsePath.TEXT
