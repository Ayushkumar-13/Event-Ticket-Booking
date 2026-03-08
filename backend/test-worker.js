require('dotenv').config();
const { ticketQueue, connection } = require('./src/config/queue');
const mongoose = require('mongoose');

async function testWorker() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Adding mock job to ticketQueue...");
    const job = await ticketQueue.add('process-ticket', {
        eventId: "698e24b1166e900d31e853d6", // Global Tastes event
        userId: "698e1a046d1b8712aa21c0cf", // Some existing user
        ticketCount: 1,
        idempotencyKey: `mock-key-${Date.now()}`
    });
    console.log(`Job added: ${job.id}`);

    setTimeout(async () => {
        const state = await job.getState();
        console.log(`Job ${job.id} state: ${state}`);
        if (state === 'failed') console.log("Failed reason:", job.failedReason);
        process.exit(0);
    }, 4000);
}

testWorker();
