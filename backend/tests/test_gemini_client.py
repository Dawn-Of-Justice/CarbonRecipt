"""Gemini client pure helpers — JSON extraction and line-item coercion.

These never call Vertex AI; they validate the parsing/normalization layer that
guards whatever the model returns.
"""

from app.gemini.client import _coerce_line_items, _extract_json


def test_extract_json_plain_array():
    assert _extract_json('[{"a": 1}]') == [{"a": 1}]


def test_extract_json_strips_code_fences():
    text = '```json\n[{"name": "Milk"}]\n```'
    assert _extract_json(text) == [{"name": "Milk"}]


def test_extract_json_finds_embedded_array():
    text = 'Sure! Here is the data: [{"name": "X"}] hope it helps'
    assert _extract_json(text) == [{"name": "X"}]


def test_extract_json_returns_none_on_garbage():
    assert _extract_json("not json at all") is None
    assert _extract_json("") is None


def test_coerce_normalizes_category_and_defaults():
    raw = [
        {"name": "Milk", "category": "DAIRY", "quantity": "2", "unit": "L"},
        {"name": "Mystery", "category": "not_real"},  # bad category -> other
        {"name": "  ", "category": "meat"},  # blank name -> skipped
        {"quantity": 3},  # no name -> skipped
        "not a dict",  # ignored
    ]
    items = _coerce_line_items(raw)
    assert len(items) == 2
    milk = items[0]
    assert milk.category == "dairy"
    assert milk.quantity == 2.0
    assert milk.unit == "l"
    assert items[1].category == "other"


def test_coerce_handles_non_numeric_quantity():
    items = _coerce_line_items([{"name": "X", "quantity": "abc"}])
    assert items[0].quantity == 1.0


def test_coerce_non_list_returns_empty():
    assert _coerce_line_items({"name": "X"}) == []
    assert _coerce_line_items(None) == []
