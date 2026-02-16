/**
 * Validates an email address using a regular expression.
 * @param {string} email - The email address to validate.
 * @returns {boolean} True if the email is valid, false otherwise.
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates a password based on minimum length and complexity requirements.
 * Example: Minimum 8 characters.
 * @param {string} password - The password to validate.
 * @returns {object} { isValid: boolean, message: string }
 */
export const validatePassword = (password) => {
    if (!password) {
        return { isValid: false, message: 'Password is required' };
    }
    if (password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    // Add more complexity checks here if needed (e.g., numbers, special chars)
    return { isValid: true, message: '' };
};

/**
 * Checks if a string is empty or contains only whitespace.
 * @param {string} value - The string to check.
 * @returns {boolean} True if empty, false otherwise.
 */
export const isEmpty = (value) => {
    return !value || value.trim().length === 0;
};

/**
 * Validates that two passwords match.
 * @param {string} password - The first password.
 * @param {string} confirmPassword - The second password.
 * @returns {boolean} True if they match, false otherwise.
 */
export const doPasswordsMatch = (password, confirmPassword) => {
    return password === confirmPassword;
};
