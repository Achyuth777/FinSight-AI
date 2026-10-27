"""Regression checks: held-out labels must never influence anomaly training."""
import pytest
from execution.pipeline import demo_data, train, validate_csv


@pytest.mark.parametrize("supervised", [False, True])
def test_changing_test_labels_does_not_change_anomaly_results(supervised):
    frame = validate_csv(demo_data(300).to_csv(index=False).encode())
    original = train(frame, trees=50, supervised=supervised)
    changed = frame.copy()
    boundary = original["train_count"]
    changed.loc[boundary:, "is_fraud"] = 1 - changed.loc[boundary:, "is_fraud"]
    relabeled = train(changed, trees=50, supervised=supervised)

    assert original["threshold"] == relabeled["threshold"]
    for before, after in zip(original["transactions"], relabeled["transactions"]):
        for key in ("anomaly_score", "risk_score", "flagged", "reasons"):
            assert before[key] == after[key]
    assert original["metrics"] != relabeled["metrics"]
