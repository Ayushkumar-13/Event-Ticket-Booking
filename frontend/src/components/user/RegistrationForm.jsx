import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import Button from '../common/Button';
import { bookTicket } from '../../services/registrationService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const RegistrationForm = ({ event, isBooked = false }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [quantity, setQuantity] = useState(1);
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [error, setError] = useState('');

    const handleBookTicket = async () => {
        if (!user) {
            // Redirect to login with return url
            return navigate('/login', { state: { from: { pathname: `/event/${event._id}` } } });
        }

        setStatus('processing');
        setError('');

        try {
            await bookTicket(event._id, quantity);
            setStatus('success');
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message || 'Booking failed');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center py-8 transition-colors duration-200">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                </div>
                <h4 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">Booking Confirmed!</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-6">You have successfully booked {quantity} ticket(s).</p>
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                    View My Tickets
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24 shadow-sm transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Get Tickets</h3>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                </label>
                <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                    disabled={status === 'processing' || isBooked}
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>{num}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-between items-center mb-6 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                <span>Subtotal</span>
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">${event.price * quantity}</span>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            {isBooked ? (
                <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg text-center">
                        <p className="text-green-700 dark:text-green-400 text-sm font-medium">You have already booked a ticket for this event</p>
                    </div>
                    <button
                        disabled
                        className="w-full py-3 text-lg bg-green-500 dark:bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed shadow-md"
                    >
                        <CheckCircle size={20} />
                        Booked
                    </button>
                </div>
            ) : (
                <Button
                    onClick={handleBookTicket}
                    isLoading={status === 'processing'}
                    className="w-full py-3 text-lg shadow-lg hover:shadow-xl transform transition-all hover:-translate-y-1"
                >
                    {user ? 'Book Now' : 'Login to Book'}
                </Button>
            )}

            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                100% Secure Checkout
            </p>
        </div>
    );
};

export default RegistrationForm;
