import json

import pytest

from app.ai.gateway.json_stream import ArrayObjectScanner
from app.ai.gateway.openai_client import OpenAIGenerator
from app.ai.gateway.router import Route, Task, route_for
from app.ai.limits import approx_tokens, clip
from app.core.config import Settings

DOC = {
    "suggestions": [
        {
            "op": "replace_text",
            "target": "exp_1.b1",
            "after": 'He said "go {now}" \\ ok',
            "evidence": ["a", "b"],
        },
        {"op": "reorder", "target": "exp_1", "order": ["x", "y"], "nested": {"k": [1, {"z": 2}]}},
        {"op": "add_skill", "target": "sk_1", "value": "GraphQL"},
    ]
}


def feed_in_chunks(text: str, size: int) -> list[dict]:
    scanner, out = ArrayObjectScanner(), []
    for i in range(0, len(text), size):
        out += scanner.feed(text[i : i + size])
    return out


@pytest.mark.parametrize("size", [1, 2, 3, 7, 50, 10_000])
def test_scanner_yields_each_object_regardless_of_chunking(size):
    # braces, quotes and backslashes inside strings must not confuse it, even when split mid-token
    assert feed_in_chunks(json.dumps(DOC), size) == DOC["suggestions"]


def test_scanner_emits_an_object_as_soon_as_it_closes():
    scanner = ArrayObjectScanner()
    text = json.dumps(DOC)
    marker = '"evidence": ["a", "b"]'
    first_end = text.index(marker) + len(marker) + 1  # the first suggestion's closing brace
    assert scanner.feed(text[: first_end - 3]) == []  # still writing the first suggestion
    assert scanner.feed(text[first_end - 3 : first_end]) == [DOC["suggestions"][0]]  # the moment it closes


def test_scanner_keeps_what_arrived_when_the_stream_is_cut_off():
    text = json.dumps(DOC)
    cut = text.index('"add_skill"')  # dies halfway through the third suggestion
    assert feed_in_chunks(text[:cut], 5) == DOC["suggestions"][:2]


def test_scanner_skips_a_malformed_element_and_continues():
    out = feed_in_chunks('{"suggestions": [{"op": bad}, {"op": "ok"}]}', 4)
    assert out == [{"op": "ok"}]


def test_clip_caps_input_at_a_word_boundary():
    text = "word " * 1000
    clipped = clip(text, 100)
    assert approx_tokens(clipped) <= 110 and clipped.endswith("[truncated]")
    assert clip("short", 100) == "short"


def test_output_caps_and_reasoning_effort_are_applied():
    s = Settings(ai_mode="live", openai_api_key="k", llm_max_output_tokens=1000, llm_reasoning_effort="low")
    gen = OpenAIGenerator(s)
    route = Route("m", None, 10, 4000)
    # the global ceiling wins over a larger per-task budget
    assert gen._limits(route, "gpt-5-mini")["max_completion_tokens"] == 1000
    assert gen._limits(route, "gpt-5-mini")["reasoning_effort"] == "low"
    assert gen._limits(route, "o3-mini")["reasoning_effort"] == "low"
    # non-reasoning models never get the parameter (they would reject it)
    assert "reasoning_effort" not in gen._limits(route, "gpt-4o-mini")
    assert "reasoning_effort" not in OpenAIGenerator(
        s.model_copy(update={"llm_reasoning_effort": ""})
    )._limits(route, "gpt-5")


def test_every_task_has_a_bounded_output_budget():
    s = Settings(ai_mode="live")
    for task in Task:
        assert 0 < route_for(task, s).max_output <= s.llm_max_output_tokens
