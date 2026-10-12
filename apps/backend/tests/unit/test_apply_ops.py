import json

import pytest

from app.ai.ops.apply_ops import apply_ops
from tests.conftest import FIXTURES

VECTORS = sorted((FIXTURES / "apply-ops").glob("*.json"))


@pytest.mark.parametrize("path", VECTORS, ids=[p.stem for p in VECTORS])
def test_shared_vectors(path):
    case = json.loads(path.read_text())
    assert apply_ops(case["document"], case["ops"]) == case["expected"]


def test_input_is_not_mutated():
    case = json.loads(VECTORS[0].read_text())
    snapshot = json.dumps(case["document"], sort_keys=True)
    apply_ops(case["document"], case["ops"])
    assert json.dumps(case["document"], sort_keys=True) == snapshot
