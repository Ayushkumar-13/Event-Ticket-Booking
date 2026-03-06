// src/server.js
const app = require('./app');
require('./workers/ticketWorker'); // Start background processors

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`
----- Server running in ${process.env.NODE_ENV || 'development'} mode    
Port: ${PORT} URL: http://localhost:${PORT}  
    `);
});

// Handle specific server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please close any other terminals or processes running on this port.`);
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});
