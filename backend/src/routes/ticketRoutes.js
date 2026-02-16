const express = require('express');
const router = express.Router();
const { bookTicket, getUserTickets, getBookedEventIds, getOrganizerTickets } = require('../controllers/ticketController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/book', protect, bookTicket);
router.get('/user', protect, getUserTickets);
router.get('/booked-events', protect, getBookedEventIds);
router.get('/organizer', protect, getOrganizerTickets);

module.exports = router;
