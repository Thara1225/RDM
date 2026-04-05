function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
  const hitsByIp = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const current = hitsByIp.get(ip);

    if (!current || now > current.resetAt) {
      hitsByIp.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count <= max) {
      return next();
    }

    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('retry-after', String(Math.max(retryAfterSeconds, 1)));
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message
      },
      requestId: req.requestId || null
    });
  };
}

module.exports = { createRateLimiter };
