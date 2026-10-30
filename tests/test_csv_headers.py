"""Reject ambiguous CSV headers before pandas renames duplicate columns."""
import pytest
from execution.pipeline import demo_data, validate_csv


@pytest.mark.parametrize("column", ["amount", "transaction_id", "is_fraud"])
@pytest.mark.parametrize("prefix", ["", "\n\n"])
def test_duplicate_headers_are_rejected(column, prefix):
    frame = demo_data(120)
    raw = frame.to_csv(index=False)
    # Append a duplicate column with conflicting values.
    lines = raw.splitlines()
    lines[0] += "," + column
    lines[1:] = [line + ",0" for line in lines[1:]]
    with pytest.raises(ValueError, match="Duplicate CSV column names"):
        validate_csv((prefix + "\n".join(lines) + "\n").encode())


@pytest.mark.parametrize("bom", [False, True])
def test_unique_headers_accept_utf8_with_or_without_bom(bom):
    frame = demo_data(120)
    raw = frame.to_csv(index=False).encode("utf-8-sig" if bom else "utf-8")
    result = validate_csv(raw)
    assert len(result) == len(frame)
    assert result.transaction_id.tolist() == frame.transaction_id.tolist()
