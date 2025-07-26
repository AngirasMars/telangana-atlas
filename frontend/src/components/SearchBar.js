// src/components/SearchBar.js
import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react"; // For search and clear icons
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

const geocodingClient = mbxGeocoding({ accessToken: process.env.REACT_APP_MAPBOX_TOKEN });

function SearchBar({ onSearch, searchResults, onSelectDistrict }) {
  const [query, setQuery] = useState("");
  const [geocodingResults, setGeocodingResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchBarRef = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        // Clear search results without clearing the query
        if (searchResults.length > 0 || geocodingResults.length > 0) {
          onSelectDistrict(null); // Pass null to effectively clear search results display
          setQuery(""); // Clear the search query as well
          setGeocodingResults([]);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchResults, geocodingResults, onSelectDistrict]);

  // Debounced geocoding search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim() && query.length > 2) {
        handleGeocodingSearch(query);
      } else {
        setGeocodingResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleGeocodingSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setGeocodingResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await geocodingClient
        .forwardGeocode({
          query: searchQuery,
          countries: ['IN'],
          limit: 5,
          bbox: [77.0, 15.8, 82.0, 19.6], // Telangana bounding box
          proximity: [78.4867, 17.3850], // Bias toward Hyderabad center
        })
        .send();

      const results = response.body.features.filter(feature => 
        feature.place_type.includes('place') || 
        feature.place_type.includes('neighborhood') ||
        feature.place_type.includes('poi')
      );
      setGeocodingResults(results);
    } catch (err) {
      console.error('Geocoding failed:', err);
      setGeocodingResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery); // Call the onSearch prop to filter data in App.js
  };

  const handleClear = () => {
    setQuery("");
    onSearch(""); // Clear search results in App.js
    onSelectDistrict(null); // Also clear any previously selected district
    setGeocodingResults([]);
  };

  const handleDistrictResultClick = (district) => {
    onSelectDistrict(district);
    setQuery("");
    setGeocodingResults([]);
  };

  const handleGeocodingResultClick = (result) => {
    if (result.center) {
      const [lng, lat] = result.center;
      window.dispatchEvent(new CustomEvent('fly-to-area', { detail: { lat, lng } }));
      setQuery("");
      setGeocodingResults([]);
    }
  };

  const hasResults = searchResults.length > 0 || geocodingResults.length > 0;

  return (
    <div ref={searchBarRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for a district or place..."
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

      {hasResults && query && (
        <ul className="absolute w-full bg-gray-800 text-white rounded-md shadow-lg mt-2 max-h-60 overflow-y-auto z-50">
          {/* District Results */}
          {searchResults.length > 0 && (
            <>
              <li className="px-4 py-2 text-xs text-gray-400 bg-gray-700 font-semibold">
                Districts
              </li>
              {searchResults.map((district) => (
                <li
                  key={district.district}
                  className="px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                  onClick={() => handleDistrictResultClick(district)}
                >
                  {district.district}
                </li>
              ))}
            </>
          )}

          {/* Geocoding Results */}
          {geocodingResults.length > 0 && (
            <>
              {searchResults.length > 0 && (
                <li className="px-4 py-2 text-xs text-gray-400 bg-gray-700 font-semibold">
                  Places
                </li>
              )}
              {geocodingResults.map((result, idx) => (
                <li
                  key={idx}
                  onClick={() => handleGeocodingResultClick(result)}
                  className="px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                >
                  <div className="text-sm">{result.place_name}</div>
                  <div className="text-xs text-gray-400">{result.context?.map(c => c.text).join(', ')}</div>
                </li>
              ))}
            </>
          )}

          {/* Loading indicator */}
          {isSearching && (
            <li className="px-4 py-2 text-gray-400 text-center">
              Searching...
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;