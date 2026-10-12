"""Grounding and gating logic of the tailoring pipeline, with scripted OpenAI and Jev fakes."""

from types import SimpleNamespace

import pytest

from app.ai.gateway import AIGateway
from app.ai.pipelines.tailor import SectionTask, TailorInputs, _process_stream, build_tasks
from app.core.config import Settings
from app.parsing.heuristic import heuristic_parse
from app.parsing.ids import build_resume
from app.schemas.jd import JDAnalysis, Requirement
from app.schemas.suggestion import ModelSuggestion
from tests.conftest import fixture_text

SETTINGS = Settings(ai_mode="mock")


class ScriptedGenerator:
    breaker_open = False

    def __init__(self, suggestions: list[ModelSuggestion]) -> None:
        self._suggestions = suggestions

    async def stream_objects(self, task, *, system, user, schema, context=None):
        for s in self._suggestions:
            yield s.model_dump()


class ScriptedJev:
    enabled = True
    breaker_open = False

    def __init__(
        self, *, relation="supported", rel_conf=0.95, fit_o=1.0, fit_r=3.0, fit_conf=0.95, same=0.95
    ):
        self.cfg = (relation, rel_conf, fit_o, fit_r, fit_conf, same)

    async def ask(self, state, battery):
        relation, rel_conf, fit_o, fit_r, fit_conf, same = self.cfg
        raw = {}
        for key in state:
            raw[f"{key}__relation"] = SimpleNamespace(choice=relation, confidence=rel_conf)
            raw[f"{key}__fit_original"] = SimpleNamespace(score=fit_o, confidence=fit_conf)
            raw[f"{key}__fit_rewrite"] = SimpleNamespace(score=fit_r, confidence=fit_conf)
            raw[f"{key}__same_work"] = SimpleNamespace(noul=same)
        from app.ai.gateway.jev_client import Answers

        return Answers(raw)


class DownJev:
    enabled = True
    breaker_open = False

    async def ask(self, state, battery):
        return None


def _inputs() -> TailorInputs:
    resume = build_resume(heuristic_parse(fixture_text("resumes/aarav_mehta.txt"))).model_dump()
    jd = JDAnalysis(
        must_haves=[Requirement(id="req_1", text="Core Web Vitals", keywords=["Web Performance"])],
        keywords=["Web Performance", "React"],
    )
    return TailorInputs(resume=resume, jd=jd, sections=["experience"], intensity="balanced")


def _suggest(**kw) -> ModelSuggestion:
    base = dict(
        op="replace_text",
        target="exp_1.b1",
        evidence=["exp_1.b1"],
        addresses=["req_1"],
        rationale="Leads with the outcome.",
        after="Cut LCP by 38% by moving checkout to Next.js server-side rendering",
    )
    return ModelSuggestion(**{**base, **kw})


async def run(suggestions, jev):
    inp = _inputs()
    ai = AIGateway(generate=ScriptedGenerator(suggestions), jev=jev)  # type: ignore[arg-type]
    task = next(t for t in build_tasks(inp.resume, ["experience"]) if t.nodes[0]["id"] == "exp_1")
    results = [r async for r in _process_stream(ai, SETTINGS, inp, task)]
    return [item for item, _ in results], any(deg for _, deg in results)


async def test_supported_rewrite_passes_with_fit_based_delta():
    items, degraded = await run([_suggest()], ScriptedJev())
    assert not degraded and len(items) == 1
    it = items[0]
    assert not it["requires_confirmation"] and it["checks"]["relation"] == "supported"
    assert it["score_delta"] > 0  # (3.0 - 1.0) / 4 of a must-have's share


async def test_contradiction_is_dropped():
    items, _ = await run([_suggest()], ScriptedJev(relation="contradicts"))
    assert items == []


@pytest.mark.parametrize("relation", ["overstated", "unsupported"])
async def test_overstated_claims_need_confirmation(relation):
    items, _ = await run([_suggest()], ScriptedJev(relation=relation))
    assert items[0]["requires_confirmation"] and items[0]["flag_reason"]


async def test_low_confidence_is_never_trusted():
    items, _ = await run([_suggest()], ScriptedJev(rel_conf=0.2))
    assert items[0]["requires_confirmation"] and "verify" in items[0]["flag_reason"]


async def test_rewrite_that_does_not_beat_the_original_is_dropped():
    items, _ = await run([_suggest()], ScriptedJev(fit_o=3.0, fit_r=1.0))
    assert items == []


async def test_rewrite_describing_different_work_is_dropped():
    items, _ = await run([_suggest()], ScriptedJev(same=0.2))
    assert items == []


async def test_new_number_is_flagged_even_when_jev_is_down():
    items, degraded = await run([_suggest(after="Cut LCP by 90% via server-side rendering")], DownJev())
    assert degraded
    assert items[0]["requires_confirmation"] and "[X]" in items[0]["payload"]["after"]


async def test_unknown_and_out_of_scope_targets_are_dropped():
    items, _ = await run(
        [
            _suggest(target="exp_99.b1"),  # does not exist
            _suggest(target="exp_2.b1"),  # exists, but not in this task's node
            _suggest(op="rewrite_summary", target="summary"),  # wrong section
        ],
        ScriptedJev(),
    )
    assert items == []


async def test_noop_replacements_are_dropped():
    same = "Improved checkout page performance by moving rendering to Next.js server-side rendering, cutting LCP by 38%"
    items, _ = await run([_suggest(after=same)], ScriptedJev())
    assert items == []


async def test_one_operation_per_node():
    items, _ = await run([_suggest(), _suggest(after="Another rewrite of 38% LCP work")], ScriptedJev())
    assert len(items) == 1


async def test_inserted_bullets_always_need_confirmation():
    ins = _suggest(op="insert_bullet", target="exp_1", after="Built GraphQL gateway", evidence=[])
    items, _ = await run([ins], ScriptedJev())
    assert items[0]["requires_confirmation"]
    assert items[0]["payload"]["new_id"].startswith("exp_1.n")


def test_build_tasks_fans_out_per_role():
    inp = _inputs()
    tasks = build_tasks(inp.resume, ["summary", "skills", "experience", "projects"])
    assert [t.section for t in tasks] == ["summary", "skills", "experience", "experience", "projects"]
    assert all(isinstance(t, SectionTask) for t in tasks)


async def test_several_skills_can_be_added_to_the_same_group():
    skills = [
        ModelSuggestion(
            op="add_skill", target="sk_1", value=v, requires_confirmation=True, addresses=["req_1"]
        )
        for v in ("GraphQL", "Kubernetes", "graphql", "GraphQL ")  # the last two repeat the first
    ]
    inp = _inputs()
    inp.sections = ["skills"]
    ai = AIGateway(generate=ScriptedGenerator(skills), jev=ScriptedJev())  # type: ignore[arg-type]
    task = next(t for t in build_tasks(inp.resume, ["skills"]))
    items = [it async for it, _ in _process_stream(ai, SETTINGS, inp, task)]
    assert [i["payload"]["value"] for i in items] == ["GraphQL", "Kubernetes"]
