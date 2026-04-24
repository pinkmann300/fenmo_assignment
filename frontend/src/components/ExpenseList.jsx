const fmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ExpenseList({ expenses, total, loading, error }) {
  if (error) {
    return <p className="list-error" role="alert">{error}</p>;
  }

  if (loading) {
    return <p className="list-status">Loading expenses…</p>;
  }

  return (
    <div className="expense-list">
      <div className="list-header">
        <h2>Expenses</h2>
        <span className="total-badge">
          Total: {fmt.format(total)}
        </span>
      </div>

      {expenses.length === 0 ? (
        <p className="list-status">No expenses found.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th className="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.date)}</td>
                  <td><span className="category-pill">{e.category}</span></td>
                  <td>{e.description}</td>
                  <td className="amount-col">{fmt.format(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
