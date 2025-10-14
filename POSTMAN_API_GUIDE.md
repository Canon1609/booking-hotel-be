# Hướng dẫn Test API bằng Postman

## Cấu hình cơ bản

**Base URL:** `http://localhost:5000/api`

> Lưu ý chuẩn hóa response: Tất cả API trả về JSON sẽ luôn bao gồm trường `statusCode` phản ánh HTTP status thực tế. Vui lòng dựa vào `statusCode` để xử lý phía FE.

## 1. Authentication APIs (Trước khi test các API khác)

### Đăng ký tài khoản
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "full_name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "123456",
  "phone": "0123456789",
  "date_of_birth": "1990-05-15"
}
```

### Đăng nhập
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

### Đăng nhập bằng Google
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/auth/google`
- **Mô tả:** Redirect đến Google OAuth, sau đó redirect về frontend với token
res
23

test
GET http://localhost:5000/api/users/profile
Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
**Lưu token từ response để sử dụng cho các API khác!**

---

## 2. User APIs (Cần Authentication)

### 2.1. Lấy thông tin profile
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/users/profile`
- **Headers:** 
  - `Authorization: Bearer YOUR_TOKEN_HERE`
  - `Content-Type: application/json`

### 2.2. Cập nhật thông tin profile
- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/users/profile`
- **Headers:** 
  - `Authorization: Bearer YOUR_TOKEN_HERE`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "full_name": "Nguyễn Văn B",
  "phone": "0987654321",
  "date_of_birth": "1992-08-20"
}
```

### 2.3. Đổi mật khẩu
- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/users/change-password`
- **Headers:** 
  - `Authorization: Bearer YOUR_TOKEN_HERE`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "currentPassword": "123456",
  "newPassword": "newpassword123"
}
```

### 2.4. Xóa tài khoản
- **Method:** `DELETE`
- **URL:** `http://localhost:5000/api/users/profile`
- **Headers:** 
  - `Authorization: Bearer YOUR_TOKEN_HERE`
  - `Content-Type: application/json`

---

## 3. Admin APIs (Cần Authentication + Admin Role)

### 3.1. Lấy danh sách tất cả người dùng
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/users`
- **Headers:** 
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- **Query Parameters (Optional):**
  - `page=1` (trang hiện tại)
  - `limit=10` (số user mỗi trang)
  - `search=keyword` (tìm kiếm theo tên hoặc email)

**Ví dụ:** `http://localhost:5000/api/users?page=1&limit=5&search=nguyen`

### 3.2. Lấy người dùng theo ID
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/users/1`
- **Headers:** 
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`

### 3.3. Tạo người dùng mới
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/users`
- **Headers:** 
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "full_name": "Trần Thị C",
  "email": "admin@example.com",
  "password": "admin123",
  "phone": "0369852147",
  "date_of_birth": "1985-12-10",
  "role": "admin"
}
```

### 3.4. Cập nhật người dùng (Admin toàn quyền)
- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/users/1`
- **Headers:** 
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "full_name": "Nguyễn Văn D",
  "email": "newemail@example.com",
  "phone": "0123456789",
  "date_of_birth": "1990-05-15",
  "role": "customer",
  "is_verified": true
}
```

### 3.5. Xóa người dùng
- **Method:** `DELETE`
- **URL:** `http://localhost:5000/api/users/1`
- **Headers:** 
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`

### 3.6. Tìm kiếm người dùng theo email
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/users/search/email?email=example`
- **Headers:** 
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`

---

## 4. Hotel APIs

### Env cần thiết (AWS)
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 4.1. Danh sách khách sạn (Public)
- Method: `GET`
- URL: `http://localhost:5000/api/hotels`
- Query (optional): `page`, `limit`, `search`

### 4.2. Chi tiết khách sạn (Public)
- Method: `GET`
- URL: `http://localhost:5000/api/hotels/:id`

### 4.3. Tạo khách sạn (Admin Only)
- Method: `POST`
- URL: `http://localhost:5000/api/hotels`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
- Body: `form-data`
  - Key `name` (text)
  - Key `address` (text)
  - Key `description` (text, optional)
  - Key `phone` (text, optional)
  - Key `email` (text, optional)
  - Key `images` (file, chọn được nhiều file)

