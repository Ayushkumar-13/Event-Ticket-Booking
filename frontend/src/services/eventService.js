import api from './api';

// Mock data (Fallback if backend is not running)
const MOCK_EVENTS = [
    {
        _id: '1',
        title: 'Tech Conference 2025',
        description: 'Join us for the biggest tech conference of the year! Featuring speakers from Google, Microsoft, and more.',
        date: '2025-06-15',
        time: '09:00',
        location: 'Convention Center, New York',
        price: 199,
        category: 'Technology',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2070',
        availableTickets: 500,
    },
    {
        _id: '2',
        title: 'Summer Music Festival',
        description: 'A weekend of live music, food, and fun. Headliners include The Weeknd and Dua Lipa.',
        date: '2025-07-20',
        time: '12:00',
        location: 'Central Park, New York',
        price: 89,
        category: 'Music',
        image: 'https://images.unsplash.com/photo-1459749411177-287ce51261df?auto=format&fit=crop&q=80&w=2070',
        availableTickets: 2000,
    },
    {
        _id: '3',
        title: 'Digital Art Workshop',
        description: 'Learn the fundamentals of digital art from industry professionals. Equipment provided.',
        date: '2025-05-10',
        time: '14:00',
        location: 'Artistry Studio, Brooklyn',
        price: 45,
        category: 'Art',
        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=2071',
        availableTickets: 30,
    },
];

export const getEvents = async () => {
    try {
        const response = await api.get('/events');
        return response.data;
    } catch (error) {
        console.warn("Backend unavailable, using mock events");
        return MOCK_EVENTS;
    }
};

export const getEventById = async (id) => {
    try {
        const response = await api.get(`/events/${id}`);
        return response.data;
    } catch (error) {
        console.warn("Backend unavailable, using mock event details");
        return MOCK_EVENTS.find(e => e._id === id);
    }
};

export const createEvent = async (eventData) => {
    try {
        const response = await api.post('/events', eventData);
        return response.data;
    } catch (error) {
        if (!error.response) {
            console.warn("Backend unavailable, using mock create event");
            const newEvent = { ...eventData, _id: String(Date.now()), availableTickets: 100, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2070' };
            MOCK_EVENTS.push(newEvent);
            return newEvent;
        }
        throw error.response.data;
    }
}

export const updateEvent = async (id, eventData) => {
    try {
        const response = await api.put(`/events/${id}`, eventData);
        return response.data;
    } catch (error) {
        if (!error.response) {
            console.warn("Backend unavailable, using mock update event");
            const index = MOCK_EVENTS.findIndex(e => e._id === id);
            if (index !== -1) {
                MOCK_EVENTS[index] = { ...MOCK_EVENTS[index], ...eventData };
                return MOCK_EVENTS[index];
            }
            throw new Error("Event not found");
        }
        throw error.response.data;
    }
}

export const deleteEvent = async (id) => {
    try {
        const response = await api.delete(`/events/${id}`);
        return response.data;
    } catch (error) {
        if (!error.response) {
            console.warn("Backend unavailable, using mock delete event");
            const index = MOCK_EVENTS.findIndex(e => e._id === id);
            if (index !== -1) {
                MOCK_EVENTS.splice(index, 1);
                return { message: "Event deleted successfully" };
            }
            throw new Error("Event not found");
        }
        throw error.response.data;
    }
}

export const getOrganizerEvents = async () => {
    try {
        const response = await api.get('/events/organizer');
        return response.data;
    } catch (error) {
        if (!error.response) {
            console.warn("Backend unavailable, using mock organizer events");
            // Return all events for now as mock
            return MOCK_EVENTS;
        }
        throw error.response.data;
    }
}
