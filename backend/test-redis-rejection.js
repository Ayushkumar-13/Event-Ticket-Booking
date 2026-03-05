const redis = require('redis');
const redisClient = redis.createClient({
    url: 'redis://127.0.0.1:0', // Invalid port to guarantee failure
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                console.warn('⚠️ Redis connection failed. Proceeding without caching layer.');
                return new Error('Redis retry exhausted');
            }
            return 100;
        }
    }
});
redisClient.on('error', (err) => {
    if (err.message !== 'Redis retry exhausted') {
        console.error('Redis Client Error:', err.message);
    }
});
redisClient.connect().catch(() => { console.log("Caught connect"); });
