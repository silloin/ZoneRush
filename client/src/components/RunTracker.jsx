import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ngeohash from 'ngeohash';
import { Play, Square, Timer, Map as MapIcon, Activity } from 'lucide-react';

const RunTracker = ({ 
  onRunComplete, 
  onRouteUpdate, 
  isTracking, 
  setIsTracking, 
  runStats, 
  setRunStats,
  currentRoute: externalRoute 
}) => {
  const [startTime, setStartTime] = useState(runStats.startTime);
  const [duration, setDuration] = useState(runStats.duration);
  const [distance, setDistance] = useState(runStats.distance);
  const [route, setRoute] = useState(externalRoute || []);
  const [pace, setPace] = useState(runStats.pace);
  const watchId = useRef(null);
  const timerId = useRef(null);
  
  // Sync with external route updates
  useEffect(() => {
    if (externalRoute && externalRoute.length > 0) {
      setRoute(externalRoute);
    }
  }, [externalRoute]);

  // Update parent state when local stats change
  useEffect(() => {
    if (setRunStats) {
      setRunStats({ duration, distance, pace, startTime });
    }
  }, [duration, distance, pace, startTime, setRunStats]);

  useEffect(() => {
    if (isTracking) {
      timerId.current = setInterval(() => {
        const newDuration = Math.floor((Date.now() - startTime) / 1000);
        setDuration(newDuration);
      }, 1000);

      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Basic accuracy filter - ignore updates with accuracy > 50m
          if (accuracy > 50) return;

          const newPoint = { lat: latitude, lng: longitude };
          
          setRoute((prevRoute) => {
            const lastPoint = prevRoute[prevRoute.length - 1];
            
            // Avoid duplicates or very small movements that are likely GPS jitter
            if (lastPoint) {
              const d = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
              if (d < 2) return prevRoute; // Only add if moved more than 2 meters
              setDistance((prevDist) => {
                const newDist = prevDist + d;
                return newDist;
              });
            }
            
            const updatedRoute = [...prevRoute, newPoint];
            if (onRouteUpdate) onRouteUpdate(updatedRoute);
            return updatedRoute;
          });
        },
        (err) => console.error("Watch error:", err),
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      clearInterval(timerId.current);
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    }

    return () => {
      clearInterval(timerId.current);
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [isTracking, startTime]);

  useEffect(() => {
    if (duration > 0 && distance > 0) {
      // Pace in minutes per km
      const paceInMinPerKm = (duration / 60) / (distance / 1000);
      setPace(isFinite(paceInMinPerKm) ? paceInMinPerKm : 0);
    } else {
      setPace(0);
    }
  }, [duration, distance]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const startTracking = () => {
    const now = Date.now();
    setIsTracking(true);
    setStartTime(now);
    setDistance(0);
    setDuration(0);
    setRoute([]);
    setPace(0);
    
    // Update parent state immediately
    if (setRunStats) {
      setRunStats({ duration: 0, distance: 0, pace: 0, startTime: now });
    }

    // Get initial position immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const initialPoint = { lat: latitude, lng: longitude };
          setRoute([initialPoint]);
          if (onRouteUpdate) onRouteUpdate([initialPoint]);
        },
        (err) => console.error("Initial position error:", err),
        { enableHighAccuracy: true }
      );
    }
  };

  const stopTracking = async () => {
    setIsTracking(false);
    
    const runData = {
      distance: (distance / 1000).toFixed(2), // km
      duration, // seconds
      avgPace: pace.toFixed(2),
      route,
    };

    try {
      // Save run
      const runRes = await axios.post('/runs', runData);
      
      // Capture tiles
      const tileRes = await axios.post('/tiles/capture', { route });
      
      alert(`Run saved! You captured ${tileRes.data.length} tiles.`);
      if (onRunComplete) onRunComplete();
    } catch (err) {
      console.error('Error saving run:', err);
      console.error('Error details:', err.response?.data);
      alert(`Error saving run: ${err.response?.data?.msg || err.message}`);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-white">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col items-center p-4 bg-gray-700 rounded">
          <Timer className="mb-2 text-blue-400" />
          <span className="text-sm text-gray-400">Time</span>
          <span className="text-2xl font-bold">{formatTime(duration)}</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-700 rounded">
          <MapIcon className="mb-2 text-green-400" />
          <span className="text-sm text-gray-400">Distance (km)</span>
          <span className="text-2xl font-bold">{(distance / 1000).toFixed(2)}</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-700 rounded">
          <Activity className="mb-2 text-yellow-400" />
          <span className="text-sm text-gray-400">Pace (min/km)</span>
          <span className="text-2xl font-bold">{pace > 0 && isFinite(pace) ? pace.toFixed(2) : '0.00'}</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-700 rounded">
          <MapIcon className="mb-2 text-purple-400" />
          <span className="text-sm text-gray-400">Tiles Captured</span>
          <span className="text-2xl font-bold">{new Set(route.map(p => ngeohash.encode(p.lat, p.lng, 7))).size}</span>
        </div>
      </div>

      {!isTracking ? (
        <button
          onClick={startTracking}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-full flex items-center justify-center transition"
        >
          <Play className="mr-2" /> Start Run
        </button>
      ) : (
        <button
          onClick={stopTracking}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-full flex items-center justify-center transition"
        >
          <Square className="mr-2" /> Stop Run
        </button>
      )}
    </div>
  );
};

export default RunTracker;
