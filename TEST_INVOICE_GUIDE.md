# Hướng Dẫn Test Chức Năng In Hóa Đơn PDF

## Tổng Quan

Chức năng in hóa đơn PDF cho phép lễ tân in hóa đơn chi tiết khi khách check-out hoặc bất cứ lúc nào cần thiết. Hóa đơn bao gồm đầy đủ thông tin về phòng, dịch vụ, thanh toán và số tiền còn phải thu.

## API Endpoint

```
GET /api/bookings/:id/invoice/pdf
```

**Authentication:** Required (Admin/Staff only)
**Headers:**
```
Authorization: Bearer <admin_or_staff_token>
```

**Response:** 
- Content-Type: `application/pdf`
- File download với tên: `invoice-{booking_code}.pdf`

## Yêu Cầu Dữ Liệu

Hóa đơn sẽ hiển thị các thông tin sau:

### 1. Thông Tin Chung
- **Logo và Tên Khách sạn:** Bean Hotel
- **Địa chỉ, SĐT:** Hiển thị trong header
- **Tên Hóa Đơn:** HÓA ĐƠN THANH TOÁN
- **Mã Đặt phòng (Booking Code):** Mã `booking_code` từ bảng bookings
- **Ngày Giờ Xuất HĐ:** Thời điểm lễ tân nhấn nút in (được tạo tự động)
- **Thu ngân (Lễ tân):** Tên nhân viên xuất hóa đơn (lấy từ `req.user.full_name`)

### 2. Thông Tin Khách Hàng
- **Tên Khách:** `user.full_name` từ bảng users

### 3. Chi Tiết Lưu Trú
- **Thời gian Nhận phòng (Check-in):** `booking.check_in_time` hoặc `booking.check_in_date + 14:00`
- **Thời gian Trả phòng (Check-out):** `booking.check_out_time` hoặc `booking.check_out_date + 12:00`
- **Loại phòng:** `room_type.room_type_name`
- **Số phòng:** Danh sách các `room_num` từ bảng `booking_rooms` (ví dụ: 101, 102)
- **Số lượng khách:** `booking.num_person`

### 4. Chi Tiết Các Khoản Phí

#### 4.1. Tiền phòng (Accommodation)
- Tính từ `booking.total_price`
- Hiển thị số đêm và số phòng

#### 4.2. Dịch vụ (Services)
- Lấy từ bảng `booking_services` với `status != 'cancelled'`
- Mỗi dịch vụ hiển thị:
  - Tên dịch vụ
  - Ghi chú "(Đã trả trước)" nếu `payment_type = 'prepaid'`
  - Số lượng, đơn giá, thành tiền

#### 4.3. Phụ thu (Surcharges)
- Phụ thu check-out muộn (nếu có)
- Các phụ thu khác (nếu có)

### 5. Tổng Kết Thanh Toán

- **Tổng Chi phí (Subtotal):** Tổng của tất cả các khoản phí
- **Giảm giá (nếu có):** Từ promotion
- **TỔNG CỘNG (Grand Total):** Subtotal - Discount
- **Đã thanh toán (Online):** Tổng các payment với `method = 'payos'` và `amount > 0`, `status = 'completed'`
- **Đã hoàn tiền (Refunds):** Tổng các payment với `amount < 0` và `status = 'completed'`
- **SỐ TIỀN THANH TOÁN KHI CHECK-OUT (Amount Due):** 
  ```
  Amount Due = Grand Total - Paid Online - Refunds
  ```
  Nếu Amount Due <= 0 thì hiển thị 0đ

### 6. Ghi Chú / Chân Trang
- "Cảm ơn quý khách! Hẹn gặp lại!"
- Phương thức thanh toán (Tiền mặt / Thẻ / PayOS)
- Ngày giờ tạo hóa đơn

## Các Bước Test

### Bước 1: Chuẩn Bị Dữ Liệu Test

1. **Tạo booking test:**
   - Tạo booking với các dịch vụ
   - Có thể thanh toán online (PayOS) hoặc chưa
   - Đảm bảo booking có `booking_rooms` đã được gán

