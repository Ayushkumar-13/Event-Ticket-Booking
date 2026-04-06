const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables early, before other imports
dotenv.config();

const connectDB = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorMiddleware');
const notFound = require('./middlewares/notFoundMiddleware');


// Connect to MongoDB ONLY if not running Jest tests
// The testing suite provides its own mongod-memory-server wrapper
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins explicitly
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Event Ticketing API is running',
    version: '1.0.0'
  });
});

const apiLimiter = require('./middlewares/rateLimiter');

// API Routes
app.use('/api', apiLimiter, routes);

// 404 Handler
app.use(notFound);

// Error Handler (must be last)
app.use(errorHandler);

module.exports = app;