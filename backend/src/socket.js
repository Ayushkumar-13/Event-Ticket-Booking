// src/socket.js
const { Server } = require('socket.io');

let io;

/**
 * Initialize the global Socket.IO server attached to the HTTP server
 */
const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL, 
                "http://localhost:5173", 
                "http://127.0.0.1:5173",
                "http://localhost:3000"
            ].filter(Boolean),
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`⚡ [Socket.IO] Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            // Optional: log disconnections
            // console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Retrieve the global Socket.IO instance to emit events from anywhere in the app
 * (e.g., Controllers, Workers)
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized!');
    }
    return io;
};

module.exports = {
    initSocket,
    getIO
};
