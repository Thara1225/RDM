require('dotenv').config();

const app = require('./app');
const prisma = require('./config/prisma');

const PORT = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in environment variables');
}

const server = app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Failed to close database connection', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
