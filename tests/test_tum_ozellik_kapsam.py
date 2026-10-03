"""One additional regression contract per requested feature (read-only)."""
import importlib.util
import json
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/kanit/tum_test"
spec = importlib.util.spec_from_file_location("tum_kapsam", EVIDENCE / "kapsam.py")
mapping = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mapping)
FEATURES = json.loads((EVIDENCE / "inventory.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("index", range(1, len(FEATURES) + 1),
                         ids=[f"{i+1:02d}-{row['name']}" for i, row in enumerate(FEATURES)])
def test_feature_source_regression_contract(index):
    source_path, required, behavioral_proof = mapping.CONTRACTS[index]
    source = (ROOT / source_path).read_text(encoding="utf-8-sig")
    for token in required:
        assert token in source, f"{FEATURES[index-1]['name']}: contract missing: {token}"
    candidates = [ROOT / "windows/tests" / behavioral_proof,
                  ROOT / "tests" / behavioral_proof, EVIDENCE / behavioral_proof]
    assert any(p.is_file() for p in candidates), f"Behavioral proof not found: {behavioral_proof}"


def test_no_requested_feature_is_omitted_from_contract_map():
    assert set(mapping.CONTRACTS) == set(range(1, len(FEATURES) + 1))
