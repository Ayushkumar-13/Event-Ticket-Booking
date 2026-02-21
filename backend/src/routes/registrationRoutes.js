const express = require('express');
const router = express.Router();
const {
    createRegistration,
    getEventRegistrations,
    updateRegistrationStatus,
    getRegistrationById
} = require('../controllers/registrationController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/', createRegistration);
router.get('/:id', getRegistrationById);

// Protected routes (Organizer only)
router.get('/event/:eventId', protect, getEventRegistrations);
router.patch('/:id/status', protect, updateRegistrationStatus);

module.exports = router;