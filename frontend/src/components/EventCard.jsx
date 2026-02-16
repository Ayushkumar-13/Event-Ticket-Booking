import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Tag, CheckCircle } from 'lucide-react';

const EventCard = ({ event, isBooked = false }) => {
    return (
        <Link
            to={`/event/${event._id}`}
            className="card h-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
            <div className="relative h-56 overflow-hidden">
                <img
                    src={event.image || 'https://placehold.co/600x400?text=Event'}
                    alt={event.title}
                    className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-indigo-600 dark:bg-indigo-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                        {event.category}
                    </span>
                    {isBooked && (
                        <span className="bg-green-500 dark:bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg flex items-center gap-1">
                            <CheckCircle size={14} />
                            Booked
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {event.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-grow">
                    {event.description}
                </p>

                {/* Date & Location on left, Price on right */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                            <Calendar size={16} className="mr-2" />
                            <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                            <MapPin size={16} className="mr-2" />
                            <span>{event.location.split(',')[0]}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Price</div>
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            ${event.price}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default EventCard;
