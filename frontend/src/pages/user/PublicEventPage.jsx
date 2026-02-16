import React, { useState, useEffect } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../context/AuthContext';
import EventCard from '../../components/EventCard';
import TypewriterText from '../../components/TypewriterText';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getBookedEventIds } from '../../services/registrationService';
import { Calendar, MapPin, ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

// Re-implementing the Event Card here locally if not available as a common component, 
// OR better, let's look for the component. 
// Previously I made EventCard in 'organizer' folder? 
// No, the summary said "Home Page: Displays a list of events... Event Card: Reusable component".
// Checking my previous "viewed_files", I saw 'components/common/Card.jsx' which was a generic wrapper.
// I probably had a specific card for events in Home.jsx inline or as a separate component?
// In the "Previous Session Summary", it says "Event Card: Reusable component".
// But I don't see a `components/EventCard.jsx` in the file list I did earlier.
// Wait, `components/organizer/EventCard.jsx` exists.
// I should probably create `components/user/EventCard.jsx` or just implement it inline here for now to be safe.

const PublicEventPage = () => {
    const { events, loading, error, fetchEvents } = useEvents();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [bookedEventIds, setBookedEventIds] = useState([]);
    const [showSubtitle, setShowSubtitle] = useState(false);
    const [resetAnimation, setResetAnimation] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(false);

    // Loop animation: reset after 5 seconds when complete
    useEffect(() => {
        if (animationComplete) {
            const timer = setTimeout(() => {
                setResetAnimation(true);
                setShowSubtitle(false);
                setAnimationComplete(false);
            }, 5000); // 5 second delay before restarting

            return () => clearTimeout(timer);
        }
    }, [animationComplete]);

    const handleAnimationComplete = () => {
        setAnimationComplete(true);
    };

    const handleResetComplete = () => {
        setResetAnimation(false);
    };

    // Fetch booked events if user is logged in
    useEffect(() => {
        const fetchBookedEvents = async () => {
            if (user) {
                try {
                    const ids = await getBookedEventIds();
                    setBookedEventIds(ids);
                } catch (error) {
                    console.error("Failed to fetch booked events:", error);
                }
            }
        };
        fetchBookedEvents();
    }, [user]);

    // Filter events
    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', 'Technology', 'Music', 'Art', 'Business', 'Food'];

    if (loading) return <Loader />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section with Enhanced Design */}
                <div className="text-center mb-16 relative">
                    {/* Decorative background blur */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>

                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl mb-4 min-h-[4rem]">
                        <TypewriterText
                            text="Find your next experience"
                            delay={80}
                            onComplete={() => setShowSubtitle(true)}
                            shouldReset={resetAnimation}
                            onResetComplete={handleResetComplete}
                            highlightWord="experience"
                            highlightClassName="text-indigo-600 dark:text-indigo-400"
                        />
                    </h1>
                    {showSubtitle && (
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            <TypewriterText
                                text="Discover and book tickets for the best events in your area"
                                delay={40}
                                onComplete={handleAnimationComplete}
                                shouldReset={resetAnimation}
                                onResetComplete={handleResetComplete}
                            />
                        </p>
                    )}
                </div>

                {/* Search and Filters */}
                <div className="mb-10 space-y-6">
                    {/* Search Bar with Enhanced Design */}
                    <div className="relative max-w-2xl mx-auto">
                        <input
                            type="text"
                            placeholder="Search events by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-6 py-4 pl-14 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                        />
                        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={22} />
                    </div>

                    {/* Category Filter with Enhanced Design */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-6 py-2.5 rounded-full font-semibold transition-all transform hover:scale-105 ${selectedCategory === category
                                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-500 dark:to-indigo-400 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 shadow-sm'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Events Grid with Enhanced Design */}
                <div>
                    {filteredEvents.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search size={48} className="text-gray-400 dark:text-gray-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No events found</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search or filters</p>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategory('All');
                                }}
                                className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredEvents.map((event) => (
                                <EventCard key={event._id} event={event} isBooked={bookedEventIds.includes(event._id)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicEventPage;
