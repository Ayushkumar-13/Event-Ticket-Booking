const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const ticketRoutes = require('./ticketRoutes');
const registrationRoutes = require('./registrationRoutes');
const chatRoutes = require('./chatRoutes');
const paymentRoutes = require('./paymentRoutes');

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/registrations', registrationRoutes);
router.use('/chat', chatRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
