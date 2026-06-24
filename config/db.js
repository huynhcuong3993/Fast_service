const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🛡️  MongoDB Cluster connected successfully.');
    } catch (err) {
        console.error('❌ MongoDB Error:', err.message);
    }
};
module.exports = connectDB;