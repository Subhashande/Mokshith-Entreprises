import { useState } from "react";
import { useSearch } from "./hooks/useSearch";
import SearchResults from "./components/SearchResults";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const { results, loading, search } = useSearch();

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    search(value);
  };

  return (
    <div>
      <h1>Search Products</h1>

      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search products..."
      />

      {loading && <p>Searching...</p>}

      <SearchResults results={results} />
    </div>
  );
};

export default SearchPage;