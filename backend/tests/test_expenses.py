"""Integration tests for the expenses API."""
import os
import tempfile
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

# Point to a temp DB before importing the app so init_db writes there
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_PATH"] = _tmp.name

from app.main import app  # noqa: E402 — import after env var is set
from app.database import init_db  # noqa: E402

init_db()
client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_create_and_list_expense():
    payload = {
        "amount": 250.50,
        "category": "Food & Dining",
        "description": "Lunch",
        "date": "2024-01-15",
    }
    res = client.post("/expenses", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["category"] == "Food & Dining"
    assert Decimal(str(data["amount"])) == Decimal("250.50")
    assert data["id"]

    list_res = client.get("/expenses")
    assert list_res.status_code == 200
    body = list_res.json()
    assert body["count"] >= 1
    assert any(e["id"] == data["id"] for e in body["expenses"])


def test_idempotency_key_prevents_duplicate():
    payload = {
        "amount": 100.00,
        "category": "Transport",
        "description": "Auto",
        "date": "2024-01-16",
    }
    key = "test-idem-key-abc123"
    res1 = client.post("/expenses", json=payload, headers={"Idempotency-Key": key})
    res2 = client.post("/expenses", json=payload, headers={"Idempotency-Key": key})

    assert res1.status_code == 201
    assert res2.status_code == 201
    # Same key → same expense id returned
    assert res1.json()["id"] == res2.json()["id"]

    # Only one expense created for this description
    list_res = client.get("/expenses", params={"category": "Transport"})
    ids = [e["id"] for e in list_res.json()["expenses"]]
    assert ids.count(res1.json()["id"]) == 1


def test_filter_by_category():
    client.post("/expenses", json={"amount": 50, "category": "Shopping", "description": "Shirt", "date": "2024-01-10"})
    client.post("/expenses", json={"amount": 75, "category": "Entertainment", "description": "Movie", "date": "2024-01-11"})

    res = client.get("/expenses", params={"category": "Shopping"})
    assert res.status_code == 200
    body = res.json()
    assert all(e["category"] == "Shopping" for e in body["expenses"])


def test_sort_date_desc():
    res = client.get("/expenses", params={"sort": "date_desc"})
    assert res.status_code == 200
    dates = [e["date"] for e in res.json()["expenses"]]
    assert dates == sorted(dates, reverse=True)


def test_total_matches_expenses():
    res = client.get("/expenses")
    body = res.json()
    computed = sum(Decimal(str(e["amount"])) for e in body["expenses"])
    assert Decimal(str(body["total"])) == computed


def test_description_is_optional():
    res = client.post("/expenses", json={"amount": 10, "category": "Other", "date": "2024-02-01"})
    assert res.status_code == 201
    assert res.json()["description"] == ""


def test_negative_amount_rejected():
    res = client.post("/expenses", json={"amount": -10, "category": "Food & Dining", "date": "2024-01-01"})
    assert res.status_code == 422


def test_zero_amount_rejected():
    res = client.post("/expenses", json={"amount": 0, "category": "Food & Dining", "date": "2024-01-01"})
    assert res.status_code == 422


def test_categories_endpoint():
    res = client.get("/expenses/categories")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
