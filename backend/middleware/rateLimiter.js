// Simple in-memory rate limiter
const rateLimitStore = new Map();

const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false
  } = options;

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of rateLimitStore.entries()) {
      if (now - data.resetTime > windowMs) {
        rateLimitStore.delete(ip);
      }
    }
    
    // Get or create rate limit data for this IP
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData) {
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, rateLimitData);
    }
    
    // Reset if window has passed
    if (now > rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + windowMs;
    }
    
    // Check if limit exceeded
    if (rateLimitData.count >= maxRequests) {
      console.warn(`Rate limit exceeded for IP: ${key}`);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
      });
    }
    
    // Increment counter
    rateLimitData.count++;
    
    // Add headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - rateLimitData.count),
      'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
    });
    
    next();
  };
};

module.exports = rateLimiter;