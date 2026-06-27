const swaggerJsDoc = require('swagger-jsdoc');

/**
 * Resolve the public base URL for Swagger's "Servers" dropdown.
 *
 * Priority:
 *  1. SERVER_URL  – explicitly set in .env or Vercel env vars
 *  2. VERCEL_URL  – automatically injected by Vercel (no https:// prefix)
 *  3. Fallback    – localhost for local development
 */
function resolveServerUrl() {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
}

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM API',
      version: '1.0.0',
      description: 'API documentation for the CRM application',
    },
    servers: [
      {
        url: resolveServerUrl(),
        description: process.env.VERCEL_URL ? 'Production Server' : 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
module.exports = swaggerDocs;
