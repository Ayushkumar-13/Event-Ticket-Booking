const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4, // Force IPv4 to fix DNS resolution issues on Windows
            serverSelectionTimeoutMS: 30000,
        });

        console.log(`---------------MongoDB Connected----------------`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;