/*
 * ===================================================================
 * CORRECTED app.js FILE
 * ===================================================================
 * 
 * INSTRUCTIONS:
 * 1. Copy this ENTIRE file
 * 2. Replace your current app.js at:
 *    E:\Intern Assignment\Event Ticketing app\backend\src\app.js
 * 3. Save and restart server: npm run dev
 * 
 * ===================================================================
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');  // ✅ FIXED: Changed from './config/db'
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorMiddleware');
const notFound = require('./middlewares/notFoundMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Allow all origins for development/debugging
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

// API Routes
app.use('/api', routes);

// 404 Handler
app.use(notFound);

// Error Handler (must be last)
app.use(errorHandler);

module.exports = app;