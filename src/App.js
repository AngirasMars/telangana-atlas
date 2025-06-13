// src/App.js
import React, { useState } from "react";
import Map from "./components/Map";
import Drawer from "./components/Drawer";
import SearchBar from "./components/SearchBar";
import districtData from "./data/districts_enriched.json"; // Import district data

function App() {
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  // Initialize as false or null, so drawer doesn't show until a district is selected
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // This function handles district selection from both map clicks and search bar.
  const handleDistrictSelect = (district) => {
    setSelectedDistrict(district);
    setIsDrawerExpanded(true); // Ensure drawer opens when a district is selected
    setSearchResults([]); // Clear search results after a selection
  };

  const handleSearch = (query) => {
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }
    const filtered = districtData.filter((d) =>
      d.district.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  };

  return (
    <div className="h-screen w-screen relative">
      <SearchBar
        onSearch={handleSearch}
        searchResults={searchResults}
        onSelectDistrict={handleDistrictSelect} // Search bar uses handleDistrictSelect
      />
      <Map
        setSelectedDistrict={handleDistrictSelect} // Map uses handleDistrictSelect
        selectedDistrict={selectedDistrict} // Pass selectedDistrict for map centering/highlighting
      />
      <Drawer
        district={selectedDistrict}
        isExpanded={isDrawerExpanded}
        setIsExpanded={setIsDrawerExpanded}
      />
    </div>
  );
}

export default App;