import api from './api';

const MOCK_USER = {
    _id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
};

export const loginUser = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const registerUser = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};

export const getMe = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data;
    } catch (error) {
        if (!error.response) {
            return null;
        }
        throw error.response.data;
    }
};
