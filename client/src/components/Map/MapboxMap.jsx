import React, { useRef, useEffect, useState, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { io } from 'socket.io-client';
import ngeohash from 'ngeohash';
import { AuthContext } from '../../context/AuthContext';
import { Activity, Route, Map as MapIcon } from 'lucide-react';
import RunTracker from '../RunTracker';
import IntervalTimer from '../IntervalTimer';
import UserProfileModal from '../Chat/UserProfileModal';
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
  const currentStyle = useRef('mapbox://styles/mapbox/dark-v11');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);

  // Calculate route using Mapbox Directions API
  const calculateRoute = async () => {
    if (!originInput.trim() || !destinationInput.trim()) return;
    
    try {
      // Geocode origin
      const originRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(originInput)}.json?access_token=${mapboxgl.accessToken}&limit=1`);
      const originData = await originRes.json();
      
      // Geocode destination
      const destRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destinationInput)}.json?access_token=${mapboxgl.accessToken}&limit=1`);
      const destData = await destRes.json();
      
      if (!originData.features.length || !destData.features.length) {
        alert('Could not find one or both locations');
        return;
      }
      
      const origin = originData.features[0].center;
      const destination = destData.features[0].center;
      
      // Get directions
      const directionsRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`);
      const directionsData = await directionsRes.json();
      
      if (directionsData.routes && directionsData.routes.length > 0) {
        const route = directionsData.routes[0];
        const routeGeometry = route.geometry;
        
        setRouteGeoJSON({
          type: 'Feature',
          properties: {},
          geometry: routeGeometry
        });
        
        // Draw route on map
        if (map.current) {
          // Remove existing route
          if (map.current.getLayer('custom-route-line')) {
            map.current.removeLayer('custom-route-line');
          }
          if (map.current.getSource('custom-route')) {
            map.current.removeSource('custom-route');
          }
          
          // Add route source and layer
          map.current.addSource('custom-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: routeGeometry
            }
          });
          
          map.current.addLayer({
            id: 'custom-route-line',
            type: 'line',
            source: 'custom-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });
          
          // Fit bounds to route
          const coordinates = routeGeometry.coordinates;
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
          
          map.current.fitBounds(bounds, {
            padding: 50,
            duration: 1000
          });
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('Failed to calculate route');
    }
  };
  
  const clearRoute = () => {
    if (map.current) {
      if (map.current.getLayer('custom-route-line')) {
        map.current.removeLayer('custom-route-line');
      }
      if (map.current.getSource('custom-route')) {
        map.current.removeSource('custom-route');
      }
    }
    setRouteGeoJSON(null);
    setOriginInput('');
    setDestinationInput('');
  };
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const otherMarkers = useRef({});
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [mapStyleMode, setMapStyleMode] = useState(0); // 0: Dark, 1: Satellite, 2: Streets+Heatmap
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Run tracking state - lifted up to persist when panel is hidden
  const [isTracking, setIsTracking] = useState(false);
  const isTrackingRef = useRef(false);
  const [liveRoute, setLiveRoute] = useState([]);
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
    if (map.current || !mapContainer.current) return;

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
      
      // Fetch nearby runners when map moves (with debounce)
      let moveTimeout;
      map.current.on('moveend', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
          fetchNearbyRunners();
        }, 500); // Debounce for 500ms
      });
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
        'line-color': '#ef4444',
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
      layout: { visibility: showHeatmap ? 'visible' : 'none' },
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

    const reconnectSocket = () => {
      if (socket.current) {
        socket.current.connect();
        setIsSocketConnected(true);
        console.log('🔄 Manual socket reconnection attempted');
      }
    };

    const startLocationTracking = () => {

    const isProduction = import.meta.env.MODE === 'production';
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    // In production, connect to the same host as the frontend
    const socketUrl = isProduction ? window.location.origin : SOCKET_URL;
    socket.current = io(socketUrl);
    
    // Multiplayer events
    socket.current.on('connect', () => {
      console.log('Socket connected:', socket.current.connected);
      setIsSocketConnected(true);
      if (user) {
        socket.current.emit('authenticate', { userId: user.id, username: user.username });
        // Fetch online users count
        setTimeout(() => {
          socket.current.emit('get-online-users');
          fetchNearbyRunners();
        }, 500);
      }
    });

    socket.current.on('online-users-list', (data) => {
      console.log('🌐 Online users list received:', data.length, 'users');
      // Update online users count (exclude current user from the count)
      const otherUsers = data.filter(u => u.userId !== user?.id);
      setOnlineUsers(otherUsers);
      console.log('👥 Displaying:', otherUsers.length, '+ 1 (you) =', otherUsers.length + 1);
    });

    socket.current.on('user-connected', (data) => {
      console.log('🟢 User connected:', data.username);
      if (data.userId !== user?.id) {
        setOnlineUsers(prev => {
          if (!prev.find(u => u.userId === data.userId)) {
            const updated = [...prev, { userId: data.userId, username: data.username }];
            console.log('👥 Added connected user. Total:', updated.length);
            return updated;
          }
          return prev;
        });
      }
    });

    socket.current.on('user-disconnected', (data) => {
      console.log('🔴 User disconnected:', data.userId);
      setOnlineUsers(prev => {
        const updated = prev.filter(u => u.userId !== data.userId);
        console.log('👥 Removed disconnected user. Total:', updated.length);
        return updated;
      });
    });

    socket.current.on('disconnect', () => {
      console.log('Socket disconnected:', socket.current.connected);
      setIsSocketConnected(false);
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsSocketConnected(false);
    });

    socket.current.on('runner-started', (data) => {
      console.log('🏃 Runner started:', data.username, data.userId);
      updateOtherUserMarker({
        userId: data.userId,
        location: { lat: data.position.lat, lng: data.position.lng },
        username: data.username
      });
      // Add to online users if not already there
      setOnlineUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) {
          const updated = [...prev, data];
          console.log('👥 Added runner to online list. Total:', updated.length);
          return updated;
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
      
      // Update online users list
      setOnlineUsers(prev => {
        const existing = prev.find(u => u.userId === data.userId);
        if (!existing) {
          return [...prev, { userId: data.userId, username: data.username }];
        }
        return prev;
      });
    });

    socket.current.on('nearby-runners', (data) => {
      console.log('📍 Received nearby runners:', data.length, data.map(r => ({ id: r.userId, name: r.username })));
      
      // Clear existing markers and add all nearby runners
      const oldMarkersCount = Object.keys(otherMarkers.current).length;
      console.log('🗑️ Clearing', oldMarkersCount, 'existing markers');
      Object.values(otherMarkers.current).forEach(marker => marker.remove());
      otherMarkers.current = {};
      
      // Add markers for all nearby runners
      console.log('🎨 Creating markers for', data.length, 'runners');
      data.forEach((runner, index) => {
        console.log(`  [${index}] Creating marker for ${runner.username} (${runner.userId}) at [${runner.position.lat}, ${runner.position.lng}]`);
        updateOtherUserMarker({
          userId: runner.userId,
          location: { lat: runner.position.lat, lng: runner.position.lng },
          username: runner.username
        });
      });
      
      const newMarkersCount = Object.keys(otherMarkers.current).length;
      console.log('✅ Total markers on map:', newMarkersCount);
      
      // Update online users count
      const newOnlineUsers = data.map(runner => ({
        userId: runner.userId,
        username: runner.username
      }));
      setOnlineUsers(newOnlineUsers);
      console.log('👥 Online users updated:', newOnlineUsers.length, '+ 1 (you) =', newOnlineUsers.length + 1);
    });

    socket.current.on('territory-updated', (data) => {
      console.log('Territory updated:', data);
      // Refresh tiles immediately
      fetchTiles();
      // Also refresh heatmap if visible
      if (showHeatmap) {
        fetchHeatmapData();
      }
    });

    socket.current.on('territory-stolen', (data) => {
      console.log('Territory stolen:', data);
      if (data.defenderId === user?.id) {
        alert(`Your territory was stolen by ${data.attackerId}!`);
      }
      // Refresh tiles immediately
      fetchTiles();
      // Also refresh heatmap if visible
      if (showHeatmap) {
        fetchHeatmapData();
      }
    });

    socket.current.on('ai-safety-check', (data) => {
      const isSafe = window.confirm(data.message);
      socket.current.emit('ai-safety-response', { isSafe });
    });

    socket.current.on('sos-trigger', (data) => {
      triggerSOS();
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
      // Refresh tiles immediately
      fetchTiles();
      // Also refresh heatmap if visible
      if (showHeatmap) {
        fetchHeatmapData();
      }
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
          
          if (isTrackingRef.current) {
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
    if (!userId || !location) {
      console.warn('⚠️ updateOtherUserMarker called with invalid data:', { userId, location });
      return;
    }

    if (!otherMarkers.current[userId]) {
      console.log(`  ✨ Creating NEW marker for user ${userId} (${username})`);
      // Create new marker for this user
      const el = document.createElement('div');
      el.className = 'other-user-marker';
      el.style.backgroundColor = '#ef4444';
      el.style.width = '15px';
      el.style.height = '15px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.title = username || `User ${userId}`;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; text-align: center;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${username || 'Runner'}</h3>
            <button 
              id="view-profile-${userId}" 
              style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
            >
              View Profile
            </button>
          </div>
        `))
        .addTo(map.current);
      
      // Add click event to marker element
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (userId !== user?.id) {
          setSelectedUser({ id: userId, username: username || `User ${userId}` });
          setIsProfileModalOpen(true);
        }
      });

      otherMarkers.current[userId] = marker;
      console.log(`  ✅ Marker created successfully. Total markers:`, Object.keys(otherMarkers.current).length);
    } else {
      // Update existing marker
      console.log(`  🔄 Updating EXISTING marker for user ${userId}`);
      otherMarkers.current[userId].setLngLat([location.lng, location.lat]);
    }
  };

  // Toggle heatmap visibility
  useEffect(() => {
    if (!map.current) return;
    
    // Check if style is loaded and layer exists
    const hasLayer = map.current.getLayer('heatmap-layer');
    if (!hasLayer) return;

    if (showHeatmap) {
      map.current.setLayoutProperty('heatmap-layer', 'visibility', 'visible');
      fetchHeatmapData();
    } else {
      map.current.setLayoutProperty('heatmap-layer', 'visibility', 'none');
    }
  }, [showHeatmap]);

  // Auto-refresh heatmap every 30 seconds when visible
  useEffect(() => {
    if (!showHeatmap || !map.current) return;
    
    const interval = setInterval(() => {
      fetchHeatmapData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [showHeatmap]);

  // Auto-refresh tiles every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTiles();
    }, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh nearby runners every 30 seconds
  useEffect(() => {
    if (!socket.current || !isSocketConnected) return;
    
    const interval = setInterval(() => {
      fetchNearbyRunners();
      // Also refresh online users count
      socket.current.emit('get-online-users');
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [isSocketConnected, center]);

  const fetchHeatmapData = async () => {
    try {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      const token = localStorage.getItem('token');
      const res = await axios.get('/heatmap/bounds', {
        params: {
          minLat: bounds.getSouth(),
          minLng: bounds.getWest(),
          maxLat: bounds.getNorth(),
          maxLng: bounds.getEast()
        },
        headers: { 'x-auth-token': token }
      });
      if (map.current.getSource('heatmap')) {
        map.current.getSource('heatmap').setData(res.data);
        console.log('Heatmap data updated successfully');
      }
    } catch (err) {
      console.error('Heatmap fetch error:', err.message);
    }
  };

  const toggleStyle = () => {
    if (!map.current) return;
    
    // Cycle through 3 modes: 0=Dark, 1=Satellite, 2=Streets+Heatmap
    const newMode = (mapStyleMode + 1) % 3;
    setMapStyleMode(newMode);
    
    let newStyle;
    switch(newMode) {
      case 0:
        newStyle = 'mapbox://styles/mapbox/dark-v11';
        setShowHeatmap(false);
        break;
      case 1:
        newStyle = 'mapbox://styles/mapbox/satellite-streets-v12';
        setShowHeatmap(false);
        break;
      case 2:
        newStyle = 'mapbox://styles/mapbox/streets-v12';
        setShowHeatmap(true);
        break;
      default:
        newStyle = 'mapbox://styles/mapbox/dark-v11';
    }
    
    currentStyle.current = newStyle;
    
    // Use setStyle with diff: false to avoid sprite update warnings
    map.current.setStyle(newStyle, { diff: false });
    
    // Wait for style to load before re-adding layers
    map.current.once('style.load', () => {
      setupMapLayers();
      fetchTiles();
      if (showHeatmap || newMode === 2) {
        fetchHeatmapData();
      }
    });
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

    isTrackingRef.current = isTracking;
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
      const token = localStorage.getItem('token');
      const res = await axios.get('/tiles', {
        headers: { 'x-auth-token': token }
      });
      const tilesData = Array.isArray(res.data) ? res.data : [];
      setTiles(tilesData);
      renderTiles(tilesData);
      console.log(`Tiles refreshed: ${tilesData.length} tiles loaded`);
    } catch (err) {
      console.error('Fetch tiles error:', err.message);
    }
  };

  const fetchNearbyRunners = () => {
    if (!socket.current || !center || center[0] === 0) return;
    
    // Request nearby runners within 5km radius
    socket.current.emit('get-nearby-runners', {
      lat: center[1],
      lng: center[0],
      radius: 5000 // 5km
    });
  };

  const triggerSOS = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const token = localStorage.getItem('token');
        await axios.post('/emergency/send-sos', { 
          latitude, 
          longitude,
          message: '🚨 SOS! Emergency assistance needed!' 
        }, {
          headers: { 'x-auth-token': token }
        });
        alert('SOS ALERT SENT TO EMERGENCY CONTACTS!');
      } catch (error) {
        console.error('Error sending SOS:', error);
        alert(error.response?.data?.msg || 'Failed to send SOS alert');
      }
    });
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const startTracking = () => {
    setIsTracking(true);
    isTrackingRef.current = true;
    setRunStats({
      duration: 0,
      distance: 0,
      pace: 0,
      startTime: Date.now()
    });
    setLiveRoute([]);
    if (socket.current) {
      socket.current.emit('start-tracking', {
        runId: `run-${Date.now()}`,
        username: user?.username,
        initialPosition: center[0] !== 0 ? { lat: center[1], lng: center[0] } : null
      });
    }
  };

  const stopTracking = async () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    if (socket.current) {
      socket.current.emit('stop-tracking', {
        finalStats: runStats
      });
    }
    // Save run to database only if we have enough points
    if (liveRoute.length >= 2) {
      try {
        const token = localStorage.getItem('token');
        // Map liveRoute ([lng, lat]) to the format server expects ([{lat, lng}])
        const formattedRoute = liveRoute.map(point => ({
          lat: point[1],
          lng: point[0]
        }));

        await axios.post('/runs', {
          ...runStats,
          route_points: formattedRoute,
          started_at: new Date(runStats.startTime).toISOString(),
          completed_at: new Date().toISOString()
        }, {
          headers: { 'x-auth-token': token }
        });
        fetchTiles();
      } catch (error) {
        console.error('Error saving run:', error);
      }
    } else {
      console.warn('Run too short to save');
    }
  };

  const renderTiles = (tilesData) => {
    if (!map.current) return;

    if (!map.current.isStyleLoaded()) {
      map.current.once('style.load', () => renderTiles(tilesData));
      return;
    }

    if (map.current.getLayer('tiles-layer')) map.current.removeLayer('tiles-layer');
    if (map.current.getSource('tiles')) map.current.removeSource('tiles');

    const features = tilesData.map(tile => {
      const coords = ngeohash.decode(tile.geohash);
      const isMine = tile.is_mine === true || tile.is_mine === 'true';
      return {
        type: 'Feature',
        properties: { color: isMine ? '#22c55e' : '#ef4444' },
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
      const token = localStorage.getItem('token');
      const res = await axios.get('/territories', {
        headers: { 'x-auth-token': token }
      });
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

  useEffect(() => {
    if (!isTracking && startMarker.current) {
      startMarker.current.remove();
      startMarker.current = null;
    }
  }, [isTracking]);

  useEffect(() => {
    return () => {
      if (socket.current) socket.current.disconnect();
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (map.current) map.current.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map Container - REQUIRED for Mapbox to render */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      {locationError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-red-500 text-white p-4 rounded-lg">
          {locationError}
        </div>
      )}
      
      {/* Map UI Controls - Moved to Bottom Right */}
      <div className="absolute bottom-20 left-4 flex flex-col space-y-2 z-10">
        <button 
          onClick={toggleStyle}
          className="p-3 rounded-full shadow-lg transition bg-white text-gray-700"
          title="Toggle Map Style"
        >
          <MapIcon size={20} />
        </button>
        <button 
          onClick={() => {
            // If in mode 2 (Streets+Heatmap), don't allow turning off heatmap
            // Otherwise toggle normally
            if (mapStyleMode === 2) {
              // Already forced on, do nothing
              return;
            }
            setShowHeatmap(!showHeatmap);
          }}
          className={`p-3 rounded-full shadow-lg transition ${showHeatmap ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'} ${mapStyleMode === 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={mapStyleMode === 2 ? "Heatmap auto-enabled in this mode" : "Toggle Heatmap"}
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
      <div className="absolute bottom-8 right-4 bg-gray-900/80 text-white px-3 py-1 rounded-lg text-xs z-10 flex items-center space-x-2 border border-gray-700">
        <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{onlineUsers.length + 1} Runners Online</span>
      </div>

      {/* Manual Refresh Button */}
      <div className="absolute bottom-44 right-4 z-10">
        <button
          onClick={() => {
            fetchTiles();
            if (showHeatmap) fetchHeatmapData();
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-1"
          title="Refresh map data"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* --- Mobile Directions Button - Top Left --- */}
      <div className="absolute top-4 left-4 z-40 md:hidden">
        {!showDirections ? (
          <button
            onClick={() => setShowDirections(true)}
            className="bg-white text-black p-3 rounded-full shadow-lg hover:bg-gray-200 transition flex items-center justify-center"
            aria-label="Show directions"
            title="Search for directions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => {
              setShowDirections(false);
              if (directionsControl.current && map.current) {
                try {
                  map.current.removeControl(directionsControl.current);
                } catch (e) {}
                directionsControl.current = null;
              }
            }}
            className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition flex items-center justify-center"
            aria-label="Close directions"
            title="Close directions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* --- Mobile Menu Button - Always Visible on Mobile --- */}
      <div className="absolute top-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition flex items-center justify-center"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>

      {/* --- Mobile Menu Panel (Collapsible) --- */}
      {isMenuOpen && (
        <div className="absolute top-20 right-4 left-4 z-[999] md:hidden bg-gray-900 bg-opacity-98 p-4 rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto border border-gray-700">
          <div className="text-white text-center mb-3 pb-2 border-b border-gray-700">
            <span className="font-bold text-lg">Menu</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                toggleTracking();
                setIsMenuOpen(false);
              }}
              className={`${isTracking ? 'bg-red-600' : 'bg-green-600'} text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2 text-sm`}
            >
              {isTracking ? <Activity size={16} /> : <Route size={16} />}
              {isTracking ? 'STOP' : 'START'}
            </button>
            
            <button
              onClick={() => {
                triggerSOS();
                setIsMenuOpen(false);
              }}
              className="bg-red-800 text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:bg-red-900 transition flex items-center justify-center gap-2 text-sm"
            >
              🆘 SOS
            </button>

            <button
              onClick={() => {
                if (directionsControl.current && center[0] !== 0) {
                  directionsControl.current.setOrigin(center);
                }
                setIsMenuOpen(false);
              }}
              className="bg-cyan-600 text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:bg-cyan-700 transition text-sm"
            >
              📍 Location
            </button>

            <button
              onClick={() => {
                if (isTracking && !showTracker) {
                  setShowTracker(true);
                } else if (showTracker) {
                  setShowTracker(false);
                } else {
                  setShowTracker(true);
                }
                setIsMenuOpen(false);
              }}
              className="bg-blue-600 text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition text-sm"
            >
              {showTracker ? 'Hide Panel' : isTracking ? 'Show Panel' : 'Start Run'}
            </button>

            <button
              onClick={() => { 
                setShowIntervals(!showIntervals); 
                setIsMenuOpen(false); 
              }}
              className="bg-gray-700 text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:bg-gray-600 transition text-sm"
            >
              ⏱️ Interval
            </button>

            <button
              onClick={toggleStyle}
              className="bg-purple-600 text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:bg-purple-700 transition text-sm"
            >
              🗺️ Style
            </button>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`${showHeatmap ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'} px-3 py-3 rounded-lg font-bold shadow-lg transition text-sm`}
            >
              🔥 Heatmap
            </button>

            <button
              onClick={() => setShowDirections(!showDirections)}
              className={`${showDirections ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'} px-3 py-3 rounded-lg font-bold shadow-lg transition text-sm`}
            >
              🧭 Directions
            </button>

            <button
              onClick={() => {
                if (directionsControl.current) directionsControl.current.removeRoutes();
                setIsMenuOpen(false);
              }}
              className="bg-red-600 text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 transition text-sm"
            >
              🗑️ Clear Route
            </button>

            <button
              onClick={() => { 
                fetchTerritories(); 
                setIsMenuOpen(false); 
              }}
              className="bg-yellow-600 text-white px-3 py-3 rounded-lg font-bold shadow-lg hover:bg-yellow-700 transition text-sm"
            >
              🔄 Refresh Tiles
            </button>

            {!isSocketConnected && (
              <button
                onClick={() => {
                  reconnectSocket();
                  setIsMenuOpen(false);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-3 rounded-lg font-bold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm col-span-2"
              >
                🔌 Reconnect Socket
              </button>
            )}
          </div>

          {/* Desktop Socket Reconnect - Compact button in Online Users section */}
          {!isSocketConnected && (
            <div className="absolute bottom-20 right-4 z-20">
              <button
                onClick={reconnectSocket}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg text-xs transition-all duration-200 flex items-center gap-2 animate-pulse"
                title="Reconnect multiplayer (socket disconnected)"
              >
                🔌 Reconnect
              </button>
            </div>
          )}

        </div>
      )}


      {/* --- Desktop Search Button - Top Left (Enhanced) --- */}
      <div className="hidden md:flex absolute top-4 left-4 z-50 flex-col items-start gap-2 p-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border">
        {!showDirections ? (
          <button
            onClick={() => setShowDirections(true)}
            className="bg-white text-black p-3 rounded-full shadow-lg hover:bg-gray-200 transition flex items-center justify-center"
            aria-label="Show directions"
            title="Search for directions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => {
              setShowDirections(false);
              if (directionsControl.current && map.current) {
                try {
                  map.current.removeControl(directionsControl.current);
                } catch (e) {}
                directionsControl.current = null;
              }
            }}
            className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition flex items-center justify-center flex-shrink-0"
            aria-label="Close directions"
            title="Close directions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* --- Desktop Burger Menu Button - Top Right --- */}
      <div className="hidden md:block absolute top-4 right-4 z-50">
        <button
          onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
          className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition flex items-center justify-center"
          aria-label="Toggle desktop menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {isDesktopMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>

      {/* --- Desktop Menu Panel (Dropdown) --- */}
      {isDesktopMenuOpen && (
        <div className="hidden md:block absolute top-20 right-4 z-50 bg-gray-900 bg-opacity-95 p-4 rounded-xl shadow-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
          <div className="text-white text-center mb-3 pb-2 border-b border-gray-700">
            <span className="font-bold text-lg">Menu</span>
          </div>
          <div className="flex flex-col space-y-2 w-48">
            <button
              onClick={() => {
                toggleTracking();
                if (!isTracking) setShowTracker(true);
              }}
              className={`${isTracking ? 'bg-red-600' : 'bg-green-600'} text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2 text-sm`}
            >
              {isTracking ? 'STOP RUN' : 'START RUN'}
            </button>

            <button
              onClick={triggerSOS}
              className="bg-red-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-red-900 transition flex items-center justify-center gap-2 text-sm"
            >
              <span className="text-xl">🆘</span> SOS
            </button>

            <div className="border-t border-gray-700 pt-2"></div>

            <button
              onClick={() => {
                if (directionsControl.current && center[0] !== 0) {
                  directionsControl.current.setOrigin(center);
                }
              }}
              className="bg-cyan-600 text-white px-3 py-2 rounded-lg font-bold shadow-lg hover:bg-cyan-700 transition text-sm"
            >
              📍 My Location
            </button>
            
            <button
              onClick={() => {
                if (isTracking && !showTracker) {
                  setShowTracker(true);
                } else if (showTracker) {
                  setShowTracker(false);
                } else {
                  setShowTracker(true);
                }
              }}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition text-sm"
            >
              {showTracker ? 'Hide Panel' : isTracking ? 'Show Panel' : 'Start Run'}
            </button>
            
            <button
              onClick={() => setShowIntervals(!showIntervals)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-600 transition text-sm"
            >
              ⏱️ Intervals
            </button>

            <div className="border-t border-gray-700 pt-2"></div>

            <button
              onClick={toggleStyle}
              className="bg-purple-600 text-white px-3 py-2 rounded-lg font-bold shadow-lg hover:bg-purple-700 transition text-sm"
              title="Cycle: Dark → Satellite → Streets+Heatmap"
            >
              🗺️ Map Style
            </button>
            
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`${showHeatmap ? 'bg-orange-500 text-white' : 'bg-gray-700 text-white'} px-3 py-2 rounded-lg font-bold shadow-lg hover:opacity-90 transition text-sm`}
            >
              🔥 Heatmap
            </button>
            
            <button
              onClick={() => setShowDirections(!showDirections)}
              className={`${showDirections ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'} px-3 py-2 rounded-lg font-bold shadow-lg hover:opacity-90 transition text-sm`}
            >
              🧭 Directions
            </button>

            <div className="border-t border-gray-700 pt-2"></div>

            <button
              onClick={() => {
                if (directionsControl.current) {
                  directionsControl.current.removeRoutes();
                }
              }}
              className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold shadow-lg hover:bg-red-700 transition text-sm"
            >
              🗑️ Clear Route
            </button>
            
            <button
              onClick={fetchTerritories}
              className="bg-yellow-600 text-white px-3 py-2 rounded-lg font-bold shadow-lg hover:bg-yellow-700 transition text-sm"
            >
              🔄 Refresh Tiles
            </button>
          </div>
        </div>
      )}

{showIntervals && (
        <div className="absolute top-28 left-4 md:left-80 z-50 w-80 animate-in slide-in-from-right duration-300">
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
            currentRoute={liveRoute}
            onRunComplete={() => {
              setShowTracker(false);
              setIsRunActive(false);
              setIsTracking(false);
              setRunStats({ duration: 0, distance: 0, pace: 0, startTime: null });
              if (map.current && map.current.getSource('live-route')) {
                map.current.getSource('live-route').setData({
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates: [] }
                });
              }
              fetchTiles();
            }} 
          />
        </div>
      )}
      
      {/* Minimized Run Indicator - shows when tracking but panel is hidden */}
      {isTracking && !showTracker && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-4 cursor-pointer hover:bg-gray-700 transition" onClick={() => setShowTracker(true)}>
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

      {/* User Profile Modal */}
      <UserProfileModal
        userId={selectedUser?.id}
        username={selectedUser?.username}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default MapboxMap;
