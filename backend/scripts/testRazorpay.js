const Razorpay = require('razorpay');

// Mock function to test Razorpay order creation locally and see the exact error
async function test() {
    try {
        const razorpay = new Razorpay({
            key_id: "rzp_test_Sd50lxOsYILkQm", // From user's env
            key_secret: "JEIlbP67Kiyi3B9S1FSlBEVo" // From user's env
        });

        const options = {
            amount: 2500,
            currency: 'INR',
            receipt: 'rcpt_123456_1234567890',
        };

        console.log("Sending options:", options);
        const order = await razorpay.orders.create(options);
        console.log("Success:", order);
    } catch (error) {
        console.log("Razorpay SDK Error Object:", error);
    }
}

test();
