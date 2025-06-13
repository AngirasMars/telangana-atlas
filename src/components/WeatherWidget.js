// src/components/WeatherWidget.js
import React, { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, Wind, Thermometer, ChevronDown, ChevronUp } from "lucide-react";

const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;

function WeatherWidget({ selectedDistrict, isExpanded, setIsExpanded }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch if a district is selected, has center coordinates, and we have an API key
    if (!selectedDistrict || !selectedDistrict.center || !OPENWEATHER_API_KEY) {
      setWeatherData(null); // Clear data if no district or key
      return;
    }

    const [lon, lat] = selectedDistrict.center; // selectedDistrict.center is [longitude, latitude]

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        setWeatherData(data);
      } catch (e) {
        console.error("Failed to fetch weather data:", e);
        setError("Failed to load weather data. Please try again or check API key.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if the widget is expanded, or if we want to show current weather in collapsed state
    // Let's modify: fetch whenever selectedDistrict changes, and then display based on isExpanded
    fetchWeather();

  }, [selectedDistrict]); // Re-fetch when district changes

  const getWeatherIcon = (iconCode) => {
    if (!iconCode) return <Cloud className="w-6 h-6 text-gray-400" />;
    // OpenWeatherMap icons: https://openweathermap.org/weather-conditions
    if (iconCode.includes("01")) return <Sun className="w-6 h-6 text-yellow-400" />; // 01d, 01n clear sky
    if (iconCode.includes("02")) return <Cloud className="w-6 h-6 text-gray-400" />; // Few clouds
    if (iconCode.includes("03") || iconCode.includes("04")) return <Cloud className="w-6 h-6 text-gray-500" />; // Scattered, broken clouds
    if (iconCode.includes("09") || iconCode.includes("10")) return <CloudRain className="w-6 h-6 text-blue-400" />; // Rain, shower rain
    if (iconCode.includes("11")) return <CloudRain className="w-6 h-6 text-red-400" />; // Thunderstorm
    if (iconCode.includes("13")) return <Cloud className="w-6 h-6 text-gray-300" />; // Snow (using generic cloud for now)
    if (iconCode.includes("50")) return <Wind className="w-6 h-6 text-gray-400" />; // Mist
    return <Cloud className="w-6 h-6 text-gray-400" />; // Default fallback
  };

  if (!selectedDistrict) {
    return null; // Don't show widget if no district is selected
  }

  // Helper to format date for daily forecast
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", { weekday: 'short', day: 'numeric' });
  };

  return (
    // Adjusted top position to make space for the SearchBar
    <div
      className={`fixed top-16 left-4 z-50 bg-gray-900 text-white shadow-2xl
        rounded-lg px-4 py-3 transition-all duration-300 ease-in-out border border-pink-500
        ${isExpanded ? "w-80 md:w-96 h-auto" : "w-40 h-auto"}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-pink-400">
          {selectedDistrict.district}
        </h3>
        <button
          onClick={() => setIsExpanded((prev) => !prev)} // Calls the handleToggleWeather from App.js
          className="bg-gray-800 p-1 rounded-full shadow-md hover:bg-gray-700"
          aria-label="Toggle Weather"
        >
          {isExpanded ? (
            <ChevronUp className="text-pink-400 w-5 h-5" />
          ) : (
            <ChevronDown className="text-pink-400 w-5 h-5" />
          )}
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading weather...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && weatherData && (
        isExpanded ? (
          // Expanded View
          <div>
            <div className="flex items-center justify-between text-xl font-bold mb-3">
              <div className="flex items-center">
                {getWeatherIcon(weatherData.current.weather[0]?.icon)}
                <span className="ml-2">{Math.round(weatherData.current.temp)}°C</span>
              </div>
              <span className="text-base text-gray-300 capitalize">{weatherData.current.weather[0]?.description}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div className="flex items-center"><Thermometer className="w-4 h-4 mr-1 text-red-400" /> Feels Like: {Math.round(weatherData.current.feels_like)}°C</div>
                <div className="flex items-center"><Wind className="w-4 h-4 mr-1 text-blue-400" /> Wind: {Math.round(weatherData.current.wind_speed * 3.6)} km/h</div> {/* Convert m/s to km/h */}
                <div className="flex items-center">Humidity: {weatherData.current.humidity}%</div>
                <div className="flex items-center">Pressure: {weatherData.current.pressure} hPa</div>
            </div>

            <h4 className="text-md font-semibold text-pink-300 mb-2">7-Day Forecast</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thumb-pink-500 scrollbar-track-gray-800 scrollbar-thin">
              {weatherData.daily.slice(1, 8).map((day, index) => ( // Skip current day, show next 7 days
                <div key={index} className="flex justify-between items-center text-sm py-1 border-b border-gray-700 last:border-b-0">
                  <span className="font-medium">{formatDate(day.dt)}</span>
                  <div className="flex items-center">
                    {getWeatherIcon(day.weather[0]?.icon)}
                    <span className="ml-2 text-gray-300 capitalize">{day.weather[0]?.description}</span>
                  </div>
                  <span className="font-bold">{Math.round(day.temp.max)}°C / {Math.round(day.temp.min)}°C</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Collapsed View (only shows if weatherData is available)
          weatherData.current && (
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center">
                {getWeatherIcon(weatherData.current.weather[0]?.icon)}
                <span className="ml-2 text-lg font-bold">
                  {Math.round(weatherData.current.temp)}°C
                </span>
              </div>
              <span className="text-sm text-gray-300 capitalize">
                {weatherData.current.weather[0]?.description}
              </span>
            </div>
          )
        )
      )}
    </div>
  );
}

export default WeatherWidget;