const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = asyncHandler(async (req, res) => {
    const events = await Event.find().sort({ date: 1 });
    res.status(200).json(events);
});

// @desc    Get organizer events
// @route   GET /api/events/organizer
// @access  Private (Organizer)
const getOrganizerEvents = asyncHandler(async (req, res) => {
    const events = await Event.find({ organizer: req.user.id });
    res.status(200).json(events);
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
const getEventById = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    res.status(200).json(event);
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizer)
const createEvent = asyncHandler(async (req, res) => {
    if (!req.body.title || !req.body.date || !req.body.price || !req.body.availableTickets) {
        res.status(400);
        throw new Error('Please add all required fields');
    }

    const event = await Event.create({
        ...req.body,
        organizer: req.user.id
    });

    res.status(201).json(event);
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer)
const updateEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Check for user
    if (!req.user) {
        res.status(401);
        throw new Error('User not found');
    }

    // Make sure the logged in user matches the event organizer
    if (event.organizer.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
    });

    res.status(200).json(updatedEvent);
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer)
const deleteEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Check for user
    if (!req.user) {
        res.status(401);
        throw new Error('User not found');
    }

    // Make sure the logged in user matches the event organizer
    if (event.organizer.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    await event.deleteOne();

    res.status(200).json({ id: req.params.id });
});

// @desc    Get organizer dashboard stats
// @route   GET /api/events/stats
// @access  Private (Organizer)
const getDashboardStats = asyncHandler(async (req, res) => {
    // 1. Get all events by this organizer
    const events = await Event.find({ organizer: req.user.id });
    const eventIds = events.map(event => event._id);

    // 2. Count total events
    const totalEvents = events.length;

    // 3. Calculate total registrations & revenue
    // We need to import Registration model (lazy load or top level)
    const Registration = require('../models/Registration');

    const stats = await Registration.aggregate([
        {
            $match: {
                event: { $in: eventIds },
                status: 'confirmed'
            }
        },
        {
            $group: {
                _id: null,
                totalAttendees: { $sum: "$ticketCount" },
                totalRevenue: { $sum: "$totalAmount" }
            }
        }
    ]);

    const result = {
        totalEvents,
        totalAttendees: stats[0]?.totalAttendees || 0,
        totalRevenue: stats[0]?.totalRevenue || 0,
        avgAttendance: totalEvents > 0 ? Math.round((stats[0]?.totalAttendees || 0) / totalEvents) : 0
    };

    res.status(200).json(result);
});

module.exports = {
    getEvents,
    getOrganizerEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getDashboardStats
};
