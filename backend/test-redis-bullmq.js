const IORedis = require('ioredis');
require('dotenv').config();

const connection = new IORedis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4,
    tls: process.env.REDIS_URI && process.env.REDIS_URI.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});

connection.on('error', (err) => {
    console.error('Redis Error:', err);
});

connection.on('ready', () => {
    console.log('Redis connected successfully!');
    process.exit(0);
});
