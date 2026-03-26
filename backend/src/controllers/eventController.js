const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const redisClient = require('../config/redis');
const { invalidateEventCache } = require('../utils/cacheHelper');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = asyncHandler(async (req, res) => {
    // --- DISTRIBUTED CACHING LAYER ---
    // 1. Try to fetch from Redis first (Cache Hit)
    try {
        if (redisClient.isOpen) {
            const cachedEvents = await redisClient.get('events_all');
            if (cachedEvents) {
                console.log("⚡ [Redis] Cache HIT! Returning events from memory instantly.");
                return res.status(200).json(JSON.parse(cachedEvents));
            }
        }
    } catch (err) {
        console.error("Cache read error:", err.message);
    }

    // 2. If not in cache (Cache Miss), fetch from MongoDB
    console.log("🐌 [MongoDB] Cache MISS! Fetching events from database...");
    const events = await Event.find().sort({ date: 1 });

    // 3. Save the result to Redis for future requests (Expire in 1 hour)
    try {
        if (redisClient.isOpen) {
            await redisClient.setEx('events_all', 3600, JSON.stringify(events));
            console.log("💾 [Redis] Successfully cached the events list.");
        }
    } catch (err) {
        console.error("Cache write error:", err.message);
    }

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

    const eventData = { ...req.body, organizer: req.user.id };

    if (req.file) {
        eventData.image = req.file.path;
    }

    const event = await Event.create(eventData);
    await invalidateEventCache();

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

    if (event.organizer.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Forbidden: You are not the organizer of this event');
    }

    const eventData = { ...req.body };

    if (req.file) {
        eventData.image = req.file.path;
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, eventData, { new: true });
    await invalidateEventCache();

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

    if (event.organizer.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Forbidden: You are not the organizer of this event');
    }

    await event.deleteOne();
    await invalidateEventCache();

    res.status(200).json({ id: req.params.id });
});

// @desc    Get organizer dashboard stats
// @route   GET /api/events/stats
// @access  Private (Organizer)
const getDashboardStats = asyncHandler(async (req, res) => {
    const events = await Event.find({ organizer: req.user.id });
    const eventIds = events.map(event => event._id);
    const totalEvents = events.length;

    // Aggregate stats from the Ticket model
    const stats = await Ticket.aggregate([
        {
            $match: {
                event: { $in: eventIds },
                status: 'Confirmed'
            }
        },
        {
            $lookup: {
                from: 'events',
                localField: 'event',
                foreignField: '_id',
                as: 'eventDetails'
            }
        },
        {
            $unwind: '$eventDetails'
        },
        {
            $group: {
                _id: null,
                totalAttendees: { $sum: '$quantity' },
                totalRevenue: { $sum: { $multiply: ['$quantity', '$eventDetails.price'] } }
            }
        }
    ]);

    res.status(200).json({
        totalEvents,
        totalAttendees: stats[0]?.totalAttendees || 0,
        totalRevenue: stats[0]?.totalRevenue || 0,
        avgAttendance: totalEvents > 0 ? Math.round((stats[0]?.totalAttendees || 0) / totalEvents) : 0
    });
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
