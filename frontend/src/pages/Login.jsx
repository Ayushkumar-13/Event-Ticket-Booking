import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorMessage from '../components/common/ErrorMessage';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                // If the user tried to access a specific page before login, send them there
                if (location.state?.from?.pathname) {
                    navigate(location.state.from.pathname, { replace: true });
                } else {
                    // Otherwise, dynamically route based on their role
                    // Note: AuthContext might not return the user directly in `result`, so we fetch from localStorage
                    const savedUser = JSON.parse(localStorage.getItem('user'));
                    if (savedUser?.role === 'organizer') {
                        navigate('/organizer/dashboard', { replace: true });
                    } else {
                        navigate('/dashboard', { replace: true });
                    }
                }
            } else {
                setError(result.message || 'Failed to login');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">Sign in to your account</h2>

            <ErrorMessage message={error} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="Email address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                />

                <Input
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            Remember me
                        </label>
                    </div>

                    <div className="text-sm">
                        <a href="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                            Forgot your password?
                        </a>
                    </div>
                </div>

                <Button type="submit" className="w-full" isLoading={loading}>
                    Sign in
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    Create User
                </Link>
            </div>

          
        </Card>
    );
};

export default Login;
