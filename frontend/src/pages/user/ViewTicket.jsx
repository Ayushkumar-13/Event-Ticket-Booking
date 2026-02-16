import React, { useState, useEffect } from 'react';
import { getUserTickets } from '../../services/registrationService';
import { Link } from 'react-router-dom';
import { Ticket, Loader2, Calendar, MapPin, DollarSign, Hash } from 'lucide-react';
import Button from '../../components/common/Button';

const ViewTicket = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTickets = async () => {
            console.log("🎫 ViewTicket: Starting to fetch tickets...");
            try {
                const data = await getUserTickets();
                console.log("🎫 ViewTicket: Received data:", data);
                console.log("🎫 ViewTicket: Data type:", typeof data);
                console.log("🎫 ViewTicket: Is array?", Array.isArray(data));
                console.log("🎫 ViewTicket: Data length:", data?.length);

                // Ensure data is an array
                if (!data) {
                    console.error("❌ ViewTicket: Data is null or undefined!");
                    setTickets([]);
                } else if (!Array.isArray(data)) {
                    console.error("❌ ViewTicket: Data is not an array!", data);
                    setTickets([]);
                } else {
                    setTickets(data);
                    console.log("🎫 ViewTicket: Tickets state updated with", data.length, "tickets");
                }
            } catch (err) {
                console.error("❌ ViewTicket: Failed to fetch tickets", err);
                setError(err.message || 'Failed to load tickets');
                setTickets([]); // Set empty array on error
            } finally {
                setLoading(false);
                console.log("🎫 ViewTicket: Loading complete");
            }
        };
        fetchTickets();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
                    <p className="text-gray-600">Loading your tickets...</p>
                </div>
            </div>
        );
    }

    console.log("🎫 ViewTicket: Rendering with tickets:", tickets);
    console.log("🎫 ViewTicket: Tickets length:", tickets.length);

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">My Tickets</h1>
                        <p className="text-gray-600 dark:text-gray-400">View and manage your event bookings</p>
                    </div>
                    <Link to="/">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">Browse Events</Button>
                    </Link>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 mb-6 text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Ticket size={32} className="text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-red-800 dark:text-red-300 font-semibold text-xl mb-2">Unable to Load Tickets</h3>
                        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                        {error.includes('log in') || error.includes('authorized') ? (
                            <Link to="/login">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                                    Sign In to View Tickets
                                </Button>
                            </Link>
                        ) : (
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                )}

                {/* Tickets Display */}
                {tickets.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-16 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Ticket size={48} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">No Tickets Yet</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                            You haven't booked any events yet. Start exploring amazing events and book your first ticket!
                        </p>
                        <Link to="/">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-8 py-3 text-lg">
                                Explore Events
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Showing {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                        </div>
                        {tickets.map((ticket, index) => (
                            <TicketCard key={ticket._id || index} ticket={ticket} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Enhanced Ticket Card Component
const TicketCard = ({ ticket }) => {
    if (!ticket.event) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-300">Event Unavailable</h3>
                    <p className="text-red-500 dark:text-red-400 text-sm">This event may have been deleted.</p>
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500">
                    Ticket ID: {ticket._id}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col md:flex-row">
                {/* Event Image */}
                <div className="md:w-64 h-48 md:h-auto relative overflow-hidden">
                    <img
                        src={ticket.event.image || 'https://placehold.co/600x400?text=Event'}
                        alt={ticket.event.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/600x400?text=Event';
                        }}
                    />
                    <div className="absolute top-4 left-4">
                        <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                            {ticket.status || 'Confirmed'}
                        </span>
                    </div>
                </div>

                {/* Ticket Details */}
                <div className="flex-grow p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{ticket.event.title}</h3>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <Calendar size={20} className="text-indigo-500 dark:text-indigo-400" />
                                <span className="font-medium">
                                    {new Date(ticket.event.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })} at {ticket.event.time}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <MapPin size={20} className="text-indigo-500 dark:text-indigo-400" />
                                <span>{ticket.event.location}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <Hash size={20} className="text-indigo-500 dark:text-indigo-400" />
                                <span>{ticket.quantity} Ticket{ticket.quantity > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Paid</div>
                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                ${(ticket.event.price || 0) * ticket.quantity}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Booked on {new Date(ticket.purchaseDate || Date.now()).toLocaleDateString()}
                            </div>
                        </div>
                        <Link to={`/event/${ticket.event._id}`}>
                            <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                                View Event
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewTicket;
