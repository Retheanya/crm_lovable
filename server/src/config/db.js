const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

/**
 * Cached connection object – persists across serverless invocations in the
 * same container/warm instance so we never open more than one connection.
 */
let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

/**
 * Returns a resolved Mongoose connection.
 * Re-uses the existing connection when already established (serverless safe).
 */
async function connectDB() {
  // Already connected – return immediately
  if (cached.conn) {
    return cached.conn;
  }

  // A connection attempt is already in-flight – wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // fail fast instead of queueing commands
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        logger.info(
          `Connected to MongoDB: ${mongooseInstance.connection.name} @ ${mongooseInstance.connection.host}`
        );
        return mongooseInstance;
      })
      .catch((err) => {
        // Reset so the next invocation can retry
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
