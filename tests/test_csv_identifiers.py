"""CSV identifiers must stay unique after whitespace normalization."""
import pytest
from execution.pipeline import demo_data, validate_csv


@pytest.mark.parametrize("padding", [" ", "\t", "  "])
def test_rejects_duplicate_transaction_ids_after_trimming(padding):
    frame = demo_data(120)
    frame.loc[1, "transaction_id"] = padding + frame.loc[0, "transaction_id"] + padding
    with pytest.raises(ValueError, match="Duplicate transaction_id"):
        validate_csv(frame.to_csv(index=False).encode())


def test_unique_padded_identifiers_are_trimmed_and_preserved():
    frame = demo_data(120)
    expected = frame.transaction_id.tolist()
    frame["transaction_id"] = " " + frame.transaction_id + " "
    validated = validate_csv(frame.to_csv(index=False).encode())
    assert validated.transaction_id.tolist() == expected
    assert validated.transaction_id.is_unique
