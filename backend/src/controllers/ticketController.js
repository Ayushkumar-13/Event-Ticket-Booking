const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');

// @desc    Book a ticket
// @route   POST /api/tickets/book
// @access  Private
const bookTicket = asyncHandler(async (req, res) => {
    const { eventId, quantity } = req.body;

    console.log("🎟️ [API POST /book] Received Payload:", req.body);

    if (!eventId || !quantity) {
        res.status(400);
        throw new Error('Please provide eventId and quantity');
    }

    const idempotencyKey = req.headers['idempotency-key'];

    // --- IDEMPOTENCY CHECK ---
    // Prevents double-booking on network retries or accidental double-clicks
    if (idempotencyKey) {
        const existingTicket = await Ticket.findOne({ idempotencyKey });
        if (existingTicket) {
            console.log(`🔄 Idempotency key match! Returning existing ticket: ${existingTicket._id}`);
            return res.status(200).json({
                message: 'Ticket already booked',
                ticketId: existingTicket._id,
                status: 'success'
            });
        }
    }

    // --- FETCH EVENT ---
    const event = await Event.findById(eventId);
    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    if (event.availableTickets < quantity) {
        res.status(400);
        throw new Error('Not enough available tickets');
    }

    // --- ATOMIC UPDATE (Optimistic Concurrency Control) ---
    // Uses $gte to guard against a race condition where another request
    // snaps up the last tickets between our check and our update.
    const updatedEvent = await Event.findOneAndUpdate(
        {
            _id: eventId,
            availableTickets: { $gte: quantity }
        },
        {
            $inc: {
                availableTickets: -quantity,
                soldTickets: quantity
            }
        },
        { new: true }
    );

    if (!updatedEvent) {
        res.status(409);
        throw new Error('Tickets were just sold out. Please try again.');
    }

    // --- CREATE TICKET RECORD ---
    const ticket = await Ticket.create({
        user: req.user.id,
        event: eventId,
        quantity,
        status: 'Confirmed',
        idempotencyKey
    });

    console.log(`✅ [ticketController] Created Ticket ${ticket._id} for user ${req.user.id}`);

    // --- INVALIDATE CACHE ---
    await invalidateEventCache();

    // --- BROADCAST REALTIME UPDATE ---
    try {
        const { getIO } = require('../socket');
        const io = getIO();
        io.emit('ticket_updated', {
            eventId,
            availableTickets: updatedEvent.availableTickets
        });
    } catch (socketErr) {
        // Non-fatal — real-time update best-effort
    }

    // --- SEND EMAIL WITH PDF (non-blocking — won't fail the booking) ---
    const userForEmail = { id: req.user.id, email: req.user.email, name: req.user.name };
    const eventForEmail = {
        title: updatedEvent.title,
        location: updatedEvent.location,
        date: updatedEvent.date,
        time: updatedEvent.time,
        price: updatedEvent.price,
        category: updatedEvent.category
    };
    const ticketForEmail = {
        _id: ticket._id,
        quantity: ticket.quantity,
        status: ticket.status,
        idempotencyKey: ticket.idempotencyKey
    };

    setImmediate(async () => {
        try {
            console.log(`📧 [Email] Generating PDF for ticket ${ticket._id}...`);
            const pdfBuffer = await generateTicketPDF(ticketForEmail, eventForEmail, userForEmail);
            await sendTicketEmail(userForEmail, eventForEmail, pdfBuffer);
            console.log(`✅ [Email] Ticket email delivered to ${req.user.email}`);
        } catch (emailErr) {
            console.error(`❌ [Email] Failed to send ticket email:`, emailErr.message);
        }
    });

    res.status(201).json({
        message: 'Ticket booked successfully',
        ticketId: ticket._id,
        status: 'success'
    });
});

// @desc    Get user's tickets
// @route   GET /api/tickets/user
// @access  Private
const getUserTickets = asyncHandler(async (req, res) => {
    console.log("📋 getUserTickets: User ID:", req.user.id);

    const tickets = await Ticket.find({
        user: req.user.id,
        status: 'Confirmed'
    }).populate('event', 'title date time location image price category');

    console.log("📋 Found tickets count:", tickets.length);

    res.status(200).json(tickets);
});

// @desc    Get user's booked event IDs (for UI state — e.g. hiding "Book" button)
// @route   GET /api/tickets/booked-events
// @access  Private
const getBookedEventIds = asyncHandler(async (req, res) => {
    const tickets = await Ticket.find({
        user: req.user.id,
        status: 'Confirmed'
    }).select('event');

    const eventIds = tickets.map(ticket => ticket.event.toString());
    res.status(200).json(eventIds);
});

// @desc    Get all tickets for events owned by the organizer
// @route   GET /api/tickets/organizer
// @access  Private (Organizer)
const getOrganizerTickets = asyncHandler(async (req, res) => {
    const events = await Event.find({ organizer: req.user.id });
    const eventIds = events.map(event => event._id);

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
