from typesafe_sdk import Choice, Noul, Score

from app.ai.decisions.coverage import COVERAGE_LEVELS
from app.ai.gateway.jev_client import Battery


def grounding_battery(keys: list[str]) -> Battery:
    questions: dict = {}
    for k in keys:
        questions[f"{k}__relation"] = Choice(
            instructions=f"Look at `{k}`. Compare `rewrite` with the candidate's `evidence`. "
            "How does the evidence relate to the claims in the rewrite?",
            criteria={
                "supported": "Every claim in the rewrite is stated or directly implied by the evidence",
                "overstated": "Same work, but scope, seniority or impact is inflated",
                "unsupported": "The rewrite adds facts the evidence does not mention",
                "contradicts": "The rewrite conflicts with the evidence",
            },
        )
        questions[f"{k}__fit_original"] = Score(
            instructions=f"Look at `{k}`. How strongly does `original` demonstrate `requirement`?",
            criteria=COVERAGE_LEVELS,
        )
        questions[f"{k}__fit_rewrite"] = Score(
            instructions=f"Look at `{k}`. How strongly does `rewrite` demonstrate `requirement`?",
            criteria=COVERAGE_LEVELS,
        )
        questions[f"{k}__same_work"] = Noul(
            instructions=f"Look at `{k}`. Do `rewrite` and `original` describe the same piece of work?"
        )
    return Battery(name="grounding", version="grounding@1", questions=questions)
