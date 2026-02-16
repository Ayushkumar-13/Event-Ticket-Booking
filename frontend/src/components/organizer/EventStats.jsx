import React from 'react';
import Card from '../common/Card';
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 group">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-20 dark:group-hover:bg-opacity-30 transition-all`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            {trend && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-gray-100 tracking-tight">{value}</h3>
        </div>
    </div>
);

const EventStats = () => {
    const [stats, setStats] = React.useState({
        totalEvents: 0,
        totalAttendees: 0,
        totalRevenue: 0,
        avgAttendance: 0
    });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                // We need to import api here or pass it as prop, assuming api default export from services/api
                const { default: api } = await import('../../services/api');
                const { data } = await api.get('/events/stats');
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statItems = [
        { title: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'bg-indigo-600', trend: 12 },
        { title: 'Total Attendees', value: stats.totalAttendees, icon: Users, color: 'bg-emerald-500', trend: 8 },
        { title: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500', trend: 24 },
        { title: 'Avg. Attendance', value: stats.avgAttendance, icon: TrendingUp, color: 'bg-violet-500', trend: -2 },
    ];

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 h-40 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 animate-pulse"></div>
            ))}
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statItems.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
};

export default EventStats;
