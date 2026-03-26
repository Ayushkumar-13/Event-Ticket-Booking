/**
 * ticketWorker.js
 *
 * NOTE: The synchronous ticket booking flow now lives entirely in
 * ticketController.js (POST /api/tickets/book), which handles:
 *   - Idempotency checks
 *   - Atomic ticket reservation (OCC)
 *   - Redis cache invalidation
 *   - Socket.IO realtime broadcast
 *   - PDF generation + confirmation email (via setImmediate)
 *
 * This file is kept so the 'ticket-processing' BullMQ queue can be monitored
 * (e.g. via Bull Board) and so the queue infrastructure stays intact for any
 * future async jobs that genuinely need background processing.
 */

const { Worker } = require('bullmq');
const { connection } = require('../config/queue');

const ticketWorker = new Worker('ticket-processing', async (job) => {
    console.log(`[Ticket Worker] Job ${job.id} acknowledged — booking is handled synchronously by ticketController.`);
    return { status: 'skipped', reason: 'Booking handled by ticketController directly' };
}, {
    connection,
    concurrency: 5
});

ticketWorker.on('error', (err) => {
    if (err.message && !err.message.includes('getaddrinfo ENOTFOUND') && !err.message.includes('ECONNRESET') && !err.message.includes('ETIMEDOUT')) {
        console.error('BullMQ Ticket Worker Error:', err.message);
    }
});

ticketWorker.on('failed', (job, err) => {
    console.error(`[Ticket Worker] Job ${job?.id} failed: ${err.message}`);
});

ticketWorker.on('completed', (job) => {
    console.log(`✅ [Ticket Worker] Job ${job?.id} acknowledged.`);
});

module.exports = ticketWorker;
