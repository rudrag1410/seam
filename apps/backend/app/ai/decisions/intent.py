from typesafe_sdk import Choice

from app.ai.gateway.jev_client import Battery

INTENT_TEMPLATES = {
    "shorter": "Make it shorter: at most 18 words, keeping the strongest fact.",
    "more_technical": "Make it more technical: name the specific technologies and methods already evidenced.",
    "lead_with_metric": "Lead with the measurable result that is already in the evidence.",
    "more_senior": "Use ownership language that is supported by the evidence, without inflating scope.",
    "simpler_language": "Use plainer, simpler language without jargon.",
}


def intent_battery() -> Battery:
    return Battery(
        name="intent",
        version="intent@1",
        questions={
            "intent": Choice(
                instructions="Which kind of rewrite does the user's instruction in `state` ask for?",
                criteria={
                    **{k: v for k, v in INTENT_TEMPLATES.items()},
                    "other": "Something else; pass the instruction through unchanged",
                },
            )
        },
    )
