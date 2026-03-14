/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} - Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert meters to kilometers
 * @param {number} meters 
 * @returns {number}
 */
const metersToKm = (meters) => meters / 1000;

/**
 * Calculate average pace (min/km)
 * @param {number} distanceMeters 
 * @param {number} durationSeconds 
 * @returns {number}
 */
const calculatePace = (distanceMeters, durationSeconds) => {
  if (distanceMeters === 0) return 0;
  const distanceKm = metersToKm(distanceMeters);
  const durationMin = durationSeconds / 60;
  return durationMin / distanceKm;
};

module.exports = {
  calculateDistance,
  metersToKm,
  calculatePace
};
