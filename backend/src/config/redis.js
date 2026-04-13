const redis = require('redis');
require('dotenv').config();

// Create a Redis client. 
// It will try to connect to localhost:6379 by default if process.env.REDIS_URI is missing.
// We configure it to NOT crash the app if Redis isn't running locally.
const redisClient = redis.createClient({
    url: process.env.REDIS_URI || 'redis://127.0.0.1:6379',
    socket: {
        family: 4, // Force IPv4
        connectTimeout: 2000, // Stop waiting after 2 seconds locally
        reconnectStrategy: (retries) => {
            // Give up after 3 tries if Redis is unavailable
            if (retries > 3) {
                redisClient.removeAllListeners('error');
                return new Error('Redis Unavailable');
            }
            return Math.min(retries * 50, 500);
        }
    }
});

redisClient.on('error', (err) => {
    // Suppress verbose error logging for common connection issues
    if (
        err.message !== 'Redis Unavailable' && 
        !err.message.includes('ENOTFOUND') && 
        !err.message.includes('ECONNRESET') &&
        !err.message.includes('ETIMEDOUT') &&
        !err.message.includes('ECONNREFUSED') &&
        !err.message.includes('Connection timeout')
    ) {
        console.error('Redis Client:', err.message);
    }
});

redisClient.on('connect', () => {
    console.log('---------------Redis Cache Connected----------------');
});

// Connect immediately, but catch so it doesn't crash the server module on boot
redisClient.connect().catch(() => { });

module.exports = redisClient;
