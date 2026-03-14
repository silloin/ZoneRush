import React, { useRef, useEffect, useState, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { io } from 'socket.io-client';
import ngeohash from 'ngeohash';
import { AuthContext } from '../../context/AuthContext';
import { Activity, Route } from 'lucide-react';
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
  const startMarker = useRef(null);
  const userHeading = useRef(0);
  const currentDirection = useRef(null);
  const previousHeading = useRef(null);
  const startTime = useRef(null);
  const [tiles, setTiles] = useState([]);
  const [showTracker, setShowTracker] = useState(false);
  const [showIntervals, setShowIntervals] = useState(false);
  const [isRunActive, setIsRunActive] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [center, setCenter] = useState([0, 0]);
  const directionsControl = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const otherMarkers = useRef({});
  
  // Run tracking state - lifted up to persist when panel is hidden
  const [isTracking, setIsTracking] = useState(false);
  const [liveRoute, setLiveRoute] = useState([]);
  const [runStats, setRunStats] = useState({
    duration: 0,
    distance: 0,
    pace: 0,
    startTime: null
  });
  const [currentRoute, setCurrentRoute] = useState([]);

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
      setupMapLayers();
    });
  };

  const setupMapLayers = () => {
    if (!map.current) return;

    // Add source for live route drawing
    map.current.addSource('live-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    });

    map.current.addLayer({
      id: 'live-route-layer',
      type: 'line',
      source: 'live-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 5,
        'line-opacity': 0.8
      }
    });

    // Add source for heatmap
    map.current.addSource('heatmap', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.current.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap',
      maxzoom: 15,
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 10, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
        'heatmap-opacity': 0.6
      }
    });
  };

  const getDirection = (heading) => {
    if (heading >= 337.5 || heading < 22.5) return 'N';
    if (heading >= 22.5 && heading < 67.5) return 'NE';
    if (heading >= 67.5 && heading < 112.5) return 'E';
    if (heading >= 112.5 && heading < 157.5) return 'SE';
    if (heading >= 157.5 && heading < 202.5) return 'S';
    if (heading >= 202.5 && heading < 247.5) return 'SW';
    if (heading >= 247.5 && heading < 292.5) return 'W';
    if (heading >= 292.5 && heading < 337.5) return 'NW';
    return 'N';
  };

  const startLocationTracking = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    socket.current = io(apiUrl.replace('/api', ''));
    
    // Multiplayer events
    socket.current.on('connect', () => {
      if (user) {
        socket.current.emit('authenticate', { userId: user.id });
      }
    });

    socket.current.on('runner-started', (data) => {
      updateOtherUserMarker({
        userId: data.userId,
        location: { lat: data.position.lat, lng: data.position.lng },
        username: data.username
      });
      // Add to online users if not already there
      setOnlineUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    socket.current.on('runner-position-update', (data) => {
      updateOtherUserMarker({
        userId: data.userId,
        location: { lat: data.position.lat, lng: data.position.lng },
        username: data.username
      });
    });

    socket.current.on('runner-stopped', (data) => {
      if (otherMarkers.current[data.userId]) {
        otherMarkers.current[data.userId].remove();
        delete otherMarkers.current[data.userId];
      }
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    socket.current.on('active-run-restored', (data) => {
      // Logic to restore an active run if needed
    });

    socket.current.on('tile-captured', (data) => {
      fetchTiles();
      // Optional: Show toast notification for new tile
    });

    socket.current.on('achievements-unlocked', (achievements) => {
      // Optional: Show achievement notification
    });

    if (user) {
      socket.current.emit('authenticate', { userId: user.id });
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
          
          if (isTracking) {
            setLiveRoute(prev => {
              const newRoute = [...prev, coords];
              if (map.current?.getSource('live-route')) {
                map.current.getSource('live-route').setData({
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: newRoute
                  }
                });
              }
              return newRoute;
            });

            // Send real-time update to others - match server protocol
            socket.current?.emit('location-update', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              distance: runStats.distance,
              pace: runStats.pace
            });
          }
          
          if (heading !== null && heading !== undefined) {
            // Detect direction change
            if (previousHeading.current !== null) {
              const headingDiff = Math.abs(heading - previousHeading.current);
              if (headingDiff > 15) { // 15 degree threshold
                currentDirection.current = getDirection(heading);
              }
            } else {
              currentDirection.current = getDirection(heading);
            }
            
            previousHeading.current = heading;
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

  const updateOtherUserMarker = (data) => {
    const { userId, location, username } = data;
    if (!userId || !location) return;

    if (!otherMarkers.current[userId]) {
      // Create new marker for this user
      const el = document.createElement('div');
      el.className = 'other-user-marker';
      el.style.backgroundColor = '#ef4444';
      el.style.width = '15px';
      el.style.height = '15px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.title = username || `User ${userId}`;

      otherMarkers.current[userId] = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h3>${username || 'Runner'}</h3>`))
        .addTo(map.current);
    } else {
      // Update existing marker
      otherMarkers.current[userId].setLngLat([location.lng, location.lat]);
    }
  };

  // Toggle heatmap visibility
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    if (showHeatmap) {
      map.current.setLayoutProperty('heatmap-layer', 'visibility', 'visible');
      fetchHeatmapData();
    } else {
      map.current.setLayoutProperty('heatmap-layer', 'visibility', 'none');
    }
  }, [showHeatmap]);

  const fetchHeatmapData = async () => {
    try {
      const bounds = map.current.getBounds();
      const res = await axios.get('/heatmap/bounds', {
        params: {
          minLat: bounds.getSouth(),
          minLng: bounds.getWest(),
          maxLat: bounds.getNorth(),
          maxLng: bounds.getEast()
        }
      });
      if (map.current.getSource('heatmap')) {
        map.current.getSource('heatmap').setData(res.data);
      }
    } catch (err) {
      console.error('Heatmap fetch error:', err);
    }
  };

  // Add/Remove Directions Control based on state
  useEffect(() => {
    if (!map.current) return;

    if (showDirections) {
      if (!directionsControl.current) {
        const directions = new MapboxDirections({
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
        const originalMove = directions._move;
        directions._move = function(e) {
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
        const originalOnSingleClick = directions._onSingleClick;
        directions._onSingleClick = function(e) {
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

        map.current.addControl(directions, 'top-left');
        directionsControl.current = directions;

        // Auto-set origin to live location
        if (center[0] !== 0) {
          setTimeout(() => {
            if (directionsControl.current) {
              directionsControl.current.setOrigin(center);
            }
          }, 500);
        }
      }
    } else {
      if (directionsControl.current) {
        try {
          map.current.removeControl(directionsControl.current);
        } catch (e) {
          // Silently catch potential error if control is already gone
        }
        directionsControl.current = null;
      }
    }
  }, [showDirections, center]);

  // Handle start/stop tracking events for socket.io
  useEffect(() => {
    if (!socket.current) return;

    if (isTracking) {
      socket.current.emit('start-tracking', {
        userId: user?.id,
        username: user?.username,
        runId: null, // This will be assigned on server if needed, or we can get it from parent
        initialPosition: center[0] !== 0 ? { lat: center[1], lng: center[0] } : null
      });
    } else if (startTime.current && !isTracking) {
      // If we were tracking but now stopped
      socket.current.emit('stop-tracking', {
        finalStats: runStats
      });
    }
    
    if (isTracking) {
      startTime.current = Date.now();
    } else {
      startTime.current = null;
    }
  }, [isTracking, user]);

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
    if (!map.current) return;

    // Handle Start Marker - only show when tracking is active
    if (currentRoute.length > 0 && isTracking) {
      if (!startMarker.current) {
        const startCoords = [currentRoute[0].lng, currentRoute[0].lat];
        const el = document.createElement('div');
        el.className = 'marker-start';
        el.style.backgroundColor = '#10b981'; // Emerald-500
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        
        startMarker.current = new mapboxgl.Marker(el)
          .setLngLat(startCoords)
          .addTo(map.current);
      }
    } else {
      // Remove start marker when not tracking or no route
      if (startMarker.current) {
        startMarker.current.remove();
        startMarker.current = null;
      }
    }

    if (currentRoute.length === 0 || !isTracking) return;

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
  }, [currentRoute, isTracking]);

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
      
      {/* Map UI Controls */}
      <div className="absolute top-20 right-4 flex flex-col space-y-2 z-10">
        <button 
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`p-3 rounded-full shadow-lg transition ${showHeatmap ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
          title="Toggle Heatmap"
        >
          <Activity size={20} />
        </button>
        <button 
          onClick={() => setShowDirections(!showDirections)}
          className={`p-3 rounded-full shadow-lg transition ${showDirections ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
          title="Toggle Directions"
        >
          <Route size={20} />
        </button>
      </div>

      {isTracking && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl z-20 font-bold flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span>LIVE TRACKING ACTIVE</span>
        </div>
      )}

      {/* Online Users Count */}
      <div className="absolute bottom-24 right-4 bg-gray-900/80 text-white px-3 py-1 rounded-lg text-xs z-10 flex items-center space-x-2 border border-gray-700">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>{onlineUsers.length + 1} Runners Online</span>
      </div>

      <div ref={mapContainer} className="w-full h-full" />

      {/* --- Directions Search Icon --- */}
      {!showDirections && (
         <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => setShowDirections(true)}
            className="bg-white text-black p-2 rounded-lg shadow-lg hover:bg-gray-200 transition"
            aria-label="Show directions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* --- Mobile Menu Button --- */}
      <div className="absolute top-4 right-4 z-20 md:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-gray-800 bg-opacity-75 text-white p-2 rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>
      </div>

      {/* --- Button Panels --- */}
      {/* Mobile (collapsible) */}
      {isMenuOpen && (
        <div className="absolute top-16 right-4 z-10 flex flex-col space-y-2 md:hidden bg-gray-800 bg-opacity-90 p-4 rounded-lg">
          <button
            onClick={() => {
              if (directionsControl.current && center[0] !== 0) {
                directionsControl.current.setOrigin(center);
              }
              setIsMenuOpen(false); // Close menu on action
            }}
            className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-cyan-700 transition"
          >
            Use My Location
          </button>
          <button
            onClick={() => {
              if (isTracking && !showTracker) {
                // If tracking but panel hidden, show it
                setShowTracker(true);
              } else if (showTracker) {
                // If panel is showing, hide it
                setShowTracker(false);
              } else {
                // If not tracking and panel not showing, start new run
                setShowTracker(true);
              }
              setIsMenuOpen(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
          >
            {showTracker ? 'Hide Panel' : isTracking ? 'Show Panel' : 'Start New Run'}
          </button>
          <button
            onClick={() => { setShowIntervals(!showIntervals); setIsMenuOpen(false); }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-700 transition"
          >
            {showIntervals ? 'Hide Interval' : 'Interval Mode'}
          </button>
          <button
            onClick={() => {
              if (map.current) map.current.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
              setIsMenuOpen(false);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-green-700 transition"
          >
            Satellite
          </button>
          <button
            onClick={() => {
              if (map.current) map.current.setStyle('mapbox://styles/mapbox/streets-v12');
              setIsMenuOpen(false);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-purple-700 transition"
          >
            Streets
          </button>
          <button
            onClick={() => {
              if (directionsControl.current) directionsControl.current.removeRoutes();
              setIsMenuOpen(false);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-red-700 transition"
          >
            Clear Route
          </button>
          <button
            onClick={() => { fetchTerritories(); setIsMenuOpen(false); }}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-yellow-700 transition"
          >
            Refresh Territories
          </button>
        </div>
      )}

      {/* Desktop (always visible) */}
      <div className="absolute top-4 right-4 z-10 hidden md:flex flex-col space-y-2">
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
          onClick={() => {
            if (isTracking && !showTracker) {
              // If tracking but panel hidden, show it
              setShowTracker(true);
            } else if (showTracker) {
              // If panel is showing, hide it
              setShowTracker(false);
            } else {
              // If not tracking and panel not showing, start new run
              setShowTracker(true);
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
        >
          {showTracker ? 'Hide Panel' : isTracking ? 'Show Panel' : 'Start New Run'}
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

      {showTracker && (
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