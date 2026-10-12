from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

_ROOT = Path(__file__).resolve().parent


@lru_cache
def _env(version: str) -> Environment:
    return Environment(
        loader=FileSystemLoader(_ROOT / version),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
        autoescape=False,
        keep_trailing_newline=False,
    )


def render(version: str, name: str, **context) -> str:
    return _env(version).get_template(f"{name}.j2").render(**context).strip()
