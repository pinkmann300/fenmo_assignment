import sqlite3
import os
from pathlib import Path

DATABASE_PATH = os.getenv("DATABASE_PATH", str(Path(__file__).parent.parent / "expenses.db"))

# Ensure the parent directory exists (important on Render when using a mounted disk)
Path(DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    # check_same_thread=False is safe here: each request gets its own connection
    # via get_db(), but FastAPI's threadpool may hand it off between threads.
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS expenses (
            id          TEXT    PRIMARY KEY,
            amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
            category    TEXT    NOT NULL,
            description TEXT    NOT NULL,
            date        TEXT    NOT NULL,
            created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
        CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);

        -- Stores processed idempotency keys so retried requests return the same result
        CREATE TABLE IF NOT EXISTS idempotency_keys (
            key        TEXT PRIMARY KEY,
            expense_id TEXT NOT NULL REFERENCES expenses(id),
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
    """)
    conn.commit()
    conn.close()
