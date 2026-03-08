import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById } from '../services/eventService';
import { getBookedEventIds } from '../services/registrationService';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import EventDetailsComponent from '../components/user/EventDetails';
import RegistrationForm from '../components/user/RegistrationForm';

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBooked, setIsBooked] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const data = await getEventById(id);
                if (!data) throw new Error("Event not found");
                setEvent(data);
            } catch (err) {
                console.error(err);
                navigate('/404');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id, navigate]);

    // Check if user has already booked this event
    useEffect(() => {
        const checkBookingStatus = async () => {
            if (user && id) {
                try {
                    const bookedIds = await getBookedEventIds();
                    setIsBooked(bookedIds.includes(id));
                } catch (error) {
                    console.error("Failed to check booking status:", error);
                }
            }
        };
        checkBookingStatus();
    }, [user, id]);

    // --- FEATURE 9: REAL-TIME DATA (WEBSOCKETS) ---
    // Listen for live ticket updates from the background worker
    useEffect(() => {
        // Dynamically grab the backend base URL (removing the /api suffix)
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const SOCKET_URL = API_URL.replace(/\/api$/, '') || window.location.origin;

        // Note: Using dynamic import to avoid crashes if socket.io-client isn't fully installed yet
        let socket;
        import('socket.io-client').then(({ io }) => {
            socket = io(SOCKET_URL);

            socket.on('ticket_updated', (data) => {
                // Only update the screen if the broadcasted ticket purchase was for THIS specific event
                if (data.eventId === id) {
                    console.log(`🎫 [WebSocket] Live Update! Tickets remaining: ${data.availableTickets}`);
                    setEvent(prev => prev ? { ...prev, availableTickets: data.availableTickets } : prev);
                }
            });
        }).catch(err => console.error("Socket.io not found", err));

        // Cleanup the websocket connection when the user leaves the page
        return () => {
            if (socket) socket.disconnect();
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={48} />
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="flex-grow pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to events
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <EventDetailsComponent event={event} />
                    </div>

                    <div className="lg:col-span-1">
                        <RegistrationForm event={event} isBooked={isBooked} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetails;
