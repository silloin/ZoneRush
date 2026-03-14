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
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, searching, active, error
  const watchId = useRef(null);
  const timerId = useRef(null);
  
  // Sync with external route updates
  useEffect(() => {
    if (externalRoute && externalRoute.length > 0) {
      setRoute(externalRoute);
      setGpsStatus('active');
    }
  }, [externalRoute]);

  // Update parent when route changes (avoid calling during render)
  useEffect(() => {
    if (onRouteUpdate && route.length > 0) {
      onRouteUpdate(route);
    }
  }, [route, onRouteUpdate]);

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
          
          setGpsStatus('active');
          
          // More lenient accuracy filter - ignore updates with accuracy > 100m
          if (accuracy > 100) {
            console.log('⚠️ Low accuracy GPS reading ignored:', accuracy + 'm');
            return;
          }

          const newPoint = { lat: latitude, lng: longitude };
          
          setRoute((prevRoute) => {
            const lastPoint = prevRoute[prevRoute.length - 1];
            
            // Avoid duplicates or very small movements that are likely GPS jitter
            if (lastPoint) {
              const d = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
              if (d < 5) return prevRoute; // Only add if moved more than 5 meters
              setDistance((prevDist) => {
                const newDist = prevDist + d;
                return newDist;
              });
            }
            
            const updatedRoute = [...prevRoute, newPoint];
            return updatedRoute;
          });
        },
        (err) => {
          console.error("Watch error:", err);
          setGpsStatus('error');
          // Don't give up immediately, GPS might recover
          setTimeout(() => {
            if (isTracking) {
              console.log('🔄 Retrying GPS...');
              setGpsStatus('searching');
            }
          }, 5000);
        },
        { 
          enableHighAccuracy: false, // Less aggressive for better compatibility
          timeout: 30000, // Longer timeout
          maximumAge: 60000 // Allow slightly older readings
        }
      );
    } else {
      clearInterval(timerId.current);
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      setGpsStatus('idle');
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
    setGpsStatus('searching');
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
          setGpsStatus('active');
          console.log('✅ Initial GPS position acquired');
        },
        (err) => {
          console.error("Initial position error:", err);
          setGpsStatus('error');
          // Try with less aggressive settings
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const initialPoint = { lat: latitude, lng: longitude };
              setRoute([initialPoint]);
              setGpsStatus('active');
              console.log('✅ Initial GPS position acquired (fallback)');
            },
            (fallbackErr) => {
              console.error('Fallback GPS also failed:', fallbackErr);
              alert('GPS access failed. Please enable location services and try again.');
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          );
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    }
  };

  const forceGpsRetry = () => {
    setGpsStatus('searching');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPoint = { lat: latitude, lng: longitude };
          setRoute(prev => [...prev, newPoint]);
          setGpsStatus('active');
          console.log('✅ Manual GPS retry successful');
        },
        (err) => {
          console.error('Manual GPS retry failed:', err);
          setGpsStatus('error');
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const cancelRun = () => {
    if (window.confirm('Are you sure you want to cancel this run? No data will be saved.')) {
      setIsTracking(false);
      setGpsStatus('idle');
      if (onRunComplete) onRunComplete();
    }
  };

  const stopTracking = async () => {
    if (route.length < 2) {
      alert("Cannot save run: A run must have at least 2 points. Try moving around a bit more!");
      return;
    }

    const runData = {
      distance: parseFloat((distance / 1000).toFixed(2)), // km
      duration, // seconds
      pace: parseFloat(pace.toFixed(2)),
      route_points: route.map((p, idx) => ({
        lat: p.lat,
        lng: p.lng,
        timestamp: new Date(startTime + (idx * (duration / route.length) * 1000)).toISOString()
      })),
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString()
    };

    console.log('📤 Sending run data to backend:', runData);

    try {
      // Save run
      const runRes = await axios.post('/runs', runData);
      console.log('✅ Run saved successfully:', runRes.data);
      
      // Capture tiles
      const tileRes = await axios.post('/tiles/capture', { route });
      console.log('✅ Tiles captured:', tileRes.data);
      
      setIsTracking(false);
      setGpsStatus('idle');
      if (onRunComplete) onRunComplete();
    } catch (err) {
      console.error('Error saving run:', err);
      console.error('Error details:', err.response?.data);
      
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Error saving run: ${errorMsg}`);
      
      // Don't stop tracking if it failed, allow user to try again or cancel
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
      {isTracking && (
        <div className={`mb-4 p-2 rounded text-center text-sm font-bold ${
          gpsStatus === 'active' ? 'bg-green-600' : 
          gpsStatus === 'error' ? 'bg-red-600' : 'bg-yellow-600'
        }`}>
          {gpsStatus === 'active' ? '📶 GPS Active' : 
           gpsStatus === 'error' ? '⚠️ GPS Error - Check Location Settings' : '🔍 Searching for GPS Signal...'}
          {gpsStatus === 'error' && (
            <button
              onClick={forceGpsRetry}
              className="ml-2 px-2 py-1 bg-white text-red-600 rounded text-xs hover:bg-gray-100"
            >
              Retry GPS
            </button>
          )}
        </div>
      )}

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
        <div className="flex space-x-2">
          <button
            onClick={stopTracking}
            className={`flex-1 font-bold py-4 rounded-full flex items-center justify-center transition ${
              route.length > 0 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            disabled={route.length === 0}
          >
            <Square className="mr-2" /> {route.length > 0 ? 'Stop & Save' : 'Waiting for GPS...'}
          </button>
          
          <button
            onClick={cancelRun}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-4 rounded-full flex items-center justify-center transition"
            title="Cancel Run (No Save)"
          >
            X
          </button>
        </div>
      )}
    </div>
  );
};

export default RunTracker;
