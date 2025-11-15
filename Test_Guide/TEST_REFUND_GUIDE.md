# 🧪 Hướng dẫn Test Hoàn Tiền (Refund)

## ✅ Đã thêm vào code:

1. ✅ **Cải thiện response khi hủy booking** - Trả về `refund_payment` details
2. ✅ **API getBookingById** - Bây giờ trả về đầy đủ thông tin payments

## 🚀 Cách test hoàn tiền:

### Bước 1: Tạo booking và thanh toán

```bash
# Đăng nhập
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Lưu token từ response
```

```bash
# Tạo booking với check_in = 3+ ngày nữa (để test hoàn 70%)
POST http://localhost:5000/api/bookings/temp-booking
Authorization: Bearer YOUR_TOKEN

{
  "room_type_id": 1,
  "check_in_date": "2025-02-05",  // 3 ngày nữa
  "check_out_date": "2025-02-07",
  "num_person": 2
}
```

```bash
# Thanh toán qua webhook (mô phỏng PayOS)
POST http://localhost:5000/api/bookings/payment-webhook
Content-Type: application/json

{
  "orderCode": "1761629259231493",
  "status": "PAID",
  "buyerName": "Nguyễn Văn A",
  "buyerEmail": "canon1609.dev@gmail.com"
}
```

**Lưu booking_id từ response**

---

### Bước 2: Hủy booking và nhận hoàn tiền

```bash
# Hủy booking (trước 48h - hoàn 70%)
POST http://localhost:5000/api/bookings/1/cancel
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "reason": "Thay đổi kế hoạch du lịch"
}
```

**Response sẽ có đầy đủ thông tin:**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 1680000,
  "cancellation_policy": "Hủy trước 48 giờ - hoàn 70%, phí 30%",
  "hours_until_checkin": 433,
  "booking_status": "cancelled",
  "payment_status": "partial_refunded",
  "refund_payment": {
    "payment_id": 123,
    "amount": 1680000,
    "transaction_id": "REFUND-BOOK123-1705291200000",
    "payment_date": "2025-01-15 10:30:00"
  },
  "note": "Đã ghi nhận hoàn tiền trong hệ thống..."
}
```

---

### Bước 3: Kiểm tra refund trong database

```bash
# Xem chi tiết booking (bao gồm payments)
GET http://localhost:5000/api/bookings/1
Authorization: Bearer YOUR_TOKEN
```

**Response sẽ có payments array:**
```json
{
  "booking": {
    "booking_id": 1,
    "booking_code": "BOOK123",
    "booking_status": "cancelled",
    "payment_status": "partial_refunded",
    "total_price": 2400000,
    "payments": [
      {
        "payment_id": 100,
        "amount": 2400000,  // Payment ban đầu
        "method": "payos",
        "status": "completed",
        "is_refund": false
      },
      {
        "payment_id": 123,
        "amount": -1680000,  // Refund (số âm)
        "method": "payos",
        "status": "completed",
        "transaction_id": "REFUND-BOOK123-1705291200000",
        "payment_date": "2025-01-15 10:30:00",
        "is_refund": true  // ✅ Đánh dấu là refund
      }
    ]
  }
}
```

---

## 🔍 Kiểm tra trong Database (MySQL)

```sql
-- Xem booking vừa hủy
SELECT 
  booking_id,
  booking_code,
  booking_status,
  payment_status,
  total_price
FROM bookings 
WHERE booking_id = 1;
-- Result:
-- booking_status = 'cancelled'
-- payment_status = 'partial_refunded'
```

```sql
-- Xem tất cả payments của booking
SELECT 
  payment_id,
  booking_id,
  amount,
  method,
  status,
  transaction_id,
  payment_date,
  created_at
FROM payments 
WHERE booking_id = 1
ORDER BY created_at DESC;
-- Result: 
-- Có 2 records:
-- 1. Payment ban đầu: amount = 2400000
-- 2. Refund: amount = -1680000
```

```sql
-- Xem chỉ refunds (amount < 0)
SELECT 
  payment_id,
  booking_id,
  ABS(amount) as refund_amount,
  transaction_id,
  payment_date,
  created_at
FROM payments 
WHERE booking_id = 1 
AND amount < 0;
-- Result: Chỉ refund payment với amount = -1680000
```

---

## 🎯 Cách xác định tiền đã hoàn:

### ✅ Trong Response API:
1. **Khi hủy thành công:** Có field `refund_payment` object
2. **Booking status:** `payment_status = 'partial_refunded'`
3. **Có transaction_id:** `"REFUND-BOOK123-1705291200000"`

### ✅ Trong Database:
1. **Có payment record** với `amount` < 0 (số âm)
2. **transaction_id** bắt đầu bằng "REFUND-"
3. **payment_date** có thời gian hủy booking

### ✅ Trong API GET booking:
1. **Payments array** có 2 records
2. **Record thứ 2** có `amount < 0` và `is_refund = true`

---

## 📋 Test Case Checklist:

- [ ] Booking được tạo thành công
- [ ] Booking có payment_status = 'paid'
- [ ] Hủy booking trước 48h
- [ ] Response có `refund_payment` object
- [ ] Booking status chuyển thành 'cancelled'
- [ ] Payment status chuyển thành 'partial_refunded'
- [ ] Database có payment record với amount < 0
- [ ] GET booking/:id trả về payments array với 2 records
- [ ] Payment thứ 2 có is_refund = true

---

## 🎉 Kết quả mong đợi:

Sau khi hủy booking thành công, bạn sẽ thấy:

1. **Response API:** Có `refund_payment` với đầy đủ thông tin
2. **Database:** Có 2 payment records (1 payment, 1 refund)
3. **Booking:** `payment_status = 'partial_refunded'`
4. **Room:** `status = 'available'` (đã giải phóng)

**Tiền đã được ghi nhận hoàn lại trong hệ thống! ✅**

