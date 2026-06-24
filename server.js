const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Thiết lập Template Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối Database
connectDB();

// ĐỊNH TUYẾN URL CHÍNH CHUYÊN NGHIỆP
app.get(['/', '/home', '/fasttrack'], (req, res) => {
    res.render('index');
});

// APIs
app.use('/api/flights', require('./routes/flightRoutes'));
app.use('/api/booking', require('./routes/bookingRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 [Blue Trip] System online at: http://localhost:${PORT}`));