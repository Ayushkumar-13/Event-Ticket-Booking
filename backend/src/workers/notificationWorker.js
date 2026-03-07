const { Worker } = require('bullmq');
const { connection } = require('../config/queue');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');

/**
 * Background worker to handle heavy CPU operations (PDF Generation)
 * and slow network operations (SMTP Email Sending) outside the main event loop
 */
const notificationWorker = new Worker('notification-processing', async (job) => {
    const { ticket, event, user } = job.data;

    console.log(`[Notification Worker] Picking up job ${job.id}: Generating PDF and emailing user ${user.email} for ticket ${ticket._id}`);

    try {
        // Step 1: Generate lightweight PDF Buffer
        console.log(`[Notification Worker] Step 1: Generating PDF Template...`);
        const pdfBuffer = await generateTicketPDF(ticket, event, user);

        // Step 2: Send email with PDF attached
        console.log(`[Notification Worker] Step 2: Dispatching Email...`);
        await sendTicketEmail(user, event, pdfBuffer);

        return { status: 'success', deliveredTo: user.email };
    } catch (error) {
        console.error(`[Notification Worker] Error processing job ${job.id}:`, error);
        throw error; // Will trigger BullMQ's exponential backoff retries
    }
}, {
    connection,
    concurrency: 2 // Send emails securely without overwhelming SMTP providers
});

// Worker error handlers
notificationWorker.on('error', (err) => {
    if (err.message && !err.message.includes('getaddrinfo ENOTFOUND') && !err.message.includes('ECONNRESET') && !err.message.includes('ETIMEDOUT')) {
        console.error('BullMQ Notification Worker Connection Error:', err.message);
    }
});

notificationWorker.on('failed', (job, err) => {
    console.error(`[Notification Worker] Job ${job?.id} failed sending email. Reason: ${err.message}`);
});

notificationWorker.on('completed', (job) => {
    console.log(`✅ [Notification Worker] Job ${job?.id} perfectly processed. Email Delivered.`);
});

module.exports = notificationWorker;
