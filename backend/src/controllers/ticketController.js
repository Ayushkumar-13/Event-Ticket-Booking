const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

// @desc    Book a ticket
// @route   POST /api/tickets/book
// @access  Private
const bookTicket = asyncHandler(async (req, res) => {
    const { eventId, quantity } = req.body;

    if (!eventId || !quantity) {
        res.status(400);
        throw new Error('Please add all fields');
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

    // Create ticket
    const ticket = await Ticket.create({
        user: req.user.id,
        event: eventId,
        quantity,
        status: 'Confirmed'
    });

    console.log("Ticket created successfully:", ticket);

    // Update available tickets
    event.availableTickets -= quantity;
    await event.save();

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
