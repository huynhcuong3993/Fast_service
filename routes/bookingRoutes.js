const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Resend } = require('resend');

const resend = new Resend('re_Me2bDqjb_Ajc5UGsbP4jTapp5G5BwN1C4');

const BookingSchema = new mongoose.Schema({
    booking_code: { type: String, required: true, unique: true },
    contact_email: String,
    location: String,
    srv_arrival: Boolean,
    srv_departure: Boolean,
    flight_arr_code: String,
    flight_arr_time: String,
    flight_dep_code: String,
    flight_dep_time: String,
    meet_time: String,
    pax_details: Array,
    pricing: { subtotal: String, discount: String, total: String },
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

// ĐÃ CHỈNH SỬA: Tạo mã booking dài 10 ký tự (Ví dụ: BT-A9F3K2W7X4)
function generateBookingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 10; i++) { 
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `BT-${code}`;
}

router.post('/', async (req, res) => {
    try {
        const d = req.body;
        const bookingCode = generateBookingCode();
        let pax_details = [];
        
        const isArr = d.srv_arrival === 'true' || d.srv_arrival === true;
        const isDep = d.srv_departure === 'true' || d.srv_departure === true;
        const isCopy = d.copy_arr_info === 'true' || d.copy_arr_info === true;

        if (isArr) {
            const totalArrPax = (parseInt(d.arr_adult) || 0) + (parseInt(d.arr_child) || 0) + (parseInt(d.arr_infant) || 0);
            for(let i = 1; i <= totalArrPax; i++) {
                if (d[`arr_pax_${i}_name`]) {
                    pax_details.push({ type: 'ARR', index: i, name: d[`arr_pax_${i}_name`].toUpperCase(), nationality: d[`arr_pax_${i}_nat`] });
                }
            }
        }

        if (isDep) {
            if (isCopy) {
                const arrPaxOnly = pax_details.filter(p => p.type === 'ARR');
                arrPaxOnly.forEach(p => pax_details.push({ type: 'DEP', index: p.index, name: p.name, nationality: p.nationality }));
            } else {
                const totalDepPax = (parseInt(d.dep_adult) || 0) + (parseInt(d.dep_child) || 0) + (parseInt(d.dep_infant) || 0);
                for(let i = 1; i <= totalDepPax; i++) {
                    if (d[`dep_pax_${i}_name`]) {
                        pax_details.push({ type: 'DEP', index: i, name: d[`dep_pax_${i}_name`].toUpperCase(), nationality: d[`dep_pax_${i}_nat`] });
                    }
                }
            }
        }

        // Lưu đơn đặt dịch vụ vào MongoDB
        const newBooking = new Booking({
            booking_code: bookingCode,
            contact_email: d.contact_email,
            location: d.arr_location || d.dep_location || 'SGN',
            srv_arrival: isArr,
            srv_departure: isDep,
            flight_arr_code: d.full_flight_code_arr || 'N/A',
            flight_arr_time: isArr ? `${d.arr_date} ${d.arr_time}` : 'N/A',
            flight_dep_code: d.full_flight_code_dep || 'N/A',
            flight_dep_time: isDep ? `${d.dep_date} ${d.dep_time}` : 'N/A',
            meet_time: d.dep_meet_time || 'N/A',
            pax_details: pax_details,
            pricing: { subtotal: d.bill_subtotal_val, discount: d.bill_discount_val, total: d.bill_total_val }
        });
        await newBooking.save();

        let paxRowsHtml = '';
        pax_details.forEach((p, idx) => {
            paxRowsHtml += `<tr><td style="padding: 10px; border-bottom: 1px solid #1e293b;">#${idx+1} [${p.type === 'ARR' ? 'Đón' : 'Tiễn'}] ${p.name}</td><td style="padding: 10px; border-bottom: 1px solid #1e293b; text-align: right; font-weight: bold; color: #f59e0b;">${p.nationality}</td></tr>`;
        });

        const emailTemplate = `
            <div style="background-color: #0b111e; color: #ffffff; font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 20px; border: 1px solid #c5a880;">
                <div style="text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 25px;">
                    <h1 style="color: #f59e0b; margin: 0; font-size: 26px; letter-spacing: 3px; font-weight: bold;">BLUE TRIP VIP SERVICES</h1>
                    <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0;">XÁC NHẬN GIAO DỊCH & LỊCH TRÌNH ĐẶT TRƯỚC</p>
                </div>
                
                <div style="margin-top: 25px; background-color: #131f32; border: 1px dashed #c5a880; padding: 15px; border-radius: 12px; text-align: center;">
                    <span style="color: #94a3b8; font-size: 12px; display: block; text-transform: uppercase;">Mã Xác Nhận Booking / Booking Code</span>
                    <strong style="color: #f59e0b; font-size: 28px; font-family: monospace; letter-spacing: 2px; display: block; margin-top: 5px;">${bookingCode}</strong>
                </div>
                
                <div style="margin-top: 25px;">
                    <p style="font-size: 14px; color: #ffffff;">Kính gửi Quý khách,</p>
                    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">Hệ thống Blue Trip xác nhận đã nhận đầy đủ thông tin đặt chỗ cho dịch vụ VIP Fast Track. Chi tiết như sau:</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; color: #cbd5e1;">
                    <tr style="background-color: #131f32;"><th colspan="2" style="padding: 12px; text-align: left; color: #f59e0b; border-bottom: 1px solid #1e293b; text-transform: uppercase;">Thông tin chuyến bay</th></tr>
                    ${isArr ? `<tr><td style="padding: 12px; border-bottom: 1px solid #1e293b;">🛬 Lịch trình Đón:</td><td style="padding: 12px; border-bottom: 1px solid #1e293b; font-weight: bold; color: #10b981;">${d.full_flight_code_arr} (Hạ cánh: ${d.arr_date} ${d.arr_time})</td></tr>` : ''}
                    ${isDep ? `<tr><td style="padding: 12px; border-bottom: 1px solid #1e293b;">🛫 Lịch trình Tiễn:</td><td style="padding: 12px; border-bottom: 1px solid #1e293b; font-weight: bold; color: #3b82f6;">${d.full_flight_code_dep} (Khởi hành: ${d.dep_date} ${d.dep_time})<br><span style="font-size:11px; color:#94a3b8;">Giờ hẹn: ${d.dep_meet_time}</span></td></tr>` : ''}
                </table>

                <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 13px; color: #cbd5e1;">
                    <tr style="background-color: #131f32;"><th colspan="2" style="padding: 12px; text-align: left; color: #f59e0b; border-bottom: 1px solid #1e293b; text-transform: uppercase;">Danh sách hành khách</th></tr>
                    ${paxRowsHtml}
                </table>

                <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 13px; color: #cbd5e1;">
                    <tr style="background-color: #131f32;"><th colspan="2" style="padding: 12px; text-align: left; color: #f59e0b; border-bottom: 1px solid #1e293b; text-transform: uppercase;">Chi tiết hóa đơn (USD)</th></tr>
                    <tr><td style="padding: 12px; border-bottom: 1px solid #1e293b;">Tổng tiền dịch vụ gốc:</td><td style="padding: 12px; border-bottom: 1px solid #1e293b; text-align: right; font-family: monospace;">$${d.bill_subtotal_val}</td></tr>
                    <tr><td style="padding: 12px; border-bottom: 1px solid #1e293b; color: #10b981;">Chiết khấu Combo (-5%):</td><td style="padding: 12px; border-bottom: 1px solid #1e293b; text-align: right; color: #10b981; font-family: monospace;">-$${d.bill_discount_val}</td></tr>
                    <tr style="font-size: 16px; font-weight: bold;"><td style="padding: 12px; color: #ffffff;">TỔNG THANH TOÁN:</td><td style="padding: 12px; text-align: right; color: #f59e0b; font-family: monospace;">$${d.bill_total_val}</td></tr>
                </table>
            </div>
        `;

        // Tính năng gửi Mail: Đã bảo vệ bằng try-catch nội bộ để dù Resend có lỗi do cấu hình tên miền thì Web vẫn lưu giao dịch thành công.
        try {
            await resend.emails.send({
                from: 'Blue Trip VIP <onboarding@resend.dev>',
                to: d.contact_email,
                subject: `✈️ [Blue Trip] Xác nhận Booking mã số ${bookingCode} thành công`,
                html: emailTemplate
            });
            console.log(`✉️ Email đã gửi thành công tới: ${d.contact_email}`);
        } catch (mailError) {
            console.log(`⚠️ Gửi mail thất bại (Có thể do giới hạn Resend Free Plan): ${mailError.message}`);
        }

        res.json({ 
            success: true, 
            message_vi: `Thanh toán thành công! Mã Booking của bạn là: ${bookingCode}. Hóa đơn điện tử đã được gửi về email của bạn.`, 
            message_en: `Payment successful! Your Booking Code is ${bookingCode}. Check your email for invoice details.` 
        });

    } catch (error) {
        console.error("Lỗi Backend:", error.message);
        res.status(500).json({ success: false, message_vi: "Lỗi kết nối máy chủ.", message_en: "Server Error." });
    }
});

module.exports = router;