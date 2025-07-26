// src/App.js
import React, { useState } from "react";
import Map from "./components/Map";
import SearchBar from "./components/SearchBar";
import FloatingToolBar from "./components/FloatingToolBar";
import GeminiAssistantButton from "./components/GeminiAssistantButton";
import districtData from "./data/districts_enriched.json";
import { useAuth } from "./contexts/AuthContext";
import LoginOverlay from "./components/LoginOverlay";
import { getAuth, signOut } from "firebase/auth";

function App() {
  const { currentUser, loading } = useAuth(); // ✅ Correct hook usage

  // ✅ Logging outside of JSX
  console.log("🤖 useAuth result:", useAuth?.toString?.());
  console.log("🧪 LoginOverlay component:", LoginOverlay);

  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingPinCoords, setPendingPinCoords] = useState(null);
  const [selectedPinType, setSelectedPinType] = useState("live");

  const handleDistrictSelect = (district) => {
    setSelectedDistrict(district);
    setSearchResults([]);
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

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white text-lg font-semibold">
        Loading Telangana Atlas...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {!currentUser && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-black/10" />
      )}

      <SearchBar
        onSearch={handleSearch}
        searchResults={searchResults}
        onSelectDistrict={handleDistrictSelect}
      />

      <Map
        selectedDistrict={selectedDistrict}
        setSelectedDistrict={handleDistrictSelect}
        isPlacingPin={isPlacingPin}
        onPinPlaced={(coords) => {
          console.log("✅ App.js received pin from Map:", coords);
          setIsPlacingPin(false);
          setPendingPinCoords(coords);
        }}
        selectedPinType={selectedPinType}
      />

      <FloatingToolBar
        selectedDistrict={selectedDistrict}
        isPlacingPin={isPlacingPin}
        setIsPlacingPin={setIsPlacingPin}
        pendingPinCoords={pendingPinCoords}
        setPendingPinCoords={setPendingPinCoords}
        selectedPinType={selectedPinType}
        setSelectedPinType={setSelectedPinType}
      />

      <GeminiAssistantButton selectedDistrict={selectedDistrict} />

      {!currentUser && <LoginOverlay />}
      {currentUser && (
        <button
          className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded text-white z-50"
          onClick={() => {
            signOut(getAuth())
              .then(() => console.log("✅ Signed out"))
              .catch((err) => console.error("❌ Logout failed:", err));
          }}
        >
          Logout
        </button>
      )}
    </div>
  );
}

export default App;
