# 🚫 Chức năng Hủy Đặt Phòng (Cancellation Feature)

## 📋 Tổng quan

Chức năng hủy đặt phòng cho phép khách hàng và admin hủy booking với các chính sách hoàn tiền khác nhau.

## 🎯 Chính sách hủy phòng (ưu tiên theo thứ tự)

**Ngoại lệ 1 tiếng (ưu tiên cao nhất):**
- Nếu hủy trong vòng **≤ 1 tiếng** từ lúc đặt → luôn chỉ **mất 15%** (hoàn 85%)
- Áp dụng **bất kể còn bao nhiêu giờ trước check-in**
- **payment_status:** `partial_refunded`

**Nếu không phải ngoại lệ 1 tiếng:**

1) Nếu thời gian tới giờ check-in (14:00 ngày check-in) còn < 48 giờ
- **Hoàn tiền: 0%** (mất 100%)
- **payment_status:** giữ nguyên `paid`

2) Nếu còn ≥ 48 giờ mới tới giờ check-in
- **Phí 30%**, **hoàn 70%** (payment_status: `partial_refunded`)

## 🔄 Chức năng đổi phòng (Modification)

Không hỗ trợ "đổi" trực tiếp. Khách hàng muốn đổi phòng phải:
1. **Hủy đặt phòng hiện tại** (chịu chính sách hủy)
2. **Đặt phòng mới**
3. **Hoặc liên hệ admin** để admin hủy và đặt lại

## 👨‍💼 Chức năng Admin

Admin có thể hủy bất kỳ đơn đặt phòng nào:
- **Không hoàn tiền tự động** - Xử lý thủ công
- **Ghi chú:** Admin đánh dấu đã xử lý hoàn tiền hay chưa
- **Dùng cho:** Trường hợp khách liên hệ đổi phòng

## 📝 API Endpoints

### 1. Hủy booking (User/Admin)
**Endpoint:** `POST /api/bookings/:id/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "Lý do hủy"
}
```

**Response (Ngoại lệ 1 tiếng):**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 850000,
  "cancellation_policy": "Hủy trong 1 tiếng kể từ lúc đặt: hoàn 85%, phí 15%",
  "hours_until_checkin": 24
}
```

**Response (Hủy trước 48h - không phải ngoại lệ 1 tiếng):**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 700000,
  "cancellation_policy": "Hủy trước 48 giờ - hoàn 70%, phí 30%",
  "hours_until_checkin": 72
}
```

**Response (Hủy trong 48h - không phải ngoại lệ 1 tiếng):**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 0,
  "cancellation_policy": "Hủy trong vòng 48 giờ - mất 100%",
  "hours_until_checkin": 24
}
```

**Điều kiện:**
- User chỉ có thể hủy booking của chính mình (trừ khi là admin)
- Không thể hủy booking đã checked_in hoặc checked_out
- Booking phải có payment_status = 'paid' để áp dụng chính sách

### 2. Admin hủy booking (Không hoàn tiền tự động)
**Endpoint:** `POST /api/bookings/:id/cancel-admin`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "reason": "Khách đổi phòng - admin xử lý",
  "refund_manually": true
}
```

**Response:**
```json
{
  "message": "Admin hủy booking thành công",
  "note": "Đã đánh dấu là đã hoàn tiền thủ công"
}
```

**Điều kiện:**
- Chỉ admin mới có quyền
- Hủy bất kỳ booking nào (trừ checked_out)
- Không tự động hoàn tiền - xử lý thủ công

## 🗄️ Database Changes

### 1. Booking Model
**File:** `src/models/booking.model.js`

**Thay đổi payment_status ENUM:**
```javascript
payment_status: {
  type: DataTypes.ENUM('pending', 'paid', 'refunded', 'partial_refunded'),
  allowNull: false,
  defaultValue: 'pending'
}
```

### 2. Payment Model
**File:** `src/models/payment.model.js`

**Thêm trường payment_date:**
```javascript
payment_date: {
  type: DataTypes.DATE,
  allowNull: true
}
```

### 3. Database Migration
**File:** `src/utils/db.util.js`

Thêm hàm `ensureBookingPaymentStatusEnum()` để cập nhật ENUM:
```sql
ALTER TABLE `bookings` 
MODIFY COLUMN `payment_status` 
ENUM('pending', 'paid', 'refunded', 'partial_refunded') 
NOT NULL DEFAULT 'pending'
```

