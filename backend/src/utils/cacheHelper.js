const redisClient = require('../config/redis');

/**
 * Invalidates the 'events_all' Redis cache key.
 * Call this after any create / update / delete that changes the events list.
 * Safe to call even when Redis is offline — errors are silently swallowed.
 */
const invalidateEventCache = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.del('events_all');
            console.log("🧹 [Redis] Invalidated 'events_all' cache.");
        }
    } catch (err) {
        console.warn('⚠️ [Redis] Cache invalidation failed (non-fatal):', err.message);
    }
};

module.exports = { invalidateEventCache };