2. **Tạo payment records (nếu cần):**
   - Payment online: `method = 'payos'`, `amount > 0`, `status = 'completed'`
   - Refund: `amount < 0`, `status = 'completed'`

### Bước 2: Test In Hóa Đơn

#### Test Case 1: Hóa đơn booking chưa thanh toán

**Request:**
```bash
GET http://localhost:5000/api/bookings/{booking_id}/invoice/pdf
Authorization: Bearer {admin_token}
```

**Kiểm tra:**
- [ ] Header hiển thị "BEAN HOTEL"
- [ ] Booking code hiển thị đúng
- [ ] Tên khách hàng hiển thị đúng
- [ ] Thông tin check-in/check-out hiển thị đúng
- [ ] Danh sách số phòng hiển thị đúng (ví dụ: "101, 102")
- [ ] Tiền phòng được tính đúng
- [ ] Dịch vụ hiển thị đầy đủ với ghi chú "(Đã trả trước)" nếu có
- [ ] Tổng chi phí, Grand Total tính đúng
- [ ] "Đã thanh toán (Online)" = 0đ
- [ ] "Đã hoàn tiền" = 0đ (nếu không có)
- [ ] "Amount Due" = Grand Total
- [ ] Footer hiển thị đúng

#### Test Case 2: Hóa đơn booking đã thanh toán online một phần

**Setup:**
- Booking có total = 5,000,000đ
- Payment PayOS = 2,300,000đ (completed)
- Grand Total = 5,500,000đ

**Kiểm tra:**
- [ ] "Đã thanh toán (Online)" = -2,300,000đ (hiển thị màu xanh)
- [ ] "Amount Due" = 5,500,000 - 2,300,000 = 3,200,000đ
- [ ] Phương thức thanh toán: "Online (PayOS) + Tiền mặt / Thẻ"

#### Test Case 3: Hóa đơn booking có hoàn tiền

**Setup:**
- Booking có total = 5,000,000đ
- Payment PayOS = 5,000,000đ (completed)
- Refund = -150,000đ (completed) (do hủy dịch vụ)

**Kiểm tra:**
- [ ] "Đã thanh toán (Online)" = -5,000,000đ
- [ ] "Đã hoàn tiền (Refunds)" = +150,000đ (hiển thị màu đỏ)
- [ ] "Amount Due" = 5,500,000 - 5,000,000 - 150,000 = 350,000đ
- [ ] Hoặc nếu Amount Due < 0 thì hiển thị 0đ

#### Test Case 4: Hóa đơn booking đã thanh toán đủ

**Setup:**
- Booking có Grand Total = 5,500,000đ
- Payment PayOS = 5,500,000đ (completed)

**Kiểm tra:**
- [ ] "Đã thanh toán (Online)" = -5,500,000đ
- [ ] "Amount Due" = 0đ
- [ ] Phương thức thanh toán: "Đã thanh toán online (PayOS)"

#### Test Case 5: Hóa đơn với nhiều phòng

**Setup:**
- Booking có 3 phòng: 101, 102, 103

**Kiểm tra:**
- [ ] "Số phòng" hiển thị: "101, 102, 103"
- [ ] Tiền phòng tính đúng cho 3 phòng

#### Test Case 6: Hóa đơn với dịch vụ prepaid và postpaid

**Setup:**
- Booking có:
  - Dịch vụ A: prepaid (300,000đ) - "Đưa đón sân bay (Đã trả trước)"
  - Dịch vụ B: postpaid (150,000đ) - "Giặt ủi (Laundry)"
  - Dịch vụ C: postpaid (80,000đ) - "Minibar"

**Kiểm tra:**
- [ ] Tất cả dịch vụ hiển thị trong bảng "Chi tiết các khoản phí"
- [ ] Dịch vụ prepaid có ghi chú "(Đã trả trước)"
- [ ] Dịch vụ postpaid không có ghi chú

#### Test Case 7: Hóa đơn với promotion

**Setup:**
- Booking có promotion giảm 10%

**Kiểm tra:**
- [ ] Dòng "Giảm giá" hiển thị trong phần tổng kết
- [ ] Grand Total được tính sau khi trừ giảm giá

