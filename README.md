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

---

## Design Decisions

### 1. Money stored as integer paise (not float)

Floating-point arithmetic is unsuitable for money. `0.1 + 0.2 === 0.30000000000000004` in most languages, and those rounding errors compound across many transactions.

The decision here was to store amounts as **integer paise** (₹ × 100) in SQLite — the same approach used by payment systems like Stripe. A ₹250.50 expense is stored as `25050`. All arithmetic on the backend uses Python's `Decimal` type with explicit `ROUND_HALF_UP` rounding before conversion, so the value going into the database is always exact. The API surfaces amounts as decimal strings (`"250.50"`) rather than JSON numbers to avoid precision loss in transit.

### 2. Idempotency via a server-side key table

The assignment explicitly called out unreliable networks, double-clicks, and page refreshes as failure modes. The standard solution for this is idempotency keys.

The frontend generates a `crypto.randomUUID()` key once per form session and sends it as an `Idempotency-Key` header on every `POST /expenses`. On the backend, a separate `idempotency_keys` table maps each key to the expense it created. If the same key arrives again — regardless of why — the server looks it up and returns the original response without inserting a duplicate. The key is only reset on the frontend after a successful submission, so any retry (network failure, accidental double-click) is automatically safe.

### 3. SQLite with WAL mode

SQLite was chosen over a hosted database for simplicity of setup and portability. It is a genuine ACID database, not a toy — it is used in production by many systems at this scale.

Two specific SQLite settings are enabled:
- **WAL mode** (`PRAGMA journal_mode=WAL`): allows concurrent readers while a write is in progress, which matters when multiple requests hit the API in quick succession.
- **`check_same_thread=False`**: FastAPI runs synchronous handlers in a thread pool, meaning a connection opened in one thread may be used in another within the same request lifecycle. This flag allows that safely, since each request gets its own connection via the `Depends(get_db)` pattern.

The `DATABASE_PATH` environment variable makes it easy to point to a mounted volume in a containerised deployment. If the app needed to scale horizontally, the next step would be PostgreSQL — the SQL queries and schema are straightforward to migrate.

### 4. Multi-layer validation

Validation is enforced at three levels rather than trusting any single layer:

- **Browser**: `type="number"`, `min="0.01"`, `step="0.01"`, and `max={today()}` on the date field constrain input at the UI level.
- **Frontend JS**: `validate()` runs before the request is sent, giving immediate feedback without a round-trip.
- **Backend (Pydantic + DB)**: The Pydantic model enforces types, ranges, and business rules (positive amount, no future dates) and returns structured `422` errors. The SQLite column also has a `CHECK(amount_paise > 0)` constraint as a final hard guard.

This means even a direct API call bypassing the frontend cannot insert invalid data.

### 5. Request timeout and error resilience

A 10-second `AbortController` timeout is attached to every `fetch` call. Without this, a hanging API response would leave the submit button permanently disabled and the form unusable. On timeout the error is surfaced to the user with a clear message. The `finally` block in the submit handler always re-enables the form regardless of how the request ends.

### 6. No ORM

Raw `sqlite3` (Python's standard library) is used directly. An ORM like SQLAlchemy would add a significant dependency and learning surface for queries this simple. The SQL here is straightforward enough that the overhead is not justified — and the explicit queries are easier to read and reason about.

---

## Trade-offs

- **No authentication** — the assignment scopes to a single user
- **No pagination** — acceptable for a personal tool; would add cursor-based pagination before any real load
- **No edit/delete** — not in the acceptance criteria; straightforward to add
- **Idempotency keys never expire** — in production, a scheduled job would prune keys older than 24 hours
- **Frontend categories hardcoded** — the `GET /expenses/categories` endpoint populates the filter dropdown dynamically; the form uses a curated list for better UX

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -v
```

11 integration tests covering: health check, create, list, category filter, date sort, total accuracy, idempotency, optional description, negative/zero amount rejection, and future date rejection.

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
        ├── api.js           # Fetch wrapper with timeout + error parsing
        └── components/
            ├── ExpenseForm.jsx
            ├── ExpenseList.jsx
            ├── Controls.jsx
            └── CategorySummary.jsx
```
