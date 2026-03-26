const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const emailValidator = require('deep-email-validator');
const { sendWelcomeEmail, sendLoginAlertEmail } = require('../utils/emailSender');
const { generateToken } = require('../utils/generateToken');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Deep email validation
    const { valid, reason, validators } = await emailValidator.validate({
        email: email,
        validateRegex: true,
        validateMx: true,
        validateTypo: true,
        validateDisposable: true,
        validateSMTP: false
    });

    if (!valid) {
        res.status(400);
        const errorMessage = validators[reason]?.reason || 'Please provide a valid and active email address';
        throw new Error(`Invalid email: ${errorMessage}`);
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({ name, email, password, role: role || 'user' });

    if (user) {
        // Send welcome email (non-blocking — doesn't affect registration response)
        setImmediate(async () => {
            try {
                await sendWelcomeEmail({ name: user.name, email: user.email });
            } catch (err) {
                console.error('⚠️ Welcome email failed:', err.message);
            }
        });

        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        // Send login alert email (non-blocking)
        setImmediate(async () => {
            try {
                await sendLoginAlertEmail({ name: user.name, email: user.email });
            } catch (err) {
                console.error('⚠️ Login alert email failed:', err.message);
            }
        });

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    res.status(200).json(req.user);
});

module.exports = { registerUser, loginUser, getMe };