### 4.4. Cập nhật khách sạn (Admin Only)
- Method: `PUT`
- URL: `http://localhost:5000/api/hotels/:id`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
- Body: `form-data` (các field như 4.3; gửi `images` để thay TOÀN BỘ ảnh)

### 4.5. Xóa khách sạn (Admin Only)
- Method: `DELETE`
- URL: `http://localhost:5000/api/hotels/:id`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
### 4.6. Loại phòng (Room Types) — CÓ nhiều ảnh

- Danh sách loại phòng (Public)
  - GET `http://localhost:5000/api/room-types?search=`

- Chi tiết loại phòng (Public)
  - GET `http://localhost:5000/api/room-types/:id`

- Tạo loại phòng (Admin Only)
  - POST `http://localhost:5000/api/room-types`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body: `multipart/form-data`
    - Text fields: `room_type_name`, `description?`, `amenities?` (JSON string), `area?`, `quantity?`
    - File fields: `images` (nhiều file)

- Cập nhật loại phòng (Admin Only)
  - PUT `http://localhost:5000/api/room-types/:id`
  - Body: `multipart/form-data` (gửi `images` để thay TOÀN BỘ ảnh)

- Xóa loại phòng (Admin Only)
  - DELETE `http://localhost:5000/api/room-types/:id`

### 4.7. Phòng (Rooms) 

- Danh sách phòng (Public)
  - GET `http://localhost:5000/api/rooms?hotel_id=1&page=1&limit=10`

- Chi tiết phòng (Public)
  - GET `http://localhost:5000/api/rooms/1`

- Tạo phòng (Admin Only)
  - POST `http://localhost:5000/api/rooms`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body (JSON hoặc form-data text):
    - `hotel_id`, `room_num`, `status` (`available|booked|cleaning`), `room_type_id`

- Cập nhật phòng (Admin Only)
  - PUT `http://localhost:5000/api/rooms/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body (JSON hoặc form-data text): các field cần cập nhật

- Xóa phòng (Admin Only)
  - DELETE `http://localhost:5000/api/rooms/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`



### 4.8. Giá phòng (Room Prices)

- Danh sách giá (Public)
  - GET `http://localhost:5000/api/room-prices?room_type_id=1`

- Tạo giá (Admin Only)
  - POST `http://localhost:5000/api/room-prices`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body (JSON):
```json
{
  "room_type_id": 1,
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "price_per_night": 1200000
}
```

- Cập nhật giá (Admin Only)
  - PUT `http://localhost:5000/api/room-prices/:id`

- Xóa giá (Admin Only)
  - DELETE `http://localhost:5000/api/room-prices/:id`

### 4.9. Dịch vụ (Services) — NHIỀU ẢNH

 - Danh sách dịch vụ (Public)
   - GET `http://localhost:5000/api/services`
   - Có thể lọc tùy chọn: `?hotel_id=1&page=1&limit=10&search=massage`

- Chi tiết dịch vụ (Public)
  - GET `http://localhost:5000/api/services/:id`

- Tạo dịch vụ (Admin Only)
  - POST `http://localhost:5000/api/services`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body: `multipart/form-data`
    - Text fields: `hotel_id` (bắt buộc), `name` (bắt buộc), `description?`
    - File fields: `images` (nhiều file)

- Cập nhật dịch vụ (Admin Only)
  - PUT `http://localhost:5000/api/services/:id`
  - Body: `multipart/form-data` (gửi `images` để thay TOÀN BỘ ảnh)

- Xóa dịch vụ (Admin Only)
  - DELETE `http://localhost:5000/api/services/:id`

### 4.10. Khuyến mãi (Promotions) — VOUCHER & GIẢM GIÁ

- Danh sách khuyến mãi (Public)
  - GET `http://localhost:5000/api/promotions`
  - Có thể lọc: `?status=active&search=SUMMER&page=1&limit=10`

