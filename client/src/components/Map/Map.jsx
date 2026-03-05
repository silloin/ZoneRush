import React, { useRef, useEffect, useState, useContext } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Polygon, Marker } from '@react-google-maps/api';
import axios from 'axios';
import { io } from 'socket.io-client';
import ngeohash from 'ngeohash';
import { AuthContext } from '../../context/AuthContext';
import RunTracker from '../RunTracker';
import IntervalTimer from '../IntervalTimer';
import './Map.css';

const LIBRARIES = ['places'];

const Map = () => {
  const { user } = useContext(AuthContext);
  const map = useRef(null);
  const socket = useRef(null);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [heading, setHeading] = useState(0);
  const [tiles, setTiles] = useState([]);
  const [showTracker, setShowTracker] = useState(false);
  const [showIntervals, setShowIntervals] = useState(false);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [locationError, setLocationError] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  useEffect(() => {
    socket.current = io(import.meta.env.VITE_API_URL.replace('/api', ''));

    socket.current.on('tiles-captured', (data) => {
      fetchTiles();
    });

    fetchTiles();

    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { longitude, latitude, heading: deviceHeading } = position.coords;
          setCenter({ lat: latitude, lng: longitude });
          if (deviceHeading !== null) {
            setHeading(deviceHeading);
          }
          setLocationError(null);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Could not get your location. Please enable location services in your browser.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);



  const fetchTiles = async () => {
    try {
      const res = await axios.get('/api/tiles');
      setTiles(res.data);
      renderTiles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const renderTiles = (tilesData) => {
    // Tiles will be rendered as Polygon components in JSX
  };

  // Simple placeholder for geohash decoding
  const decodeGeohash = (hash) => {
    return ngeohash.decode(hash);
  };

  if (!isLoaded) {
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="relative w-full h-full">
      {locationError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-red-500 text-white p-4 rounded-lg">
          {locationError}
        </div>
      )}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center.lat !== 0 ? center : { lat: 40.7128, lng: -74.0060 }}
        zoom={14}
        onLoad={(mapInstance) => { 
          map.current = mapInstance;
          if (center.lat !== 0) {
            mapInstance.panTo(center);
          }
        }}
        options={{
          mapTypeId: 'roadmap',
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false
        }}
      >
        {tiles.map((tile, idx) => {
          const coords = decodeGeohash(tile.geohash);
          const isMine = tile.ownerid === user?.id;
          const paths = [
            { lat: coords.lat - 0.0005, lng: coords.lng - 0.0005 },
            { lat: coords.lat - 0.0005, lng: coords.lng + 0.0005 },
            { lat: coords.lat + 0.0005, lng: coords.lng + 0.0005 },
            { lat: coords.lat + 0.0005, lng: coords.lng - 0.0005 }
          ];
          return (
            <Polygon
              key={idx}
              paths={paths}
              options={{
                fillColor: isMine ? '#3b82f6' : '#ef4444',
                fillOpacity: 0.4,
                strokeColor: '#ffffff',
                strokeWeight: 1
              }}
            />
          );
        })}

        {center.lat !== 0 && (
          <Marker
            position={center}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 5,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              rotation: heading
            }}
          />
        )}

        {currentRoute.length > 0 && (
          <Polyline
            path={currentRoute}
            options={{
              strokeColor: '#ef4444',
              strokeWeight: 5,
              strokeOpacity: 1
            }}
          />
        )}
      </GoogleMap>
      
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <button
          onClick={() => setShowTracker(!showTracker)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition"
        >
          {showTracker ? 'Hide Tracker' : 'Start New Run'}
        </button>
        <button
          onClick={() => setShowIntervals(!showIntervals)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-700 transition"
        >
          {showIntervals ? 'Hide Intervals' : 'Interval Mode'}
        </button>
      </div>

      {showIntervals && (
        <div className="absolute top-20 right-4 z-10 w-80">
          <IntervalTimer />
        </div>
      )}

      {showTracker && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
          <RunTracker 
            onRouteUpdate={(newRoute) => setCurrentRoute(newRoute)}
            onRunComplete={() => {
              setShowTracker(false);
              setCurrentRoute([]);
              fetchTiles();
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default Map;