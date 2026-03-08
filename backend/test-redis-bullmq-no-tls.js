const IORedis = require('ioredis');
require('dotenv').config();

const connection = new IORedis(process.env.REDIS_URI || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 4,
    // tls removed
});

connection.on('error', (err) => {
    console.error('Redis Error:', err);
});

connection.on('ready', () => {
    console.log('Redis connected successfully!');
    process.exit(0);
});