## 🔧 Implementation Details

### Tính toán thời gian hủy

```javascript
const now = moment().tz('Asia/Ho_Chi_Minh');
const checkInDateTime = moment(booking.check_in_date).tz('Asia/Ho_Chi_Minh').set({
  hour: 14,
  minute: 0,
  second: 0
});
const hoursUntilCheckIn = checkInDateTime.diff(now, 'hours');
const hoursSinceBooking = now.diff(moment(booking.created_at).tz('Asia/Ho_Chi_Minh'), 'hours');
const isWithin1h = hoursSinceBooking <= 1;     // <= 1h: ngoại lệ, mất 15%
const isWithin48h = hoursUntilCheckIn <= 48;   // < 48h: mất 100%
```

### Tạo payment record cho hoàn tiền

```javascript
await Payment.create({
  booking_id: booking.booking_id,
  amount: -refundAmount, // Số âm để biểu thị hoàn tiền
  method: booking.booking_type === 'online' ? 'payos' : 'cash',
  status: 'completed',
  transaction_id: `REFUND-${booking.booking_code}-${Date.now()}`,
  created_at: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
});
```

### Giải phóng phòng

```javascript
if (booking.room_id) {
  await Room.update(
    { status: 'available' },
    { where: { room_id: booking.room_id } }
  );
}
```

## 🧪 Test Cases - Chi tiết

### Luồng đơn giản (chuẩn): Admin đánh dấu hoàn tiền thủ công

Quy trình 4 bước:
1) Admin chuyển khoản hoàn theo STK khách đã gửi qua email
2) Hệ thống gửi email xác nhận hoàn tiền (khi admin đánh dấu)
3) Admin gọi API đánh dấu đã hoàn tiền
4) `payment_status` chuyển thành `refunded`

1) Tạo và thanh toán booking online (trước 48h để được hoàn 70%)
```bash
# Giữ chỗ tạm thời
POST /api/bookings/temp-booking
Authorization: Bearer USER_TOKEN
{
  "room_type_id": 1,
  "check_in_date": "2025-02-05",
  "check_out_date": "2025-02-07",
  "num_person": 2
}

# Tạo link thanh toán
POST /api/bookings/create-payment-link
Authorization: Bearer USER_TOKEN
{
  "temp_booking_key": "<temp_key>"
}

# Mô phỏng thanh toán thành công (PayOS webhook)
POST /api/bookings/payment-webhook
{
  "orderCode": "<order_code>",
  "status": "PAID"
}
```

2) User hủy booking (trước 48h)
```bash
POST /api/bookings/{booking_id}/cancel
Authorization: Bearer USER_TOKEN
{
  "reason": "Thay đổi kế hoạch"
}
```
- Kỳ vọng:
- Response có `refund_amount = 70%`, `payment_status = partial_refunded`, `booking_status = cancelled`
- Hệ thống gửi EMAIL “Yêu cầu thông tin hoàn tiền” → Khách phản hồi STK qua email

3) Admin đánh dấu đã hoàn tiền trong hệ thống
```bash
POST /api/bookings/{booking_id}/refund-admin
Authorization: Bearer ADMIN_TOKEN
{
  "amount": 1680000,      # Số tiền admin đã CK cho khách
  "method": "banking",   # banking | cash | payos
  "note": "Hoàn theo STK khách cung cấp"
}
```
- Kỳ vọng:
  - Tạo/cập nhật payment âm hoàn tất (status = completed, có transaction_id, payment_date)
  - Gửi EMAIL “Xác nhận hoàn tiền” cho khách
  - Cập nhật `payment_status` = `refunded`

4) Xác minh kết quả
```bash
GET /api/bookings/{booking_id}
Authorization: Bearer ADMIN_TOKEN
```
- `payments` có 2 bản ghi: payment dương (thanh toán), payment âm (refund)
- `payment_summary.total_refunded` đúng với số tiền đã hoàn
- `note` có dòng: "Admin đánh dấu hoàn tiền ..."

📌 Quy tắc hoàn tiền của Admin:
- Với flow hiện tại: Admin chỉ ĐÁNH DẤU hoàn tiền thủ công.
- Trường hợp có bản ghi hoàn tiền pending (tạo khi user hủy trước 48h): API sẽ chuyển sang completed, set `payment_date`, thêm `transaction_id`, gửi email xác nhận.
- Trường hợp KHÔNG có bản ghi pending: truyền `amount` để tạo bản ghi hoàn âm hoàn tất ngay, gửi email xác nhận.

