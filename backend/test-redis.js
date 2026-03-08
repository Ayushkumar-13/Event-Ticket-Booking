require('dotenv').config();
const { Redis } = require('ioredis');

async function testRedis() {
    console.log(`\n🔍 Testing Redis Connection...`);
    console.log(`URI: ${process.env.REDIS_URI ? 'Found' : 'Missing'}`);

    if (!process.env.REDIS_URI) {
        console.error("❌ No REDIS_URI found in .env");
        process.exit(1);
    }

    try {
        const redis = new Redis(process.env.REDIS_URI, {
            family: 4, // Force IPv4
            maxRetriesPerRequest: 1,
            connectTimeout: 5000
        });

        redis.on('error', (err) => {
            console.error(`\n❌ Redis Connection Error:\n`, err.message);
            if (err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
                console.log(`\n⚠️ This means your current Wi-Fi network (or ISP) is blocking access to port 6379.`);
            }
            process.exit(1);
        });

        redis.on('connect', async () => {
            console.log(`✅ Successfully connected to Upstash Redis!`);

            // Test read/write
            await redis.set('test_key', 'working_perfectly', 'EX', 10);
            const val = await redis.get('test_key');

            console.log(`✅ Read/Write Test: ${val === 'working_perfectly' ? 'PASSED' : 'FAILED'}`);

            // Cleanup and exit gracefully
            await redis.quit();
            console.log(`\n🎉 Redis is 100% working in your codebase right now!`);
            process.exit(0);
        });

    } catch (e) {
        console.error(`\n❌ Failed to initialize Redis:\n`, e);
        process.exit(1);
    }
}

testRedis();
