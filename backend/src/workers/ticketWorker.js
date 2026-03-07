const { Worker } = require('bullmq');
const { connection } = require('../config/queue');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const redisClient = require('../config/redis');

const ticketWorker = new Worker('ticket-processing', async (job) => {
    const { eventId, userId, ticketCount, idempotencyKey } = job.data;
    console.log(`[Worker] Picking up job ${job.id}: Processing ticket for user ${userId} to event ${eventId}`);

    // --- IDEMPOTENCY KEY CHECK ---
    // Prevent double-charging during network drops or double-clicks
    if (idempotencyKey) {
        const existingTicket = await Ticket.findOne({ idempotencyKey });
        if (existingTicket) {
            console.log("🔄 Idempotency key match! Returning already processed ticket.");
            return {
                status: 'success',
                ticketId: existingTicket._id
            };
        }
    }

    const event = await Event.findById(eventId);

    if (!event) {
        throw new Error(`Event ${eventId} not found`);
    }

    if (event.availableTickets < ticketCount) {
        throw new Error(`Not enough available tickets for event ${eventId}`);
    }

    // Simulate a Payment Gateway delay to showcase async capability (e.g. Stripe)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // --- OPTIMISTIC CONCURRENCY CONTROL (OCC) ---
    // Atomic update using versioning to prevent double-booking race condition
    const updatedEvent = await Event.findOneAndUpdate(
        {
            _id: eventId,
            __v: event.__v || 0, // The precise version we just read
            availableTickets: { $gte: ticketCount } // Ensure tickets didn't drop below our requested quantity
        },
        {
            $inc: {
                availableTickets: -ticketCount,
                soldTickets: ticketCount,
                __v: 1 // Atomically increment the document version
            }
        },
        { new: true } // Return the updated document to confirm success
    );

    if (!updatedEvent) {
        throw new Error('High demand! Tickets were purchased by another user while you were booking. Please try again.');
    }

    // Now definitely safe to create the ticket
    const ticket = await Ticket.create({
        user: userId,
        event: eventId,
        quantity: ticketCount,
        status: 'Confirmed',
        idempotencyKey // Store key to prevent future double processing
    });

    // --- DISTRIBUTED CACHING LAYER: Invalidate Cache ---
    if (redisClient.isOpen) {
        await redisClient.del('events_all');
        console.log("🧹 [Redis Worker] Invalidated 'events_all' cache due to ticket purchase.");
    }

    // --- FEATURE 8: ASYNCHRONOUS BACKGROUND NOTIFICATIONS ---
    // Push the heavy PDF generation and slow SMTP email sending to a separate worker
    // to prevent the ticket-processing line from getting backed up.
    const { notificationQueue } = require('../config/queue');
    await notificationQueue.add('send-ticket-email', {
        ticket,
        event: updatedEvent,
        user: { id: userId, email: job.data.userEmail, name: job.data.userName }
    });

    console.log(`[Worker] Job ${job.id} SUCCESS: Created ticket ${ticket._id}`);

    // Return data for the polling endpoint
    return {
        status: 'success',
        ticketId: ticket._id
    };

}, {
    connection,
    concurrency: 5 // Process up to 5 ticket purchases simultaneously
});

// Worker error handlers
ticketWorker.on('error', (err) => {
    // Catch worker-level network disconnects so they don't blow up the console
    if (err.message && !err.message.includes('getaddrinfo ENOTFOUND') && !err.message.includes('ECONNRESET') && !err.message.includes('ETIMEDOUT')) {
        console.error('BullMQ Worker Connection Error:', err.message);
    }
});

ticketWorker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed with error ${err.message}`);
});
ticketWorker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Job ${job?.id} perfectly processed.`);
});

module.exports = ticketWorker;
