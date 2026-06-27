/**
 * Local Development Entry Point
 *
 * This file is used ONLY when running locally (npm run dev / npm start).
 * Vercel uses api/index.js instead — this file is never executed on Vercel.
 */

require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  });
