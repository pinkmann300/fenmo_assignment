export default function Controls({ categories, filter, sort, onFilterChange, onSortChange }) {
  return (
    <div className="controls">
      <div className="control-group">
        <label htmlFor="filter-category">Filter by Category</label>
        <select
          id="filter-category"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="sort-order">Sort</label>
        <select
          id="sort-order"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="date_desc">Newest First</option>
          <option value="">Default</option>
        </select>
      </div>
    </div>
  );
}