- Chi tiết khuyến mãi (Public)
  - GET `http://localhost:5000/api/promotions/:id`

- Kiểm tra mã khuyến mãi (Public)
  - POST `http://localhost:5000/api/promotions/validate`
  - Body (JSON): `{ "promotion_code": "SUMMER2024" }`

- Áp dụng mã khuyến mãi (Public) - dùng khi checkout
  - POST `http://localhost:5000/api/promotions/apply`
  - Body (JSON): `{ "promotion_code": "SUMMER2024", "total_amount": 1000000 }`

- Tạo khuyến mãi (Admin Only)
  - POST `http://localhost:5000/api/promotions`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body (JSON): xem ví dụ bên dưới

- Cập nhật khuyến mãi (Admin Only)
  - PUT `http://localhost:5000/api/promotions/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`

- Xóa khuyến mãi (Admin Only)
  - DELETE `http://localhost:5000/api/promotions/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`

- Cập nhật promotions hết hạn (Admin Only)
  - POST `http://localhost:5000/api/promotions/update-expired`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`

---

## 9. Trật tự tạo dữ liệu khi test (gợi ý)
Tạo Loại phòng (Room Type) — BẮT BUỘC trước khi tạo Phòng
 Tạo Phòng (Room): chọn `hotel_id` và `room_type_id` (KHÔNG gửi ảnh)
 Tạo Giá phòng (Room Price): theo `room_type_id` Sau đó mới test Booking/Payment/Review nếu cần

---

## 10. Payload mẫu (JSON) cho các API

### 10.1. Tạo Phòng (Room) - dùng JSON
- Method: `POST`
- URL: `http://localhost:5000/api/rooms`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "hotel_id": 1,
  "room_num": 101,
  "status": "available",
  "room_type_id": 1
}
```

### 10.2. Cập nhật Phòng (Room) - dùng JSON
- Method: `PUT`
- URL: `http://localhost:5000/api/rooms/1`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- Body (JSON) (gửi các field cần đổi):
```json
{
  "status": "cleaning",
  "room_num": 102
}
```

### 10.3. Tạo Giá phòng (Room Price) - dùng JSON
- Method: `POST`
- URL: `http://localhost:5000/api/room-prices`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "room_type_id": 1,
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "price_per_night": 1200000
}
```

### 10.4. Tạo Loại phòng (Room Type) - multipart (vì có nhiều ảnh)
- Method: `POST`
- URL: `http://localhost:5000/api/room-types`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body: `multipart/form-data`
    - Text: `room_type_name`, `description?`, `amenities?` (JSON string), `area?`, `quantity?`
    - Files: `images` (nhiều file)

### 10.5. Tạo Khách sạn (Hotel) - multipart (có nhiều ảnh)
- Method: `POST`
- URL: `http://localhost:5000/api/hotels`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
- Body: `multipart/form-data`
  - Text: `name`, `address`, `description?`, `phone?`, `email?`
  - Files: `images` (nhiều file)

### 10.6. Tạo Dịch vụ (Service) - multipart (nhiều ảnh)
- Method: `POST`
- URL: `http://localhost:5000/api/services`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
- Body: `multipart/form-data`
  - Text: `hotel_id`, `name`, `description?`
  - Files: `images` (nhiều file)

### 10.7. Tạo Khuyến mãi (Promotion) - JSON
- Method: `POST`
- URL: `http://localhost:5000/api/promotions`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- Body (JSON) - Voucher có hạn:
```json
{
  "promotion_code": "SUMMER2024",
  "discount_type": "percentage",
  "amount": 20,
  "start_date": "2024-06-01 00:00:00",
  "end_date": "2024-08-31 23:59:59",
  "quantity": 100
}
```

- Body (JSON) - Voucher vĩnh viễn:
```json
{
  "promotion_code": "WELCOME10",
  "discount_type": "fixed",
  "amount": 100000,
  "start_date": "2024-01-01 00:00:00",
  "end_date": null,
  "quantity": 0
}
```

