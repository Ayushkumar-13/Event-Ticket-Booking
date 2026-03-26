const redis = require('redis');
require('dotenv').config();

// Create a Redis client. 
// It will try to connect to localhost:6379 by default if process.env.REDIS_URI is missing.
// We configure it to NOT crash the app if Redis isn't running locally.
const redisClient = redis.createClient({
    url: process.env.REDIS_URI || 'redis://127.0.0.1:6379',
    socket: {
        family: 4, // Force IPv4
        reconnectStrategy: (retries) => {
            // Give up after 3 tries if Redis is completely unavailable
            // This allows the app to fallback to just using MongoDB without crashing
            if (retries > 3) {
                // Silently fallback to MongoDB without logging warnings to the terminal
                redisClient.removeAllListeners('error');
                return new Error('Redis retry exhausted');
            }
            return Math.min(retries * 50, 1000);
        }
    }
});

redisClient.on('error', (err) => {
    // Suppress verbose error logging if we already know it's down or can't resolve
    if (err.message !== 'Redis retry exhausted' && !err.message.includes('ENOTFOUND') && !err.message.includes('ECONNRESET')) {
        console.error('Redis Client Error:', err.message);
    }
});

redisClient.on('connect', () => {
    console.log('---------------Redis Cache Connected----------------');
});

// Connect immediately, but catch so it doesn't crash the server module on boot
redisClient.connect().catch(() => { });

module.exports = redisClient;
