import React from 'react';
import { Calendar, MapPin } from 'lucide-react';

const TicketDisplay = ({ ticket }) => {
    if (!ticket.event) {
        return (
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-red-700">Event Unavailable</h3>
                    <p className="text-red-500 text-sm">This event may have been deleted.</p>
                </div>
                <div className="text-sm text-gray-400">
                    Ticket ID: {ticket._id}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
            <div className="md:w-48 h-48 md:h-auto relative">
                <img
                    src={ticket.event.image || 'https://placehold.co/600x400?text=Event'}
                    alt={ticket.event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/600x400?text=Event';
                    }}
                />
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-t from-black/50 to-transparent md:hidden" />
            </div>
            <div className="p-6 flex-grow flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div className="space-y-3">
                    <div>
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded uppercase tracking-wide font-bold">
                            {ticket.status || 'Confirmed'}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900 mt-2">{ticket.event.title}</h3>
                    </div>

                    <div className="space-y-1 text-gray-600 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-500" />
                            <span>{new Date(ticket.event.date).toLocaleDateString()} at {ticket.event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-indigo-500" />
                            <span>{ticket.event.location}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                    <div className="text-sm text-gray-500">Total Paid</div>
                    <div className="text-2xl font-bold text-gray-900">
                        ${(ticket.event.price || 0) * ticket.quantity}
                    </div>
                    <div className="text-sm text-gray-500">
                        {ticket.quantity} Ticket{ticket.quantity > 1 ? 's' : ''}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                        Ordered on {new Date(ticket.purchaseDate || Date.now()).toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDisplay;
