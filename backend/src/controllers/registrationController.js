const asyncHandler = require('express-async-handler');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

// @desc    Get all registrations for a specific event
// @route   GET /api/registrations/event/:eventId
// @access  Private (Organizer)
const getEventRegistrations = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Forbidden: You are not the organizer of this event');
    }

    const registrations = await Registration.find({ event: req.params.eventId })
        .populate('user', 'name email');

    res.status(200).json(registrations);
});

// @desc    Get a single registration by ID
// @route   GET /api/registrations/:id
// @access  Private
const getRegistrationById = asyncHandler(async (req, res) => {
    const registration = await Registration.findById(req.params.id).populate('event user');

    if (!registration) {
        res.status(404);
        throw new Error('Registration not found');
    }

    res.status(200).json(registration);
});

// @desc    Update a registration's status (e.g. confirm, cancel)
// @route   PATCH /api/registrations/:id/status
// @access  Private (Organizer)
const updateRegistrationStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const registration = await Registration.findById(req.params.id);

    if (!registration) {
        res.status(404);
        throw new Error('Registration not found');
    }

    registration.status = status;
    const updatedRegistration = await registration.save();

    res.status(200).json(updatedRegistration);
});

module.exports = {
    getEventRegistrations,
    getRegistrationById,
    updateRegistrationStatus
};
