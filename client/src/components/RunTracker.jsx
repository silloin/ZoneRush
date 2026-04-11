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
  const [duration, setDuration] = useState(runStats.duration || 0);
  const [distance, setDistance] = useState(runStats.distance || 0);
  const [route, setRoute] = useState([]); // Don't initialize with externalRoute
  const [pace, setPace] = useState(runStats.pace || 0);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, searching, active, error
  const [isMinimized, setIsMinimized] = useState(false); // Minimized state
  const [isSaving, setIsSaving] = useState(false); // Track saving state
  const watchId = useRef(null);
  const timerId = useRef(null);
  const setRunStatsRef = useRef(setRunStats);
  const onRouteUpdateRef = useRef(onRouteUpdate);
  const prevRouteLengthRef = useRef(0);
  
  // Keep refs updated with latest callbacks
  useEffect(() => {
    setRunStatsRef.current = setRunStats;
  }, [setRunStats]);
  
  useEffect(() => {
    onRouteUpdateRef.current = onRouteUpdate;
  }, [onRouteUpdate]);
  
  // Update parent when route changes - only send updates when route actually changes
  useEffect(() => {
    // Only call onRouteUpdate when route length increases (new GPS point added)
    if (onRouteUpdateRef.current && route.length > prevRouteLengthRef.current) {
      console.log('📤 Sending route update to parent:', route.length, 'points');
      prevRouteLengthRef.current = route.length;
      onRouteUpdateRef.current(route);
    }
  }, [route]);

  // Update parent state when local stats change
  useEffect(() => {
    if (setRunStatsRef.current) {
      setRunStatsRef.current({ 
        duration: duration || 0, 
        distance: distance || 0, 
        pace: pace || 0, 
        startTime 
      });
    }
  }, [duration, distance, pace, startTime]);

  useEffect(() => {
    if (isTracking) {
      timerId.current = setInterval(() => {
        const newDuration = Math.floor((Date.now() - startTime) / 1000);
        setDuration(newDuration);
      }, 1000);

      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log('📍 GPS Update:', { lat: latitude, lng: longitude, accuracy });
          
          setGpsStatus('active');
          
          // Increased accuracy filter to 200m to accept more GPS readings
          // Mobile GPS accuracy varies widely (50-200m is normal)
          if (accuracy > 200) {
            console.warn('⚠️ GPS accuracy too low:', accuracy, 'meters');
            return;
          }

          const newPoint = { lat: latitude, lng: longitude };
          
          setRoute((prevRoute) => {
            const lastPoint = prevRoute[prevRoute.length - 1];
            
            // Avoid duplicates or very small movements that are likely GPS jitter
            if (lastPoint) {
              // Validate that we have proper coordinates
              if (lastPoint.lat === undefined || lastPoint.lng === undefined || 
                  latitude === undefined || longitude === undefined) {
                console.error('❌ Invalid coordinates:', { lastPoint, newPoint });
                return prevRoute;
              }
              
              const d = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
              
              // Check if distance calculation is valid
              if (isNaN(d) || d < 0) {
                console.error('❌ Invalid distance calculation:', d, { lastPoint, newPoint });
                return prevRoute;
              }
              
              console.log('📏 Distance from last point:', d.toFixed(2), 'meters');
              
              // Removed 5m minimum filter - track all movements for accurate distance
              // Only filter out extremely small movements (< 1m) that are definitely GPS noise
              if (d < 1) {
                console.log('⏭️ Movement too small (< 1m), ignoring as GPS noise');
                return prevRoute;
              }
              
              // Update distance - this must be done here to use the latest prevDist
              setDistance((prevDist) => {
                // Ensure prevDist is a valid number
                const validPrevDist = (typeof prevDist === 'number' && !isNaN(prevDist)) ? prevDist : 0;
                const newDist = validPrevDist + d;
                console.log('💾 Updating distance:', validPrevDist.toFixed(2), '->', newDist.toFixed(2), 'meters');
                return newDist;
              });
            } else {
              console.log('🎯 First GPS point received');
            }
            
            const updatedRoute = [...prevRoute, newPoint];
            console.log('🛣️ Route points:', updatedRoute.length);
            return updatedRoute;
          });
        },
        (err) => {
          // Timeout errors (code 3) are common and not critical - just log as warning
          if (err.code === 3) {
            console.warn('⚠️ GPS timeout - will retry automatically');
            // Don't change status, keep current status (active or searching)
            return;
          }
          
          // Other errors are more serious
          console.error("GPS Error:", err.message);
          setGpsStatus('error');
          
          // Don't give up immediately, GPS might recover
          setTimeout(() => {
            if (isTracking) {
              setGpsStatus('searching');
            }
          }, 5000);
        },
        { 
          enableHighAccuracy: false, // Less aggressive for better compatibility
          timeout: 30000, // Longer timeout (30 seconds)
          maximumAge: 60000 // Allow cached readings up to 60 seconds old
        }
      );
    } else {
      console.log('⏹️ isTracking is false - clearing timer and GPS watch');
      clearInterval(timerId.current);
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      setGpsStatus('idle');
    }

    return () => {
      console.log('🧹 Cleaning up GPS watch and timer');
      clearInterval(timerId.current);
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [isTracking, startTime]);

  useEffect(() => {
    // Only calculate pace if we have meaningful distance (at least 10 meters)
    // and only when actively tracking or just finished
    if (distance >= 10 && duration > 0) {
      // Pace in minutes per km
      const paceInMinPerKm = (duration / 60) / (distance / 1000);
      setPace(isFinite(paceInMinPerKm) ? paceInMinPerKm : 0);
    } else if (distance < 10) {
      // For very short distances, pace is not meaningful
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
      console.log('📡 Requesting initial GPS position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log('✅ Initial GPS position received:', { lat: latitude, lng: longitude, accuracy });
          const initialPoint = { lat: latitude, lng: longitude };
          setRoute([initialPoint]);
          setGpsStatus('active');
        },
        (err) => {
          console.error("Initial position error:", err);
          setGpsStatus('error');
          // Try with less aggressive settings
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              console.log('✅ Fallback GPS position received:', { lat: latitude, lng: longitude, accuracy });
              const initialPoint = { lat: latitude, lng: longitude };
              setRoute([initialPoint]);
              setGpsStatus('active');
            },
            (fallbackErr) => {
              console.error('Fallback GPS also failed:', fallbackErr);
              alert('GPS access failed. Please enable location services and try again.');
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
    console.log('🛑 StopTracking called, route.length:', route.length);
    console.log('📍 Route points:', route);
    
    if (route.length < 2) {
      alert("Cannot save run: A run must have at least 2 points. Try moving around a bit more!");
      return;
    }

    // Set saving state immediately for UI feedback
    setIsSaving(true);

    const runData = {
      distance: parseFloat((distance / 1000).toFixed(2)), // km
      duration, // seconds
      pace: pace ? parseFloat(pace.toFixed(2)) : 0, // min/km - handle undefined/NaN
      route_points: route.map((p, idx) => ({
        lat: p.lat,
        lng: p.lng,
        timestamp: new Date(startTime + (idx * (duration / route.length) * 1000)).toISOString()
      })),
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString()
    };

    console.log('📦 Sending run data to server:', {
      distance: runData.distance,
      duration: runData.duration,
      route_points_count: runData.route_points.length,
      first_point: runData.route_points[0],
      last_point: runData.route_points[runData.route_points.length - 1]
    });

    try {
      // Save run
      console.log('💾 Saving run to database...', runData.distance, 'km');
      const runRes = await axios.post('/runs', runData);
      console.log('✅ Run saved successfully:', runRes.data);
      
      // Stop tracking AFTER successful save
      setIsTracking(false);
      setGpsStatus('idle');
      setIsSaving(false);
      
      if (onRunComplete) onRunComplete();
    } catch (err) {
      console.error('Error saving run:', err);
      console.error('Error details:', err.response?.data);
      
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Error saving run: ${errorMsg}`);
      
      // Reset saving state but don't stop tracking if it failed
      setIsSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl text-white">
      {/* Header with minimize button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Activity className="text-red-400" size={20} />
          Run Tracker
        </h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition"
          title={isMinimized ? "Expand" : "Minimize"}
        >
          {isMinimized ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Content - only show when not minimized */}
      {!isMinimized && (
        <div className="p-6">
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
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded border border-red-500/20">
              <Timer className="mb-2 text-red-400" />
              <span className="text-sm text-gray-400">Time</span>
              <span className="text-2xl font-bold">{formatTime(duration || 0)}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded border border-orange-500/20">
              <MapIcon className="mb-2 text-orange-400" />
              <span className="text-sm text-gray-400">Distance (km)</span>
              <span className="text-2xl font-bold">{distance && !isNaN(distance) ? (distance / 1000).toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded border border-red-500/20">
              <Activity className="mb-2 text-red-400" />
              <span className="text-sm text-gray-400">Pace (min/km)</span>
              <span className="text-2xl font-bold">
                {pace > 0 && isFinite(pace) && distance >= 10 ? pace.toFixed(2) : 'N/A'}
              </span>
              {distance < 10 && (
                <span className="text-xs text-gray-500 mt-1">Need 10m+ for pace</span>
              )}
            </div>
            <div className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded border border-orange-500/20">
              <MapIcon className="mb-2 text-orange-400" />
              <span className="text-sm text-gray-400">Tiles Captured</span>
              <span className="text-2xl font-bold">{route.length > 0 ? new Set(route.map(p => ngeohash.encode(p.lat, p.lng, 7))).size : 0}</span>
            </div>
          </div>

          {!isTracking ? (
            <button
              onClick={startTracking}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-4 rounded-full flex items-center justify-center transition shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Play className="mr-2" /> Start Run
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={stopTracking}
                disabled={route.length === 0 || isSaving}
                className={`flex-1 font-bold py-4 rounded-full flex items-center justify-center transition shadow-lg ${
                  route.length > 0 && !isSaving
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white' 
                    : isSaving
                    ? 'bg-yellow-600 text-white cursor-wait'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Square className="mr-2" /> {route.length > 0 ? 'Stop & Save' : 'Waiting for GPS...'}
                  </>
                )}
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
      )}

      {/* Minimized bar - show quick stats */}
      {isMinimized && isTracking && (
        <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>⏱️ {formatTime(duration || 0)}</span>
            <span>📍 {distance && !isNaN(distance) ? (distance / 1000).toFixed(2) : '0.00'} km</span>
          </div>
          <span className="text-xs opacity-75">Click ▲ to expand</span>
        </div>
      )}
    </div>
  );
};

export default RunTracker;
