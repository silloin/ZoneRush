 C:\Users\hp\Desktop\Realtime-Location-Tracker-main - local - Copy> git add .; git commit -m "fix: Add fallback Mapbox access token"; git push
warning: in the working copy of 'client/src/components/Map/MapboxMap.jsx', LF will be replaced by CRLF the next time Git touches it
[main 28dcd77] fix: Add fallback Mapbox access token
 1 file changed, 2 insertions(+), 2 deletions(-)
Enumerating objects: 13, done.
Counting objects: 100% (13/13), done.
Delta compression using up to 8 threads
Compressing objects: 100% (7/7), done.
Writing objects: 100% (7/7), 653 bytes | 653.00 KiB/s, done.
Total 7 (delta 6), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (6/6), completed with 6 local objects.
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote:
remote: - GITHUB PUSH PROTECTION
remote:   —————————————————————————————————————————
remote:     Resolve the following violations before pushing again
remote:
remote:     - Push cannot contain secrets
remote:
remote:
remote:      (?) Learn how to resolve a blocked push
remote:      https://docs.github.com/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/working-with-push-protection-from-the-command-line#resolving-a-blocked-push
remote:
remote:
remote:       —— Mapbox Secret Access Token ————————————————————————
remote:        locations:
remote:          - commit: 28dcd77d243ff0647a69b8fe5a3a75d81b71d3fd
remote:            path: client/src/components/Map/MapboxMap.jsx:14
remote:
remote:        (?) To push, remove secret from commit(s) or follow this URL to allow the secret.
remote:        https://github.com/silloin/ZoneRush/security/secret-scanning/unblock-secret/3AiHlbWyz1pUAN20foiQgJmhWW4
remote:
remote:
remote:
To https://github.com/silloin/ZoneRush.git
 ! [remote rejected] main -> main (push declined due to repository rule violations)       
