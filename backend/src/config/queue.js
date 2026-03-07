const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// Create a dedicated Redis connection for BullMQ using ioredis
const connection = new IORedis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        if (times > 3) {
            console.warn('⚠️ BullMQ Redis connection failed. Queue processing will be paused.');
            return null; // Stop retrying
        }
        return Math.min(times * 50, 1000); // Reconnect after this time
    }
});

connection.on('error', (err) => {
    // Suppress verbose connection errors after exhaustion
    if (err.message && !err.message.includes('getaddrinfo ENOTFOUND') && !err.message.includes('ECONNRESET')) {
        console.error('BullMQ Redis Error:', err.message);
    }
});

// Initialize the Queue
// Default to throwing warning if no connection, but keeping instance alive
const ticketQueue = new Queue('ticket-processing', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    }
});

module.exports = {
    ticketQueue,
    connection
};
