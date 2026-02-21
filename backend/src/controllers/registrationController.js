const asyncHandler = require('express-async-handler');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Public
const createRegistration = asyncHandler(async (req, res) => {
    const { event, user, ticketCount, totalAmount } = req.body;

    const registration = await Registration.create({
        event,
        user,
        ticketCount,
        totalAmount
    });

    // Update sold tickets count in Event
    const eventDoc = await Event.findById(event);
    if (eventDoc) {
        eventDoc.soldTickets = (eventDoc.soldTickets || 0) + ticketCount;
        eventDoc.availableTickets -= ticketCount; // Decrement available tickets
        await eventDoc.save();
    }

    res.status(201).json(registration);
});

// @desc    Get registrations for a specific event
// @route   GET /api/registrations/event/:eventId
// @access  Private/Organizer
const getEventRegistrations = asyncHandler(async (req, res) => {
    const eventId = req.params.eventId;

    // Check if event exists and belongs to the organizer (optional security check)
    const event = await Event.findById(eventId);
    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to view registrations for this event');
    }

    const registrations = await Registration.find({ event: eventId })
        .populate('user', 'name email'); // Populate user details for the report

    res.status(200).json(registrations);
});

// @desc    Get registration by ID
// @route   GET /api/registrations/:id
// @access  Public
const getRegistrationById = asyncHandler(async (req, res) => {
    const registration = await Registration.findById(req.params.id).populate('event user');

    if (registration) {
        res.status(200).json(registration);
    } else {
        res.status(404);
        throw new Error('Registration not found');
    }
});

// @desc    Update registration status
// @route   PATCH /api/registrations/:id/status
// @access  Private/Organizer
const updateRegistrationStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const registration = await Registration.findById(req.params.id);

    if (registration) {
        registration.status = status;
        const updatedRegistration = await registration.save();
        res.status(200).json(updatedRegistration);
    } else {
        res.status(404);
        throw new Error('Registration not found');
    }
});

module.exports = {
    createRegistration,
    getEventRegistrations,
    getRegistrationById,
    updateRegistrationStatus,
};
