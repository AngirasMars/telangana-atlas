// src/components/Map.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import districtData from "../data/districts_enriched.json";
import * as turf from "@turf/turf";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../components/firebase_keys";
import mapboxSdk from '@mapbox/mapbox-sdk';
import directions from '@mapbox/mapbox-sdk/services/directions';

const baseClient = mapboxSdk({ accessToken: process.env.REACT_APP_MAPBOX_TOKEN });
const directionsClient = directions(baseClient);

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

// 🧪 MOCK GPS LOCATION (Hyderabad)
navigator.geolocation.getCurrentPosition = (success) => {
  success({
    coords: {
      latitude: 17.385044,  // Hyderabad
      longitude: 78.486671,
    },
  });
};

navigator.geolocation.watchPosition = (success) => {
  success({
    coords: {
      latitude: 17.385044,
      longitude: 78.486671,
    },
  });
};

function Map({ setSelectedDistrict, selectedDistrict, isPlacingPin, onPinPlaced, selectedPinType }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [telanganaGeoJson, setTelanganaGeoJson] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pinGeoJson, setPinGeoJson] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const placingPinRef = useRef(isPlacingPin);
  const [viewport, setViewport] = useState(null);
  const [headlightPulse, setHeadlightPulse] = useState(0);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    fetch("/telangana_districts.geojson")
      .then((res) => res.json())
      .then(setTelanganaGeoJson)
      .catch((err) => console.error("Failed to load GeoJSON:", err));
  }, []);

  useEffect(() => {
    placingPinRef.current = isPlacingPin;
    
    // Update cursor based on pin placement mode
    if (map.current) {
      if (isPlacingPin) {
        map.current.getCanvas().style.cursor = "crosshair";
      } else {
        map.current.getCanvas().style.cursor = "";
      }
    }
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
      center: viewport?.center || [79.0193, 17.9784],
      zoom: viewport?.zoom || 2,
      bearing: viewport?.bearing || 0,
      pitch: viewport?.pitch || 0,
      maxBounds: [
        [77.0, 15.8],
        [82.0, 19.6],
      ],
    });

    // Create pin preview element
    const pinPreview = document.createElement("div");
    pinPreview.className = "pin-preview";
    pinPreview.style.position = "absolute";
    pinPreview.style.width = "20px";
    pinPreview.style.height = "20px";
    pinPreview.style.pointerEvents = "none";
    pinPreview.style.zIndex = 999;
    pinPreview.style.borderRadius = "50%";
    pinPreview.style.opacity = "0.9";
    pinPreview.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    pinPreview.style.display = "none";
    document.body.appendChild(pinPreview);

    setTimeout(() => {
      if (map.current) map.current.resize();
    }, 150);

    map.current.on("load", () => {
      setMapLoaded(true);
      if (telanganaGeoJson) addMapLayers(map.current, telanganaGeoJson);
      
      // Set up viewport tracking
      const handleMove = () => {
        setViewport({
          center: map.current.getCenter(),
          zoom: map.current.getZoom(),
          bearing: map.current.getBearing(),
          pitch: map.current.getPitch(),
        });
      };
      
      map.current.on("moveend", handleMove);
      
      // Add resize after map movements to ensure marker stability
      map.current.on("moveend", () => {
        setTimeout(() => {
          map.current?.resize();
        }, 100);
      });
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
      if (!placingPinRef.current) {
        map.current.getCanvas().style.cursor = "pointer";
      }
    });

    map.current.on("mouseleave", "districts-fill", () => {
      if (!placingPinRef.current) {
        map.current.getCanvas().style.cursor = "";
      }
    });

    // Add mouse move listener for pin preview
    const updateCursor = (e) => {
      if (!placingPinRef.current) {
        pinPreview.style.display = "none";
        return;
      }

      // Update position
      pinPreview.style.left = `${e.clientX - 10}px`;
      pinPreview.style.top = `${e.clientY - 10}px`;

      // Set color based on selectedPinType
      pinPreview.style.backgroundColor =
        selectedPinType === "live" ? "red" : "yellow";

      pinPreview.style.display = "block";
    };

    window.addEventListener("mousemove", updateCursor);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      window.removeEventListener("mousemove", updateCursor);
      if (pinPreview) document.body.removeChild(pinPreview);
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

      // Clear existing markers
      if (window.pinMarkers) {
        window.pinMarkers.forEach((m) => m.remove());
      }
      window.pinMarkers = [];

      // Add DOM-based markers
      pinGeoJson.features.forEach((feature) => {
        const el = document.createElement("div");
        el.className = "pin-marker";
        el.setAttribute("data-post-id", feature.properties.postId);
        
        // Apply the pin color from properties
        if (feature.properties.pinColor) {
          el.style.background = `radial-gradient(circle, ${feature.properties.pinColor} 0%, ${feature.properties.pinColor} 60%, transparent 100%)`;
          el.style.border = "2px solid white";
        }

        // Optional: add animation trigger class if it's a recent post
        if (feature.properties.shouldAnimate) {
          el.classList.add("highlighted");
          setTimeout(() => el.classList.remove("highlighted"), 2400);
        }

        // Add click handler
        el.addEventListener("click", () => {
          const postId = feature.properties.postId;
          if (postId) {
            // Trigger highlight animation
            el.classList.add("highlighted");
            setTimeout(() => el.classList.remove("highlighted"), 2400);
            
            window.dispatchEvent(new CustomEvent("scroll-to-post", { detail: { postId } }));
            window.dispatchEvent(new Event("open-charcha-tab"));
          }
        });

        // Add hover effects
        el.addEventListener("mouseenter", () => {
          map.current.getCanvas().style.cursor = "pointer";
          setHoveredPinId(feature.properties.postId);
        });

        el.addEventListener("mouseleave", () => {
          map.current.getCanvas().style.cursor = "";
          setHoveredPinId(null);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat(feature.geometry.coordinates)
          .addTo(map.current);

        window.pinMarkers.push(marker);
      });

      // Add highlight-pin event listener
      window.addEventListener("highlight-pin", (e) => {
        const postId = e.detail.postId;
        const el = document.querySelector(`.pin-marker[data-post-id="${postId}"]`);
        if (el) {
          el.classList.add("highlighted");
          setTimeout(() => el.classList.remove("highlighted"), 2400);
        }
      });

      console.log("DOM pin markers added to map");
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

      // Force resize to refresh marker positions after bounds fit
      setTimeout(() => {
        map.current?.resize();
      }, 1100); // Slightly longer than the fitBounds duration

      map.current.setFilter("districts-highlight", [
        "==",
        ["upcase", ["get", "district"]],
        selectedDistrict.district.toUpperCase(),
      ]);
    }
  }, [selectedDistrict, telanganaGeoJson, mapLoaded]);

  const fetchPins = useCallback(async () => {
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

      let pinColor = "#ffe066"; // default for persistent pins (soft sunflower yellow)

      if (data.pinType === "live" && data.timestamp?.toDate) {
        const now = Date.now();
        const postTime = data.timestamp.toDate().getTime();
        const hoursAgo = (now - postTime) / (1000 * 60 * 60);

        if (hoursAgo < 24) pinColor = "#ff4d4d"; // bright red
        else if (hoursAgo < 48) pinColor = "#ff9900"; // deep orange
        else if (hoursAgo < 72) pinColor = "#66cc66"; // soft green
        else return; // 🧹 Skip expired live pins
      }

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
        id: doc.id, // 👈 Required for feature state
      });
    });

    setPinGeoJson({
      type: "FeatureCollection",
      features,
    });
  }, [selectedDistrict]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  useEffect(() => {
    const handleFlyToPins = (e) => {
      const pins = e.detail;
      if (pins && pins.length > 0) {
        const first = pins[0];
        map.current?.flyTo({ center: [first.lng, first.lat], zoom: 14, essential: true });
        
        // Force resize to refresh marker positions after animation
        setTimeout(() => {
          map.current?.resize();
        }, 500);
      }
    };
    const handleFlyToPin = (e) => {
      const { lat, lng, postId } = e.detail;
      map.current?.flyTo({ center: [lng, lat], zoom: 14, essential: true });
      
      // Animate the pin using DOM highlight
      if (postId) {
        console.log("Highlighting pin for postId:", postId);
        setHighlightedPostId(postId);
        window.dispatchEvent(new CustomEvent("highlight-pin", { detail: { postId } }));
      }
    };
    const handleFlyToArea = (e) => {
      const { lat, lng } = e.detail;
      map.current?.flyTo({ center: [lng, lat], zoom: 15, essential: true });

      setTimeout(() => {
        map.current?.resize();
      }, 500);
    };

    window.addEventListener("fly-to-pins", handleFlyToPins);
    window.addEventListener("fly-to-pin", handleFlyToPin);
    window.addEventListener("fly-to-area", handleFlyToArea);
    return () => {
      window.removeEventListener("fly-to-pins", handleFlyToPins);
      window.removeEventListener("fly-to-pin", handleFlyToPin);
      window.removeEventListener("fly-to-area", handleFlyToArea);
    };
  }, []);

  useEffect(() => {
    const handleRefreshPins = (e) => {
      const districtName = e.detail.district;
      if (!districtName || districtName !== selectedDistrict?.district) return;
      console.log("⟳ Refreshing pins for:", districtName);
      fetchPins(); // manually trigger re-fetch
    };

    window.addEventListener("refresh-pins", handleRefreshPins);
    return () => window.removeEventListener("refresh-pins", handleRefreshPins);
  }, [selectedDistrict, fetchPins]);

  // Live User GPS Tracking
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Headlight pulse animation
    const pulseInterval = setInterval(() => {
      setHeadlightPulse(prev => (prev === 0 ? 1 : 0));
    }, 1000); // Pulse every 1 second

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const geojson = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              properties: {
                pulse: headlightPulse,
              },
            },
          ],
        };

        if (map.current.getSource("user-location")) {
          map.current.getSource("user-location").setData(geojson);
        } else {
          map.current.addSource("user-location", {
            type: "geojson",
            data: geojson,
          });

          map.current.addLayer({
            id: "user-location-layer",
            type: "circle",
            source: "user-location",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "pulse"],
                0, 4,
                1, 6
              ],
              "circle-color": "#3b82f6",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": [
                "interpolate",
                ["linear"],
                ["get", "pulse"],
                0, 1,
                1, 2
              ],
              "circle-stroke-opacity": [
                "interpolate",
                ["linear"],
                ["get", "pulse"],
                0, 0.8,
                1, 1
              ],
            },
          });
        }
      },
      (err) => console.error("Error getting location", err),
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(pulseInterval);
    };
  }, [mapLoaded]);

  // Real-time user location for DOM marker
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting location:", error);
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Add/update pulsing blue dot marker
  useEffect(() => {
    if (!map.current || !userLocation) return;
    // Remove previous marker if exists
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }
    // Create DOM element for pulsing dot
    const el = document.createElement('div');
    el.className = 'pulse-location';
    // Always add marker to map
    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);
    // Clean up on unmount
    return () => {
      if (userMarkerRef.current) userMarkerRef.current.remove();
    };
  }, [userLocation, mapLoaded]);

  // Helper to format duration and distance
  const formatEta = (seconds) => Math.round(seconds / 60);
  const formatDistance = (meters) => (meters / 1000).toFixed(1);

  // Navigation Route Handler
  useEffect(() => {
    const handleNavigateToPin = (e) => {
      const { lat, lng } = e.detail;
      handleNavigateToPinImpl(lat, lng);
    };
    const handleNavigateToPinImpl = async (lat, lng) => {
      const userSource = map.current?.getSource("user-location");
      if (!userSource?._data?.features?.[0]) {
        console.log("User location not available for navigation");
        return;
      }
      const userCoords = userSource._data.features[0].geometry.coordinates;
      const navSource = map.current.getSource("navigation-line");
      // Toggle off if already exists
      if (navSource) {
        map.current.removeLayer("navigation-line-layer");
        map.current.removeSource("navigation-line");
        setEta(null);
        setDistance(null);
        return;
      }
      map.current.flyTo({
        center: userCoords,
        zoom: 14,
        speed: 1.5,
        curve: 1.42,
        essential: true
      });
      try {
        const res = await directionsClient.getDirections({
          profile: 'driving',
          geometries: 'geojson',
          waypoints: [
            { coordinates: userCoords },
            { coordinates: [lng, lat] },
          ],
        }).send();
        const route = res.body.routes[0];
        const { geometry, duration, distance } = route;
        setEta(duration);
        setDistance(distance);
        if (map.current.getLayer("navigation-line-layer")) {
          map.current.removeLayer("navigation-line-layer");
        }
        if (map.current.getSource("navigation-line")) {
          map.current.removeSource("navigation-line");
        }
        map.current.addSource("navigation-line", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: geometry,
          },
        });
        map.current.addLayer({
          id: "navigation-line-layer",
          type: "line",
          source: "navigation-line",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 4,
            "line-opacity": 0.9,
            "line-dasharray": [2, 2]
          },
        });
        const bbox = turf.bbox(geometry);
        map.current.fitBounds(bbox, { padding: 100, duration: 1000 });
      } catch (error) {
        console.error("Navigation Error:", error);
        setEta(null);
        setDistance(null);
        const navLine = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [userCoords, [lng, lat]],
          },
        };
        if (map.current.getLayer("navigation-line-layer")) {
          map.current.removeLayer("navigation-line-layer");
        }
        if (map.current.getSource("navigation-line")) {
          map.current.removeSource("navigation-line");
        }
        map.current.addSource("navigation-line", {
          type: "geojson",
          data: navLine,
        });
        map.current.addLayer({
          id: "navigation-line-layer",
          type: "line",
          source: "navigation-line",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 4,
            "line-opacity": 0.9,
            "line-dasharray": [2, 2]
          },
        });
        map.current.fitBounds(
          [userCoords, [lng, lat]],
          { padding: 100, duration: 1000 }
        );
      }
    };

    const handleStartNavigation = (e) => {
      const { lat, lng } = e.detail;
      handleNavigateToPinImpl(lat, lng);
    };

    window.addEventListener("navigate-to-pin", handleNavigateToPin);
    window.addEventListener("start-navigation", handleStartNavigation);
    return () => {
      window.removeEventListener("navigate-to-pin", handleNavigateToPin);
      window.removeEventListener("start-navigation", handleStartNavigation);
    };
  }, [mapLoaded]);

  const flyToUserLocation = () => {
    if (!map.current || !userLocation) {
      console.warn("User location not available");
      return;
    }
    map.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 15,
      speed: 1.5,
      curve: 1.42,
      essential: true,
    });
    setTimeout(() => {
      map.current?.resize();
    }, 500);
  };

  return (
    <>
      <div
        ref={mapContainer}
        className="map-container absolute top-0 left-0 w-full h-full z-0"
      />
      {/* Fly to My Location Button */}
      <button
        onClick={flyToUserLocation}
        className="absolute bottom-20 left-4 z-50 bg-white bg-opacity-90 text-blue-600 p-2 rounded-full shadow-lg hover:scale-105 transition"
        title="Go to my location"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 12m-9 0a9 9 0 1118 0a9 9 0 01-18 0zm9-4v4l2 2"
          />
        </svg>
      </button>
      {eta && distance && (
        <div className="absolute top-2 right-2 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          ETA: {formatEta(eta)} mins • Distance: {formatDistance(distance)} km
        </div>
      )}
    </>
  );
}

export default Map;

