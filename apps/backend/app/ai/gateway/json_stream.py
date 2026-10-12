"""Pull complete objects out of a JSON array while the model is still writing it.

The tailoring prompt asks for `{"suggestions": [ {...}, {...} ]}`. Waiting for the whole document
means waiting for the slowest suggestion. This scanner watches the character stream and hands over
each element of the array the moment its closing brace arrives, so the UI can show it right away.
"""

import json
from typing import Any


class ArrayObjectScanner:
    """Feed text chunks; `feed` returns the objects that completed inside them.

    Only objects that sit directly inside an array nested in the top-level object are emitted,
    which is exactly the shape of the suggestions list. Braces inside strings are ignored.
    """

    def __init__(self) -> None:
        self._depth = 0
        self._in_string = False
        self._escape = False
        self._buf: list[str] = []  # characters of the object currently being read
        self._capturing = False

    def feed(self, chunk: str) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for ch in chunk:
            if self._capturing:
                self._buf.append(ch)

            if self._in_string:
                if self._escape:
                    self._escape = False
                elif ch == "\\":
                    self._escape = True
                elif ch == '"':
                    self._in_string = False
                continue

            if ch == '"':
                self._in_string = True
            elif ch in "{[":
                # an object opening at depth 2 is an element of the array inside the top-level object
                if ch == "{" and self._depth == 2 and not self._capturing:
                    self._capturing = True
                    self._buf = ["{"]
                self._depth += 1
            elif ch in "}]":
                self._depth -= 1
                if self._capturing and ch == "}" and self._depth == 2:
                    self._capturing = False
                    try:
                        obj = json.loads("".join(self._buf))
                    except json.JSONDecodeError:
                        continue  # a malformed element is skipped, the rest of the stream is still good
                    if isinstance(obj, dict):
                        out.append(obj)
        return out
