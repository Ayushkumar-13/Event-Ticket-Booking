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
        return response.data;
    } catch (error) {
        console.error("📡 registrationService: Error fetching booked events:", error);
        // Return empty array for booked events - this is acceptable as it just means no bookings
        return [];
    }
}
