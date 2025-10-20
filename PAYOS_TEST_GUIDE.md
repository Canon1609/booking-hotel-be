# 🚀 Hướng dẫn Test PayOS thật - Hotel Booking

## 📋 Chuẩn bị

### 1. **Cấu hình PayOS Sandbox:**
```bash
# Trong file .env
PAYOS_CLIENT_ID=your_sandbox_client_id
PAYOS_API_KEY=your_sandbox_api_key  
PAYOS_CHECKSUM_KEY=your_sandbox_checksum_key
```

### 2. **Webhook URL:**
```
https://your-domain.com/api/booking/payment/webhook
```

## 🔄 Flow Test Hoàn Chỉnh

### **Bước 1: Tạo booking tạm thời**
```bash
POST http://localhost:5000/api/booking/temp
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "room_id": 1,
  "check_in_date": "2025-10-21",
  "check_out_date": "2025-10-22", 
  "num_person": 2
}
```

**Response:**
```json
{
  "message": "Giữ chỗ tạm thời thành công",
  "temp_booking_key": "temp_booking_2_1_2025-10-21_2025-10-22",
  "expires_in": 1800,
  "booking_data": {
    "user_id": 2,
    "room_id": 1,
    "check_in_date": "2025-10-21",
    "check_out_date": "2025-10-22",
    "num_person": 2,
    "room_price": 500,
    "total_price": 500,
    "nights": 1,
    "room_type_id": 1,
    "room_number": "101",
    "room_type_name": "Deluxe normal"
  }
}
```

### **Bước 2: Thêm dịch vụ (tùy chọn)**
```bash
POST http://localhost:5000/api/booking/temp/add-service
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "temp_booking_key": "temp_booking_2_1_2025-10-21_2025-10-22",
  "service_id": 1,
  "quantity": 2,
  "payment_type": "prepaid"
}
```

### **Bước 3: Tạo link thanh toán PayOS**
```bash
POST http://localhost:5000/api/booking/payment/create-link
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "temp_booking_key": "temp_booking_2_1_2025-10-21_2025-10-22",
  "promotion_code": "SUMMER2025"
}
```

**Response:**
```json
{
  "message": "Tạo link thanh toán thành công",
  "payment_url": "https://pay.payos.vn/web/...",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "order_code": 1760945033417144,
  "booking_code": "BKMGYT7FT5I5RG0K",
  "amount": 500,
  "expires_in": 1800
}
```

### **Bước 4: Test thanh toán thật**

#### **Option A: Test với PayOS Sandbox**
1. **Mở payment_url** trong browser
2. **Chọn phương thức thanh toán** (QR Code, Banking, etc.)
3. **Sử dụng thông tin test:**
   - **Số thẻ:** `4111111111111111`
   - **Ngày hết hạn:** `12/25`
   - **CVV:** `123`
   - **Tên chủ thẻ:** `NGUYEN VAN A`

#### **Option B: Test với QR Code thật**
1. **Mở app ngân hàng** (Vietcombank, BIDV, etc.)
2. **Quét QR code** từ response
3. **Nhập số tiền:** `500 VNĐ`
4. **Xác nhận thanh toán**

### **Bước 5: Kiểm tra kết quả**

#### **5.1. Kiểm tra webhook log:**
```bash
# Trong terminal server, bạn sẽ thấy:
Webhook received: {
  orderCode: '1760945033417144',
  status: 'PAID',
  buyerName: 'Nguyễn Văn A',
  buyerEmail: 'canon1609.dev@gmail.com'
}
```

#### **5.2. Kiểm tra database:**
```sql
-- Kiểm tra booking đã tạo
SELECT * FROM bookings WHERE booking_code = 'BKMGYT7FT5I5RG0K';

-- Kiểm tra payment
SELECT * FROM payments WHERE transaction_id = '1760945033417144';

-- Kiểm tra booking services
SELECT * FROM booking_services WHERE booking_id = <booking_id>;
```

#### **5.3. Kiểm tra email:**
- **Email xác nhận** sẽ được gửi đến user
- **Nội dung đẹp** với HTML template

## 🎯 Test Cases

### **Test Case 1: Thanh toán thành công**
- ✅ Tạo booking tạm thời
- ✅ Tạo payment link
- ✅ Thanh toán thành công
- ✅ Webhook nhận được
- ✅ Booking chuyển sang 'confirmed'
- ✅ Email xác nhận được gửi

### **Test Case 2: Thanh toán thất bại**
- ✅ Tạo booking tạm thời
- ✅ Tạo payment link
- ❌ Thanh toán thất bại
- ❌ Webhook không nhận được
- ❌ Booking vẫn 'pending'
- ❌ Email không được gửi

### **Test Case 3: Booking hết hạn**
- ✅ Tạo booking tạm thời
- ⏰ Đợi 30 phút (TTL)
- ❌ Booking tạm thời bị xóa
- ❌ Webhook không tìm thấy booking

## 🔧 Troubleshooting

### **Lỗi "Webhook không hợp lệ":**
- Kiểm tra `PAYOS_CHECKSUM_KEY` trong .env
- Đảm bảo webhook URL đúng
- Kiểm tra PayOS dashboard webhook settings

### **Lỗi "Temp booking not found":**
- Booking tạm thời đã hết hạn (30 phút)
- Tạo lại flow từ đầu
- Kiểm tra Redis connection

### **Lỗi "Email sending failed":**
- Kiểm tra `EMAIL_USER` và `EMAIL_PASS` trong .env
- Sử dụng App Password cho Gmail
- Kiểm tra SMTP settings

## 📱 Test với Mobile App

### **iOS/Android App:**
1. **Mở app ngân hàng**
2. **Chọn "Quét QR"**
3. **Quét QR code** từ payment_url
4. **Nhập số tiền** chính xác
5. **Xác nhận thanh toán**

### **Web Browser:**
1. **Mở payment_url** trong browser
2. **Chọn phương thức thanh toán**
3. **Nhập thông tin thẻ** (sandbox)
4. **Xác nhận thanh toán**

## 🎉 Kết quả mong đợi

Sau khi thanh toán thành công:
- ✅ **Booking status:** `confirmed`
- ✅ **Payment status:** `paid`
- ✅ **Email xác nhận:** Gửi thành công
- ✅ **Database:** Cập nhật đầy đủ
- ✅ **Webhook:** Xử lý thành công

---

**💡 Lưu ý:** 
- Sử dụng PayOS Sandbox để test an toàn
- Không sử dụng thông tin thẻ thật khi test
- Kiểm tra logs để debug khi có lỗi
- Test trên nhiều thiết bị khác nhau
