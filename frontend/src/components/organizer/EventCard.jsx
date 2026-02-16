import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Edit, Trash2, Eye } from 'lucide-react';
import Badge from '../common/Badge';

const EventCard = ({ event, onDelete }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-40">
                <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                    <Badge variant={event.availableTickets > 0 ? 'success' : 'danger'}>
                        {event.availableTickets > 0 ? 'Active' : 'Sold Out'}
                    </Badge>
                </div>
            </div>

            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{event.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{event.category}</p>

                <div className="space-y-1 mb-4">
                    <div className="flex items-center text-xs text-gray-500">
                        <Calendar size={14} className="mr-1.5 text-indigo-500" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        <MapPin size={14} className="mr-1.5 text-indigo-500" />
                        <span className="line-clamp-1">{event.location}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-900">
                        ${event.price}
                    </span>

                    <div className="flex gap-1">
                        <Link to={`/event/${event._id}`} target="_blank" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition-colors">
                            <Eye size={16} />
                        </Link>
                        <Link to={`/organizer/events/edit/${event._id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition-colors">
                            <Edit size={16} />
                        </Link>
                        <button
                            onClick={() => onDelete(event._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventCard;
