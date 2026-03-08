// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const redisClient = require('../config/redis');

const windowMs = 60 * 1000;
const max = 100;

const handler = (req, res) => {
    res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again after a minute.'
    });
};

const memoryLimiter = rateLimit({
    windowMs,
    max,
    handler,
    standardHeaders: true,
    legacyHeaders: false,
});

let redisLimiter = null;

const apiLimiter = (req, res, next) => {
    // 🚀 Bypassing Rate Limiter completely during Automated Testing
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    if (redisClient.isReady) {
        if (!redisLimiter) {
            console.log('🛡️ Rate Limiter: Promoted to Redis Distributed Store');
            redisLimiter = rateLimit({
                store: new RedisStore({
                    sendCommand: async (...args) => {
                        if (!redisClient.isReady) throw new Error('Redis not ready');
                        return redisClient.sendCommand(args);
                    },
                }),
                windowMs,
                max,
                handler,
                standardHeaders: true,
                legacyHeaders: false,
            });
        }
        return redisLimiter(req, res, next);
    }

    // Utilize Memory Fallback Store immediately if Redis hasn't connected
    return memoryLimiter(req, res, next);
};

module.exports = apiLimiter;
