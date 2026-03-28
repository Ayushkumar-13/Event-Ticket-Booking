import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, X } from 'lucide-react';

const GlobalNotification = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!user) return;

        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const SOCKET_URL = API_URL.replace(/\/api$/, '') || window.location.origin;

        if (SOCKET_URL.includes('vercel.app')) return;

        let socket;
        import('socket.io-client').then(({ io }) => {
            socket = io(SOCKET_URL, { transports: ['websocket'] });

            socket.on('email_sent', (data) => {
                if (data.userId === user.id) {
                    const newNotification = {
                        id: Date.now(),
                        title: data.title,
                        body: data.body
                    };
                    setNotifications(prev => [...prev, newNotification]);

                    // Auto-dismiss after 6 seconds
                    setTimeout(() => {
                        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
                    }, 6000);
                }
            });
        }).catch(err => console.error("Socket error", err));

        return () => {
            if (socket) socket.disconnect();
        };
    }, [user]);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
            {notifications.map(notif => (
                <div 
                    key={notif.id} 
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-l-4 border-indigo-500 w-80 p-4 transform transition-all pointer-events-auto shadow-indigo-500/20"
                    style={{ animation: 'slideInRight 0.3s ease-out forwards' }}
                >
                    <button 
                        onClick={() => removeNotification(notif.id)} 
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex gap-4 items-start pt-1">
                        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-full flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{notif.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">{notif.body}</p>
                        </div>
                    </div>
                </div>
            ))}
            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default GlobalNotification;
