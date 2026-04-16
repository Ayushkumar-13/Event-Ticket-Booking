import api from './api';

export const bookTicket = async (eventId, quantity, idempotencyKey) => {
    try {
        const response = await api.post('/tickets/book', { eventId, quantity }, {
            headers: {
                'Idempotency-Key': idempotencyKey
            }
        });
        return response.data;
    } catch (error) {
        console.error("📡 registrationService: Error booking ticket:", error);
        throw error.response?.data || { message: "Failed to book ticket. Please try again." };
    }
}

export const pollJobStatus = async (jobId) => {
    try {
        const response = await api.get(`/registrations/status/${jobId}`);
        return response.data; // { jobId, state, result, failedReason }
    } catch (error) {
        console.error("📡 registrationService: Error polling job status:", error);
        throw error.response?.data || { message: "Failed to check booking status." };
    }
}

export const getUserTickets = async () => {
    console.log("📡 registrationService: Calling GET /tickets/user");
    try {
        const response = await api.get('/tickets/user');
        console.log("📡 registrationService: Response received:", response);
        console.log("📡 registrationService: Response data:", response.data);
        console.log("📡 registrationService: Response status:", response.status);
        return response.data;
    } catch (error) {
        console.error("📡 registrationService: Error occurred:", error);
        console.error("📡 registrationService: Error response:", error.response);
        throw error.response?.data || { message: "Failed to fetch tickets. Please log in and try again." };
    }
}

export const getBookedEventIds = async () => {
    console.log("📡 registrationService: Calling GET /tickets/booked-events");
    try {
        const response = await api.get('/tickets/booked-events');
        console.log("📡 registrationService: Booked event IDs:", response.data);
        // Response is now: [{ eventId, quantity }, ...]
        // Return as a Map: { eventId -> quantity }
        const bookingMap = {};
        (response.data || []).forEach(({ eventId, quantity }) => {
            bookingMap[eventId] = quantity;
        });
        return bookingMap;
    } catch (error) {
        console.error("📡 registrationService: Error fetching booked events:", error);
        return {};
    }
}
