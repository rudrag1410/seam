import re

_INVISIBLE = re.compile(r"[​-‏‪-‮⁠-⁤﻿]|[\x00-\x08\x0b\x0c\x0e-\x1f]")
_SUSPICIOUS = re.compile(
    r"(ignore (all |any |the )?(previous|prior|above) (instructions|prompts?)"
    r"|disregard (all |any |the )?(previous|prior|above)"
    r"|you are (now )?(an? )?(ai|assistant|language model|llm)"
    r"|(system|developer) prompt"
    r"|as an ai\b"
    r"|rank (this|the) candidate"
    r"|(output|respond with|reply with) (only )?(the following|exactly))",
    re.I,
)


def sanitize(text: str) -> str:
    text = _INVISIBLE.sub("", text.replace("\r\n", "\n"))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def strip_suspicious_lines(text: str) -> tuple[str, list[str]]:
    kept: list[str] = []
    removed: list[str] = []
    for line in text.split("\n"):
        (removed if _SUSPICIOUS.search(line) else kept).append(line)
    return "\n".join(kept), removed


def looks_injected(text: str) -> bool:
    return bool(_SUSPICIOUS.search(text))
