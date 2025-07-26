// src/components/FloatingToolBar.js
import React, { useState, useEffect } from "react";
import DistrictStatsPanel from "./DistrictStatsPanel";
import ComparePanel from "./ComparePanel";
import GeminiChatPanel from "./GeminiChatPanel";
import FloatingPanel from "./FloatingPanel";
import DistrictCharchaPanel from "./DistrictCharchaPanel";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const FloatingToolBar = ({
  selectedDistrict,
  isPlacingPin,
  setIsPlacingPin,
  pendingPinCoords,
  setPendingPinCoords,
  selectedPinType,
  setSelectedPinType
}) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(null); // null = no tab open

  const isDistrictSelected = !!selectedDistrict;

  // Listen for open-charcha-tab event
  useEffect(() => {
    const handleOpenCharcha = () => {
      // Find the Charcha tab index (it's the 4th tab, index 3)
      setSelectedTabIndex(3);
    };
    window.addEventListener("open-charcha-tab", handleOpenCharcha);
    return () => window.removeEventListener("open-charcha-tab", handleOpenCharcha);
  }, []);

  // Listen for open-charcha event
  useEffect(() => {
    const openCharcha = () => {
      setSelectedTabIndex(3); // or whatever activates Charcha
    };

    window.addEventListener("open-charcha", openCharcha);
    return () => window.removeEventListener("open-charcha", openCharcha);
  }, []);

  const tabs = [
    {
      name: "District Stats",
      show: isDistrictSelected,
      content: (
        <FloatingPanel
          title={`District: ${selectedDistrict?.district}`}
          onClose={() => setSelectedTabIndex(null)}
        >
          <DistrictStatsPanel district={selectedDistrict} />
        </FloatingPanel>
      ),
    },
    {
      name: "Compare",
      show: true,
      content: (
        <FloatingPanel
          title="Compare Districts"
          onClose={() => setSelectedTabIndex(null)}
        >
          <ComparePanel />
        </FloatingPanel>
      ),
    },
    {
      name: "Gemini",
      show: isDistrictSelected,
      content: (
        <FloatingPanel
          title="Talk to Gemini AI"
          onClose={() => setSelectedTabIndex(null)}
        >
          <GeminiChatPanel
            selectedDistrict={selectedDistrict}
            isCompareMode={false}
            comparisonContext={null}
          />
        </FloatingPanel>
      ),
    },
    {
      name: "Charcha",
      show: isDistrictSelected,
      content: (
        <FloatingPanel
          title={`Charcha: ${selectedDistrict?.district}`}
          onClose={() => setSelectedTabIndex(null)}
        >
          <DistrictCharchaPanel
            district={selectedDistrict}
            isPlacingPin={isPlacingPin}
            setIsPlacingPin={setIsPlacingPin}
            pendingPinCoords={pendingPinCoords}
            setPendingPinCoords={setPendingPinCoords}
            selectedPinType={selectedPinType}
            setSelectedPinType={setSelectedPinType}
          />
        </FloatingPanel>
      ),
    },
  ];

  return (
    <div className="absolute top-3 right-4 z-50">
      {/* Tab Selector Bar */}
      <div className="flex space-x-2 bg-gray-800 p-2 rounded-xl shadow-lg">
        {tabs.map(
          (tab, index) =>
            tab.show && (
              <button
                key={tab.name}
                onClick={() => setSelectedTabIndex(index)}
                className={classNames(
                  "px-4 py-2 rounded-md font-semibold text-sm transition-all",
                  selectedTabIndex === index
                    ? "bg-pink-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                )}
              >
                {tab.name}
              </button>
            )
        )}
      </div>

      {/* Panel Content */}
      {selectedTabIndex !== null && tabs[selectedTabIndex].content}
    </div>
  );
};

export default FloatingToolBar;
