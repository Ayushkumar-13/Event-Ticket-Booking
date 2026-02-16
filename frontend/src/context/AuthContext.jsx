import React, { createContext, useState, useEffect, useContext } from 'react';
import { loginUser, registerUser, getMe } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Verify with backend
                    const userData = await getMe();
                    setUser(userData);
                } catch (error) {
                    console.error("Session invalid:", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        try {
            const data = await loginUser(email, password);
            localStorage.setItem('token', data.token);
            // The backend returns a flat object with user info and token
            const userObj = { ...data };
            delete userObj.token; // Optional: remove token from user object in state
            localStorage.setItem('user', JSON.stringify(userObj));
            setUser(userObj);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message || 'Login failed' };
        }
    };

    const register = async (userData) => {
        try {
            console.log("🔐 AuthContext: Starting registration...");
            const data = await registerUser(userData);
            console.log("🔐 AuthContext: Registration response:", data);

            if (!data || !data.token) {
                console.error("🔐 AuthContext: No token in response!", data);
                return { success: false, message: 'Registration failed - no token received' };
            }

            localStorage.setItem('token', data.token);
            console.log("🔐 AuthContext: Token saved to localStorage");

            const userObj = { ...data };
            delete userObj.token;
            localStorage.setItem('user', JSON.stringify(userObj));
            console.log("🔐 AuthContext: User saved to localStorage:", userObj);

            setUser(userObj);
            console.log("🔐 AuthContext: User state updated");

            return { success: true };
        } catch (error) {
            console.error("🔐 AuthContext: Registration error:", error);
            console.error("🔐 AuthContext: Error message:", error.message);
            console.error("🔐 AuthContext: Error response:", error.response);
            return { success: false, message: error.message || 'Registration failed' };
        }
    }

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
