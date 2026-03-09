// Anti-cheat GPS validation module
const pool = require('../config/db');

// Constants for validation
const MAX_SPEED_KMH = 25; // Maximum realistic running speed (km/h)
const MAX_SPEED_MPS = MAX_SPEED_KMH / 3.6; // Convert to m/s
const MIN_ACCURACY_METERS = 100; // Maximum acceptable GPS accuracy
const MAX_DISTANCE_JUMP_METERS = 500; // Maximum distance between points
const MIN_TIME_BETWEEN_POINTS_MS = 1000; // Minimum time between GPS updates

/**
 * Validate GPS point for cheating
 * @param {Object} point - { lat, lng, accuracy, timestamp }
 * @param {Object} lastPoint - Previous point { lat, lng, timestamp }
 * @returns {Object} - { valid: boolean, reason: string, confidence: number }
 */
const validateGPSPoint = (point, lastPoint) => {
  // Check accuracy
  if (point.accuracy && point.accuracy > MIN_ACCURACY_METERS) {
    return {
      valid: false,
      reason: `Poor GPS accuracy: ${point.accuracy}m (max ${MIN_ACCURACY_METERS}m)`,
      confidence: 0.9
    };
  }

  // Check for valid coordinates
  if (!point.lat || !point.lng) {
    return {
      valid: false,
      reason: 'Missing coordinates',
      confidence: 1.0
    };
  }

  // Check coordinate bounds
  if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    return {
      valid: false,
      reason: 'Coordinates out of valid range',
      confidence: 1.0
    };
  }

  if (!lastPoint) {
    return { valid: true, reason: 'First point', confidence: 1.0 };
  }

  // Calculate distance from last point
  const distance = calculateDistance(
    lastPoint.lat, lastPoint.lng,
    point.lat, point.lng
  );

  // Check for impossible jumps
  if (distance > MAX_DISTANCE_JUMP_METERS) {
    return {
      valid: false,
      reason: `Impossible jump: ${distance.toFixed(0)}m (max ${MAX_DISTANCE_JUMP_METERS}m)`,
      confidence: 0.95
    };
  }

  // Calculate time difference
  const timeDiff = point.timestamp - lastPoint.timestamp;
  if (timeDiff < MIN_TIME_BETWEEN_POINTS_MS) {
    return {
      valid: false,
      reason: 'Points too frequent (possible spoofing)',
      confidence: 0.7
    };
  }

  // Calculate speed
  const speed = distance / (timeDiff / 1000); // m/s
  if (speed > MAX_SPEED_MPS) {
    return {
      valid: false,
      reason: `Impossible speed: ${(speed * 3.6).toFixed(1)} km/h (max ${MAX_SPEED_KMH} km/h)`,
      confidence: 0.9
    };
  }

  return { valid: true, reason: 'Valid point', confidence: 1.0 };
};

/**
 * Validate entire route for cheating
 * @param {Array} route - Array of { lat, lng, accuracy, timestamp }
 * @returns {Object} - { valid: boolean, violations: Array, confidence: number }
 */
const validateRoute = (route) => {
  if (!route || route.length < 2) {
    return {
      valid: false,
      violations: ['Route too short'],
      confidence: 1.0
    };
  }

  const violations = [];
  let validPoints = 0;
  let lastValidPoint = null;

  for (let i = 0; i < route.length; i++) {
    const point = route[i];
    const validation = validateGPSPoint(point, lastValidPoint);

    if (!validation.valid) {
      violations.push({
        index: i,
        point,
        reason: validation.reason,
        confidence: validation.confidence
      });
    } else {
      validPoints++;
      lastValidPoint = point;
    }
  }

  // Calculate overall confidence
  const confidence = validPoints / route.length;
  
  // Flag for review if too many violations
  const violationThreshold = 0.3; // 30% of points can be invalid
  const valid = violations.length / route.length <= violationThreshold;

  return {
    valid,
    violations,
    confidence,
    validPoints,
    totalPoints: route.length
  };
};

