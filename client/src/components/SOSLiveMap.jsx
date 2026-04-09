import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, AlertTriangle, Phone, X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox token (get from https://mapbox.com)
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
if (mapboxToken) {
  mapboxgl.accessToken = mapboxToken;
} else {
  console.warn('Mapbox token not set. Live map may not work. Add VITE_MAPBOX_TOKEN to .env.local');
}

const SOSLiveMap = ({ userId, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const io = require('socket.io-client');
    const socketInstance = io(import.meta.env.VITE_API_URL || window.location.origin);

    // Authenticate with your user ID
    const token = localStorage.getItem('token');
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      socketInstance.emit('authenticate', { 
        userId: parseInt(localStorage.getItem('userId')) 
      });
    });

    socketInstance.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      setIsConnected(true);
      
      // Join the emergency tracking room
      socketInstance.emit('join-emergency-tracking', {
        targetUserId: userId
      });
    });

    // Listen for live location updates
    socketInstance.on('sos-live-update', (data) => {
      console.log('Received live update:', data);
      setUserPosition({
        lat: data.latitude,
        lng: data.longitude,
        accuracy: data.accuracy,
        speed: data.speed,
        heading: data.heading
      });
      setLastUpdate(new Date(data.timestamp));
      
      // Update map marker
      if (mapRef.current && markerRef.current) {
        markerRef.current.setLngLat([data.longitude, data.latitude]);
        
        // Optionally pan to new location
        mapRef.current.flyTo({
          center: [data.longitude, data.latitude],
          zoom: 16,
          essential: true
        });
      }
    });

    socketInstance.on('sos-tracking-stopped', (data) => {
      alert('SOS tracking has been stopped. User is safe.');
      if (onClose) onClose();
    });

    socketInstance.on('sos-user-disconnected', (data) => {
      setIsConnected(false);
      alert('Lost connection to user. Last known position shown.');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [userId, onClose]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxgl.accessToken) return;

    // Default view (showing a general area)
    const defaultPosition = [-98.5795, 39.8283]; // Center of USA
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: defaultPosition,
      zoom: 4,
      attributionControl: false
    });

    // Add navigation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Create initial marker
    markerRef.current = new mapboxgl.Marker({ 
      color: '#EF4444',
      scale: 1.5
    })
    .setLngLat(defaultPosition)
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
      .setHTML('<h3>SOS Location</h3><p>Waiting for live updates...</p>')
    )
    .addTo(mapRef.current);

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    
    mapRef.current.addControl(geolocate, 'top-left');

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  // Update popup content when position changes
  useEffect(() => {
    if (markerRef.current && userPosition) {
      const popupContent = `
        <div style="text-align: left;">
          <h3 style="margin: 0 0 10px 0; color: #EF4444;">🚨 SOS Alert Active</h3>
          <div style="font-size: 12px;">
            <p style="margin: 5px 0;"><strong>Last Update:</strong> ${lastUpdate?.toLocaleString() || 'Just now'}</p>
            <p style="margin: 5px 0;"><strong>Accuracy:</strong> ±${userPosition.accuracy?.toFixed(1) || '?'}m</p>
            ${userPosition.speed ? `<p style="margin: 5px 0;"><strong>Moving:</strong> ${userPosition.speed.toFixed(1)} m/s</p>` : ''}
            <p style="margin: 5px 0;"><strong>Coordinates:</strong></p>
            <p style="margin: 0; font-family: monospace;">${userPosition.lat.toFixed(6)}, ${userPosition.lng.toFixed(6)}</p>
          </div>
          <a href="https://www.google.com/maps?q=${userPosition.lat},${userPosition.lng}" 
             target="_blank" 
             style="display: inline-block; margin-top: 10px; padding: 5px 10px; background: #3B82F6; color: white; text-decoration: none; border-radius: 4px; font-size: 11px;">
            Open in Google Maps
          </a>
        </div>
      `;
      
      markerRef.current.getPopup().setHTML(popupContent);
    }
  }, [userPosition, lastUpdate]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={28} className="animate-pulse" />
            <div>
              <h2 className="text-xl font-bold">LIVE SOS TRACKING</h2>
              <p className="text-xs opacity-80">
                {isConnected ? '● Connected - Receiving live updates' : '○ Disconnected - Showing last known position'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-red-700 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="flex-1 relative" />

        {/* Status Overlay */}
        {userPosition && (
          <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-90 p-4 rounded-xl border border-red-500/50">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="text-red-500" size={20} />
              <span className="font-semibold text-sm">Current Position</span>
            </div>
            <div className="text-xs space-y-1 text-gray-300">
              <p>Lat: {userPosition.lat.toFixed(6)}</p>
              <p>Lng: {userPosition.lng.toFixed(6)}</p>
              {lastUpdate && (
                <p className="text-gray-400">Updated: {lastUpdate.toLocaleTimeString()}</p>
              )}
            </div>
          </div>
        )}

        {/* Emergency Call Button */}
        <div className="absolute top-4 right-4 flex gap-2">
          <a
            href="tel:911"
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full transition shadow-lg"
            title="Call Emergency Services"
          >
            <Phone size={24} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default SOSLiveMap;
