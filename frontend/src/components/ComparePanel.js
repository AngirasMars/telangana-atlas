// src/components/ComparePanel.js
import React, { useState, useEffect } from "react";
import districtData from "../data/districts_enriched.json";
import RadarChart from "./RadarChart";
import GeminiChatPanel from "./GeminiChatPanel";

const ComparePanel = () => {
  const [leftDistrict, setLeftDistrict] = useState(null);
  const [rightDistrict, setRightDistrict] = useState(null);
  const [compareContext, setCompareContext] = useState(null);

  useEffect(() => {
    if (leftDistrict && rightDistrict) {
      setCompareContext({
        left: leftDistrict.district,
        right: rightDistrict.district,
      });
    }
  }, [leftDistrict, rightDistrict]);

  const handleSelect = (side, name) => {
    const match = districtData.find(
      (d) => d.district.toLowerCase() === name.toLowerCase()
    );
    if (side === "left") setLeftDistrict(match);
    else setRightDistrict(match);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top: District Pickers */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left Picker */}
        <div className="w-full md:w-1/2">
          <label className="block text-sm text-pink-400 mb-1">Select District 1</label>
          <input
            type="text"
            className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="e.g. JAGTIAL"
            onBlur={(e) => handleSelect("left", e.target.value)}
          />
        </div>

        {/* Right Picker */}
        <div className="w-full md:w-1/2">
          <label className="block text-sm text-pink-400 mb-1">Select District 2</label>
          <input
            type="text"
            className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="e.g. KARIMNAGAR"
            onBlur={(e) => handleSelect("right", e.target.value)}
          />
        </div>
      </div>

      {/* Comparison Display */}
      {leftDistrict && rightDistrict && (
        <>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left */}
            <div className="w-full md:w-1/2 p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-md">
              <h3 className="text-center text-lg font-semibold text-pink-400 mb-3">
                {leftDistrict.district}
              </h3>
              <RadarChart district={leftDistrict} />
            </div>

            {/* Right */}
            <div className="w-full md:w-1/2 p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-md">
              <h3 className="text-center text-lg font-semibold text-pink-400 mb-3">
                {rightDistrict.district}
              </h3>
              <RadarChart district={rightDistrict} />
            </div>
          </div>

          {/* Gemini AI Insight */}
          <div className="mt-6">
            <h3 className="text-center text-lg font-semibold text-pink-400 mb-4">
              Gemini's Take on the Comparison
            </h3>
            <GeminiChatPanel
              isCompareMode={true}
              comparisonContext={compareContext}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ComparePanel;
