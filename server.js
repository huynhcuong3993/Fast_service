const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ giao diện Frontend từ thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API Key Aviationstack được giữ an toàn tại Backend
const AVIATION_API_KEY = '9b2967fc382e7955acda02849044d05e';

// API: Lấy danh sách chuyến bay thời gian thực từ Aviationstack
app.get('/api/flights', async (req, res) => {
    try {
        const arr_iata = req.query.iata || 'SGN'; // Mặc định là Tân Sơn Nhất nếu thiếu
        
        const response = await axios.get('http://api.aviationstack.com/v1/flights', {
            params: {
                access_key: AVIATION_API_KEY,
                arr_iata: arr_iata,
                flight_status: 'active',
                limit: 50
            }
        });
        
        // Lọc dữ liệu cần thiết trả về cho Frontend
        if (response.data && response.data.data) {
            const flights = response.data.data.map(f => ({
                flight_code: f.flight.iata || f.flight.number,
                airline: f.airline ? f.airline.name : 'Unknown Airline',
                arrival_time: f.arrival ? f.arrival.estimated : null
            })).filter(f => f.flight_code);
            
            return res.json({ success: true, data: flights });
        }
        
        res.json({ success: true, data: [] });
    } catch (error) {
        console.error("Lỗi API Aviationstack:", error.message);
        // Trả về mảng rỗng để frontend không bị lỗi, khách vẫn nhập tay được bình thường
        res.json({ success: false, data: [], message: "Không thể tải chuyến bay từ API." });
    }
});

// API: Tiếp nhận thông tin đơn hàng đặt Fast Track
app.post('/api/booking', (req, res) => {
    const orderData = req.body;
    
    // Log thông tin đơn hàng ra terminal để kiểm tra
    console.log("==========================================");
    console.log("✈️ ĐƠN ĐẶT DỊCH VỤ FAST TRACK MỚI (BLUE TRIP) ✈️");
    console.log(JSON.stringify(orderData, null, 2));
    console.log("==========================================");

    // Ở đây bạn có thể viết thêm code kết nối Database (MongoDB/MySQL) hoặc gửi Telegram/Email về cho nhân viên
    
    res.json({ success: true, message: "Đơn hàng đã được ghi nhận thành công trên hệ thống Blue Trip!" });
});

// Khởi chạy Server ở cổng 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Blue Trip] Server đang chạy tại: http://localhost:${PORT}`);
});