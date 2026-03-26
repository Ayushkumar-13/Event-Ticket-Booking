import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent, getOrganizerEvents } from '../services/eventService';

const EventContext = createContext();

export const useEvents = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
    const [events, setEvents] = useState([]);
    const [organizerEvents, setOrganizerEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getEvents();
            setEvents(data);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch events');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOrganizerEvents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getOrganizerEvents();
            setOrganizerEvents(data);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch organizer events');
        } finally {
            setLoading(false);
        }
    }, []);

    const addEvent = async (eventData) => {
        setLoading(true);
        try {
            const newEvent = await createEvent(eventData);
            setEvents(prev => [...prev, newEvent]);
            setOrganizerEvents(prev => [...prev, newEvent]);
            return { success: true, event: newEvent };
        } catch (err) {
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    const editEvent = async (id, eventData) => {
        setLoading(true);
        try {
            const updatedEvent = await updateEvent(id, eventData);
            setEvents(prev => prev.map(e => e._id === id ? updatedEvent : e));
            setOrganizerEvents(prev => prev.map(e => e._id === id ? updatedEvent : e));
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }

    const removeEvent = async (id) => {
        setLoading(true);
        try {
            await deleteEvent(id);
            setEvents(prev => prev.filter(e => e._id !== id));
            setOrganizerEvents(prev => prev.filter(e => e._id !== id));
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // --- REAL TIME UPDATES ---
    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const SOCKET_URL = API_URL.replace(/\/api$/, '') || window.location.origin;

        let socket;
        
        // Vercel serverless functions do not support WebSockets natively.
        // Prevent CORS 500/404 spam in the browser console.
        if (SOCKET_URL.includes('vercel.app')) {
            console.warn("WebSocket disabled for Vercel production to prevent CORS errors.");
            return;
        }

        import('socket.io-client').then(({ io }) => {
            socket = io(SOCKET_URL, { transports: ['websocket'] });

            socket.on('ticket_updated', (data) => {
                const { eventId, availableTickets } = data;
                
                // Instantly update the event globally across the entire website
                setEvents(prev => prev.map(e => 
                    e._id === eventId ? { ...e, availableTickets } : e
                ));
                
                setOrganizerEvents(prev => prev.map(e => 
                    e._id === eventId ? { ...e, availableTickets } : e
                ));
            });
        }).catch(err => console.error("Socket.io not found", err));

        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    return (
        <EventContext.Provider value={{
            events,
            organizerEvents,
            loading,
            error,
            fetchEvents,
            fetchOrganizerEvents,
            addEvent,
            editEvent,
            removeEvent
        }}>
            {children}
        </EventContext.Provider>
    );
};
