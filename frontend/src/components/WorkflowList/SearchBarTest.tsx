import { useState, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarTestProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

// Completely isolated test version - NO memo, NO debounce
export function SearchBarTest({
  onSearch,
  placeholder = "Search workflows...",
}: SearchBarTestProps) {
  const [query, setQuery] = useState("");
  const renderCount = useRef(0);
  renderCount.current++;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log(`[${renderCount.current}] SearchBarTest handleChange:`, value);
    setQuery(value);
    onSearch(value); // Direct call, no debounce
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  console.log(`[${renderCount.current}] SearchBarTest RENDER, query:`, query);

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
