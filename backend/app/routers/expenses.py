import uuid
import sqlite3
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.database import get_db
from app.models import ExpenseCreate, ExpenseResponse, ExpenseListResponse

router = APIRouter(prefix="/expenses", tags=["expenses"])

PAISE_PER_RUPEE = 100


def _row_to_response(row: sqlite3.Row) -> ExpenseResponse:
    return ExpenseResponse(
        id=row["id"],
        amount=Decimal(row["amount_paise"]) / PAISE_PER_RUPEE,
        category=row["category"],
        description=row["description"],
        date=row["date"],
        created_at=row["created_at"],
    )


@router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(
    body: ExpenseCreate,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: sqlite3.Connection = Depends(get_db),
):
    # If client supplies an idempotency key, return the cached result for retries
    if idempotency_key:
        existing = db.execute(
            """
            SELECT e.* FROM expenses e
            JOIN idempotency_keys ik ON ik.expense_id = e.id
            WHERE ik.key = ?
            """,
            (idempotency_key,),
        ).fetchone()
        if existing:
            return _row_to_response(existing)

    expense_id = str(uuid.uuid4())
    amount_paise = int(body.amount * PAISE_PER_RUPEE)

    try:
        db.execute(
            """
            INSERT INTO expenses (id, amount_paise, category, description, date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (expense_id, amount_paise, body.category, body.description, str(body.date)),
        )

        if idempotency_key:
            db.execute(
                "INSERT INTO idempotency_keys (key, expense_id) VALUES (?, ?)",
                (idempotency_key, expense_id),
            )

        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save expense")

    row = db.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    return _row_to_response(row)


@router.get("", response_model=ExpenseListResponse)
def list_expenses(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    sort: Optional[str] = Query(default=None, description="Use 'date_desc' to sort newest first"),
    db: sqlite3.Connection = Depends(get_db),
):
    query = "SELECT * FROM expenses"
    params: list = []

    if category:
        query += " WHERE category = ?"
        params.append(category)

    if sort == "date_desc":
        query += " ORDER BY date DESC, created_at DESC"
    else:
        query += " ORDER BY created_at DESC"

    rows = db.execute(query, params).fetchall()
    expenses = [_row_to_response(r) for r in rows]

    total = sum((e.amount for e in expenses), Decimal("0.00"))

    return ExpenseListResponse(expenses=expenses, total=total, count=len(expenses))


@router.get("/categories", response_model=list[str])
def list_categories(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT DISTINCT category FROM expenses ORDER BY category").fetchall()
    return [r["category"] for r in rows]
