export const EVENT_CATEGORIES = [
    'Technology',
    'Music',
    'Art',
    'Business',
    'Food',
    'Sports',
    'Health',
    'Education'
];

export const USER_ROLES = {
    USER: 'user',
    ORGANIZER: 'organizer',
    ADMIN: 'admin'
};

export const TICKET_STATUS = {
    CONFIRMED: 'Confirmed',
    PENDING: 'Pending',
    CANCELLED: 'Cancelled'
};

export const API_ENDPOINTS = {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    EVENTS: '/events',
    ORGANIZER_EVENTS: '/events/organizer',
    BOOK_TICKET: '/tickets/book',
    USER_TICKETS: '/tickets/user'
};

export const DATE_FORMAT_OPTIONS = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
};
