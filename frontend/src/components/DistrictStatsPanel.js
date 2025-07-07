// src/components/DistrictStatsPanel.js
import React from "react";
import RadarChart from "./RadarChart";

const DistrictStatsPanel = ({ district }) => {
  if (!district) return null;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left: Radar Chart */}
      <div className="w-full md:w-1/2 p-4 bg-gray-800 rounded-xl shadow-md border border-gray-700">
        <h3 className="text-lg font-semibold text-pink-400 mb-3 text-center">
          District Profile: Radar View
        </h3>
        <RadarChart district={district} />
      </div>

      {/* Right: Key Stats */}
      <div className="w-full md:w-1/2 p-4 bg-gray-800 rounded-xl shadow-md border border-gray-700">
        <h3 className="text-lg font-semibold text-pink-400 mb-3 text-center">
          Demographics Snapshot
        </h3>
        <ul className="text-sm space-y-3 text-gray-300">
          <li><strong>Population:</strong> {district.population.toLocaleString()}</li>
          <li><strong>Density:</strong> {district.density} people/km²</li>
          <li><strong>Area:</strong> {district.area_km2} km²</li>
          <li><strong>Literacy Rate:</strong> {district.literacy_rate}%</li>
          <li><strong>Sex Ratio:</strong> {district.sex_ratio} females / 1000 males</li>
          <li><strong>Urban Population:</strong> {district.urban_percent}%</li>
          <li><strong>Rural Population:</strong> {district.rural_percent}%</li>
        </ul>
      </div>
    </div>
  );
};

export default DistrictStatsPanel;