/**
 * Check for teleportation (sudden location changes)
 * @param {Array} route - GPS route
 * @returns {Object} - Teleportation check result
 */
const checkTeleportation = (route) => {
  const teleportThreshold = 1000; // meters
  const teleportations = [];

  for (let i = 1; i < route.length; i++) {
    const distance = calculateDistance(
      route[i - 1].lat, route[i - 1].lng,
      route[i].lat, route[i].lng
    );

    if (distance > teleportThreshold) {
      teleportations.push({
        from: route[i - 1],
        to: route[i],
        distance: distance
      });
    }
  }

  return {
    hasTeleportation: teleportations.length > 0,
    teleportations,
    severity: teleportations.length > 2 ? 'high' : teleportations.length > 0 ? 'medium' : 'none'
  };
};

/**
 * Check for GPS spoofing patterns
 * @param {Array} route - GPS route
 * @returns {Object} - Spoofing analysis
 */
const checkSpoofingPatterns = (route) => {
  const patterns = {
    perfectStraightLines: 0,
    repeatedCoordinates: 0,
    impossibleAccuracy: 0
  };

  // Check for repeated coordinates (mock location apps often repeat)
  const coordinateMap = new Map();
  for (const point of route) {
    const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
    coordinateMap.set(key, (coordinateMap.get(key) || 0) + 1);
  }

  for (const [coord, count] of coordinateMap) {
    if (count > 5) {
      patterns.repeatedCoordinates += count;
    }
  }

  // Check for impossibly perfect accuracy
  let perfectAccuracyCount = 0;
  for (const point of route) {
    if (point.accuracy && point.accuracy < 1) {
      perfectAccuracyCount++;
    }
  }
  
  if (perfectAccuracyCount / route.length > 0.5) {
    patterns.impossibleAccuracy = perfectAccuracyCount;
  }

  const isSuspicious = 
    patterns.repeatedCoordinates > 10 ||
    patterns.impossibleAccuracy > route.length * 0.5;

  return {
    isSuspicious,
    patterns,
    riskLevel: isSuspicious ? 'high' : patterns.repeatedCoordinates > 0 ? 'medium' : 'low'
  };
};

/**
 * Calculate distance between two coordinates (Haversine formula)
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
 * Full anti-cheat validation middleware
 */
const antiCheatMiddleware = async (req, res, next) => {
  const { route } = req.body;

  if (!route) {
    return next(); // No route to validate
  }

  // Run all checks
  const routeValidation = validateRoute(route);
  const teleportCheck = checkTeleportation(route);
  const spoofingCheck = checkSpoofingPatterns(route);

  // Log suspicious activity
  if (!routeValidation.valid || teleportCheck.hasTeleportation || spoofingCheck.isSuspicious) {
    console.warn('Anti-cheat: Suspicious activity detected', {
      userId: req.user?.id,
      routeValidation,
      teleportCheck,
      spoofingCheck
    });

    // Store flag in database for review
    try {
      await pool.query(
        `INSERT INTO cheat_flags (user_id, route_data, violations, severity, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          req.user?.id,
          JSON.stringify(route),
          JSON.stringify({
            routeValidation,
            teleportCheck,
            spoofingCheck
          }),
          spoofingCheck.riskLevel === 'high' || teleportCheck.severity === 'high' ? 'high' : 'medium'
        ]
      );
    } catch (err) {
      console.error('Failed to log cheat flag:', err);
    }

    // Block high-severity violations
    if (spoofingCheck.riskLevel === 'high' || teleportCheck.severity === 'high') {
      return res.status(403).json({
        msg: 'Activity flagged for review',
        reason: 'Suspicious GPS patterns detected',
        violations: routeValidation.violations.slice(0, 3)
      });
    }
  }

  // Attach validation results to request
  req.antiCheat = {
    validated: true,
    confidence: routeValidation.confidence,
    violations: routeValidation.violations
  };

  next();
};

module.exports = {
  validateGPSPoint,
  validateRoute,
  checkTeleportation,
  checkSpoofingPatterns,
  antiCheatMiddleware
};
