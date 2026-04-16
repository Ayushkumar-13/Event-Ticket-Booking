import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import Button from '../common/Button';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/currencyFormatter';

const RegistrationForm = ({ event, bookedQuantity = 0, onSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [quantity, setQuantity] = useState(1);
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [error, setError] = useState('');

    const [idempotencyKey] = useState(() => {
        return typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substring(2);
    });

    const handleBookTicket = async () => {
        if (!user) {
            return navigate('/login', { state: { from: { pathname: `/event/${event._id}` } } });
        }

        // ── Production Check: Ensure Razorpay script is loaded ──────────────
        // This fails when: browser ad-blocker is active, no internet, or the
        // CDN script in index.html hasn't loaded yet.
        if (typeof window.Razorpay === 'undefined') {
            setError(
                'Payment system could not load. ' +
                'If you have an ad-blocker (e.g. uBlock Origin), please disable it for this page and refresh. ' +
                'Or try a different browser like Chrome.'
            );
            setStatus('error');
            return;
        }

        setStatus('processing');
        setError('');

        const targetEventId = event._id || event.id;

        if (!targetEventId) {
            setError('System Error: Event ID is missing. Cannot proceed.');
            setStatus('error');
            return;
        }

        if (!targetEventId) {
            setError('System Error: Event ID is missing. Cannot proceed.');
            setStatus('error');
            return;
        }

        try {
            // Step 1: Create Razorpay Order
            const orderData = await createRazorpayOrder(targetEventId, quantity);

            // Determine if we are in Dark Mode
            const isDarkMode = document.documentElement.classList.contains('dark');

            // Step 2: Initialize Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
                amount: orderData.amount,
                currency: orderData.currency,
                name: "EventTix",
                description: `Tickets for ${orderData.event.title}`,
                order_id: orderData.order_id,
                handler: async function (response) {
                    try {
                        setStatus('processing');
                        // Step 3: Verify Payment on Backend
                        await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            eventId: targetEventId,
                            quantity
                        });
                        setStatus('success');
                        if (onSuccess) onSuccess(quantity);
                    } catch (verifyErr) {
                        setError(verifyErr.message || 'Payment verification failed.');
                        setStatus('error');
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: isDarkMode ? "#818cf8" : "#4f46e5",
                    backdrop_color: isDarkMode ? "#111827" : "#ffffff"
                },
                modal: {
                    ondismiss: function () {
                        setStatus('idle');
                    }
                }
            };
            
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setError(err.message || 'Checkout failed. Please try again.');
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
                <div className="space-y-3">
                    <Button onClick={() => navigate('/dashboard')} className="w-full">
                        View My Tickets
                    </Button>
                    <button
                        onClick={() => setStatus('idle')}
                        className="w-full py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg transition-colors duration-200"
                    >
                        + Book More Tickets
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24 shadow-sm transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Get Tickets</h3>

            {/* Existing booking badge */}
            {bookedQuantity > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm rounded-lg px-3 py-2 mb-4">
                    <CheckCircle size={15} className="shrink-0" />
                    <span>You already have <strong>{bookedQuantity}</strong> ticket{bookedQuantity > 1 ? 's' : ''} for this event. Need more?</span>
                </div>
            )}

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                </label>
                <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                disabled={status === 'processing'}
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>{num}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-between items-center mb-1 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                <span>Subtotal</span>
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                    {formatCurrency(event.price * quantity, event.currency)}
                </span>
            </div>

            {event.currency !== 'INR' && (
                <p className="text-[10px] text-gray-500 text-right mb-6">
                    * Final payment will be approximately {formatCurrency(event.price * quantity * 83, 'INR')} based on live rates.
                </p>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            <Button
                onClick={handleBookTicket}
                isLoading={status === 'processing'}
                className="w-full py-3 text-lg shadow-lg hover:shadow-xl transform transition-all hover:-translate-y-1"
            >
                {user ? 'Book Now' : 'Login to Book'}
            </Button>

            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                100% Secure Checkout
            </p>
        </div>
    );
};

export default RegistrationForm;
