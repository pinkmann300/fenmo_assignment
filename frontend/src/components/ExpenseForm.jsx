import { useState, useRef } from "react";
import { createExpense } from "../api";

const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Utilities",
  "Rent",
  "Other",
];

function newIdempotencyKey() {
  return crypto.randomUUID();
}

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ onCreated }) {
  const [form, setForm] = useState({
    amount: "",
    category: CATEGORIES[0],
    description: "",
    date: today(),
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // One key per form session; survives retries, resets on success
  const idempotencyKey = useRef(newIdempotencyKey());

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0)
      return "Amount must be a positive number.";
    if (!form.date) return "Date is required.";
    if (!form.description.trim()) return "Description is required.";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const expense = await createExpense(
        {
          amount: parseFloat(form.amount),
          category: form.category,
          description: form.description.trim(),
          date: form.date,
        },
        idempotencyKey.current
      );
      // Reset form and generate a fresh key for the next submission
      setForm({ amount: "", category: CATEGORIES[0], description: "", date: today() });
      idempotencyKey.current = newIdempotencyKey();
      onCreated(expense);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit} noValidate>
      <h2>Add Expense</h2>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-row">
        <label htmlFor="amount">Amount (₹)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-row">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          name="category"
          value={form.category}
          onChange={handleChange}
          disabled={submitting}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="What did you spend on?"
          value={form.description}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-row">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
          required
          disabled={submitting}
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Saving…" : "Add Expense"}
      </button>
    </form>
  );
}
