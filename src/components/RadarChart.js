// src/components/RadarChart.js
import React from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

function normalize(value, max) {
  return Math.min((value / max) * 100, 100); // Scale to 0-100
}

const RadarChart = ({ district }) => {
  if (!district) return null;

  const data = {
    labels: ["Literacy", "Sex Ratio", "Density", "Urban %", "Area"],
    datasets: [
      {
        label: district.district,
        data: [
          normalize(district.literacy_rate, 100),       // Literacy out of 100
          normalize(district.sex_ratio, 1100),          // Avg ~950-1050
          normalize(district.density, 20000),           // Cap extreme values
          normalize(district.urban_percent, 100),       // Out of 100
          normalize(district.area_km2, 8000),           // Largest ~7500 km²
        ],
        backgroundColor: "rgba(236, 72, 153, 0.2)", // Tailwind's pink-500 @ 20%
        borderColor: "rgba(236, 72, 153, 1)",       // Tailwind's pink-500
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: "#444" },
        grid: { color: "#555" },
        pointLabels: {
          color: "#f3f4f6", // Tailwind gray-100
          font: { size: 14 },
        },
        ticks: {
          display: false,
          max: 100,
          min: 0,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
            label: function (context) {
                const label = context.chart.data.labels[context.dataIndex];
                const value = context.formattedValue;

                switch (label) {
                    case "Literacy":
                    case "Urban %":
                        return `${label}: ${value}%`;
                    case "Sex Ratio":
                        return `${label}: ${value} females / 100 males`;
                    case "Density":
                        return `${label}: ${value} people/km²`;
                    case "Area":
                        return `${label}: ${value} km²`;
                    default:
                        return `${label}: ${value}`
                }
            }
        }
      }
                    

    },
  };

  return (
    <div className="w-full h-64">
      <Radar data={data} options={options} />
    </div>
  );
};

export default RadarChart;
