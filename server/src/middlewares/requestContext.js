const crypto = require('crypto');

function requestContext(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  req.requestId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

module.exports = requestContext;
