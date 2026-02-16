import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useRegistrations = (eventId) => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRegistrations = useCallback(async () => {
        if (!eventId) return;

        setLoading(true);
        try {
            // Placeholder endpoint - backend implementation required
            // const response = await api.get(`/events/${eventId}/registrations`);
            // setRegistrations(response.data);

            // Mock data for now
            await new Promise(resolve => setTimeout(resolve, 500));
            setRegistrations([
                { id: 1, user: 'John Doe', email: 'john@example.com', date: '2025-02-15', status: 'Confirmed' },
                { id: 2, user: 'Jane Smith', email: 'jane@example.com', date: '2025-02-14', status: 'Pending' }
            ]);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch registrations');
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    return { registrations, loading, error, fetchRegistrations };
};

export default useRegistrations;
