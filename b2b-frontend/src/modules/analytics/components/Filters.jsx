const Filters = ({ filters, setFilters }) => {
  const handleChange = (e) => {
    setFilters({ ...filters, range: e.target.value });
  };

  return (
    <div>
      <label>Date Range: </label>
      <select value={filters.range} onChange={handleChange}>
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
        <option value="90d">Last 90 Days</option>
      </select>
    </div>
  );
};

export default Filters;