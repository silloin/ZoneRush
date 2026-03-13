import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY;

const RouteReplay = ({ runId, onClose }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [run, setRun] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef(null);

  useEffect(() => {
    fetchRunData();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, [runId]);

  const fetchRunData = async () => {
    try {
      const response = await axios.get(`/runs/${runId}`);
      setRun(response.data);
      initializeMap(response.data);
    } catch (error) {
      console.error('Error fetching run data:', error);
    }
  };

  const initializeMap = (runData) => {
    if (!runData.route_points || runData.route_points.length === 0) return;

    const firstPoint = runData.route_points[0].location.coordinates;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [firstPoint[0], firstPoint[1]],
      zoom: 14
    });

    map.current.on('load', () => {
      // Add full route line
      const coordinates = runData.route_points.map(p => p.location.coordinates);
      
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#888',
          'line-width': 4,
          'line-opacity': 0.4
        }
      });

      // Add animated route line
      map.current.addSource('animated-route', {
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
        id: 'animated-route-line',
        type: 'line',
        source: 'animated-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3B82F6',
          'line-width': 6
        }
      });

      // Add marker
      const el = document.createElement('div');
      el.className = 'replay-marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#EF4444';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      marker.current = new mapboxgl.Marker(el)
        .setLngLat([firstPoint[0], firstPoint[1]])
        .addTo(map.current);
    });
  };

  const animate = () => {
    if (!run || !run.route_points || currentIndex >= run.route_points.length) {
      setIsPlaying(false);
      return;
    }

    const point = run.route_points[currentIndex];
    const coords = point.location.coordinates;

    // Update marker position
    if (marker.current) {
      marker.current.setLngLat(coords);
    }

    // Update animated route
    const animatedCoords = run.route_points
      .slice(0, currentIndex + 1)
      .map(p => p.location.coordinates);

    if (map.current.getSource('animated-route')) {
      map.current.getSource('animated-route').setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: animatedCoords
        }
      });
    }

    // Center map on current position
    map.current.flyTo({
      center: coords,
      duration: 100
    });

    setCurrentIndex(prev => prev + 1);

    // Continue animation
    const delay = 100 / speed;
    animationRef.current = setTimeout(() => {
      if (isPlaying) {
        animate();
      }
    }, delay);
  };

  useEffect(() => {
    if (isPlaying) {
      animate();
    } else {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }
  }, [isPlaying, currentIndex, speed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
    
    if (map.current.getSource('animated-route')) {
      map.current.getSource('animated-route').setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      });
    }

    if (run && run.route_points.length > 0) {
      const firstPoint = run.route_points[0].location.coordinates;
      if (marker.current) {
        marker.current.setLngLat(firstPoint);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!run) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const progress = run.route_points ? (currentIndex / run.route_points.length) * 100 : 0;

  return (
    <div className="relative w-full h-screen bg-gray-900">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-95 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{currentIndex} / {run.route_points?.length || 0} points</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Distance</p>
              <p className="text-white font-bold">{(run.distance / 1000).toFixed(2)} km</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Duration</p>
              <p className="text-white font-bold">{formatDuration(run.duration)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Pace</p>
              <p className="text-white font-bold">{run.pace?.toFixed(2)} min/km</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Speed</p>
              <p className="text-white font-bold">{speed}x</p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRestart}
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
              </svg>
            </button>

            <button
              onClick={handlePlayPause}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full transition"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>

            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteReplay;
