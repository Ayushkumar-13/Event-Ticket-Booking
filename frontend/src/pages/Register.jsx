import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorMessage from '../components/common/ErrorMessage';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user' // Default role
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);
        try {
            console.log("Attempting registration with:", formData);
            const result = await register(formData);
            console.log("Registration result:", result);
            if (result.success) {
                console.log("Registration successful! Redirecting to home page...");
                navigate('/');
            } else {
                console.error("Registration failed:", result.message);
                setError(result.message || 'Failed to register');
            }
        } catch (err) {
            console.error("Registration error exception:", err);
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">Create your account</h2>

            <ErrorMessage message={error} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />

                <Input
                    label="Email address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <Input
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <Input
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                />

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">I want to</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${formData.role === 'user'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            onClick={() => setFormData({ ...formData, role: 'user' })}
                        >
                            Buy Tickets
                        </button>
                        <button
                            type="button"
                            className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${formData.role === 'organizer'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            onClick={() => setFormData({ ...formData, role: 'organizer' })}
                        >
                            Organize Events
                        </button>
                    </div>
                </div>

                <Button type="submit" className="w-full" isLoading={loading}>
                    Create Account
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Sign in
                </Link>
            </div>
        </Card>
    );
};

export default Register;
