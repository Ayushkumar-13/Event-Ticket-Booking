import React from 'react';
import EventStats from '../../components/organizer/EventStats';
import EventList from '../../components/organizer/EventList';
import { PlusCircle, FileText, Settings, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const QuickAction = ({ icon: Icon, title, desc, to, color }) => (
    <Link to={to} className="flex items-start p-4 rounded-xl border border-slate-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all group">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 dark:bg-opacity-20 text-opacity-100 mr-4 group-hover:scale-110 transition-transform`}>
            {/* The icon color needs to be explicit or derived */}
            <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        <div>
            <h4 className="font-semibold text-slate-800 dark:text-gray-100 mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{title}</h4>
            <p className="text-xs text-slate-500 dark:text-gray-400">{desc}</p>
        </div>
    </Link>
);

const OrganizerDashboard = () => {
    return (
        <div className="space-y-8 py-2 px-4 md:px-6">
            {/* Welcome Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-100">Overview</h2>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Here's what's happening with your events today.</p>
            </div>

            <EventStats />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Event List Section - Takes up 2/3 space */}
                <div className="md:col-span-2">
                    <EventList />
                </div>

                {/* Sidebar/Quick Actions - Takes up 1/3 space */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 transition-colors">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <QuickAction
                                icon={PlusCircle}
                                title="Create New Event"
                                desc="Launch a new event page in minutes."
                                to="/organizer/events/new"
                                color="bg-indigo-600"
                            />
                            <QuickAction
                                icon={FileText}
                                title="Export Reports"
                                desc="Download attendee lists and data."
                                to="/organizer/registrations"
                                color="bg-emerald-500"
                            />
                            <QuickAction
                                icon={Settings}
                                title="Account Settings"
                                desc="Manage your profile and preferences."
                                to="/organizer/settings"
                                color="bg-slate-500"
                            />
                        </div>
                    </div>

                    <div className="bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 p-6 text-white relative overflow-hidden transition-colors">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-2">Need Help?</h3>
                            <p className="text-indigo-100 dark:text-indigo-200 text-sm mb-4">Check our documentation for guides on how to maximize your event sales.</p>
                            <button className="px-4 py-2 bg-white dark:bg-gray-100 text-indigo-600 dark:text-indigo-700 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-all">
                                View Docs
                            </button>
                        </div>
                        <HelpCircle size={100} className="absolute -bottom-4 -right-4 text-indigo-500 dark:text-indigo-600 opacity-20" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizerDashboard;
