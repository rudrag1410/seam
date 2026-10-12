from typesafe_sdk import Score

from app.ai.gateway.jev_client import Battery
from app.schemas.jd import Requirement

COVERAGE_LEVELS = [
    "Not mentioned anywhere in the resume",
    "Only listed (for example in a skills list) with no supporting work",
    "Used in at least one role or project, without detail",
    "Clearly demonstrated with concrete work in a relevant context",
    "Demonstrated repeatedly, with measurable impact",
]


def coverage_battery(requirements: list[Requirement]) -> Battery:
    return Battery(
        name="coverage",
        version="coverage@1",
        questions={
            r.id: Score(
                instructions=f"How strongly does the candidate's `resume` demonstrate this job "
                f'requirement: "{r.text}"?',
                criteria=COVERAGE_LEVELS,
            )
            for r in requirements
        },
    )
