import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    useEffect(() => {
        console.log('🔌 [SocketContext] Initializing connection to:', SOCKET_URL);
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('🟢 [SocketContext] Connected successfully:', newSocket.id);
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔴 [SocketContext] Connection error:', error.message);
        });

        setSocket(newSocket);

        return () => {
            console.log('🔌 [SocketContext] Closing connection...');
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
