const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const AVIATION_API_KEY = process.env.AVIATION_API_KEY || '9b2967fc382e7955acda02849044d05e';
const MONGODB_URI = "mongodb+srv://huynhcuongtien_db_user:hJFfihcYphNsosMd@cluster0.5ft5fxv.mongodb.net/?appName=Cluster0/bluetrip?retryWrites=true&w=majority";

const TARGET_AIRPORTS = ['SGN', 'HAN', 'DAD', 'PQC'];
const VIETNAM_AIRPORTS = ['SGN', 'HAN', 'DAD', 'CXR', 'PQC', 'VDO', 'HUI', 'VII', 'HPH', 'THD', 'TBB', 'VCL', 'VCA', 'BMV', 'PXU', 'UIH', 'VCS', 'DIN', 'VKG', 'CAH'];

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('🛡️ Connected to MongoDB Cluster.');
        // Đặt là false để hệ thống tự động kiểm tra chu kỳ 3 ngày, không gọi API vô tội vạ khi test
        preloadAllAirports(false);
    })
    .catch(err => console.error('MongoDB connection error:', err));

const FlightCacheSchema = new mongoose.Schema({
    airportCode: { type: String, required: true, unique: true },
    flights: [{
        type: { type: String, enum: ['ARRIVAL', 'DEPARTURE'] },
        flight_code: String,
        airline_iata: String, 
        airline_name: String,
        scheduled_time: String
    }],
    lastUpdated: { type: Date, default: Date.now }
});

const FlightCache = mongoose.model('FlightCache', FlightCacheSchema);

async function preloadAllAirports(force = true) {
    console.log(`🔄 [Cache Process] Đang kiểm tra dữ liệu 4 sân bay...`);
    const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
    const now = new Date();

    for (const iata of TARGET_AIRPORTS) {
        try {
            const cachedData = await FlightCache.findOne({ airportCode: iata });
            
            // Nếu hết hạn 3 ngày hoặc chưa có dữ liệu -> Gọi API ghi đè dữ liệu mới
            if (force || !cachedData || (now - cachedData.lastUpdated >= THREE_DAYS_IN_MS)) {
                console.log(`📡 Đang làm mới dữ liệu và ghi đè lịch trình cho sân bay: ${iata}`);
                
                const [arrResponse, depResponse] = await Promise.all([
                    axios.get('http://api.aviationstack.com/v1/flights', { params: { access_key: AVIATION_API_KEY, arr_iata: iata, limit: 100 } }),
                    axios.get('http://api.aviationstack.com/v1/flights', { params: { access_key: AVIATION_API_KEY, dep_iata: iata, limit: 100 } })
                ]);
                
                let freshFlights = [];

                if (arrResponse.data && arrResponse.data.data) {
                    arrResponse.data.data.forEach(f => {
                        if (f.flight_status === 'scheduled' && f.flight?.iata && f.departure?.iata && !VIETNAM_AIRPORTS.includes(f.departure.iata.toUpperCase())) {
                            const airlineIata = f.airline?.iata || f.flight.iata.substring(0, 2);
                            freshFlights.push({
                                type: 'ARRIVAL',
                                flight_code: f.flight.iata.toUpperCase(),
                                airline_iata: airlineIata.toUpperCase(),
                                airline_name: f.airline?.name || 'Hãng Quốc Tế',
                                scheduled_time: f.arrival?.scheduled
                            });
                        }
                    });
                }

                if (depResponse.data && depResponse.data.data) {
                    depResponse.data.data.forEach(f => {
                        if (f.flight_status === 'scheduled' && f.flight?.iata && f.arrival?.iata && !VIETNAM_AIRPORTS.includes(f.arrival.iata.toUpperCase())) {
                            const airlineIata = f.airline?.iata || f.flight.iata.substring(0, 2);
                            freshFlights.push({
                                type: 'DEPARTURE',
                                flight_code: f.flight.iata.toUpperCase(),
                                airline_iata: airlineIata.toUpperCase(),
                                airline_name: f.airline?.name || 'Hãng Quốc Tế',
                                scheduled_time: f.departure?.scheduled
                            });
                        }
                    });
                }

                // Ghi đè hoàn toàn thông tin mới để cập nhật sự thay đổi lịch trình
                await FlightCache.findOneAndUpdate(
                    { airportCode: iata },
                    { flights: freshFlights, lastUpdated: now },
                    { upsert: true, new: true }
                );
                console.log(`✅ Đã cập nhật dữ liệu mới cho sân bay ${iata}`);
            } else {
                console.log(`📦 Dữ liệu sân bay ${iata} vẫn tối ưu (Dưới 3 ngày). Duy trì cache.`);
            }
        } catch (error) {
            console.error(`❌ Lỗi đồng bộ sân bay ${iata}:`, error.message);
        }
    }
}

app.get('/api/flights', async (req, res) => {
    try {
        const cachedData = await FlightCache.findOne({ airportCode: (req.query.iata || 'SGN').toUpperCase() });
        res.json({ success: true, data: cachedData ? cachedData.flights : [] });
    } catch (error) {
        res.status(500).json({ success: false, data: [] });
    }
});

app.post('/api/booking', (req, res) => {
    console.log("✈️ ĐƠN ĐẶT DỊCH VỤ CƠ CẤU MỚI:", req.body);
    res.json({ success: true, message: "Hồ sơ dịch vụ đặt trước của bạn đã được tiếp nhận thành công!" });
});

app.listen(PORT, () => console.log(`[Blue Trip VIP] Server running on port: ${PORT}`));