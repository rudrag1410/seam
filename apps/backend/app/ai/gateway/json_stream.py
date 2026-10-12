import json
from typing import Any


class ArrayObjectScanner:
    def __init__(self) -> None:
        self._depth = 0
        self._in_string = False
        self._escape = False
        self._buf: list[str] = []
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
                        continue
                    if isinstance(obj, dict):
                        out.append(obj)
        return out
