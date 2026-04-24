# Expense Tracker

A minimal full-stack personal finance tool. Users can record expenses, filter by category, sort by date, and see totals — built with production-like correctness in mind.

---

## Quick Start

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API runs at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI runs at http://localhost:5173
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/expenses` | Create an expense |
| `GET` | `/expenses` | List expenses (supports `?category=&sort=date_desc`) |
| `GET` | `/expenses/categories` | List distinct categories used |
| `GET` | `/health` | Health check |

### Idempotency

`POST /expenses` accepts an optional `Idempotency-Key: <uuid>` header. If the same key is sent again (e.g. on network retry or double-click), the server returns the original response without creating a duplicate. The frontend generates one key per form session and resets it after a successful submission.

---

## Key Design Decisions

### Money handling — integer paise
Amounts are stored as `INTEGER` (paise, i.e. ₹ × 100) in SQLite. This eliminates floating-point rounding errors entirely. All arithmetic uses Python's `Decimal` before/after conversion. The API accepts and returns decimal strings (e.g. `"250.50"`).

### Persistence — SQLite
SQLite is the right call for a single-node app of this size: zero setup, ACID transactions, WAL mode for better concurrency, and portable as a file. The `DATABASE_PATH` env var makes it easy to swap to a mounted volume in production. If this needed to scale horizontally, PostgreSQL would be the next step.

### Idempotency — server-side key table
A separate `idempotency_keys` table maps client-supplied UUIDs to expense IDs. This handles the stated failure modes (network issues, page reloads, double-clicks) without requiring the client to do anything clever beyond storing a key in memory.

### Tech stack
- **Backend**: FastAPI + Python 3.12 — fast to write, self-documenting via OpenAPI, excellent Pydantic validation
- **Frontend**: React + Vite — minimal build tooling, component model keeps concerns separated
- **No ORM**: Raw `sqlite3` is sufficient here; an ORM would add complexity without benefit at this scale

---

## Trade-offs made for the timebox

- **No authentication** — the assignment scopes to a single user
- **No pagination** — acceptable for a personal tool with a modest number of records; would add cursor-based pagination before any real load
- **No edit/delete** — not in the acceptance criteria; easy to add
- **Idempotency keys expire never** — a cron job to prune keys older than 24 h would be the real-world fix
- **Frontend categories hardcoded** — the `GET /expenses/categories` endpoint exists and is used to populate the filter dropdown; the form uses a curated list for UX clarity

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -v
```

9 integration tests covering: create, list, category filter, date sort, total calculation, idempotency, and validation (negative/zero amount rejection).

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, lifespan
│   │   ├── database.py      # SQLite connection + schema init
│   │   ├── models.py        # Pydantic request/response models
│   │   └── routers/
│   │       └── expenses.py  # POST /expenses, GET /expenses
│   ├── tests/
│   │   └── test_expenses.py
│   ├── requirements.txt
│   └── requirements-dev.txt
└── frontend/
    └── src/
        ├── App.jsx
        ├── api.js           # Thin fetch wrapper
        └── components/
            ├── ExpenseForm.jsx
            ├── ExpenseList.jsx
            ├── Controls.jsx
            └── CategorySummary.jsx
```
