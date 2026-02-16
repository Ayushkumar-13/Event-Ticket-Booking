const express = require('express');
const router = express.Router();
const {
    getEvents,
    getOrganizerEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getDashboardStats
} = require('../controllers/eventController');
const { protect, organizer } = require('../middlewares/authMiddleware');

router.route('/').get(getEvents).post(protect, organizer, createEvent);
router.route('/organizer').get(protect, organizer, getOrganizerEvents);
router.route('/stats').get(protect, organizer, getDashboardStats);
router.route('/:id').get(getEventById).put(protect, organizer, updateEvent).delete(protect, organizer, deleteEvent);

module.exports = router;
