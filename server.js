const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình để đọc được dữ liệu gửi từ Form (POST)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Phục vụ các file tĩnh trong thư mục 'public' (chứa file index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Route xử lý khi người dùng nhấn nút Đặt Hàng
app.post('/checkout', (req, res) => {
    const { name, email } = req.body;
    
    // Hiện tại: Log thông tin đơn hàng ra màn hình server để kiểm tra
    console.log(`[ĐƠN HÀNG MỚI]: Khách hàng ${name} (${email}) vừa đăng ký dịch vụ.`);

    // Sau này: Đây là nơi bạn tích hợp Stripe / PayPal SDK để tính tiền.

    // Phản hồi lại cho người dùng
    res.send(`
        <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
            <h2 style="color: #10B981;">🎉 Đăng ký thành công!</h2>
            <p>Cảm ơn bạn, <b>${name}</b>. Chúng tôi đã nhận được yêu cầu cho email <b>${email}</b>.</p>
            <p>Hệ thống thanh toán quốc tế đang được bảo trì. Đơn hàng của bạn đã được ghi nhận thử nghiệm.</p>
            <a href="/">Quay lại trang chủ</a>
        </div>
    `);
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại port: ${PORT}`);
});