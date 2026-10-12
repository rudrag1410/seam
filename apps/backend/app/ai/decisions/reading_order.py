from typesafe_sdk import Noul

from app.ai.gateway.jev_client import Battery


def reading_order_battery() -> Battery:
    return Battery(
        name="reading_order",
        version="reading_order@1",
        questions={
            "coherent": Noul(
                instructions="Does `state` read as a resume in natural reading order, without "
                "lines from separate columns interleaved or garbled characters?"
            )
        },
    )
