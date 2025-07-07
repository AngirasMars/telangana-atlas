// src/components/Map.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import districtData from "../data/districts_enriched.json";
import * as turf from "@turf/turf";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

function Map({ setSelectedDistrict, selectedDistrict, isPlacingPin, onPinPlaced }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [telanganaGeoJson, setTelanganaGeoJson] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pinGeoJson, setPinGeoJson] = useState(null);
  const placingPinRef = useRef(isPlacingPin);

  useEffect(() => {
    fetch("/telangana_districts.geojson")
      .then((res) => res.json())
      .then(setTelanganaGeoJson)
      .catch((err) => console.error("Failed to load GeoJSON:", err));
  }, []);

  useEffect(() => {
    placingPinRef.current = isPlacingPin;
  }, [isPlacingPin]);

  const addMapLayers = useCallback((mapInstance, geojsonData) => {
    if (!mapInstance.getSource("telangana")) {
      mapInstance.addSource("telangana", {
        type: "geojson",
        data: geojsonData,
      });

      mapInstance.addLayer({
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
            5000, "#de2d26",
          ],
          "fill-opacity": 0.2,
        },
      });

      mapInstance.addLayer({
        id: "districts-outline",
        type: "line",
        source: "telangana",
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.5,
        },
      });

      mapInstance.addLayer({
        id: "districts-highlight",
        type: "line",
        source: "telangana",
        paint: {
          "line-color": "#FFD700",
          "line-width": 3,
        },
        filter: ["==", "district", ""],
      });

      mapInstance.addLayer({
        id: "district-names",
        type: "symbol",
        source: "telangana",
        layout: {
          "text-field": ["get", "district"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#FFFFFF",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
          "text-opacity": ["step", ["zoom"], 0, 6.5, 1],
        },
      });
    }
  }, []);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v10",
      center: [79.0193, 17.9784],
      zoom: 2,
      maxBounds: [
        [77.0, 15.8],
        [82.0, 19.6],
      ],
    });

    setTimeout(() => {
      if (map.current) map.current.resize();
    }, 150);

    map.current.on("load", () => {
      setMapLoaded(true);
      if (telanganaGeoJson) addMapLayers(map.current, telanganaGeoJson);
    });

    map.current.on("click", (e) => {
      if (placingPinRef.current) {
        const { lng, lat } = e.lngLat;
        onPinPlaced({ lat, lng });
        return;
      }

      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ["districts-fill"],
      });

      if (features.length) {
        const name = features[0].properties.district;
        const match = districtData.find((d) =>
          d.district.toLowerCase() === name.toLowerCase()
        );
        if (match) {
          setSelectedDistrict(match);
        }
      }
    });

    map.current.on("mouseenter", "districts-fill", () => {
      map.current.getCanvas().style.cursor = "pointer";
    });

    map.current.on("mouseleave", "districts-fill", () => {
      map.current.getCanvas().style.cursor = "";
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [telanganaGeoJson, addMapLayers]);

  useEffect(() => {
    if (!map.current || !pinGeoJson) return;

    const tryRenderPins = () => {
      if (!map.current.isStyleLoaded()) {
        console.log("Map style not ready. Retrying pin render in 300ms...");
        setTimeout(tryRenderPins, 300);
        return;
      }

      if (map.current.getSource("charcha-pins")) {
        map.current.getSource("charcha-pins").setData(pinGeoJson);
        console.log("Pin source updated.");
      } else {
        map.current.addSource("charcha-pins", {
          type: "geojson",
          data: pinGeoJson,
        });

        map.current.addLayer({
          id: "charcha-pin-layer",
          type: "symbol",
          source: "charcha-pins",
          layout: {
            "icon-image": "marker-15",
            "icon-size": 1.5,
            "icon-allow-overlap": true,
            "text-field": ["get", "userName"],
            "text-size": 12,
            "text-anchor": "top",
            "text-offset": [0, 1.2],
          },
          paint: {
            "icon-color": ["get", "pinColor"],
            "text-color": ["get", "pinColor"],
            "text-opacity": ["step", ["zoom"], 0, 14, 1], // 👈 userName only shows after zoom level 14
          },
        });

        map.current.on("click", "charcha-pin-layer", (e) => {
          const postId = e.features[0].properties.postId;
          if (postId) {
            window.dispatchEvent(new CustomEvent("scroll-to-post", { detail: { postId } }));
            window.dispatchEvent(new Event("open-charcha-tab"));
          }
        });

        console.log("Pin layer added to map");
      }
    };

    tryRenderPins();
  }, [pinGeoJson]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedDistrict || !telanganaGeoJson)
      return;

    if (placingPinRef.current) return;

    map.current.setFilter("districts-highlight", ["==", "district", ""]);

    const feature = telanganaGeoJson.features.find(
      (f) =>
        f.properties?.district?.toUpperCase() ===
        selectedDistrict.district.toUpperCase()
    );

    if (feature) {
      const bbox = turf.bbox(feature.geometry);
      map.current.fitBounds(bbox, { padding: 50, duration: 1000 });

      map.current.setFilter("districts-highlight", [
        "==",
        ["upcase", ["get", "district"]],
        selectedDistrict.district.toUpperCase(),
      ]);
    }
  }, [selectedDistrict, telanganaGeoJson, mapLoaded]);

  useEffect(() => {
    const fetchPins = async () => {
      if (!selectedDistrict?.district) {
        setPinGeoJson(null);
        return;
      }

      const colRef = collection(db, "charcha", selectedDistrict.district, "posts");
      const snapshot = await getDocs(colRef);
      const features = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Pin data from Firestore:", data);

        if (!data.lat || !data.lng) return;

        let pinColor = "white"; // Fallback color for now
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [data.lng, data.lat],
          },
          properties: {
            text: data.text || "",
            userName: data.userName || "Unknown",
            postId: doc.id,
            pinColor,
          },
        });
      });

      setPinGeoJson({
        type: "FeatureCollection",
        features,
      });
    };

    fetchPins();
  }, [selectedDistrict]);

  useEffect(() => {
    const handleFlyToPins = (e) => {
      const pins = e.detail;
      if (pins && pins.length > 0) {
        const first = pins[0];
        map.current?.flyTo({ center: [first.lng, first.lat], zoom: 14, essential: true });
      }
    };
    const handleFlyToPin = (e) => {
      const { lat, lng } = e.detail;
      map.current?.flyTo({ center: [lng, lat], zoom: 14, essential: true });
    };

    window.addEventListener("fly-to-pins", handleFlyToPins);
    window.addEventListener("fly-to-pin", handleFlyToPin);
    return () => {
      window.removeEventListener("fly-to-pins", handleFlyToPins);
      window.removeEventListener("fly-to-pin", handleFlyToPin);
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="map-container absolute top-0 left-0 w-full h-full z-0"
    />
  );
}

export default Map;

