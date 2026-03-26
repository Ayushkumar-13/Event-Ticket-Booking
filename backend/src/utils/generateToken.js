const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT for the given user ID.
 * @param {string} id - MongoDB user _id
 * @returns {string} Signed JWT token (expires in 30 days)
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

module.exports = { generateToken };
