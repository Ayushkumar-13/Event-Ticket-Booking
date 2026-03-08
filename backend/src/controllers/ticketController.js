const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { ticketQueue } = require('../config/queue');

// @desc    Book a ticket
// @route   POST /api/tickets/book
// @access  Private
const bookTicket = asyncHandler(async (req, res) => {
    const { eventId, quantity } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    if (!eventId || !quantity) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Dispatch the ticket purchase operation to the BullMQ message queue!
    const job = await ticketQueue.add('process-ticket', {
        eventId,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        ticketCount: quantity,
        idempotencyKey
    });

    console.log(`[Queue] Added ticket registration job ${job.id} for user ${req.user.id}`);

    // Respond immediately with 202 Accepted, giving UI the jobId to poll
    res.status(202).json({
        message: 'Ticket purchase queued successfully',
        jobId: job.id,
        status: 'pending'
    });
});

// @desc    Get user tickets
// @route   GET /api/tickets/user
// @access  Private
const getUserTickets = asyncHandler(async (req, res) => {
    console.log("========================================");
    console.log("📋 getUserTickets: Starting...");
    console.log("📋 User ID:", req.user.id);
    console.log("📋 User email:", req.user.email);

    // Find all confirmed tickets for the user
    const tickets = await Ticket.find({
        user: req.user.id,
        status: 'Confirmed'
    }).populate('event', 'title date time location image price category');

    console.log("📋 Found tickets count:", tickets.length);
    console.log("📋 Tickets data:", JSON.stringify(tickets, null, 2));

    // Check if any tickets have null events
    const ticketsWithoutEvent = tickets.filter(t => !t.event);
    if (ticketsWithoutEvent.length > 0) {
        console.warn("⚠️  Found tickets with deleted events:", ticketsWithoutEvent.length);
    }

    console.log("📋 Returning tickets to frontend");
    console.log("========================================");
    res.status(200).json(tickets);
});

// @desc    Get user's booked event IDs
// @route   GET /api/tickets/booked-events
// @access  Private
const getBookedEventIds = asyncHandler(async (req, res) => {
    console.log("Fetching booked event IDs for user:", req.user.id);
    const tickets = await Ticket.find({
        user: req.user.id,
        status: 'Confirmed'
    }).select('event');

    const eventIds = tickets.map(ticket => ticket.event.toString());
    console.log("User has booked events:", eventIds);
    res.status(200).json(eventIds);
});

// @desc    Get tickets for organizer's events
// @route   GET /api/tickets/organizer
// @access  Private (Organizer)
const getOrganizerTickets = asyncHandler(async (req, res) => {
    // 1. Find all events created by this organizer
    const events = await Event.find({ organizer: req.user.id });
    const eventIds = events.map(event => event._id);

    // 2. Find all tickets for these events
    const tickets = await Ticket.find({ event: { $in: eventIds } })
        .populate('user', 'name email')
        .populate('event', 'title date price')
        .sort({ createdAt: -1 });

    res.status(200).json(tickets);
});

module.exports = {
    bookTicket,
    getUserTickets,
    getBookedEventIds,
    getOrganizerTickets
};
