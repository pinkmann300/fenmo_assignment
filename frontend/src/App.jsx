import { useState, useEffect, useCallback } from "react";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import Controls from "./components/Controls";
import CategorySummary from "./components/CategorySummary";
import { getExpenses, getCategories } from "./api";

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExpenses({ category: filter || undefined, sort: sort || undefined });
      setExpenses(data.expenses);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, sort]);

  const fetchCategories = useCallback(async () => {
    try {
      setCategories(await getCategories());
    } catch {
      // non-critical; categories list is just a convenience
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function handleCreated(newExpense) {
    // Optimistically prepend then re-fetch to get the server-authoritative list
    setExpenses((prev) => [newExpense, ...prev]);
    setTotal((prev) => parseFloat(prev) + parseFloat(newExpense.amount));
    fetchExpenses();
    fetchCategories();
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Expense Tracker</h1>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <ExpenseForm onCreated={handleCreated} />
          <CategorySummary expenses={expenses} />
        </aside>

        <section className="content">
          <Controls
            categories={categories}
            filter={filter}
            sort={sort}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />
          <ExpenseList
            expenses={expenses}
            total={total}
            loading={loading}
            error={error}
          />
        </section>
      </main>
    </div>
  );
}
