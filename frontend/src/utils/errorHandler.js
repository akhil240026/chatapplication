// Error handling utilities for the frontend

export class ChatError extends Error {
  constructor(message, type = 'GENERAL', details = null) {
    super(message);
    this.name = 'ChatError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export const ERROR_TYPES = {
  CONNECTION: 'CONNECTION',
  AUTHENTICATION: 'AUTHENTICATION',
  MESSAGE: 'MESSAGE',
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  GENERAL: 'GENERAL'
};

export const errorHandler = {
  // Log error with context
  log: (error, context = {}) => {
    const errorInfo = {
      message: error.message,
      type: error.type || 'UNKNOWN',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('[ERROR]', errorInfo);
    
    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureError(errorInfo);
    }
  },

  // Handle Socket.IO errors
  handleSocketError: (error, callback) => {
    const chatError = new ChatError(
      error.message || 'Socket connection error',
      ERROR_TYPES.CONNECTION,
      error
    );
    
    errorHandler.log(chatError, { source: 'socket' });
    
    if (callback) {
      callback(chatError);
    }
    
    return chatError;
  },

  // Handle API errors
  handleApiError: (error, callback) => {
    let message = 'An error occurred';
    let type = ERROR_TYPES.NETWORK;
    
    if (error.response) {
      // Server responded with error status
      message = error.response.data?.error || `HTTP ${error.response.status}`;
      type = error.response.status >= 500 ? ERROR_TYPES.NETWORK : ERROR_TYPES.VALIDATION;
    } else if (error.request) {
      // Request made but no response received
      message = 'Network error - please check your connection';
      type = ERROR_TYPES.NETWORK;
    } else {
      // Something else happened
      message = error.message || 'Request failed';
      type = ERROR_TYPES.GENERAL;
    }
    
    const chatError = new ChatError(message, type, error);
    errorHandler.log(chatError, { source: 'api' });
    
    if (callback) {
      callback(chatError);
    }
    
    return chatError;
  },

  // Handle validation errors
  handleValidationError: (field, value, rule, callback) => {
    const message = `${field} ${rule}`;
    const chatError = new ChatError(message, ERROR_TYPES.VALIDATION, {
      field,
      value,
      rule
    });
    
    errorHandler.log(chatError, { source: 'validation' });
    
    if (callback) {
      callback(chatError);
    }
    
    return chatError;
  },

  // Get user-friendly error message
  getUserMessage: (error) => {
    if (error instanceof ChatError) {
      switch (error.type) {
        case ERROR_TYPES.CONNECTION:
          return 'Connection problem. Please check your internet and try again.';
        case ERROR_TYPES.AUTHENTICATION:
          return 'Authentication failed. Please refresh and try again.';
        case ERROR_TYPES.MESSAGE:
          return 'Failed to send message. Please try again.';
        case ERROR_TYPES.VALIDATION:
          return error.message;
        case ERROR_TYPES.NETWORK:
          return 'Network error. Please check your connection.';
        default:
          return error.message || 'Something went wrong. Please try again.';
      }
    }
    
    return error.message || 'An unexpected error occurred.';
  },

  // Retry mechanism
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        errorHandler.log(error, { 
          source: 'retry',
          attempt,
          maxAttempts
        });
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }
};

export default errorHandler;