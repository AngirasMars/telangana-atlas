// src/components/Map.js
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import districtData from "../data/districts_enriched.json";
import * as turf from '@turf/turf';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

function Map({ setSelectedDistrict, selectedDistrict }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [telanganaGeoJson, setTelanganaGeoJson] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false); // State to track map loading

  // Effect to load GeoJSON data
  useEffect(() => {
    fetch('/telangana_districts.geojson')
      .then(response => response.json())
      .then(data => {
        setTelanganaGeoJson(data);
      })
      .catch(error => console.error("Error loading telangana_districts.geojson:", error));
  }, []); // Run only once on component mount

  // Effect to initialize the map and add layers when map and data are ready
  useEffect(() => {
    if (map.current) return; // Ensure map is initialized only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v10", // Telangana dark theme
      center: [79.0193, 17.9784],
      zoom: 6.1,
      maxBounds: [
        [77.0, 15.8], // Southwest bounds of Telangana
        [82.0, 19.6], // Northeast bounds of Telangana
      ],
    });

    map.current.on("load", () => {
      setMapLoaded(true); // Map style and initial resources are loaded

      // Add sources and layers only if GeoJSON data is already available
      // If telanganaGeoJson is not yet loaded, these will be added by the second useEffect
      // that watches `telanganaGeoJson` (see below, if needed, or rely on this useEffect's re-run)
      if (telanganaGeoJson) {
        addMapLayers(map.current, telanganaGeoJson);
      }
    });

    // Event listener for map clicks (for initial districts-fill layer)
    map.current.on("click", "districts-fill", (e) => {
      if (e.features && e.features[0]) {
        const name = e.features[0].properties.district;
        const match = districtData.find(
          (d) => d.district.toLowerCase() === name.toLowerCase()
        );
        if (match) {
          setSelectedDistrict(match); // This will trigger the drawer and highlight
        }
      }
    });

    map.current.on("mouseenter", "districts-fill", () => {
      map.current.getCanvas().style.cursor = "pointer";
    });

    map.current.on("mouseleave", "districts-fill", () => {
      map.current.getCanvas().style.cursor = "";
    });

    // Cleanup function for the map
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount for map initialization


  // Separate useEffect to add layers/sources when both map is ready and GeoJSON data is loaded
  // This handles the case where telanganaGeoJson might load AFTER the map.on("load") event fires
  useEffect(() => {
    if (map.current && mapLoaded && telanganaGeoJson && !map.current.getSource('telangana')) {
      addMapLayers(map.current, telanganaGeoJson);
    }
  }, [mapLoaded, telanganaGeoJson]); // Dependencies: run when mapLoaded or telanganaGeoJson changes

  // Helper function to add layers to the map
  const addMapLayers = (currentMap, geojsonData) => {
    if (!currentMap.getSource('telangana')) { // Prevent adding source if already exists
      currentMap.addSource("telangana", {
        type: "geojson",
        data: geojsonData,
      });

      currentMap.addLayer({
        id: "districts-fill",
        type: "fill",
        source: "telangana",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "density"],
            0, "#F8BBD0",
            100, "#fee0d2",
            500, "#fc9272",
            5000, "#de2d26"
          ],
          "fill-opacity": 0.2,
        },
      });

      currentMap.addLayer({
        id: "districts-outline",
        type: "line",
        source: "telangana",
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.5,
        },
      });

      currentMap.addLayer({
        id: "districts-highlight",
        type: "line",
        source: "telangana",
        paint: {
          "line-color": "#FFD700",
          "line-width": 3,
        },
        filter: ["==", "district", ""], // Initially hidden
      });

      // ⭐ NEW: Add a symbol layer for district names
      currentMap.addLayer({
        id: "district-names",
        type: "symbol", // Symbol layers are used for points, icons, and text
        source: "telangana",
        layout: {
          // Use the 'district' property from your GeoJSON features as the text field
          "text-field": ["get", "district"], // Assumes 'district' is the property name
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], // Or other fonts you load/have
          "text-size": 12, // Base font size
          "text-allow-overlap": false, // Prevents text labels from overlapping
          "text-ignore-placement": false, // Allow Mapbox to optimize placement
        },
        paint: {
          "text-color": "#FFFFFF", // White text
          "text-halo-color": "#000000", // Black halo for contrast
          "text-halo-width": 1.5, // Halo width
          "text-opacity": [ // Make names more visible when zoomed in
            "step",
            ["zoom"],
            0,    // Fully transparent when zoom is 0
            6.5,  // Start appearing at zoom 6.5
            1     // Fully opaque at zoom 6.5 and higher
          ]
        }
      });
    }
  };


  // Effect to handle map centering and highlighting when selectedDistrict changes
  useEffect(() => {
    // Only proceed if the map is initialized, loaded, selectedDistrict exists, and GeoJSON is available
    if (map.current && mapLoaded && selectedDistrict && telanganaGeoJson) {
      // Clear any existing highlight first
      map.current.setFilter('districts-highlight', ["==", "district", ""]);

      const featureToHighlight = telanganaGeoJson.features.find(feature =>
        feature.properties &&
        feature.properties.district &&
        feature.properties.district.toUpperCase() === selectedDistrict.district.toUpperCase()
      );

      if (featureToHighlight) {
        const bbox = turf.bbox(featureToHighlight.geometry);

        map.current.fitBounds(bbox, {
          padding: 50,
          duration: 1000,
        });

        // Apply highlight filter
        map.current.setFilter('districts-highlight', ["==", ["upcase", ["get", "district"]], selectedDistrict.district.toUpperCase()]);

      } else {
        console.warn(`District feature not found in loaded GeoJSON for mapping: ${selectedDistrict.district}`);
      }
    } else if (map.current && mapLoaded && !selectedDistrict) {
      // If selectedDistrict is null, clear the highlight (only if map is loaded)
      map.current.setFilter('districts-highlight', ["==", "district", ""]);
    }
  }, [selectedDistrict, telanganaGeoJson, mapLoaded]); // Dependencies: run when these states/props change

  return <div ref={mapContainer} className="map-container h-full w-full" />;
}

export default Map;