import "./FilterPanel.css";

interface Filters {
  status: string;
  sort: string;
  order: "asc" | "desc";
}

interface FilterPanelProps {
  readonly filters: Filters;
  readonly onFilterChange: (filters: Filters) => void;
}

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const handleChange = (key: keyof Filters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="filter-panel">
      <div className="filter-group">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={filters.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className="filter-select"
        >
          <option value="">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="sort-filter">Sort By</label>
        <select
          id="sort-filter"
          value={filters.sort}
          onChange={(e) => handleChange("sort", e.target.value)}
          className="filter-select"
        >
          <option value="createdAt">Created Date</option>
          <option value="updatedAt">Updated Date</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="order-filter">Order</label>
        <select
          id="order-filter"
          value={filters.order}
          onChange={(e) =>
            handleChange("order", e.target.value as "asc" | "desc")
          }
          className="filter-select"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  );
}
