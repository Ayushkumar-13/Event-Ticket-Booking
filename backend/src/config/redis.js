const redis = require('redis');

// Create a Redis client. 
// It will try to connect to localhost:6379 by default if process.env.REDIS_URI is missing.
// We configure it to NOT crash the app if Redis isn't running locally.
const redisClient = redis.createClient({
    url: process.env.REDIS_URI || 'redis://127.0.0.1:6379',
    socket: {
        reconnectStrategy: (retries) => {
            // Give up after 3 tries if Redis is completely unavailable
            // This allows the app to fallback to just using MongoDB without crashing
            if (retries > 3) {
                console.warn('⚠️ Redis connection failed. Proceeding without caching layer.');
                return new Error('Redis retry exhausted');
            }
            return Math.min(retries * 50, 1000);
        }
    }
});

redisClient.on('error', (err) => {
    // Suppress verbose error logging if we already know it's down
    if (err.message !== 'Redis retry exhausted') {
        console.error('Redis Client Error:', err.message);
    }
});

redisClient.on('connect', () => {
    console.log('---------------Redis Cache Connected----------------');
});

// Connect immediately, but catch so it doesn't crash the server module on boot
redisClient.connect().catch(() => { });

module.exports = redisClient;
