const { Worker } = require('bullmq');
const { connection } = require('../config/queue');

/**
 * Notification worker — email is now handled synchronously in ticketController.js
 * This worker is kept for queue lifecycle management (completed/failed tracking)
 * but no longer sends emails to avoid duplicate delivery.
 */
const notificationWorker = new Worker('notification-processing', async (job) => {
    // Email sending moved to ticketController.js (direct setImmediate call)
    // to ensure single delivery and avoid duplicate emails.
    console.log(`[Notification Worker] Job ${job.id} acknowledged (email handled by controller).`);
    return { status: 'skipped', reason: 'Email handled by ticketController directly' };
}, {
    connection,
    concurrency: 2
});

notificationWorker.on('error', (err) => {
    if (err.message && !err.message.includes('getaddrinfo ENOTFOUND') && !err.message.includes('ECONNRESET') && !err.message.includes('ETIMEDOUT')) {
        console.error('BullMQ Notification Worker Error:', err.message);
    }
});

notificationWorker.on('failed', (job, err) => {
    console.error(`[Notification Worker] Job ${job?.id} failed. Reason: ${err.message}`);
});

notificationWorker.on('completed', (job) => {
    console.log(`✅ [Notification Worker] Job ${job?.id} acknowledged.`);
});

module.exports = notificationWorker;
