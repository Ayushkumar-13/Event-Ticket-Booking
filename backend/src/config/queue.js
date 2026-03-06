const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// Create a dedicated Redis connection for BullMQ using ioredis
const connection = new IORedis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

connection.on('error', (err) => {
    // Prevent generic connection errors from crashing if Redis is down
    console.error('BullMQ Redis Error:', err.message);
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
