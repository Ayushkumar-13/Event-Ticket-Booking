import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Calendar,
    PlusCircle,
    Settings,
    LogOut,
    Menu,
    X,
    Users,
    ChevronDown,
    Bell
} from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';

const OrganizerLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        { path: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/organizer/events', label: 'My Events', icon: Calendar },
        { path: '/organizer/events/new', label: 'Create Event', icon: PlusCircle },
        { path: '/organizer/registrations', label: 'Registrations', icon: Users },
        { path: '/organizer/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex transition-colors">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 
                transition-all duration-300 ease-in-out shadow-xl lg:shadow-none
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="flex items-center justify-between p-6 h-20 border-b border-slate-100 dark:border-gray-700">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:bg-indigo-700 dark:group-hover:bg-indigo-600 transition-colors">
                            E
                        </div>
                        <div>
                            <span className="block font-bold text-lg text-slate-800 dark:text-gray-100 tracking-tight leading-none">EventHub</span>
                            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium uppercase tracking-wider">Organizer</span>
                        </div>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col h-[calc(100vh-5rem)] justify-between">
                    <nav className="p-4 space-y-1 overflow-y-auto">
                        <div className="px-4 py-2 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                            Main Menu
                        </div>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon size={20} className={`transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300'}`} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-3 px-4 py-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-slate-700 dark:text-gray-200 truncate">{user?.name}</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-sm font-medium text-slate-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 hover:shadow-sm hover:ring-1 hover:ring-slate-200 dark:hover:ring-gray-600 transition-all"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 h-20 flex items-center justify-between px-6 lg:px-10 shrink-0 sticky top-0 z-30 transition-colors">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-gray-100 hidden md:block">
                            {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button className="p-2 text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
                        </button>
                        <div className="h-8 w-px bg-slate-200 dark:bg-gray-700 mx-2 hidden md:block"></div>
                        <div className="text-right hidden md:block">
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Current Role</p>
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Organizer</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-10 overflow-y-auto scroll-smooth">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default OrganizerLayout;
