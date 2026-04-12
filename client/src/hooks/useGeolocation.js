import { useState, useCallback, useRef } from 'react';

/**
 * Hook for GPS geolocation with retry, timeout, and validation
 * @returns {Object} { coords, error, loading, getCurrentPosition }
 */
const useGeolocation = () => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const timeoutId = useRef(null);
  
  const getCurrentPosition = useCallback(async (options = {}) => {
    const {
      timeout = 10000,
      maxAge = 0,
      enableHighAccuracy = true,
      retries = 3
    } = options;
    
    if (!navigator.geolocation) {
      setError('❌ Geolocation not supported in this browser');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await new Promise((resolve) => {
          const timeoutHandle = setTimeout(() => {
            console.warn(`⚠️ GPS timeout on attempt ${attempt}/${retries}`);
            if (attempt < retries) {
              setError(`GPS timeout - attempt ${attempt}/${retries}`);
            } else {
              setError('❌ GPS timeout after ' + retries + ' attempts');
            }
            resolve(false);
          }, timeout);
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutHandle);
              const { latitude, longitude, accuracy } = position.coords;
              
              // Validate coordinates
              if (!isValidCoordinates(latitude, longitude)) {
                console.error('❌ Invalid coordinates:', { latitude, longitude });
                setError('Invalid coordinates received');
                resolve(false);
                return;
              }
              
              const coordData = {
                latitude,
                longitude,
                accuracy: accuracy || 0,
                timestamp: new Date()
              };
              
              setCoords(coordData);
              setError(null);
              console.log('✅ GPS position acquired:', coordData);
              resolve(true);
            },
            (err) => {
              clearTimeout(timeoutHandle);
              const errorMsg = getGeolocationErrorMessage(err.code);
              
              if (attempt < retries) {
                console.log(`⚠️ GPS attempt ${attempt}/${retries} failed: ${errorMsg}`);
              } else {
                console.error(`❌ GPS failed after ${retries} attempts: ${errorMsg}`);
                setError(errorMsg);
              }
              
              resolve(false);
            },
            {
              enableHighAccuracy,
              timeout,
              maxAge
            }
          );
        });
        
        if (result) {
          setLoading(false);
          return true;
        }
      } catch (err) {
        console.error('Error in geolocation attempt:', err);
      }
      
      // Exponential backoff between retries
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    
    setLoading(false);
    return false;
  }, []);
  
  const isValidCoordinates = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };
  
  const getGeolocationErrorMessage = (code) => {
    const messages = {
      1: '❌ Location permission denied. Enable in settings.',
      2: '❌ Location unavailable. Check signal.',
      3: '❌ Location request timeout.'
    };
    
    return messages[code] || `❌ GPS error code: ${code}`;
  };
  
  return {
    coords,
    error,
    loading,
    getCurrentPosition,
    isValidCoordinates
  };
};

export default useGeolocation;
