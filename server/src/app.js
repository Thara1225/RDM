const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const apiRouter = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const requestContext = require('./middlewares/requestContext');
const { createRateLimiter } = require('./middlewares/rateLimit');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const globalRateLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300
});

app.disable('x-powered-by');
app.use(requestContext);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed'));
    }
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
morgan.token('request-id', (req) => req.requestId || '-');
app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqId=:request-id'));
app.use(globalRateLimiter);
app.use(express.json({ limit: process.env.JSON_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_LIMIT || '100kb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, message: 'Server is running' });
});

app.use('/api', apiRouter);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    },
    requestId: req.requestId || null
  });
});
app.use(errorHandler);

module.exports = app;