error: failed to push some refs to 'https://github.com/silloin/ZoneRush.git'
PS C:\Users\hp\Desktop\Realtime-Location-Tracker-main - local - Copy> import React, { useRef, useEffect, useState, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { io } from 'socket.io-client';
import ngeohash from 'ngeohash';
import { AuthContext } from '../../context/AuthContext';
import RunTracker from '../RunTracker';
import IntervalTimer from '../IntervalTimer';
import './Map.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY;

const MapboxMap = () => {
  const { user } = useContext(AuthContext);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const socket = useRef(null);
  const watchId = useRef(null);
  const userMarker = useRef(null);
  const userHeading = useRef(0);
  const [tiles, setTiles] = useState([]);
  const [showTracker, setShowTracker] = useState(false);
  const [showIntervals, setShowIntervals] = useState(false);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [isRunActive, setIsRunActive] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [center, setCenter] = useState([0, 0]);
  const directionsControl = useRef(null);
  
  // Run tracking state - lifted up to persist when panel is hidden
  const [isTracking, setIsTracking] = useState(false);
  const [runStats, setRunStats] = useState({
    duration: 0,
    distance: 0,
    pace: 0,
    startTime: null
  });

  useEffect(() => {
    if (map.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.longitude, position.coords.latitude];
        setCenter(coords);
        initializeMap(coords);
      },
      () => {
        const fallback = [55.2708, 25.2048];
        setCenter(fallback);
        initializeMap(fallback);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const initializeMap = (coords) => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: coords,
      zoom: 15
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      fetchTiles();
      startLocationTracking();
    });
  };

  const startLocationTracking = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    socket.current = io(apiUrl.replace('/api', ''));
    socket.current.on('tiles-captured', () => fetchTiles());

    directionsControl.current = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'mapbox/walking',
      controls: {
        inputs: true,
        instructions: true
      },
      flyTo: false,
      interactive: true,
      alternatives: true
    });
    
    // Override the _move method to prevent layer query errors
    const originalMove = directionsControl.current._move;
    directionsControl.current._move = function(e) {
      try {
        if (this._map && this._map.isStyleLoaded()) {
          const layers = this._map.getStyle().layers;
          const hasDirectionsLayers = layers.some(layer => 
            layer.id.includes('directions-route-line-alt') || 
            layer.id.includes('directions-origin-point')
          );
          if (hasDirectionsLayers) {
            originalMove.call(this, e);
          }
        }
      } catch (error) {
        // Silently ignore layer query errors
      }
    };
    
    // Override the _onSingleClick method to prevent layer query errors
    const originalOnSingleClick = directionsControl.current._onSingleClick;
    directionsControl.current._onSingleClick = function(e) {
      try {
        if (this._map && this._map.isStyleLoaded()) {
          const layers = this._map.getStyle().layers;
          const hasDirectionsLayers = layers.some(layer => 
            layer.id.includes('directions-origin-point')
          );
          if (hasDirectionsLayers) {
            originalOnSingleClick.call(this, e);
          }
        }
      } catch (error) {
        // Silently ignore layer query errors
      }
    };
    
    map.current.addControl(directionsControl.current, 'top-left');

    // Auto-set origin to live location
    if (center[0] !== 0) {
      setTimeout(() => {
        directionsControl.current.setOrigin(center);
      }, 500);
    }

    userMarker.current = new mapboxgl.Marker({ color: '#4285F4' })
      .setLngLat(center)
      .addTo(map.current);

    if ('geolocation' in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords = [position.coords.longitude, position.coords.latitude];
          const heading = position.coords.heading;
          
          setCenter(coords);
          
          if (heading !== null && heading !== undefined) {
            userHeading.current = heading;
          }
          
          if (userMarker.current) {
            userMarker.current.setLngLat(coords);
            if (userHeading.current) {
              userMarker.current.setRotation(userHeading.current);
            }
          }
          
          if (map.current) map.current.flyTo({ center: coords, duration: 1000 });
          setLocationError(null);
        },
        () => {
          setLocationError('Location denied - using Dubai fallback');
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
  };

  const fetchTiles = async () => {
    try {
      const res = await axios.get('/tiles');
      const tilesData = Array.isArray(res.data) ? res.data : [];
      setTiles(tilesData);
      renderTiles(tilesData);
    } catch (err) {
      console.error(err);
    }
  };

  const renderTiles = (tilesData) => {
    if (!map.current) return;

    if (map.current.getSource('tiles')) {
      map.current.removeLayer('tiles-layer');
      map.current.removeSource('tiles');
    }

    const features = tilesData.map(tile => {
      const coords = ngeohash.decode(tile.geohash);
      const isMine = tile.ownerId === user?.id;
      return {
        type: 'Feature',
        properties: { color: isMine ? '#3b82f6' : '#ef4444' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [coords.longitude - 0.0005, coords.latitude - 0.0005],
            [coords.longitude + 0.0005, coords.latitude - 0.0005],
            [coords.longitude + 0.0005, coords.latitude + 0.0005],
            [coords.longitude - 0.0005, coords.latitude + 0.0005],
            [coords.longitude - 0.0005, coords.latitude - 0.0005]
          ]]
        }
      };
    });

    map.current.addSource('tiles', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features }
    });

    map.current.addLayer({
      id: 'tiles-layer',
      type: 'fill',
      source: 'tiles',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.4,
        'fill-outline-color': '#ffffff'
      }
    });

    fetchTerritories();
  };

  const fetchTerritories = async () => {
    try {
      const res = await axios.get('/territories');
      if (map.current && res.data.features && res.data.features.length > 0) {
        if (map.current.getSource('territories')) {
          map.current.getSource('territories').setData(res.data);
        } else {
          map.current.addSource('territories', {
            type: 'geojson',
            data: res.data
          });

          map.current.addLayer({
            id: 'territories-layer',
            type: 'fill',
            source: 'territories',
            paint: {
              'fill-color': '#00ff00',
              'fill-opacity': 0.3
            }
          });

          map.current.addLayer({
            id: 'territories-outline',
            type: 'line',
            source: 'territories',
            paint: {
              'line-color': '#00ff00',
              'line-width': 2
            }
          });
        }
      }
    } catch (err) {
      // Silently ignore
    }
  };

  // Draw live route line on map when currentRoute changes
  useEffect(() => {
    if (!map.current || currentRoute.length === 0) return;

    const coordinates = currentRoute.map(point => [point.lng, point.lat]);
    
    const routeGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    };

    if (map.current.getSource('live-route')) {
      map.current.getSource('live-route').setData(routeGeoJSON);
    } else {
      map.current.addSource('live-route', {
        type: 'geojson',
        data: routeGeoJSON
      });
      
      map.current.addLayer({
        id: 'live-route-line',
        type: 'line',
        source: 'live-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ef4444',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    }
  }, [currentRoute]);

  useEffect(() => {
    return () => {
      if (socket.current) socket.current.disconnect();
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (map.current) map.current.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {locationError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-red-500 text-white p-4 rounded-lg">
          {locationError}
        </div>
      )}
      
      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <button
          onClick={() => {
            if (directionsControl.current && center[0] !== 0) {
              directionsControl.current.setOrigin(center);
            }
          }}
          className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-cyan-700 transition"
        >
          Use My Location
        </button>
        <button
          onClick={() => setShowTracker(!showTracker)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
        >
          {showTracker ? 'Hide Panel' : isTracking ? 'Show Panel' : isRunActive ? 'Show Panel' : 'Start New Run'}
        </button>
        <button
          onClick={() => setShowIntervals(!showIntervals)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-700 transition"
        >
          {showIntervals ? 'Hide Interval' : 'Interval Mode'}
        </button>
        <button
          onClick={() => {
            if (map.current) {
              map.current.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
              // Re-add live route layer after style change
              map.current.once('style.load', () => {
                if (currentRoute.length > 0) {
                  const coordinates = currentRoute.map(point => [point.lng, point.lat]);
                  const routeGeoJSON = {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates }
                  };
                  map.current.addSource('live-route', {
                    type: 'geojson',
                    data: routeGeoJSON
                  });
                  map.current.addLayer({
                    id: 'live-route-line',
                    type: 'line',
                    source: 'live-route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#ef4444', 'line-width': 4, 'line-opacity': 0.8 }
                  });
                }
              });
            }
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-green-700 transition"
        >
          Satellite
        </button>
        <button
          onClick={() => {
            if (map.current) {
              map.current.setStyle('mapbox://styles/mapbox/streets-v12');
              // Re-add live route layer after style change
              map.current.once('style.load', () => {
                if (currentRoute.length > 0) {
                  const coordinates = currentRoute.map(point => [point.lng, point.lat]);
                  const routeGeoJSON = {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates }
                  };
                  map.current.addSource('live-route', {
                    type: 'geojson',
                    data: routeGeoJSON
                  });
                  map.current.addLayer({
                    id: 'live-route-line',
                    type: 'line',
                    source: 'live-route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#ef4444', 'line-width': 4, 'line-opacity': 0.8 }
                  });
                }
              });
            }
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-purple-700 transition"
        >
          Streets
        </button>
        <button
          onClick={() => {
            if (directionsControl.current) {
              directionsControl.current.removeRoutes();
            }
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-red-700 transition"
        >
          Clear Route
        </button>
        <button
          onClick={fetchTerritories}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-yellow-700 transition"
        >
          Refresh Territories
        </button>
      </div>

      {showIntervals && (
        <div className="absolute top-20 right-4 z-50 w-80">
          <IntervalTimer onClose={() => setShowIntervals(false)} />
        </div>
      )}

      {(showTracker || isTracking) && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
          <RunTracker 
            isTracking={isTracking}
            setIsTracking={setIsTracking}
            runStats={runStats}
            setRunStats={setRunStats}
            currentRoute={currentRoute}
            onRouteUpdate={(newRoute) => {
              setCurrentRoute(newRoute);
              if (newRoute.length > 0 && !isTracking) setIsRunActive(true);
            }}
            onRunComplete={() => {
              setShowTracker(false);
              setIsRunActive(false);
              setIsTracking(false);
              setRunStats({ duration: 0, distance: 0, pace: 0, startTime: null });
              
              // Clear the live route line from map
              if (map.current && map.current.getSource('live-route')) {
                map.current.removeLayer('live-route-line');
                map.current.removeSource('live-route');
              }
              
              setCurrentRoute([]);
              fetchTiles();
            }} 
          />
        </div>
      )}
      
      {/* Minimized Run Indicator - shows when tracking but panel is hidden */}
      {isTracking && !showTracker && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-4 cursor-pointer" onClick={() => setShowTracker(true)}>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
            <span className="font-bold">Run in Progress</span>
          </div>
          <div className="text-gray-400">|</div>
          <div className="text-sm">
            <span className="text-blue-400">{(runStats.distance / 1000).toFixed(2)} km</span>
            <span className="text-gray-500 mx-2">•</span>
            <span className="text-green-400">{Math.floor(runStats.duration / 60)}m {runStats.duration % 60}s</span>
          </div>
          <div className="text-gray-400 text-xs">(Click to show)</div>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;