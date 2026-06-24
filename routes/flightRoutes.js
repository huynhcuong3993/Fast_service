const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');

const FlightCacheSchema = new mongoose.Schema({
    airportCode: { type: String, required: true, unique: true },
    flights: [{
        type: { type: String, enum: ['ARRIVAL', 'DEPARTURE'] },
        flight_code: String, airline_iata: String, airline_name: String, scheduled_time: String
    }],
    lastUpdated: { type: Date, default: Date.now }
});

const FlightCache = mongoose.models.FlightCache || mongoose.model('FlightCache', FlightCacheSchema);
const TARGET_AIRPORTS = ['SGN', 'HAN', 'DAD', 'PQC'];
const VIETNAM_AIRPORTS = ['SGN', 'HAN', 'DAD', 'CXR', 'PQC', 'VDO', 'HUI', 'VII', 'HPH', 'THD', 'TBB', 'VCL', 'VCA', 'BMV', 'PXU', 'UIH', 'VCS', 'DIN', 'VKG', 'CAH'];

async function updateAirportsCache() {
    const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
    const now = new Date();
    for (const iata of TARGET_AIRPORTS) {
        try {
            const cachedData = await FlightCache.findOne({ airportCode: iata });
            if (!cachedData || (now - cachedData.lastUpdated >= THREE_DAYS_IN_MS)) {
                console.log(`📡 Đang cập nhật dữ liệu API sân bay: ${iata}`);
                const [arrResponse, depResponse] = await Promise.all([
                    axios.get('http://api.aviationstack.com/v1/flights', { params: { access_key: process.env.AVIATION_API_KEY, arr_iata: iata, limit: 100 } }),
                    axios.get('http://api.aviationstack.com/v1/flights', { params: { access_key: process.env.AVIATION_API_KEY, dep_iata: iata, limit: 100 } })
                ]);
                
                let freshFlights = [];
                if (arrResponse.data?.data) {
                    arrResponse.data.data.forEach(f => {
                        if (f.flight_status === 'scheduled' && f.flight?.iata && f.departure?.iata && !VIETNAM_AIRPORTS.includes(f.departure.iata.toUpperCase())) {
                            freshFlights.push({ type: 'ARRIVAL', flight_code: f.flight.iata.toUpperCase(), airline_iata: (f.airline?.iata || f.flight.iata.substring(0, 2)).toUpperCase(), airline_name: f.airline?.name || 'Hãng Quốc Tế', scheduled_time: f.arrival?.scheduled });
                        }
                    });
                }
                if (depResponse.data?.data) {
                    depResponse.data.data.forEach(f => {
                        if (f.flight_status === 'scheduled' && f.flight?.iata && f.arrival?.iata && !VIETNAM_AIRPORTS.includes(f.arrival.iata.toUpperCase())) {
                            freshFlights.push({ type: 'DEPARTURE', flight_code: f.flight.iata.toUpperCase(), airline_iata: (f.airline?.iata || f.flight.iata.substring(0, 2)).toUpperCase(), airline_name: f.airline?.name || 'Hãng Quốc Tế', scheduled_time: f.departure?.scheduled });
                        }
                    });
                }
                await FlightCache.findOneAndUpdate({ airportCode: iata }, { flights: freshFlights, lastUpdated: now }, { upsert: true });
            }
        } catch (err) { console.error(`Lỗi cache ${iata}:`, err.message); }
    }
}
setTimeout(() => updateAirportsCache(), 3000);

router.get('/', async (req, res) => {
    try {
        const cachedData = await FlightCache.findOne({ airportCode: (req.query.iata || 'SGN').toUpperCase() });
        res.json({ success: true, data: cachedData ? cachedData.flights : [] });
    } catch (error) { res.json({ success: false, data: [] }); }
});

module.exports = router;