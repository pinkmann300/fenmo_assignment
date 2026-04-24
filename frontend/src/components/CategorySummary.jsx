const fmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

export default function CategorySummary({ expenses }) {
  if (!expenses.length) return null;

  const totals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + parseFloat(e.amount);
    return acc;
  }, {});

  const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a);

  return (
    <div className="category-summary">
      <h3>By Category</h3>
      <ul>
        {sorted.map(([cat, total]) => (
          <li key={cat}>
            <span className="category-pill">{cat}</span>
            <span className="cat-total">{fmt.format(total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
