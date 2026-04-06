import axios from 'axios';

// For local development, this defaults to /api (handled by Vite proxy).
// For production, you MUST set VITE_API_URL in your Vercel/live dashboard.
const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log("🚀 [API Config] Active Backend:", API_URL.startsWith('http') ? API_URL : `Relative path (${API_URL}) - Ensure your frontend and backend are on the SAME domain!`);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor to handle 401 Unauthorized responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user'); // If you store user info
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
