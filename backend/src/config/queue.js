const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// Create a dedicated Redis connection for BullMQ using ioredis
const isRediss = process.env.REDIS_URI && process.env.REDIS_URI.startsWith('rediss://');
let bullmqWarned = false;
const connection = new IORedis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4, // Force IPv4 to fix getaddrinfo ENOTFOUND errors in Node.js
    tls: isRediss ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times) {
        if (times > 3) {
            if (!bullmqWarned) {
                // Silently pause queue processing without logging warnings to the terminal
                bullmqWarned = true;
            }
            return null; // Stop retrying
        }
        return Math.min(times * 50, 1000); // Reconnect after this time
    }
});

connection.on('error', (err) => {
    // Suppress verbose connection errors after exhaustion or timeout
    if (err && err.message) {
        if (
            !err.message.includes('getaddrinfo ENOTFOUND') && 
            !err.message.includes('ECONNRESET') &&
            !err.message.includes('ETIMEDOUT') &&
            !err.message.includes('ECONNREFUSED')
        ) {
            console.error('BullMQ Redis Error:', err.message);
        }
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

// Suppress queue-level unhandled connection errors
ticketQueue.on('error', (err) => {
    if (err.message && !err.message.includes('getaddrinfo ENOTFOUND') && !err.message.includes('ECONNRESET') && !err.message.includes('ETIMEDOUT')) {
        console.error('BullMQ Ticket Queue Error:', err.message);
    }
});

// Initialize Notification Queue (Feature 8)
const notificationQueue = new Queue('notification-processing', {
    connection,
    defaultJobOptions: {
        attempts: 5, // Give emails more attempts in case SMTP is slow
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

notificationQueue.on('error', (err) => {
    if (err.message && !err.message.includes('getaddrinfo ENOTFOUND') && !err.message.includes('ECONNRESET') && !err.message.includes('ETIMEDOUT')) {
        console.error('BullMQ Notification Queue Error:', err.message);
    }
});

module.exports = {
    ticketQueue,
    notificationQueue,
    connection
};
