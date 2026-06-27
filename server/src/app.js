const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API Routes
app.use('/api/v1', routes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