#### Cách test chi tiết cho Admin (2 trường hợp)

1) Có bản ghi hoàn tiền pending (user hủy trước 48h đã sinh pending refund)
```http
POST http://localhost:5000/api/bookings/{booking_id}/refund-admin
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "method": "banking",
  "note": "Chuyển khoản xong"
}
```
- Kỳ vọng:
  - Payment âm status chuyển từ `pending` → `completed`
  - Có `transaction_id` kiểu `ADMIN-REFUND-<booking_code>-<timestamp>` và `payment_date`
  - `payment_status` được cập nhật (thường là `refunded` nếu đây là khoản hoàn theo chính sách)
  - Email xác nhận hoàn tiền được gửi cho khách

2) Không có bản ghi pending (admin hoàn mới)
```http
POST http://localhost:5000/api/bookings/{booking_id}/refund-admin
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "amount": 1680000,
  "method": "banking",
  "note": "Hoàn theo STK khách cung cấp"
}
```
- Kỳ vọng:
  - Tạo mới payment âm với `status = completed`
  - Có `transaction_id` và `payment_date`
  - `payment_status` cập nhật thành `refunded`
  - Email xác nhận hoàn tiền được gửi

### Test Case 1: User hủy trong 1 tiếng (Ngoại lệ) - Hoàn 85%

**Bước 1: Đăng nhập và tạo booking**
```bash
# Đăng nhập user
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123"
}
```

```bash
# Giữ chỗ tạm thời
POST http://localhost:5000/api/bookings/temp-booking
Authorization: Bearer YOUR_TOKEN

{
  "room_type_id": 1,
  "check_in_date": "2025-01-22",  // Hôm nay hoặc ngày mai
  "check_out_date": "2025-01-24",
  "num_person": 2
}
```

**Bước 2: Thanh toán**
```bash
# Tạo link thanh toán PayOS
POST http://localhost:5000/api/bookings/create-payment-link
Authorization: Bearer YOUR_TOKEN

{
  "temp_booking_key": "temp_key_from_previous_response"
}

# Mô phỏng thanh toán qua webhook
POST http://localhost:5000/api/bookings/payment-webhook
Content-Type: application/json

{
  "orderCode": "order_code_from_payment",
  "status": "PAID"
}
```

**Bước 3: Hủy booking ngay trong 1 tiếng**
```bash
POST http://localhost:5000/api/bookings/1/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "reason": "Đổi ý"
}
```

**Response:**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 850000,
  "cancellation_policy": "Hủy trong 1 tiếng kể từ lúc đặt: hoàn 85%, phí 15%",
  "hours_until_checkin": 24
}
```

**Bước 4: Kiểm tra database**
```sql
-- Kiểm tra booking status
SELECT booking_id, booking_status, payment_status, total_price 
FROM bookings 
WHERE booking_id = 1;
-- Result: booking_status = 'cancelled', payment_status = 'partial_refunded'

-- Kiểm tra payment record (hoàn tiền)
SELECT * FROM payments WHERE booking_id = 1 AND amount < 0;
-- Result: amount = -850000 (85% hoàn lại)
```

---

### Test Case 2: User hủy trước 48h (không phải ngoại lệ 1 tiếng) - Hoàn 70%

**Bước 1: Đăng nhập và tạo booking**
```bash
# Đăng nhập user
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123"
}

# Response: Lưu token
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }
```

```bash
# Giữ chỗ tạm thời (check_in = 3 ngày nữa)
POST http://localhost:5000/api/bookings/temp-booking
Authorization: Bearer YOUR_TOKEN

{
  "room_type_id": 1,
  "check_in_date": "2025-01-30",  // 3 ngày nữa (72h)
  "check_out_date": "2025-02-01",
  "num_person": 2
}
```

**Bước 2: Thanh toán**
```bash
# Tạo link thanh toán PayOS
POST http://localhost:5000/api/bookings/create-payment-link
Authorization: Bearer YOUR_TOKEN

{
  "temp_booking_key": "temp_key_from_previous_response"
}

# Mô phỏng thanh toán qua webhook
POST http://localhost:5000/api/bookings/payment-webhook
Content-Type: application/json

