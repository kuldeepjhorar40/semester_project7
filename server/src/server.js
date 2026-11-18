const env = require('./config/env'); // validates required env vars first
const connectDB = require('./config/db');
const app = require('./app');
const gemini = require('./services/gemini');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error(`[db] Could not connect to MongoDB at ${env.mongoUri.replace(/\/\/.*@/, '//***@')}`);
    console.error(`[db] ${err.message}`);
    console.error('[db] Is MongoDB running? (e.g. `mongod`, `brew services start mongodb-community`, or use a MongoDB Atlas URI)');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] http://localhost:${env.port}  (${env.nodeEnv})`);
    console.log(`[ai] ${gemini.isConfigured() ? `Gemini enabled (${env.gemini.model})` : 'GEMINI_API_KEY not set -> using built-in keyword fallback'}`);
  });

  const shutdown = (sig) => {
    console.log(`\n[server] ${sig} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
start();
