/**
 * Vercel Serverless Entry Point
 *
 * Vercel invokes this file as a serverless function for every request
 * routed to `/api/*` (see vercel.json).
 *
 * Key behaviours:
 *  - Loads environment variables (no-op on Vercel where they are injected)
 *  - Connects to MongoDB using a cached connection so a new connection is
 *    NOT created on every cold-start invocation
 *  - Delegates all request handling to the shared Express app (src/app.js)
 */

require('dotenv').config();

const app = require('../src/app');
const connectDB = require('../src/config/db');

// Pre-warm the DB connection (best-effort; errors are caught per-request)
connectDB().catch(() => {});

/**
 * Serverless handler exported for Vercel.
 * Express's `app` is a valid Node.js http.RequestListener, so Vercel can
 * use it directly as a serverless function handler.
 */
module.exports = async (req, res) => {
  // Ensure DB is connected before processing the request
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    res.status(503).json({ success: false, message: 'Database unavailable' });
    return;
  }

  // Hand off to Express
  app(req, res);
};