{
  "orderCode": "order_code_from_payment",
  "status": "PAID"
}
```

**Bước 3: Đợi hơn 1 tiếng rồi hủy booking (trước 48h, không phải ngoại lệ)**
```bash
# Lưu ý: Đợi hơn 1 tiếng từ lúc đặt để không rơi vào ngoại lệ
POST http://localhost:5000/api/bookings/2/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "reason": "Thay đổi kế hoạch du lịch"
}
```

**Response:**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 700000,
  "cancellation_policy": "Hủy trước 48 giờ - hoàn 70%, phí 30%",
  "hours_until_checkin": 72
}
```

**Bước 4: Kiểm tra database**
```sql
-- Kiểm tra booking status
SELECT booking_id, booking_status, payment_status, total_price 
FROM bookings 
WHERE booking_id = 2;
-- Result: booking_status = 'cancelled', payment_status = 'partial_refunded'

-- Kiểm tra payment record (hoàn tiền)
SELECT * FROM payments WHERE booking_id = 2 AND amount < 0;
-- Result: amount = -700000 (70% hoàn lại)
```

---

### Test Case 3: User hủy trong 48h (không phải ngoại lệ 1 tiếng) - Mất 100%

**Bước 1: Tạo booking với check_in = 1 ngày nữa (24h)**
```bash
POST http://localhost:5000/api/bookings/temp-booking
Authorization: Bearer YOUR_TOKEN

{
  "room_type_id": 1,
  "check_in_date": "2025-01-22",  // 1 ngày nữa (24h)
  "check_out_date": "2025-01-24",
  "num_person": 2
}

# Thanh toán thành công...
```

**Bước 2: Hủy booking (trong 48h)**
```bash
POST http://localhost:5000/api/bookings/2/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "reason": "Không thể đi được"
}
```

**Response:**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 0,
  "cancellation_policy": "Hủy trong vòng 48 giờ - mất 100%",
  "hours_until_checkin": 24
}
```

**Kiểm tra database:**
```sql
-- payment_status vẫn là 'paid'
SELECT booking_status, payment_status FROM bookings WHERE booking_id = 2;
-- Result: booking_status = 'cancelled', payment_status = 'paid'

-- Không có payment record hoàn tiền
SELECT * FROM payments WHERE booking_id = 2 AND amount < 0;
-- Result: Empty (0 rows)
```

---

### Test Case 3: Admin hủy booking (Manual processing)

**Scenario:** Khách liên hệ muốn đổi phòng

**Bước 1: Admin hủy booking**
```bash
POST http://localhost:5000/api/bookings/1/cancel-admin
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "reason": "Khách đổi phòng - đã xử lý hoàn tiền thủ công",
  "refund_manually": true
}
```

**Response:**
```json
{
  "message": "Admin hủy booking thành công",
  "note": "Đã đánh dấu là đã hoàn tiền thủ công"
}
```

**Kiểm tra database:**
```sql
-- Xem note của booking
SELECT booking_id, note, booking_status FROM bookings WHERE booking_id = 1;
-- Note: "Admin hủy: Khách đổi phòng... (Đã hoàn tiền thủ công)"
```

**Bước 2: Admin tạo booking mới cho khách**
```bash
POST http://localhost:5000/api/bookings/temp-booking
Authorization: Bearer USER_TOKEN

{
  "room_type_id": 2,  // Đổi loại phòng
  "check_in_date": "2025-02-05",  // Đổi ngày
  "check_out_date": "2025-02-07",
  "num_person": 2
}

# Thanh toán booking mới...
```

---

### Test Case 4: User không thể hủy booking của người khác

**Setup:**
- User A: `user_a@example.com`
- User B: `user_b@example.com`
- User A có booking_id = 3

**Test:**
```bash
# User B cố gắng hủy booking của User A
POST http://localhost:5000/api/bookings/3/cancel
Authorization: Bearer USER_B_TOKEN
Content-Type: application/json

{
  "reason": "..."
}
```

**Response (403):**
```json
{
  "message": "Bạn không có quyền hủy booking này",
  "statusCode": 403
}
```

---

### Test Case 5: Không thể hủy booking đã checked_in

**Setup:** Booking đã check-in

```bash
POST http://localhost:5000/api/bookings/4/cancel
Authorization: Bearer USER_TOKEN
Content-Type: application/json

{
  "reason": "..."
}
```

**Response (400):**
```json
{
  "message": "Không thể hủy booking ở trạng thái: checked_in",
  "statusCode": 400
}
```

---

### Test Case 6: Không thể hủy booking chưa thanh toán

**Setup:** Booking có payment_status = 'pending'

```bash
POST http://localhost:5000/api/bookings/5/cancel
Authorization: Bearer USER_TOKEN
Content-Type: application/json