#### Test Case 8: Kiểm tra định dạng số tiền

**Kiểm tra:**
- [ ] Tất cả số tiền được format đúng định dạng Việt Nam (ví dụ: 1.500.000đ)
- [ ] Có dấu "đ" ở cuối
- [ ] Không có dấu phẩy thập phân

#### Test Case 9: Kiểm tra tên nhân viên

**Kiểm tra:**
- [ ] "Thu ngân (Lễ tân)" hiển thị tên nhân viên đang đăng nhập (từ token)
- [ ] Nếu không có token thì hiển thị "N/A"

#### Test Case 10: Kiểm tra ngày giờ xuất hóa đơn

**Kiểm tra:**
- [ ] "Ngày giờ xuất HĐ" hiển thị thời gian thực tại khi in (format: DD/MM/YYYY HH:mm)
- [ ] Timezone: Asia/Ho_Chi_Minh

## Test Với Postman

### 1. Import Collection

Tạo request mới trong Postman:

```
GET {{base_url}}/api/bookings/{{booking_id}}/invoice/pdf
```

### 2. Headers

```
Authorization: Bearer {{admin_token}}
```

### 3. Send Request

- Click "Send"
- Response sẽ là file PDF (binary)
- Postman sẽ tự động download file

### 4. Kiểm Tra File PDF

- Mở file PDF vừa download
- Kiểm tra tất cả các mục trong checklist ở trên

## Test Với cURL

```bash
curl -X GET \
  http://localhost:3000/api/bookings/1/invoice/pdf \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/pdf" \
  --output invoice.pdf
```

## Test Với Browser (Development)

Nếu API trả về HTML preview (không phải PDF), có thể dùng endpoint:

```
GET /api/bookings/:id/invoice
```

Endpoint này trả về HTML để preview trước khi in PDF.

## Lỗi Thường Gặp

### 1. Lỗi 404: Không tìm thấy booking
- **Nguyên nhân:** Booking ID không tồn tại
- **Giải pháp:** Kiểm tra booking_id trong request

### 2. Lỗi 403: Không có quyền
- **Nguyên nhân:** Token không phải admin/staff
- **Giải pháp:** Đăng nhập với tài khoản admin/staff

### 3. PDF không hiển thị đúng
- **Nguyên nhân:** Dữ liệu booking không đầy đủ (thiếu booking_rooms, services, etc.)
- **Giải pháp:** Kiểm tra booking có đầy đủ relationships không

### 4. Số tiền tính sai
- **Nguyên nhân:** Logic tính toán sai hoặc dữ liệu payment không đúng
- **Giải pháp:** 
  - Kiểm tra `booking.total_price`
  - Kiểm tra `booking.payments` có đúng status 'completed' không
  - Kiểm tra refunds có amount < 0 không

## Checklist Hoàn Chỉnh

Trước khi release, đảm bảo:

- [ ] Hóa đơn hiển thị đầy đủ thông tin theo yêu cầu
- [ ] Định dạng số tiền đúng (Việt Nam)
- [ ] Tính toán Grand Total đúng (Subtotal - Discount)
- [ ] Tính toán Amount Due đúng
- [ ] Hiển thị đúng Paid Online và Refunds
- [ ] Logo và tên khách sạn đúng
- [ ] Tên nhân viên hiển thị từ token
- [ ] Ngày giờ xuất hóa đơn là thời gian thực
- [ ] Danh sách số phòng hiển thị đúng
- [ ] Dịch vụ prepaid có ghi chú "(Đã trả trước)"
- [ ] PDF có thể mở và in được
- [ ] File PDF có tên đúng format: `invoice-{booking_code}.pdf`

## Ghi Chú

- Hóa đơn chỉ tính các dịch vụ có `status != 'cancelled'`
- Payment chỉ tính các payment có `status = 'completed'`
- Nếu booking chưa có `check_in_time` hoặc `check_out_time`, sẽ dùng `check_in_date` + 14:00 và `check_out_date` + 12:00
- Hóa đơn không có VAT (thuế giá trị gia tăng)

