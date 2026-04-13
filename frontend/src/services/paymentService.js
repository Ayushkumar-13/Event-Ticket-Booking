import api from './api';

/**
 * Step 1: Create a Razorpay Order on the backend
 */
export const createRazorpayOrder = async (eventId, quantity) => {
    try {
        const response = await api.post('/payments/order', { eventId, quantity });
        return response.data;
    } catch (error) {
        console.error("📡 paymentService: Error creating order:", error);
        throw error.response?.data || { message: "Failed to initialize payment." };
    }
};

/**
 * Step 2: Verify the payment signature on the backend
 */
export const verifyRazorpayPayment = async (paymentData) => {
    try {
        const response = await api.post('/payments/verify', paymentData);
        return response.data;
    } catch (error) {
        console.error("📡 paymentService: Error verifying payment:", error);
        throw error.response?.data || { message: "Payment verification failed." };
    }
};
