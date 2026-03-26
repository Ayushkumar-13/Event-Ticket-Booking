const express = require('express');
const router = express.Router();
const {
    getEventRegistrations,
    getRegistrationById,
    updateRegistrationStatus
} = require('../controllers/registrationController');
const { protect } = require('../middlewares/authMiddleware');

// Protected routes
router.get('/event/:eventId', protect, getEventRegistrations);
router.get('/:id', protect, getRegistrationById);
router.patch('/:id/status', protect, updateRegistrationStatus);

module.exports = router;