import { useState, useCallback } from "react";
import { searchService } from "../searchService";
import debounce from "../../utils/debounce";

export const useSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (query) => {
    if (!query) return;

    setLoading(true);
    try {
      const data = await searchService.search(query);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  // debounce for performance
  const debouncedSearch = useCallback(debounce(performSearch, 400), []);

  return { results, loading, search: debouncedSearch };
};