### 10.8. Kiểm tra mã khuyến mãi (Promotion Validate)
- Method: `POST`
- URL: `http://localhost:5000/api/promotions/validate`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "promotion_code": "SUMMER2024"
}
```

### 10.9. Áp dụng mã khuyến mãi (Promotion Apply) - dùng khi checkout
- Method: `POST`
- URL: `http://localhost:5000/api/promotions/apply`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "promotion_code": "SUMMER2024",
  "total_amount": 2000000
}
```

---

## 5. Cách tạo Admin User để test

### Bước 1: Tạo user thường
Đăng ký một user bình thường qua API register

### Bước 2: Cập nhật role thành admin (qua database)
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Bước 3: Đăng nhập với user admin
Sử dụng API login để lấy token admin

---

## 6. Response Examples

### Thành công (200/201):
```json
{
  "message": "Lấy thông tin profile thành công",
  "user": {
    "user_id": 1,
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0123456789",
    "date_of_birth": "1990-05-15",
    "role": "customer",
    "is_verified": false,
    "created_at": "2025-01-04 21:23:31",
    "updated_at": "2025-01-04 21:23:31"
  },
  "statusCode": 200
}
```

### Lỗi (400/401/403/404):
```json
{
  "message": "Email đã được sử dụng",
  "statusCode": 400
}
```

Ví dụ 404 (route không tồn tại):
```json
{
  "message": "Endpoint không tồn tại",
  "statusCode": 404
}
```

---

## 7. Lưu ý quan trọng

1. **Token Authentication:** Tất cả API (trừ register/login/google) đều cần token trong header `Authorization: Bearer TOKEN`

2. **Admin Role:** Các API admin cần user có role = 'admin'

3. **Date Format:** Sử dụng định dạng `YYYY-MM-DD` cho date_of_birth

4. **Password:** Mật khẩu sẽ được hash tự động, không lưu plain text

5. **Google OAuth:** 
   - Cần cấu hình `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` trong .env
   - User đăng nhập Google sẽ tự động verified và không cần password
   - Nếu email đã tồn tại, sẽ link Google ID với tài khoản hiện tại

6. **Timezone:** Tất cả thời gian đều theo múi giờ Hà Nội (UTC+7)

7. **Validation:** 
   - Email phải unique
   - Password tối thiểu 6 ký tự (trừ Google users)
   - Phone có thể null
   - date_of_birth có thể null

---

## 8. Test Cases gợi ý

### Test User APIs:
1. Đăng ký → Đăng nhập → Lấy profile
2. Cập nhật profile → Kiểm tra thay đổi
3. Đổi mật khẩu → Đăng nhập với mật khẩu mới
4. Xóa tài khoản → Thử đăng nhập lại (sẽ lỗi)
5. **Test Google OAuth:** Truy cập `/api/auth/google` → Đăng nhập Google → Kiểm tra token redirect

### Test Admin APIs:
1. Tạo admin user → Đăng nhập admin
2. Tạo user mới → Lấy danh sách users
3. Tìm kiếm user theo email
4. Cập nhật user → Xóa user
5. Test phân quyền (user thường không thể truy cập admin APIs)

### Test Hotel APIs:
1. GET danh sách/chi tiết (public)
2. POST tạo khách sạn kèm ảnh (admin)
3. PUT cập nhật có thay ảnh (admin) → ảnh cũ bị xóa khỏi S3
4. DELETE khách sạn (admin) → ảnh bị xóa khỏi S3

### Test Promotion APIs:
1. **Tạo voucher có hạn:** POST với `end_date` → Kiểm tra status = 'active'
2. **Tạo voucher vĩnh viễn:** POST với `end_date: null` → Kiểm tra status = 'active'
3. **Kiểm tra mã hợp lệ:** POST validate với tổng tiền → Tính toán giảm giá
4. **Test hết hạn:** Tạo voucher với `end_date` quá khứ → Chờ cron job hoặc gọi update-expired
5. **Test phần trăm:** `discount_type: "percentage"`, `amount: 20` → Giảm 20%
6. **Test số tiền cố định:** `discount_type: "fixed"`, `amount: 100000` → Giảm 100k

