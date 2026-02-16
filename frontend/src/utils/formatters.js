/**
 * Formats a number as a currency string.
 * @param {number} amount - The amount to format.
 * @param {string} currency - The currency code (default: 'USD').
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

/**
 * Formats a date string or object into a readable date string.
 * @param {string|Date} date - The date to format.
 * @param {object} options - Intl.DateTimeFormat options.
 * @returns {string} The formatted date string.
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';
    const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Formats a time string (e.g., '14:00') into a readable time string (e.g., '2:00 PM').
 * @param {string} time - The time string in HH:mm format.
 * @returns {string} The formatted time string.
 */
export const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param {string} text - The text to truncate.
 * @param {number} length - The maximum length.
 * @returns {string} The truncated text.
 */
export const truncateText = (text, length = 100) => {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + '...';
};
