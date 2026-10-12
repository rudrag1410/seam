"""House rule: no function is defined inside another function, and that includes lambdas.
Helpers live at module level or as methods, so each one can be read, named and tested alone."""

import ast
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
SOURCES = [p for d in ("app", "tests", "evals", "alembic") for p in sorted((BACKEND / d).rglob("*.py"))]
FUNCTIONS = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)


def _nested(node: ast.AST, inside: str | None, found: list[str]) -> None:
    for child in ast.iter_child_nodes(node):
        if isinstance(child, FUNCTIONS):
            name = getattr(child, "name", "lambda")
            if inside is not None:
                found.append(f"line {child.lineno}: {name} inside {inside}")
            _nested(child, name, found)
        elif isinstance(child, ast.ClassDef):
            # a class in a function hides functions just as well; methods of a module-level class are fine
            if inside is not None:
                found.append(f"line {child.lineno}: class {child.name} inside {inside}")
            _nested(child, inside, found)
        else:
            _nested(child, inside, found)


def test_no_function_is_defined_inside_another():
    problems: list[str] = []
    for path in SOURCES:
        found: list[str] = []
        _nested(ast.parse(path.read_text()), None, found)
        problems += [f"{path.relative_to(BACKEND)} {f}" for f in found]
    assert not problems, "\n".join(problems)
