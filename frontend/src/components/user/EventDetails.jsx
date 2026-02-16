import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import Badge from '../common/Badge';

const EventDetails = ({ event }) => {
    if (!event) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-200">
            <div className="h-64 md:h-96 w-full relative">
                <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full px-4 py-2 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm">
                    ${event.price} / ticket
                </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <Badge variant="primary">
                        {event.category}
                    </Badge>
                    {event.availableTickets < 20 && (
                        <Badge variant="danger">
                            Only {event.availableTickets} tickets left!
                        </Badge>
                    )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">{event.title}</h1>

                <div className="prose prose-indigo dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                    <p>{event.description}</p>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <Calendar className="text-indigo-600 dark:text-indigo-400 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Date & Time</h3>
                            <p className="text-gray-600 dark:text-gray-300">{new Date(event.date).toLocaleDateString()}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{event.time}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <MapPin className="text-indigo-600 dark:text-indigo-400 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Location</h3>
                            <p className="text-gray-600 dark:text-gray-300">{event.location}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetails;
