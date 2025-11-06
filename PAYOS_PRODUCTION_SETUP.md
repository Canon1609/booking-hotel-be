# 🚀 Hướng Dẫn Cấu Hình PayOS Thanh Toán Thật (Production)

## 📋 1. Cấu Hình Webhook URL trong PayOS

### 1.1. Điền Webhook URL vào PayOS Dashboard

Sau khi đã deploy BE lên VPS, bạn cần điền **Webhook URL** vào trang cấu hình PayOS:

```
https://api.beanhotelvn.id.vn/api/bookings/payment-webhook
```

**Lưu ý:**
- URL phải là **HTTPS** (PayOS yêu cầu HTTPS cho production)
- Đảm bảo endpoint này accessible từ internet (kiểm tra firewall, nginx config)

### 1.2. Thông Tin Domain:

- **Backend:** `https://api.beanhotelvn.id.vn/`
- **Frontend:** `https://beanhotelvn.id.vn/`
- **Webhook URL:** `https://api.beanhotelvn.id.vn/api/bookings/payment-webhook`

---

## 🔄 2. Flow Thanh Toán Hoàn Chỉnh

### Bước 1: Frontend tạo booking tạm thời
**API:** `POST /api/bookings/temp-booking`
```javascript
// Frontend gọi API này
const response = await fetch('https://api.beanhotelvn.id.vn/api/bookings/temp-booking', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    room_id: 1,
    check_in_date: '2025-01-20',
    check_out_date: '2025-01-22',
    num_person: 2,
    num_rooms: 1
  })
});

const { temp_booking_key } = await response.json();
```

### Bước 2: Thêm dịch vụ (nếu có) - Tùy chọn
**API:** `POST /api/bookings/temp-booking/add-service`
```javascript
await fetch('https://api.beanhotelvn.id.vn/api/bookings/temp-booking/add-service', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    temp_booking_key: temp_booking_key,
    service_id: 1,
    quantity: 2,
    payment_type: 'prepaid'
  })
});
```

### Bước 3: Tạo link thanh toán PayOS ⭐ (API CHÍNH)
**API:** `POST /api/bookings/create-payment-link`

Đây là API **quan trọng nhất** mà frontend cần gọi để tạo link thanh toán:

```javascript
// Frontend gọi API này để lấy link thanh toán
const response = await fetch('https://api.beanhotelvn.id.vn/api/bookings/create-payment-link', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    temp_booking_key: temp_booking_key,
    promotion_code: 'SUMMER2024' // Optional
  })
});

const data = await response.json();
// Response:
// {
//   "message": "Tạo link thanh toán thành công",
//   "payment_url": "https://pay.payos.vn/web/...",
//   "qr_code": "data:image/png;base64,...",
//   "order_code": 1705312222001,
//   "booking_code": "A1B2C3",
//   "amount": 1260000,
//   "expires_in": 1800
// }

// Redirect user đến payment_url hoặc hiển thị QR code
window.location.href = data.payment_url;
// hoặc
// <img src={data.qr_code} alt="QR Code" />
```

### Bước 4: PayOS gọi webhook tự động
Sau khi khách hàng thanh toán thành công, **PayOS sẽ tự động gọi webhook** đến backend:
- **URL:** `https://api.beanhotelvn.id.vn/api/bookings/payment-webhook`
- **Method:** POST
- **Body:** Tự động từ PayOS
- Backend sẽ tự động xử lý: tạo booking, assign phòng, gửi email xác nhận

### Bước 5: Redirect user về trang thành công
Sau khi thanh toán, PayOS sẽ redirect user về:
- **Success:** `https://beanhotelvn.id.vn/payment/success`
- **Cancel:** `https://beanhotelvn.id.vn/payment/cancel`

---

## 📝 3. Checklist Cấu Hình Production

### ✅ Backend (VPS)
- [ ] Cập nhật `.env` với thông tin PayOS production:
  ```env
  PAYOS_CLIENT_ID=your_production_client_id
  PAYOS_API_KEY=your_production_api_key
  PAYOS_CHECKSUM_KEY=your_production_checksum_key
  SERVER_URL=https://api.beanhotelvn.id.vn
  FRONTEND_URL=https://beanhotelvn.id.vn
  CLIENT_URL=https://beanhotelvn.id.vn
  ```
- [ ] Đảm bảo server có SSL/HTTPS ✅ (Đã có)
- [ ] Restart backend sau khi cập nhật `.env`

### ✅ PayOS Dashboard
- [ ] Điền **Webhook URL** vào trang cấu hình:
  ```
  https://api.beanhotelvn.id.vn/api/bookings/payment-webhook
  ```
- [ ] Lưu cấu hình

### ✅ Frontend
- [ ] Cập nhật API base URL thành production URL:
  ```javascript
  const API_BASE_URL = 'https://api.beanhotelvn.id.vn/api';
  ```
- [ ] Đảm bảo frontend gọi đúng API:
  - `POST /api/bookings/temp-booking` - Tạo booking tạm
  - `POST /api/bookings/create-payment-link` - Tạo link thanh toán ⭐
- [ ] Xử lý redirect sau thanh toán tại `/payment/success` và `/payment/cancel`

---

## 🔍 4. Kiểm Tra và Test

### Test Webhook URL:
```bash
# Test webhook endpoint có hoạt động không
curl -X POST https://api.beanhotelvn.id.vn/api/bookings/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"orderCode": 123, "status": "PAID"}'
```

### Kiểm tra logs backend:
Sau khi test thanh toán, kiểm tra logs backend để xem webhook có được gọi không:
```bash
# Trên VPS
tail -f /path/to/your/app/logs
# Hoặc nếu dùng PM2
pm2 logs
```

---

## ⚠️ 5. Lưu Ý Quan Trọng

1. **HTTPS là bắt buộc:** PayOS chỉ chấp nhận webhook URL là HTTPS
2. **Webhook verification:** Hiện tại code đang tắt verification để test. Khi production, nên bật lại trong `src/utils/payos.util.js`
3. **Timeout:** Link thanh toán có thời hạn 30 phút (1800 giây)
4. **Error handling:** Frontend cần xử lý các trường hợp:
   - User hủy thanh toán
   - Thanh toán hết hạn
   - Thanh toán thất bại

---

## 📚 6. Tài Liệu Tham Khảo

- PayOS Documentation: https://payos.vn/docs
- API Endpoints trong codebase:
  - `src/routes/bookingRoutes.js` - Định nghĩa routes
  - `src/controllers/bookingController.js` - Logic xử lý
  - `src/utils/payos.util.js` - PayOS service

---

## 🆘 7. Troubleshooting

### Webhook không được gọi:
- Kiểm tra URL trong PayOS dashboard có đúng không
- Kiểm tra server có chạy và accessible không
- Kiểm tra firewall có block port 5000 không
- Kiểm tra logs backend có lỗi gì không

### Thanh toán thành công nhưng không tạo booking:
- Kiểm tra Redis có hoạt động không (temp booking lưu trong Redis)
- Kiểm tra database connection
- Kiểm tra logs để xem lỗi cụ thể

### Frontend không nhận được payment_url:
- Kiểm tra API response có lỗi không
- Kiểm tra token authentication có hợp lệ không
- Kiểm tra temp_booking_key có đúng không

