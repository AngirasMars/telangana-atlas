// src/components/SearchBar.js
import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react"; // For search and clear icons

function SearchBar({ onSearch, searchResults, onSelectDistrict }) {
  const [query, setQuery] = useState("");
  const searchBarRef = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        // Clear search results without clearing the query
        if (searchResults.length > 0) {
          onSelectDistrict(null); // Pass null to effectively clear search results display
          setQuery(""); // Clear the search query as well
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchResults, onSelectDistrict]);


  const handleChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery); // Call the onSearch prop to filter data in App.js
  };

  const handleClear = () => {
    setQuery("");
    onSearch(""); // Clear search results in App.js
    onSelectDistrict(null); // Also clear any previously selected district
  };

  return (
    <div ref={searchBarRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for a district..."
          className="w-full py-2 pl-10 pr-4 rounded-full bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-lg"
          value={query}
          onChange={handleChange}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-gray-400 hover:text-white"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {searchResults.length > 0 && query && (
        <ul className="absolute w-full bg-gray-800 text-white rounded-md shadow-lg mt-2 max-h-60 overflow-y-auto z-50">
          {searchResults.map((district) => (
            <li
              key={district.district}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
              onClick={() => onSelectDistrict(district)}
            >
              {district.district}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;