/**
 * Input Validation Middleware
 * Validates request inputs to prevent bad data and security issues
 */

// Validate AI training plan preferences
const validateTrainingPlanPreferences = (req, res, next) => {
  const { preferences } = req.body;
  
  // Preferences are optional but if provided, validate them
  if (preferences) {
    // Validate goal
    if (preferences.goal) {
      if (typeof preferences.goal !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'Goal must be a string'
        });
      }
      if (preferences.goal.length > 200) {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'Goal must be less than 200 characters'
        });
      }
    }
    
    // Validate available days
    if (preferences.availableDays) {
      if (!Array.isArray(preferences.availableDays)) {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'Available days must be an array'
        });
      }
      if (preferences.availableDays.some(d => !Number.isInteger(d) || d < 1 || d > 7)) {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'Available days must be integers between 1-7 (Mon-Sun)'
        });
      }
      if (preferences.availableDays.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'Please select at least one available day'
        });
      }
    }
    
    // Validate preferred time
    if (preferences.preferredTime) {
      const validTimes = ['morning', 'afternoon', 'evening', 'anytime'];
      if (!validTimes.includes(preferences.preferredTime)) {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: `Preferred time must be one of: ${validTimes.join(', ')}`
        });
      }
    }
    
    // Validate max distance per week
    if (preferences.maxDistancePerWeek !== undefined) {
      const distance = Number(preferences.maxDistancePerWeek);
      if (!Number.isFinite(distance) || distance < 5 || distance > 150) {
        return res.status(400).json({ 
          error: 'Invalid input',
          message: 'Max weekly distance must be between 5 and 150 km'
        });
      }
    }
  }
  
  next();
};

// Validate user ID parameter
const validateUserId = (req, res, next) => {
  const userId = parseInt(req.params.userId);
  
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ 
      error: 'Invalid input',
      message: 'User ID must be a positive integer'
    });
  }
  
  next();
};

// Sanitize string input (prevent XSS)
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Validate and sanitize text inputs
const validateTextInput = (req, res, next) => {
  if (req.body.caption && typeof req.body.caption === 'string') {
    req.body.caption = sanitizeString(req.body.caption);
  }
  if (req.body.description && typeof req.body.description === 'string') {
    req.body.description = sanitizeString(req.body.description);
  }
  if (req.body.title && typeof req.body.title === 'string') {
    req.body.title = sanitizeString(req.body.title);
  }
  next();
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (page < 1) {
    return res.status(400).json({ 
      error: 'Invalid input',
      message: 'Page number must be >= 1'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({ 
      error: 'Invalid input',
      message: 'Limit must be between 1 and 100'
    });
  }
  
  // Add validated values to request
  req.pagination = { page, limit };
  next();
};

// Validate date range
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'Invalid start date format'
      });
    }
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'Invalid end date format'
      });
    }
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'End date must be after start date'
      });
    }
  }
  
  next();
};

module.exports = {
  validateTrainingPlanPreferences,
  validateUserId,
  validateTextInput,
  validatePagination,
  validateDateRange,
  sanitizeString
};
