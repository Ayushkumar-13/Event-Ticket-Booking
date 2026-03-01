const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

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

    // --- IDEMPOTENCY KEY CHECK ---
    // Prevent double-charging during network drops or double-clicks
    if (idempotencyKey) {
        const existingTicket = await Ticket.findOne({ idempotencyKey });
        if (existingTicket) {
            console.log("🔄 Idempotency key match! Returning already processed ticket.");
            return res.status(200).json(existingTicket);
        }
    }

    const event = await Event.findById(eventId);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    if (event.availableTickets < quantity) {
        res.status(400);
        throw new Error('Not enough tickets available');
    }

    // Check if user already has a ticket for this event
    // Check if user already has a ticket for this event
    /* 
    // Allow multiple bookings for the same event (User Request)
    const existingTicket = await Ticket.findOne({
        user: req.user.id,
        event: eventId,
        status: 'Confirmed'
    });

    if (existingTicket) {
        res.status(400);
        throw new Error('You have already booked a ticket for this event');
    }
    */

    // --- OPTIMISTIC CONCURRENCY CONTROL (OCC) ---
    // Atomic update using versioning to prevent double-booking race condition
    const updatedEvent = await Event.findOneAndUpdate(
        {
            _id: eventId,
            __v: event.__v || 0, // The precise version we just read
            availableTickets: { $gte: quantity } // Ensure tickets didn't drop below our requested quantity
        },
        {
            $inc: {
                availableTickets: -quantity,
                soldTickets: quantity,
                __v: 1 // Atomically increment the document version
            }
        },
        { new: true } // Return the updated document to confirm success
    );

    if (!updatedEvent) {
        // If null, someone else beat us to the database update or grabbed the last tickets!
        res.status(409); // 409 Conflict
        throw new Error('High demand! Tickets were purchased by another user while you were booking. Please try again.');
    }

    // Now definitely safe to create the ticket
    const ticket = await Ticket.create({
        user: req.user.id,
        event: eventId,
        quantity,
        status: 'Confirmed',
        idempotencyKey // Store key to prevent future double processing
    });

    // --- DISTRIBUTED CACHING LAYER: Invalidate Cache ---
    // Clear the cache because 'availableTickets' has dropped
    const redisClient = require('../config/redis');
    if (redisClient.isOpen) {
        await redisClient.del('events_all');
        console.log("🧹 [Redis] Invalidated 'events_all' cache due to ticket purchase.");
    }

    console.log("Ticket created successfully with OCC:", ticket);

    res.status(201).json(ticket);
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