{
  "reason": "..."
}
```

**Response:**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 0,
  "cancellation_policy": "Không áp dụng vì chưa thanh toán"
}
```

## 🚀 Deploy

1. Database sẽ tự động cập nhật khi chạy `npm start`
2. Migration chạy tự động trong `server.js`
3. Không cần restart server

## 📊 Flow Diagram

```
User hủy booking
├─ Kiểm tra quyền
│  └─ User chỉ có thể hủy booking của mình (trừ admin)
├─ Kiểm tra payment_status
│  ├─ 'pending' → Hủy không áp dụng chính sách
│  ├─ 'paid' → Áp dụng chính sách hoàn tiền
│  └─ Khác → Không hủy được
├─ Kiểm tra booking_status
│  ├─ 'checked_in' → Lỗi: Không thể hủy
│  ├─ 'checked_out' → Lỗi: Không thể hủy
│  └─ Khác → Tiếp tục
├─ Tính thời gian từ lúc đặt đến lúc hủy
│  └─ Check-in time: 14:00 ngày check_in_date
├─ Ngoại lệ 1 tiếng?
│  ├─ YES (hủy ≤ 1h từ lúc đặt):
│  │  ├─ Hoàn 85% tổng giá (mất 15%)
│  │  ├─ Tạo payment record (amount = -85%)
│  │  ├─ Cập nhật payment_status = 'partial_refunded'
│  │  └─ Giải phóng phòng
│  └─ NO:
│     ├─ Trước 48h?
│     │  ├─ YES: 
│     │  │  ├─ Hoàn 70% tổng giá (mất 30%)
│     │  │  ├─ Tạo payment record (amount = -70%)
│     │  │  ├─ Cập nhật payment_status = 'partial_refunded'
│     │  │  └─ Giải phóng phòng
│     │  └─ NO: 
│     │     ├─ Không hoàn tiền (mất 100%)
│     │     ├─ payment_status = 'paid' (giữ nguyên)
│     │     └─ Giải phóng phòng
├─ Cập nhật booking_status = 'cancelled'
├─ Ghi chú lý do hủy vào note
└─ Trả về kết quả

Admin hủy booking
├─ Kiểm tra quyền admin
├─ Kiểm tra booking_status
│  ├─ 'checked_out' → Lỗi
│  └─ Khác → Tiếp tục
├─ Cập nhật booking_status = 'cancelled'
├─ Ghi chú "Admin hủy" vào note
├─ refund_manually = true → "Đã hoàn tiền thủ công"
├─ refund_manually = false → "Không hoàn tiền - xử lý thủ công"
├─ Giải phóng phòng
└─ Trả về kết quả (không hoàn tiền tự động)
```

## ⚠️ Lưu ý

1. **Check-in time mặc định:** 14:00 (2:00 PM)
2. **Ngoại lệ 1 tiếng:** Nếu hủy trong vòng ≤ 1 tiếng từ lúc đặt, luôn chỉ mất 15% (hoàn 85%), bất kể còn bao nhiêu giờ trước check-in
3. **Trước 48h:** Từ hơn 48 giờ trước 14:00 ngày check-in (không phải ngoại lệ 1 tiếng)
4. **Trong 48h:** Từ 48 giờ trước 14:00 ngày check-in trở đi (không phải ngoại lệ 1 tiếng)
5. **Không đến (no-show):** Tự động áp dụng chính sách "trong 48h" - mất 100%
6. **Admin hủy:** Luôn không hoàn tiền tự động, cần xử lý thủ công

## 🔗 Related Files

- `src/models/booking.model.js` - Booking model
- `src/models/payment.model.js` - Payment model
- `src/controllers/bookingController.js` - Booking controller
- `src/routes/bookingRoutes.js` - Booking routes
- `src/utils/db.util.js` - Database utilities
- `src/server.js` - Server startup

## 📋 Postman Examples - Quick Reference

### 1. User hủy booking (API cơ bản)
```http
POST http://localhost:5000/api/bookings/1/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "reason": "Thay đổi kế hoạch"
}
```

### 2. Admin hủy booking (API đặc biệt)
```http
POST http://localhost:5000/api/bookings/1/cancel-admin
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "reason": "Khách đổi phòng - đã xử lý thủ công",
  "refund_manually": true
}
```

