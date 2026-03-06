const asyncHandler = require('express-async-handler');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { ticketQueue } = require('../config/queue');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Public
const createRegistration = asyncHandler(async (req, res) => {
    const { event, user, ticketCount, totalAmount } = req.body;

    if (!event || !user || !ticketCount) {
        res.status(400);
        throw new Error('Please populate all booking fields');
    }

    // Instead of processing immediately, we add it to the message queue
    const job = await ticketQueue.add('process-ticket', {
        eventId: event,
        userId: user,
        ticketCount,
        amount: totalAmount
    });

    console.log(`[Queue] Added ticket registration job ${job.id}`);

    // Return 202 Accepted meaning: I got the request, but I haven't finished processing it
    res.status(202).json({
        message: 'Ticket purchase queued successfully',
        jobId: job.id,
        status: 'pending'
    });
});

// @desc    Check status of an async ticket purchase job
// @route   GET /api/registrations/status/:jobId
// @access  Public
const checkJobStatus = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const job = await ticketQueue.getJob(jobId);

    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }

    const state = await job.getState();
    res.status(200).json({
        jobId: job.id,
        state, // "waiting", "active", "completed", "failed"
        result: job.returnvalue, // The data we returned inside the ticketWorker
        failedReason: job.failedReason
    });
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
    checkJobStatus,
};
