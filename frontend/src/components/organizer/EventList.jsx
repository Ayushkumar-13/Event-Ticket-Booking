import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../../context/EventContext';
import { Edit, Trash2, Plus, Eye, Calendar } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Loader from '../common/Loader';
import Card from '../common/Card';

const EventList = () => {
    const { organizerEvents, fetchOrganizerEvents, removeEvent, loading } = useEvents();

    useEffect(() => {
        fetchOrganizerEvents();
    }, [fetchOrganizerEvents]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            await removeEvent(id);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-100">My Events</h2>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Manage all your upcoming and past events.</p>
                </div>
                <Link to="/organizer/events/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
                        <Plus size={18} className="mr-2" />
                        Create Event
                    </Button>
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700">
                        <thead className="bg-slate-50/50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Event Details</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Sales</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-50 dark:divide-gray-700">
                            {organizerEvents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                <Calendar className="text-slate-300 dark:text-gray-500" size={32} />
                                            </div>
                                            <p className="text-slate-500 dark:text-gray-400 font-medium">No events found</p>
                                            <p className="text-slate-400 dark:text-gray-500 text-sm mt-1">Get started by creating your first event</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                organizerEvents.map((event) => (
                                    <tr key={event._id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-12 w-12 flex-shrink-0 relative">
                                                    <img
                                                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-100"
                                                        src={event.image || 'https://placehold.co/150'}
                                                        alt={event.title}
                                                        onError={(e) => {
                                                            e.target.onerror = null; // Prevent infinite loop
                                                            e.target.src = 'https://placehold.co/150?text=Event';
                                                        }}
                                                    />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{event.title}</div>
                                                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{event.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-700 dark:text-gray-300">{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{event.time}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.availableTickets > 0
                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                                : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${event.availableTickets > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                {event.availableTickets > 0 ? 'Active' : 'Sold Out'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm text-slate-700 font-medium">
                                                    {event.soldTickets || 0} <span className="text-slate-400 text-xs font-normal">/ {(event.soldTickets || 0) + event.availableTickets}</span>
                                                </div>
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full"
                                                        style={{ width: `${Math.min(((event.soldTickets || 0) / ((event.soldTickets || 0) + event.availableTickets)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/event/${event._id}`} target="_blank" title="View details">
                                                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                                        <Eye size={18} />
                                                    </button>
                                                </Link>
                                                <Link to={`/organizer/events/edit/${event._id}`} title="Edit event">
                                                    <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                                                        <Edit size={18} />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(event._id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete event"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EventList;