### 3. Kiểm tra booking sau khi hủy
```http
GET http://localhost:5000/api/bookings/1
Authorization: Bearer YOUR_TOKEN
```

### 4. Kiểm tra lịch sử booking
```http
GET http://localhost:5000/api/bookings/my-bookings
Authorization: Bearer YOUR_TOKEN
```

## 🎯 Business Logic Examples

### Ví dụ thực tế 1: Khách hủy trong 1 tiếng (Ngoại lệ)
- **Ngày đặt:** 27/01/2025 lúc 10:00
- **Ngày hủy:** 27/01/2025 lúc 10:30 (30 phút sau)
- **Ngày check-in:** 28/01/2025 lúc 14:00
- **Thời gian từ lúc đặt:** 30 phút (≤ 1 tiếng) ✅
- **Kết quả:** Hoàn 85%, phí 15% (ngoại lệ áp dụng bất kể còn bao nhiêu giờ trước check-in)

### Ví dụ thực tế 2: Khách hủy trước 48h (không phải ngoại lệ)
- **Ngày đặt:** 25/01/2025 lúc 10:00
- **Ngày hủy:** 27/01/2025 lúc 10:00 (2 ngày sau, > 1 tiếng)
- **Ngày check-in:** 29/01/2025 lúc 14:00
- **Thời gian từ lúc đặt:** 48 giờ (> 1 tiếng)
- **Thời gian đến check-in:** 48 giờ (≥ 48h) ✅
- **Kết quả:** Hoàn 70%, phí 30%

### Ví dụ thực tế 3: Khách hủy trong 48h (không phải ngoại lệ)
- **Ngày đặt:** 27/01/2025 lúc 10:00
- **Ngày hủy:** 28/01/2025 lúc 10:00 (1 ngày sau, > 1 tiếng)
- **Ngày check-in:** 29/01/2025 lúc 14:00
- **Thời gian từ lúc đặt:** 24 giờ (> 1 tiếng)
- **Thời gian đến check-in:** 28 giờ (< 48h) ❌
- **Kết quả:** Mất 100% (0% hoàn)

### Ví dụ thực tế 4: Admin hủy cho khách đổi phòng
- **Khách yêu cầu:** Đổi từ phòng Deluxe sang Suite
- **Bước 1:** Admin hủy booking cũ (không hoàn tiền tự động)
- **Bước 2:** Admin hoàn tiền booking cũ thủ công
- **Bước 3:** Khách đặt booking mới (phòng Suite)
- **Kết quả:** Khách có phòng mới, hệ thống ghi nhận rõ ràng

## 🔍 Troubleshooting

### Lỗi: "Bạn không có quyền hủy booking này"
- **Nguyên nhân:** User đang cố gắng hủy booking của người khác
- **Giải pháp:** User chỉ có thể hủy booking của chính mình (hoặc là admin)

### Lỗi: "Không thể hủy booking ở trạng thái: checked_in"
- **Nguyên nhân:** Booking đã được check-in
- **Giải pháp:** Không thể hủy booking đã check-in, phải check-out trước

### Không nhận được hoàn tiền
- **Kiểm tra:** Xem `payment_status` có = 'partial_refunded' không
- **Kiểm tra:** Xem có payment record với amount < 0 không
- **Kiểm tra:** Đã hủy trước 48h chưa?

### Admin muốn hoàn tiền cho khách
- **Cách 1:** Dùng `cancel-admin` với `refund_manually: true` (ghi chú)
- **Cách 2:** Xử lý hoàn tiền thủ công bên ngoài hệ thống

## 📖 Code Examples

### Trong Frontend: Gọi API hủy booking
```javascript
// React/Vue/Angular example
async function cancelBooking(bookingId, reason) {
  const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });
  
  const data = await response.json();
  
  if (data.refund_amount > 0) {
    alert(`Đã hủy thành công! Hoàn tiền: ${data.refund_amount.toLocaleString('vi-VN')} VNĐ`);
  } else {
    alert('Đã hủy thành công nhưng không hoàn tiền (hủy trong vòng 48h)');
  }
}
```

### Trong Backend: Kiểm tra quyền hủy
```javascript
// Middleware hoặc trong controller
const canCancelBooking = (user, booking) => {
  // User là admin
  if (user.role === 'admin') return true;
  
  // User là chủ của booking
  if (user.id === booking.user_id) return true;
  
  // Không có quyền
  return false;
};
```

