// Error handler middleware for production logging
module.exports = (err, req, res, next) => {
  const { method, path, body, params, query } = req;
  const userId = req.user?.id || 'anonymous';
  
  // Sanitize sensitive data
  const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') return data;
    const sensitive = ['password', 'token', 'secret', 'email', 'phone'];
    const sanitized = JSON.parse(JSON.stringify(data));
    
    Object.keys(sanitized).forEach(key => {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '***REDACTED***';
      }
    });
    return sanitized;
  };
  
  const errorLog = {
    timestamp: new Date().toISOString(),
    method,
    path,
    userId,
    statusCode: err.statusCode || 500,
    errorMessage: err.message,
    errorCode: err.code || 'UNKNOWN',
    requestData: {
      body: sanitizeData(body),
      params: sanitizeData(params),
      query: sanitizeData(query)
    }
  };
  
  // Log development stack trace
  if (process.env.NODE_ENV === 'development') {
    errorLog.stack = err.stack;
  }
  
  console.error('\n❌ ERROR OCCURRED:', JSON.stringify(errorLog, null, 2));
  
  // Send response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code,
      status: statusCode
    }
  });
};
