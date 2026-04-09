/**
 * Error Handler Utility
 * Provides consistent error handling and user-friendly messages
 */

// Error codes and their user-friendly messages
const ERROR_MESSAGES = {
  // Authentication errors
  'AUTH_INVALID_TOKEN': 'Your session has expired. Please log in again.',
  'AUTH_MISSING_TOKEN': 'Please log in to access this feature.',
  'AUTH_INVALID_CREDENTIALS': 'Invalid email or password.',
  
  // Validation errors
  'VALIDATION_FAILED': 'Please check your input and try again.',
  'INVALID_INPUT': 'The information provided is invalid.',
  
  // Database errors
  'DB_CONNECTION': 'Unable to connect to the database. Please try again later.',
  'DB_QUERY': 'An error occurred while processing your request.',
  'DB_DUPLICATE': 'This entry already exists.',
  'DB_NOT_FOUND': 'The requested resource was not found.',
  
  // AI Service errors
  'AI_TIMEOUT': 'The AI service is taking longer than expected. Please try again.',
  'AI_UNAVAILABLE': 'AI service is temporarily unavailable. Using template plan instead.',
  'AI_RATE_LIMIT': 'You\'ve reached the limit for AI plan generation. Please try again in an hour.',
  
  // Network errors
  'NETWORK_ERROR': 'Network connection failed. Please check your internet connection.',
  'SERVER_ERROR': 'Server error occurred. Please try again later.',
  'REQUEST_TIMEOUT': 'Request timed out. Please try again.',
  
  // Permission errors
  'FORBIDDEN': 'You don\'t have permission to perform this action.',
  'UNAUTHORIZED': 'Please log in to continue.',
  
  // Rate limiting
  'RATE_LIMIT': 'Too many requests. Please slow down and try again.',
  
  // Generic fallback
  'UNKNOWN': 'An unexpected error occurred. Please try again.'
};

// Get user-friendly error message
const getUserFriendlyMessage = (errorCode, defaultMessage) => {
  return ERROR_MESSAGES[errorCode] || defaultMessage || ERROR_MESSAGES.UNKNOWN;
};

// Log error for debugging (not shown to user)
const logError = (error, context = '') => {
  console.error(`[ERROR${context ? ` - ${context}` : ''}]`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
};

// Handle API errors
const handleApiError = (error) => {
  logError(error, 'API Request');
  
  if (!error.response) {
    // Network error
    return {
      status: 0,
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
      isRetryable: true
    };
  }
  
  const { status, data } = error.response;
  
  // Extract error information
  const errorCode = data?.code || data?.error || `HTTP_${status}`;
  const message = data?.message || data?.details || getUserFriendlyMessage(errorCode);
  
  // Determine if error is retryable
  const isRetryable = status >= 500 || status === 429 || status === 0;
  
  return {
    status,
    message,
    code: errorCode,
    isRetryable,
    details: data?.details
  };
};

// Create standardized error response for API
const createErrorResponse = (statusCode, errorCode, message, details = null) => {
  return {
    status: statusCode,
    error: errorCode,
    message: getUserFriendlyMessage(errorCode, message),
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
};

// Async error handler wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    logError(error, `Route: ${req.method} ${req.path}`);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        createErrorResponse(400, 'VALIDATION_FAILED', error.message, error.details)
      );
    }
    
    if (error.name === 'UnauthorizedError') {
      return res.status(401).json(
        createErrorResponse(401, 'AUTH_INVALID_TOKEN', 'Authentication required')
      );
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json(
        createErrorResponse(503, 'DB_CONNECTION', 'Service temporarily unavailable')
      );
    }
    
    // Default error response
    res.status(500).json(
      createErrorResponse(500, 'SERVER_ERROR', 'Internal server error')
    );
  });
};

// Retry function with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

module.exports = {
  getUserFriendlyMessage,
  handleApiError,
  createErrorResponse,
  asyncHandler,
  retryWithBackoff,
  logError,
  ERROR_MESSAGES
};
