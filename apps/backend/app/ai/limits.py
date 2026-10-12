"""Input capping. Tokens are estimated from characters (about four per token), which is close
enough to bound cost without shipping a tokenizer."""

CHARS_PER_TOKEN = 4


def approx_tokens(text: str) -> int:
    return (len(text) + CHARS_PER_TOKEN - 1) // CHARS_PER_TOKEN


def clip(text: str, max_tokens: int) -> str:
    """Cut `text` to roughly `max_tokens`, at a word boundary, and say so."""
    limit = max_tokens * CHARS_PER_TOKEN
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(None, 1)[0] + "\n[truncated]"
