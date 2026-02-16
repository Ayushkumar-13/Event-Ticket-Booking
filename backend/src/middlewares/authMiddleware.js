const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log("🔐 Auth: Token received");

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("🔐 Auth: Token decoded, user ID:", decoded.id);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');
            console.log("🔐 Auth: User found:", req.user ? req.user.email : "NOT FOUND");

            next();
        } catch (error) {
            console.error("❌ Auth: Token verification failed:", error.message);
            res.status(401);
            throw new Error('Not authorized');
        }
    }

    if (!token) {
        console.error("❌ Auth: No token provided");
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const organizer = (req, res, next) => {
    if (req.user && req.user.role === 'organizer') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an organizer');
    }
};

module.exports = { protect, organizer };
