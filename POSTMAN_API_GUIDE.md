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
  - GET `http://localhost:5000/api/room-types?search=&category=don-vip`
  - Query (optional):
    - `search`: tìm theo tên loại phòng
    - `category`: lọc theo danh mục loại phòng (ví dụ: `don-vip`, `don-thuong`)

- Chi tiết loại phòng (Public)
  - GET `http://localhost:5000/api/room-types/:id`

- Tạo loại phòng (Admin Only)
  - POST `http://localhost:5000/api/room-types`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body: `multipart/form-data`
    - Text fields: `room_type_name`, `category?`, `capacity?`, `description?`, `amenities?` (JSON string), `area?`, `quantity?`
    - File fields: `images` (nhiều file)

- Cập nhật loại phòng (Admin Only)
  - PUT `http://localhost:5000/api/room-types/:id`
  - Body: `multipart/form-data` (gửi `images` để thay TOÀN BỘ ảnh)
    - Text fields có thể cập nhật: `room_type_name?`, `category?`, `capacity?`, `description?`, `amenities?` (JSON string), `area?`, `quantity?`

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
  - **Lưu ý:** Số phòng tạo không được vượt quá `quantity` của loại phòng
  - **Response:**
    ```json
    {
      "message": "Tạo phòng thành công",
      "room": { ... },
      "room_type_info": {
        "room_type_name": "Deluxe",
        "max_quantity": 2,
        "current_quantity": 1,
        "remaining_slots": 1
      }
    }
    ```

- Cập nhật phòng (Admin Only)
  - PUT `http://localhost:5000/api/rooms/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body (JSON hoặc form-data text): các field cần cập nhật
  - **Lưu ý:** Khi thay đổi `room_type_id`, hệ thống sẽ kiểm tra quantity của loại phòng mới

- Xóa phòng (Admin Only)
  - DELETE `http://localhost:5000/api/rooms/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`


#### 4.7.1. Tìm kiếm phòng trống + sắp xếp theo giá (Public)

- Method: `GET`
- URL: `http://localhost:5000/api/rooms/availability/search`
- Query params:
  - `check_in` (bắt buộc) — ví dụ: `2025-10-25`
  - `check_out` (bắt buộc) — ví dụ: `2025-10-27`
  - `guests` (tùy chọn) — số khách, dùng để lọc theo `capacity` của `room_type`
  - `hotel_id` (tùy chọn) — lọc theo khách sạn
  - `room_type_id` (tùy chọn) — lọc theo loại phòng
  - `min_price` (tùy chọn) — giá tối thiểu mỗi đêm
  - `max_price` (tùy chọn) — giá tối đa mỗi đêm
  - `sort` (tùy chọn) — `price_asc` hoặc `price_desc` (mặc định: `price_asc`)
  - `page` (tùy chọn) — mặc định `1`
  - `limit` (tùy chọn) — mặc định `10`

- Ví dụ cơ bản (lọc + giá tăng dần):
  - `GET http://localhost:5000/api/rooms/availability/search?check_in=2025-10-25&check_out=2025-10-27&guests=2&hotel_id=1&sort=price_asc`

- Ví dụ nâng cao (khoảng giá + giá giảm dần):
  - `GET http://localhost:5000/api/rooms/availability/search?check_in=2025-10-25&check_out=2025-10-27&min_price=500000&max_price=2000000&sort=price_desc&page=1&limit=12`

- Response mẫu:
```json
{
  "total": 2,
  "rooms": [
    {
      "room_id": 101,
      "hotel": {
        "hotel_id": 1,
        "name": "Khách sạn ABC",
        "address": "123 Đường ABC, Quận 1, TP.HCM",
        "phone": "+84-28-1234-5678",
        "email": "contact@abc-hotel.vn",
        "images": ["hotel-1.jpg"]
      },
      "room_type": {
        "room_type_id": 1,
        "room_type_name": "Deluxe",
        "capacity": 2,
        "images": ["deluxe-1.jpg"],
        "amenities": {"wifi": "miễn phí", "điều_hoà": true},
        "area": 30,
        "prices": [
          {
            "price_id": 10,
            "start_date": "2025-11-01T00:00:00.000Z",
            "end_date": "2025-12-31T00:00:00.000Z",
            "price_per_night": 1200000
          }
        ]
      }
    }
  ],
  "summary_by_room_type": [
    {
      "room_type_id": 1,
      "room_type_name": "Deluxe",
      "capacity": 2,
      "amenities": {"wifi": "miễn phí", "điều_hoà": true},
      "area": 30,
      "total_rooms": 5,
      "booked_rooms": 3,
      "available_rooms": 2,
      "sold_out": false,
      "availability_text": "Còn 2 phòng"
    },
    {
      "room_type_id": 2,
      "room_type_name": "Suite",
      "capacity": 3,
      "amenities": {"wifi": "miễn phí"},
      "area": 45,
      "total_rooms": 4,
      "booked_rooms": 4,
      "available_rooms": 0,
      "sold_out": true,
      "availability_text": "Hết phòng"
    }
  ]
}
```

Ghi chú:
- Hệ thống tự loại trừ các phòng đã có booking trùng lịch với trạng thái `confirmed`/`completed`.
- Giá dùng để sắp xếp và lọc lấy theo `RoomPrice` bao trùm ngày `check_in`.
- Nếu một loại phòng có nhiều `RoomPrice` bao trùm, record phù hợp nhất theo ngày `check_in` sẽ được chọn.



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
  - **Lưu ý:** Hệ thống sẽ tự động kiểm tra trùng lặp khoảng thời gian. Nếu có overlap sẽ trả về lỗi validation.
  // Tạo giá 1: 01/11-10/11
POST /api/room-prices
{"room_type_id": 1, "start_date": "2025-11-01", "end_date": "2025-11-10", "price_per_night": 1000000}

// Tạo giá 2: 05/11-15/11 (sẽ bị lỗi)
POST /api/room-prices  
{"room_type_id": 1, "start_date": "2025-11-05", "end_date": "2025-11-15", "price_per_night": 1500000}
// Response: "Khoảng thời gian giá bị trùng lặp với bản ghi ID 1 (2025-11-01 - 2025-11-10)"

- Cập nhật giá (Admin Only)
  - PUT `http://localhost:5000/api/room-prices/:id`
  - **Lưu ý:** Cũng kiểm tra trùng lặp khi cập nhật.

- Xóa giá (Admin Only)
  - DELETE `http://localhost:5000/api/room-prices/:id`

**Validation Rules:**
- Không được có 2 khoảng giá trùng lặp cho cùng 1 loại phòng
- Ví dụ: Nếu đã có giá từ 01/11-10/11, không thể tạo giá từ 05/11-15/11
- Lỗi sẽ trả về: `"Khoảng thời gian giá bị trùng lặp với bản ghi ID X (start_date - end_date)"`

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
    - Text fields: `hotel_id` (bắt buộc), `name` (bắt buộc), `description?`, `price` (bắt buộc), `service_type?` (prepaid/postpaid), `is_available?` (true/false)
    - File fields: `images` (nhiều file)

- Cập nhật dịch vụ (Admin Only)
  - PUT `http://localhost:5000/api/services/:id`
  - Body: `multipart/form-data` (gửi `images` để thay TOÀN BỘ ảnh)
    - Text fields có thể cập nhật: `name?`, `description?`, `price?`, `service_type?`, `is_available?`

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

### 4.11. Danh mục (Categories) — QUẢN LÝ DANH MỤC

- Danh sách danh mục (Public)
  - GET `http://localhost:5000/api/categories`
  - Có thể lọc: `?search=tin-tuc&page=1&limit=10`

- Chi tiết danh mục (Public)
  - GET `http://localhost:5000/api/categories/:id`
  - GET `http://localhost:5000/api/categories/slug/:slug`

- Tạo danh mục (Admin Only)
  - POST `http://localhost:5000/api/categories`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`
  - Body (JSON): `{ "name": "Tin tức", "slug": "tin-tuc" }`

- Cập nhật danh mục (Admin Only)
  - PUT `http://localhost:5000/api/categories/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`

- Xóa danh mục (Admin Only)
  - DELETE `http://localhost:5000/api/categories/:id`
  - Headers: `Authorization: Bearer ADMIN_TOKEN_HERE`

### 4.12. Bài viết (Posts) — BLOG & TIN TỨC

- Danh sách bài viết (Public)
  - GET `http://localhost:5000/api/posts`
  - Có thể lọc: `?status=published&category_id=1&search=khach-san&tag=du-lich&page=1&limit=10`

- Chi tiết bài viết (Public)
  - GET `http://localhost:5000/api/posts/:id`
  - GET `http://localhost:5000/api/posts/slug/:slug`

- Tạo bài viết (Cần đăng nhập)
  - POST `http://localhost:5000/api/posts`
  - Headers: `Authorization: Bearer TOKEN_HERE`
  - Body: `multipart/form-data` (xem ví dụ bên dưới)
  - **Lưu ý:** `user_id` sẽ tự động lấy từ token, không cần gửi trong body

- Cập nhật bài viết (Cần đăng nhập)
  - PUT `http://localhost:5000/api/posts/:id`
  - Headers: `Authorization: Bearer TOKEN_HERE`
  - Body: `multipart/form-data`
  - **Lưu ý:** Chỉ admin hoặc tác giả bài viết mới được sửa

- Xóa bài viết (Cần đăng nhập)
  - DELETE `http://localhost:5000/api/posts/:id`
  - Headers: `Authorization: Bearer TOKEN_HERE`
  - **Lưu ý:** Chỉ admin hoặc tác giả bài viết mới được xóa

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
    - Text: `room_type_name`, `description?`, `amenities?` (JSON string), `area?`, `quantity?`, `categoy`
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
  - Text: `hotel_id`, `name`, `description?`, `price` (bắt buộc), `service_type?` (prepaid/postpaid), `is_available?` (true/false)
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
  "name": "Khuyến mãi mùa hè 2024",
  "description": "Giảm giá 20% cho tất cả đặt phòng trong mùa hè",
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
  "name": "Chào mừng khách mới",
  "description": "Giảm 100,000 VNĐ cho khách hàng mới",
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

### 10.10. Tạo Danh mục (Category) - JSON
- Method: `POST`
- URL: `http://localhost:5000/api/categories`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "name": "Tin tức",
  "slug": "tin-tuc"
}
```

### 10.11. Cập nhật Danh mục (Category) - JSON
- Method: `PUT`
- URL: `http://localhost:5000/api/categories/:id`
- Headers:
  - `Authorization: Bearer ADMIN_TOKEN_HERE`
  - `Content-Type: application/json`
- Body (JSON) - Đổi tên:
```json
{
  "name": "Tin tức mới"
}
```
- Body (JSON) - Đổi slug:
```json
{
  "slug": "tin-tuc-moi"
}
```
- Body (JSON) - Đổi cả tên và slug:
```json
{
  "name": "Tin tức cập nhật",
  "slug": "tin-tuc-cap-nhat"
}
```

### 10.12. Tạo Bài viết (Post) - multipart (có ảnh)
- Method: `POST`
- URL: `http://localhost:5000/api/posts`
- Headers:
  - `Authorization: Bearer TOKEN_HERE`
- Body: `multipart/form-data`

**Form-data fields:**
- `category_id`: `1` (số)
- `title`: `Bài viết về khách sạn Vũng Tàu`
- `slug`: `bai-viet-ve-khach-san-vung-tau`
- `content`: `<p>Nội dung bài viết...</p>`
- `status`: `draft` hoặc `published`
- `tags`: `du-lich, khach-san, vung-tau` (comma-separated)
- `cover_image`: [File] (1 ảnh đại diện)
- `images`: [File] (nhiều ảnh bổ sung)

**Ví dụ tags trong form-data:**
- **Comma-separated:** `du-lich, khach-san, vung-tau`
- **JSON string:** `["du-lich", "khach-san", "vung-tau"]`
- **Không có tags:** Để trống hoặc không gửi field

**Lưu ý:** `user_id` tự động lấy từ token, không cần gửi

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

### Test Category APIs:
1. **Tạo danh mục:** 
   - POST `{"name": "Tin tức", "slug": "tin-tuc"}` → Kiểm tra unique slug
   - POST `{"name": "Khuyến mãi", "slug": "khuyen-mai"}` → Tạo thêm danh mục

2. **Lấy danh sách:** 
   - GET `/api/categories` → Lấy tất cả
   - GET `/api/categories?search=tin` → Tìm theo tên hoặc slug

3. **Lấy chi tiết:**
   - GET `/api/categories/1` → Lấy theo ID
   - GET `/api/categories/slug/tin-tuc` → SEO-friendly URL

4. **Cập nhật danh mục:**
   - PUT `/api/categories/1` với `{"name": "Tin tức mới"}` → Đổi tên
   - PUT `/api/categories/1` với `{"slug": "tin-tuc-moi"}` → Đổi slug
   - PUT `/api/categories/1` với `{"name": "Tin tức cập nhật", "slug": "tin-tuc-cap-nhat"}` → Đổi cả tên và slug
   - PUT `/api/categories/1` với `{"slug": "tin-tuc"}` → Test slug trùng lặp (sẽ lỗi)

5. **Xóa danh mục:**
   - DELETE `/api/categories/2` → Xóa danh mục thứ 2

### Test Post APIs:
1. **Tạo bài viết draft:** 
   - POST với `status: "draft"` → Chưa có `published_at`
   - Tags: `du-lich, khach-san, vung-tau`

2. **Publish bài viết:** 
   - PUT với `status: "published"` → Tự động set `published_at`

3. **Upload ảnh:** 
   - Cover image + nhiều ảnh bổ sung → Lưu vào S3

4. **Test tags:**
   - **Comma-separated:** `du-lich, khach-san, vung-tau`
   - **JSON string:** `["du-lich", "khach-san", "vung-tau"]`
   - **Không tags:** Để trống field tags

5. **Lọc theo tag:** 
   - GET với `?tag=du-lich` → Tìm bài viết có tag

6. **Lọc theo danh mục:** 
   - GET với `?category_id=1` → Bài viết trong danh mục

7. **SEO-friendly:** 
   - GET `/slug/bai-viet-ve-khach-san` → URL thân thiện

8. **Test quyền sở hữu:**
   - User A tạo bài → User B không thể sửa/xóa
   - Admin có thể sửa/xóa tất cả bài viết

---

## 9. BOOKING APIs

### Tổng quan
Hệ thống đặt phòng hỗ trợ 2 luồng chính:
- **Luồng 1: Đặt phòng trực tuyến** - Thanh toán trước qua PayOS
- **Luồng 2: Đặt phòng trực tiếp** - Thanh toán khi check-out

### 9.0. CHUẨN BỊ DỮ LIỆU MẪU (BẮT BUỘC)

Trước khi test đặt phòng, cần tạo dữ liệu mẫu theo thứ tự:

#### 9.0.1. Tạo Hotel
- **POST** `http://localhost:5000/api/hotels`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "name": "Khách sạn ABC",
    "address": "123 Đường ABC, Quận 1, TP.HCM",
    "phone": "1900-xxxx",
    "email": "info@hotelabc.com",
    "description": "Khách sạn 5 sao tại trung tâm TP.HCM",
    "images": ["hotel1.jpg", "hotel2.jpg"]
  }
  ```

#### 9.0.2. Tạo Room Type
- **POST** `http://localhost:5000/api/room-types`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "room_type_name": "Deluxe",
    "category": "VIP",
    "capacity": 2,
    "description": "Phòng deluxe view biển",
    "amenities": ["Wifi", "TV", "Minibar"],
    "area": 35,
    "quantity": 10,
    "images": ["room1.jpg", "room2.jpg"]
  }
  ```

#### 9.0.3. Tạo Room
- **POST** `http://localhost:5000/api/rooms`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "hotel_id": 1,
    "room_type_id": 1,
    "room_num": 101,
    "status": "available"
  }
  ```

#### 9.0.4. Tạo Room Price
- **POST** `http://localhost:5000/api/room-prices`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "room_type_id": 1,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "price_per_night": 1200000
  }
  ```

#### 9.0.5. Tạo Services (Dịch vụ khách sạn)

**Lưu ý:** Đây là tạo dịch vụ của khách sạn, khác với booking_services (dịch vụ trong booking cụ thể)

- **POST** `http://localhost:5000/api/services`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Content-Type:** `multipart/form-data` (nếu có ảnh)
- **Body (form-data):**
  ```
  hotel_id: 1
  name: Đưa đón sân bay
  description: Dịch vụ đưa đón sân bay Tân Sơn Nhất
  price: 200000
  service_type: prepaid
  is_available: true
  images: [file upload] (optional)
  ```

**Hoặc JSON (không có ảnh):**
```json
{
  "hotel_id": 1,
  "name": "Đưa đón sân bay",
  "description": "Dịch vụ đưa đón sân bay Tân Sơn Nhất",
  "price": 200000,
  "service_type": "prepaid",
  "is_available": true
}
```

**Tạo thêm dịch vụ khác:**
```json
{
  "hotel_id": 1,
  "name": "Spa massage",
  "description": "Dịch vụ spa và massage thư giãn",
  "price": 500000,
  "service_type": "spa",
  "is_available": true
}
```

**Các loại service_type:**
- `prepaid`: Dịch vụ thanh toán trước (khi đặt phòng)
- `postpaid`: Dịch vụ thanh toán sau (khi check-out)

**Test tạo services:**
```bash
# Chạy script tạo services mẫu
node test-create-services.js
```

**Response mẫu:**
```json
{
  "message": "Tạo dịch vụ thành công",
  "service": {
    "service_id": 1,
    "hotel_id": 1,
    "name": "Đưa đón sân bay",
    "description": "Dịch vụ đưa đón sân bay Tân Sơn Nhất",
    "price": 200000,
    "service_type": "prepaid",
    "is_available": true,
    "images": []
  }
}
```

#### 9.0.6. Tạo User (Customer)
- **POST** `http://localhost:5000/api/auth/register`
- **Body:**
  ```json
  {
    "full_name": "Nguyễn Văn A",
    "email": "customer@example.com",
    "password": "password123",
    "phone": "0123456789",
    "role": "customer"
  }
  ```

#### 9.0.7. Tạo Admin User
- **POST** `http://localhost:5000/api/auth/register`
- **Body:**
  ```json
  {
    "full_name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "phone": "0987654321",
    "role": "admin"
  }
  ```

**Lưu ý:** Sau khi tạo xong, lưu lại các ID để test:
- `hotel_id`: 1
- `room_type_id`: 1  
- `room_id`: 1
- `service_id`: 1 (dịch vụ của khách sạn)
- `user_id`: 2 (customer)
- `admin_id`: 1 (admin)

### 9.0.8. Giải thích về Booking Services

**Khác biệt quan trọng:**
- **`services`**: Dịch vụ của khách sạn (ví dụ: "Đưa đón sân bay", "Spa", "Ăn sáng")
- **`booking_services`**: Dịch vụ cụ thể trong từng booking (ví dụ: "Đưa đón sân bay cho booking #1")

**Khi nào tạo `booking_services`:**
- Khi khách đặt phòng và chọn thêm dịch vụ
- Khi admin tạo booking walk-in và thêm dịch vụ
- Tự động tạo khi booking được xác nhận

**Cấu trúc `booking_services`:**
```json
{
  "booking_service_id": 1,
  "booking_id": 1,
  "service_id": 1,
  "quantity": 2,
  "unit_price": 200000,
  "total_price": 400000,
  "payment_type": "prepaid",
  "status": "active"
}
```

#### 9.0.9. Tạo Booking Service thủ công (nếu cần)

**Lưu ý:** Thông thường `booking_services` được tạo tự động khi:
- Tạo booking walk-in với services
- Xác nhận temp booking với services
- Thêm service vào temp booking

**Nếu cần tạo thủ công:**
```sql
INSERT INTO booking_services (
  booking_id, 
  service_id, 
  quantity, 
  unit_price, 
  total_price, 
  payment_type, 
  status
) VALUES (
  1,  -- booking_id
  1,  -- service_id (từ bảng services)
  2,  -- quantity
  200000,  -- unit_price
  400000,  -- total_price = quantity * unit_price
  'prepaid',  -- payment_type
  'active'    -- status
);
```

### 9.1. LUỒNG 1: ĐẶT PHÒNG TRỰC TUYẾN (ONLINE)

**Luồng hoạt động mới:**
1. **Khách đặt phòng:** Chọn loại phòng (room_type_id) và số lượng phòng (num_rooms) - không phải phòng cụ thể
2. **Thanh toán thành công:** Hệ thống tự động gán các phòng cụ thể từ loại phòng đã đặt (một booking có thể có nhiều phòng)
3. **Check-in:** Lễ tân sử dụng booking_code để xác nhận, hệ thống hiển thị tất cả phòng đã được gán
4. **Check-out:** Lễ tân sử dụng booking_code để hoàn tất quá trình

**Lưu ý quan trọng:**
- **Một booking có thể đặt nhiều phòng:** Thêm trường `num_rooms` vào request body
- **Một booking chỉ thanh toán một lần:** Tổng giá = giá 1 phòng × số đêm × num_rooms
- **Check-in bằng một booking code:** Khi check-in với booking code, hệ thống hiển thị tất cả phòng đã được gán

**📊 Bảng so sánh: Đặt 1 phòng vs Đặt nhiều phòng**

| Tính năng | Đặt 1 phòng | Đặt nhiều phòng (3 phòng) |
|-----------|-------------|----------------------------|
| **Request body** | `num_rooms: 1` (hoặc bỏ qua) | `num_rooms: 3` |
| **Giá phòng** | 500,000 VNĐ/đêm × 2 đêm = 1,000,000 VNĐ | 500,000 VNĐ/đêm × 2 đêm × 3 = 3,000,000 VNĐ |
| **Kiểm tra phòng trống** | Cần 1 phòng trống | Cần 3 phòng trống |
| **Booking code** | `AEWQAS` | `AEWQAS` (1 mã cho tất cả) |
| **Số phòng gán** | 1 phòng (ví dụ: 101) | 3 phòng (ví dụ: 101, 102, 103) |
| **Check-in** | Hiển thị 1 phòng | Hiển thị 3 phòng trong mảng `rooms` |
| **Thanh toán** | 1 lần: 1,000,000 VNĐ | 1 lần: 3,000,000 VNĐ |
| **Response check-in** | `{"room_num": 101}` | `{"rooms": [{"room_num": 101}, {"room_num": 102}, {"room_num": 103}]}` |

#### 9.1.1. Giữ chỗ tạm thời (Redis)
- **POST** `http://localhost:5000/api/bookings/temp-booking`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Body:**
  ```json
  {
    "room_type_id": 1,
    "check_in_date": "2024-01-15",
    "check_out_date": "2024-01-17",
    "num_person": 2,
    "num_rooms": 3
  }
  ```
- **Lưu ý:** 
  - `num_rooms`: Số lượng phòng muốn đặt (mặc định: 1)
  - **Redis TTL:** Booking tạm thời được lưu trong Redis với thời gian hết hạn **30 phút (1800 giây)**
  - **Kiểm tra phòng trống:** 
    - Hệ thống kiểm tra số phòng thực sự trống trong database (đã loại trừ các phòng đã được đặt vĩnh viễn)
    - Sau đó trừ đi số phòng đang được giữ tạm thời bởi các khách hàng khác trong Redis (chỉ tính các phòng thực sự còn trống)
    - Đảm bảo không block các phòng đã được đặt vĩnh viễn hoặc phòng của chính user hiện tại
  - **Giá:** Sẽ được tính = giá 1 phòng × số đêm × num_rooms
  - **Tự động giải phóng:** Nếu không thanh toán trong 30 phút, Redis tự động xóa temp booking và phòng sẽ được giải phóng
- **Response (đặt 1 phòng):**
  ```json
  {
    "message": "Giữ chỗ tạm thời thành công",
    "temp_booking_key": "temp_booking:2:1:2024-01-15:2024-01-17:20240115143022",
    "expires_in": 1800,
    "booking_data": {
      "user_id": 2,
      "room_type_id": 1,
      "check_in_date": "2024-01-15",
      "check_out_date": "2024-01-17",
      "num_person": 2,
      "num_rooms": 1,
      "room_price": 500000,
      "total_price": 1000000,
      "nights": 2,
      "room_type_name": "Deluxe",
      "available_rooms": 5
    },
    "statusCode": 200
  }
  ```
- **Response (đặt 3 phòng):**
  ```json
  {
    "message": "Giữ chỗ tạm thời thành công",
    "temp_booking_key": "temp_booking:2:1:2024-01-15:2024-01-17:20240115143022",
    "expires_in": 1800,
    "booking_data": {
      "user_id": 2,
      "room_type_id": 1,
      "check_in_date": "2024-01-15",
      "check_out_date": "2024-01-17",
      "num_person": 6,
      "num_rooms": 3,
      "room_price": 500000,
      "total_price": 3000000,
      "nights": 2,
      "room_type_name": "Deluxe",
      "available_rooms": 5
    },
    "statusCode": 200
  }
  ```
- **Lỗi khi không đủ phòng:**
  ```json
  {
    "message": "Không đủ phòng trống. Yêu cầu: 5 phòng, hiện có: 3 phòng trống trong khoảng thời gian này (2 phòng đang được giữ tạm thời bởi khách hàng khác)",
    "available_rooms": 3,
    "held_rooms": 2,
    "total_free_rooms": 5,
    "statusCode": 400
  }
  ```
  - `available_rooms`: Số phòng thực sự có thể đặt (đã trừ phòng đang được giữ)
  - `held_rooms`: Số phòng đang được giữ tạm thời bởi các khách hàng khác trong Redis
  - `total_free_rooms`: Tổng số phòng trống trong database (chưa trừ phòng đang được giữ)

#### 9.1.2. Thêm dịch vụ vào booking tạm thời
- **POST** `http://localhost:5000/api/bookings/temp-booking/add-service`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Body:**
  ```json
  {
    "temp_booking_key": "temp_booking:2:1:2024-01-15:2024-01-17:20240115143022",
    "service_id": 1,
    "quantity": 2,
    "payment_type": "prepaid"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Thêm dịch vụ thành công",
    "service": {
      "service_id": 1,
      "service_name": "Đưa đón sân bay",
      "quantity": 2,
      "unit_price": 200000,
      "total_price": 400000,
      "payment_type": "prepaid"
    },
    "updated_booking": {
      "total_price": 1400000,
      "prepaid_services_total": 400000
    },
    "statusCode": 200
  }
  ```

#### 9.1.3. Tạo link thanh toán PayOS
- **POST** `http://localhost:5000/api/bookings/create-payment-link`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Body:**
  ```json
  {
    "temp_booking_key": "temp_booking:2:1:2024-01-15:2024-01-17:20240115143022",
    "promotion_code": "SUMMER2024"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Tạo link thanh toán thành công",
    "payment_url": "https://pay.payos.vn/web/...",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "order_code": 1705312222001,
    "booking_code": "A1B2C3",
    "amount": 1260000,
    "expires_in": 1800,
    "statusCode": 200
  }
  ```

#### 9.1.4. Webhook xử lý kết quả thanh toán
- **POST** `http://localhost:5000/api/bookings/payment-webhook`
- **Headers:** `Content-Type: application/json`
- **Body:** (Tự động từ PayOS)
  ```json
  {
    "orderCode": 1705312222001,
    "status": "PAID",
    "buyerName": "Nguyễn Văn A",
    "buyerEmail": "nguyenvana@email.com"
  }
  ```
- **Lưu ý:** 
  - Khi thanh toán thành công, hệ thống sẽ tự động gán các phòng (số lượng = `num_rooms`)
  - **Logic xử lý:**
    - Temp booking hiện tại sẽ được bỏ qua khi tính số phòng đang được giữ (vì nó sắp được xóa)
    - Số phòng có sẵn = số phòng trống trong DB - số phòng đang được giữ bởi temp bookings khác + số phòng của temp booking hiện tại
    - Đảm bảo user có thể thanh toán thành công cho temp booking đã được tạo trước đó
  - Tất cả phòng sẽ được lưu vào bảng `booking_rooms`
  - Booking sẽ có một `booking_code` duy nhất để check-in tất cả phòng
  - Temp booking trong Redis sẽ bị xóa ngay sau khi tạo booking vĩnh viễn

#### 9.1.5. 📌 VÍ DỤ CHI TIẾT: ĐẶT NHIỀU PHÒNG

##### Ví dụ 1: Đặt 3 phòng đơn (Deluxe) cho gia đình

**Bước 1: Đăng nhập**
```bash
POST /api/auth/login
{
  "email": "customer@example.com",
  "password": "password123"
}
```
→ Lưu `token`

**Bước 2: Giữ chỗ tạm thời (3 phòng)**
```bash
POST /api/bookings/temp-booking
Headers: Authorization: Bearer {token}
{
  "room_type_id": 1,
  "check_in_date": "2024-12-25",
  "check_out_date": "2024-12-27",
  "num_person": 6,
  "num_rooms": 3
}
```
- **Giải thích:** 
  - Đặt 3 phòng Deluxe
  - 6 người (2 người/phòng)
  - 2 đêm (25/12 → 27/12)
  - Giá: 500,000 VNĐ/đêm/phòng × 2 đêm × 3 phòng = 3,000,000 VNĐ

**Response:**
```json
{
  "message": "Giữ chỗ tạm thời thành công",
  "temp_booking_key": "temp_booking:2:1:2024-12-25:2024-12-27:20241215143022",
  "expires_in": 1800,
  "booking_data": {
    "user_id": 2,
    "room_type_id": 1,
    "check_in_date": "2024-12-25",
    "check_out_date": "2024-12-27",
    "num_person": 6,
    "num_rooms": 3,
    "room_price": 500000,
    "total_price": 3000000,
    "nights": 2,
    "room_type_name": "Deluxe",
    "available_rooms": 10
  }
}
```

**Bước 3: Tạo link thanh toán**
```bash
POST /api/bookings/create-payment-link
Headers: Authorization: Bearer {token}
{
  "temp_booking_key": "temp_booking:2:1:2024-12-25:2024-12-27:20241215143022"
}
```

**Response:**
```json
{
  "message": "Tạo link thanh toán thành công",
  "payment_url": "https://pay.payos.vn/web/...",
  "booking_code": "AEWQAS",
  "amount": 3000000,
  "statusCode": 200
}
```
→ **Lưu booking_code: `AEWQAS`** (mã này dùng để check-in tất cả 3 phòng)

**Bước 4: Thanh toán (webhook)**
```bash
POST /api/bookings/payment-webhook
{
  "orderCode": 1705312222001,
  "status": "PAID"
}
```

**Sau thanh toán, hệ thống tự động:**
- Tạo 1 booking với `booking_code: "AEWQAS"`
- Gán 3 phòng cụ thể (ví dụ: phòng 101, 102, 103)
- Tạo 3 records trong `booking_rooms`

**Bước 5: Check-in tại khách sạn**
```bash
GET /api/bookings/code/AEWQAS
Headers: Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "message": "Tìm thấy đặt phòng",
  "booking": {
    "booking_code": "AEWQAS",
    "num_rooms": 3,
    "rooms": [
      {
        "room_id": 1,
        "room_num": 101,
        "status": "booked"
      },
      {
        "room_id": 2,
        "room_num": 102,
        "status": "booked"
      },
      {
        "room_id": 3,
        "room_num": 103,
        "status": "booked"
      }
    ]
  }
}
```

**Check-in:**
```bash
POST /api/bookings/AEWQAS/check-in
Headers: Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "message": "Check-in thành công",
  "booking_code": "AEWQAS",
  "guest_name": "Nguyễn Văn A",
  "rooms": [
    { "room_num": 101 },
    { "room_num": 102 },
    { "room_num": 103 }
  ],
  "num_rooms": 3,
  "check_in_time": "2024-12-25 14:30:00"
}
```

**👉 Kết quả:** Khách được đưa lên 3 phòng 101, 102, 103 với cùng 1 mã booking `AEWQAS`

---

##### Ví dụ 2: Đặt 2 phòng cho nhóm bạn

**Request:**
```json
{
  "room_type_id": 2,
  "check_in_date": "2024-12-20",
  "check_out_date": "2024-12-22",
  "num_person": 4,
  "num_rooms": 2
}
```

**Tính toán:**
- Giá: 800,000 VNĐ/đêm/phòng × 2 đêm × 2 phòng = 3,200,000 VNĐ
- Thanh toán 1 lần: 3,200,000 VNĐ
- Check-in với 1 mã booking code
- Nhận 2 phòng (ví dụ: 201, 202)

---

##### Ví dụ 3: Lỗi khi không đủ phòng

**Request:**
```json
{
  "room_type_id": 1,
  "check_in_date": "2024-12-25",
  "check_out_date": "2024-12-27",
  "num_rooms": 10
}
```

**Response (lỗi):**
```json
{
  "message": "Không đủ phòng trống. Yêu cầu: 10 phòng, hiện có: 5 phòng trống trong khoảng thời gian này",
  "statusCode": 400
}
```

**Giải thích:** 
- Khách muốn đặt 10 phòng
- Nhưng chỉ còn 5 phòng trống
- Hệ thống từ chối và báo lỗi

---

##### Tổng kết luồng đặt nhiều phòng:

1. **Đặt phòng:** Thêm `num_rooms` vào request → Hệ thống kiểm tra số phòng trống
2. **Thanh toán:** Thanh toán 1 lần cho tất cả phòng → Tổng giá = giá 1 phòng × số đêm × num_rooms
3. **Nhận mã booking:** Một `booking_code` duy nhất (ví dụ: `AEWQAS`)
4. **Check-in:** Lễ tân nhập `booking_code` → Hệ thống hiển thị tất cả phòng đã gán
5. **Gán phòng:** Tự động gán `num_rooms` phòng khi thanh toán thành công

### 9.2. LUỒNG 2: ĐẶT PHÒNG TRỰC TIẾP (WALK-IN)

#### 9.2.1. Tạo booking trực tiếp

**Lưu ý về đặt nhiều phòng:**
- Thêm trường `num_rooms` vào request body
- Hệ thống kiểm tra số lượng phòng trống có đủ không
- Giá được tính: giá 1 phòng × số đêm × num_rooms
- Phòng sẽ được gán khi check-in (có thể gán trước hoặc gán khi check-in)

**Ví dụ đặt 1 phòng:**
```json
{
  "user_id": 2,
  "room_type_id": 1,
  "check_in_date": "2024-01-15",
  "check_out_date": "2024-01-17",
  "num_person": 2,
  "num_rooms": 1,
  "note": "Khách VIP"
}
```

**Ví dụ đặt 3 phòng:**
```json
{
  "user_id": 2,
  "room_type_id": 1,
  "check_in_date": "2024-01-15",
  "check_out_date": "2024-01-17",
  "num_person": 6,
  "num_rooms": 3,
  "note": "Đoàn gia đình 6 người"
}
```
- Giá: 500,000 VNĐ/đêm × 2 đêm × 3 phòng = 3,000,000 VNĐ
- Một booking code duy nhất cho cả 3 phòng
- Check-in bằng booking code, hiển thị tất cả 3 phòng đã gán
<!-- - **POST** `http://localhost:5000/api/bookings/walk-in`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "user_id": 2,
    "room_type_id": 1,
    "check_in_date": "2024-01-15",
    "check_out_date": "2024-01-17",
    "num_person": 2,
    "note": "Khách VIP",
    "services": [
      {
        "service_id": 1,
        "quantity": 1,
        "payment_type": "postpaid"
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "message": "Tạo booking thành công",
    "booking": {
      "booking_id": 1,
      "booking_code": "9AF1MBNS",
      "room_type_name": "Deluxe",
      "check_in_date": "2024-01-15",
      "check_out_date": "2024-01-17",
      "total_price": 1000000,
      "booking_status": "confirmed",
      "payment_status": "paid",
      "available_rooms_remaining": 1
    },
    "statusCode": 201
  } -->
  ```

#### 9.2.2. Tạo user nhanh cho walk-in booking
- **POST** `http://localhost:5000/api/users/quick-create`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "full_name": "Nguyễn Văn A",
    "cccd": "012345678901"
  }
  ```
- **Response (User mới):**
  ```json
  {
    "message": "Tạo người dùng thành công",
    "user": {
      "user_id": 10,
      "full_name": "Nguyễn Văn A",
      "cccd": "012345678901",
      "role": "customer",
      "is_existing": false
    },
    "statusCode": 201
  }
  ```
- **Response (User đã tồn tại):**
  ```json
  {
    "message": "Tìm thấy người dùng đã tồn tại",
    "user": {
      "user_id": 5,
      "full_name": "Nguyễn Văn A",
      "cccd": "012345678901",
      "is_existing": true
    },
    "statusCode": 200
  }
  ```
- **Lưu ý:**
  - Chỉ cần **tên** và **CCCD** (bắt buộc)
  - Kiểm tra trùng CCCD, nếu đã có thì trả về user hiện tại
  - Email, phone, password để NULL (không tạo tạm thời)

#### 9.2.3. Tạo walk-in booking và check-in luôn

**Lưu ý:** API này dùng cho walk-in nhanh, gán trực tiếp phòng cụ thể (room_id), không dùng cho đặt nhiều phòng. Để đặt nhiều phòng, dùng API walk-in thông thường.

- **POST** `http://localhost:5000/api/bookings/walk-in-checkin`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "user_id": 10,
    "room_id": 5,
    "nights": 1,
    "num_person": 2,
    "note": "Khách VIP",
    "services": [
      {
        "service_id": 1,
        "quantity": 1,
        "payment_type": "postpaid"
      }
    ]
  }
  ```
- **Lưu ý:**
  - `check_in_date` = ngày hiện tại (tự động)
  - `check_out_date` = ngày hiện tại + số đêm (tự động)
  - `nights`: Số đêm ở (mặc định 1 đêm)
  - Không cần nhập ngày, hệ thống tự tính
- **Response:**
  ```json
  {
    "message": "Tạo walk-in booking và check-in thành công",
    "booking": {
      "booking_id": 5,
      "booking_code": "A1B2C3",
      "room_type": "Deluxe",
      "room_id": 5,
      "room_num": 101,
      "check_in_date": "2024-01-15",
      "check_out_date": "2024-01-17",
      "num_person": 2,
      "total_price": 2000000,
      "booking_status": "checked_in",
      "payment_status": "pending",
      "check_in_time": "2024-01-15 14:30:00"
    }
  }
  ```
- **Lưu ý quan trọng:**
  - Phòng phải ở trạng thái `available`
  - Booking sẽ tự động check-in và có `check_in_time`
  - Booking status: `checked_in` (khách đang ở khách sạn)
  - Payment status: `pending` (chưa thanh toán)
  - Phòng chuyển từ `available` → `in_use` ngay lập tức
  - Khi check-out: `payment_status` → `paid`

### 9.3. CÁC API CHUNG

#### 9.3.1. Lấy lịch sử đặt phòng của user hiện tại (User)
- **GET** `http://localhost:5000/api/bookings/my-bookings`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Query params:**
  - `page=1&limit=10` - Phân trang (mặc định: page=1, limit=10)
  - `status=confirmed` - Lọc theo trạng thái (pending/confirmed/cancelled/checked_in/checked_out)
- **Response:**
  ```json
  {
    "message": "Lấy lịch sử đặt phòng thành công",
    "bookings": [
      {
        "booking_id": 1,
        "booking_code": "A1B2C3",
        "room_type_name": "Deluxe",
        "rooms": [
          {
            "room_id": 1,
            "room_num": 101,
            "status": "booked",
            "assigned_at": "2024-01-14 10:30:00"
          }
        ],
        "num_rooms": 1,
        "room_num": 101,
        "check_in_date": "2024-01-15",
        "check_out_date": "2024-01-17",
        "num_person": 2,
        "total_price": 2400000,
        "final_price": 2400000,
        "booking_status": "confirmed",
        "payment_status": "paid",
        "booking_type": "online",
        "check_in_time": null,
        "check_out_time": null,
        "note": null,
        "created_at": "2024-01-10T10:30:00.000Z",
        "services": [
          {
            "service_name": "Đưa đón sân bay",
            "quantity": 2,
            "unit_price": 200000,
            "total_price": 400000,
            "payment_type": "prepaid"
          }
        ],
        "promotion": null
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "pageSize": 10
    },
    "statusCode": 200
  }
  ```

**Lưu ý:**
- Chỉ trả về các booking của user đang đăng nhập
- Có thể lọc theo trạng thái booking với query param `status`
- Mỗi booking bao gồm thông tin chi tiết về phòng, dịch vụ và promotion nếu có

#### 9.3.2. Lấy danh sách booking (Admin)
- **GET** `http://localhost:5000/api/bookings`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Query params:**
  - `page=1&limit=10` - Phân trang
  - `status=confirmed` - Lọc theo trạng thái
  - `type=online` - Lọc theo loại (online/walkin)
  - `user_id=2` - Lọc theo user
- **Response:**
  ```json
  {
    "bookings": [
      {
        "booking_id": 1,
        "booking_code": "A1B2C3",
        "check_in_date": "2024-01-15",
        "check_out_date": "2024-01-17",
        "booking_status": "confirmed",
        "payment_status": "paid",
        "booking_type": "online",
        "user": {
          "user_id": 2,
          "full_name": "Nguyễn Văn A",
          "email": "nguyenvana@email.com"
        },
        "rooms": [
          {
            "room_id": 1,
            "room_num": 101,
            "status": "booked",
            "assigned_at": "2024-01-14 10:30:00"
          }
        ],
        "num_rooms": 1
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    },
    "statusCode": 200
  }
  ```

#### 9.3.3. Lấy booking theo ID
- **GET** `http://localhost:5000/api/bookings/1`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Response:**
  ```json
  {
    "booking": {
      "booking_id": 1,
      "booking_code": "A1B2C3",
      "check_in_date": "2024-01-15",
      "check_out_date": "2024-01-17",
      "booking_status": "confirmed",
      "payment_status": "paid",
      "user": {
        "user_id": 2,
        "full_name": "Nguyễn Văn A",
        "email": "nguyenvana@email.com"
      },
      "rooms": [
        {
          "room_id": 1,
          "room_num": 101,
          "status": "booked",
          "room_type": {
            "room_type_id": 1,
            "room_type_name": "Deluxe",
            "capacity": 2
          },
          "assigned_at": "2024-01-14 10:30:00"
        }
      ],
      "num_rooms": 1,
      "booking_services": [
        {
          "booking_service_id": 1,
          "service_id": 1,
          "quantity": 2,
          "unit_price": 200000,
          "total_price": 400000,
          "payment_type": "prepaid",
          "status": "active",
          "service": {
            "service_name": "Đưa đón sân bay"
          }
        }
      ]
    },
    "statusCode": 200
  }
  ```

#### 9.3.4. Tìm booking theo mã đặt phòng (cho check-in)
- **GET** `http://localhost:5000/api/bookings/code/A1B2C3`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Response:**
  ```json
  {
    "message": "Tìm thấy đặt phòng",
    "booking": {
      "booking_id": 1,
      "booking_code": "A1B2C3",
      "check_in_date": "2024-01-15",
      "check_out_date": "2024-01-17",
      "num_person": 2,
      "booking_status": "confirmed",
      "payment_status": "paid",
      "total_price": 3000000,
      "final_price": 3000000,
      "room_type": {
        "room_type_id": 1,
        "room_type_name": "Deluxe",
        "capacity": 2
      },
      "rooms": [
        {
          "room_id": 1,
          "room_num": 101,
          "status": "booked",
          "room_type": {
            "room_type_id": 1,
            "room_type_name": "Deluxe",
            "capacity": 2
          },
          "assigned_at": "2024-01-14 10:30:00"
        },
        {
          "room_id": 2,
          "room_num": 102,
          "status": "booked",
          "room_type": {
            "room_type_id": 1,
            "room_type_name": "Deluxe",
            "capacity": 2
          },
          "assigned_at": "2024-01-14 10:30:00"
        },
        {
          "room_id": 3,
          "room_num": 103,
          "status": "booked",
          "room_type": {
            "room_type_id": 1,
            "room_type_name": "Deluxe",
            "capacity": 2
          },
          "assigned_at": "2024-01-14 10:30:00"
        }
      ],
      "num_rooms": 3,
      "user": {
        "user_id": 2,
        "full_name": "Nguyễn Văn A",
        "email": "nguyenvana@email.com",
        "phone": "0123456789"
      },
      "services": []
    }
  }
  ```
- **Lưu ý:**
  - `rooms`: Mảng chứa tất cả phòng của booking này
  - `num_rooms`: Số lượng phòng trong booking
  - Khi check-in, lễ tân sẽ thấy tất cả phòng đã được gán từ booking code này

#### 9.3.5. Lấy danh sách phòng trống (cho lễ tân)
- **GET** `http://localhost:5000/api/bookings/available-rooms?room_type_id=1&check_in_date=2024-01-15&check_out_date=2024-01-17`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Response:**
  ```json
  {
    "message": "Danh sách phòng trống",
    "room_type_id": 1,
    "room_type_name": "Deluxe",
    "max_quantity": 2,
    "check_in_date": "2024-01-15",
    "check_out_date": "2024-01-17",
    "total_rooms": 2,
    "available_rooms": 2,
    "rooms": [
      {
        "room_id": 5,
        "room_num": "101",
        "status": "available"
      },
      {
        "room_id": 7,
        "room_num": "102",
        "status": "available"
      }
    ]
  }
  ```

#### 9.3.6. Check-in (phòng đã được gán sẵn hoặc gán khi check-in cho walk-in)
- **POST** `http://localhost:5000/api/bookings/{booking_code}/check-in`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body (Optional - chỉ cho walk-in booking chưa gán phòng):**
  ```json
  {
    "room_ids": [1, 2, 3]
  }
  ```
- **Yêu cầu:** 
  - Booking phải ở trạng thái `confirmed`
  - **Booking online:** Phòng đã được gán sẵn khi thanh toán thành công. Không cần gửi `room_ids`.
  - **Booking walk-in:** Có thể chưa gán phòng. Nếu chưa gán, cần gửi `room_ids` (mảng các room_id).
  - Nếu là booking online: chỉ được check-in từ **12:00 trưa ngày check_in_date** trở đi. Trước thời điểm này API sẽ trả về lỗi 400.
- **Ví dụ:** `POST http://localhost:5000/api/bookings/9AF1MBNS/check-in`
- **Response (Booking có nhiều phòng):**
  ```json
  {
    "message": "Check-in thành công",
    "booking_code": "9AF1MBNS",
    "guest_name": "Nguyễn Văn A",
    "room_type": "Deluxe",
    "rooms": [
      {
        "room_id": 1,
        "room_num": 101,
        "assigned_at": "2024-01-15 10:30:00"
      },
      {
        "room_id": 2,
        "room_num": 102,
        "assigned_at": "2024-01-15 10:30:00"
      },
      {
        "room_id": 3,
        "room_num": 103,
        "assigned_at": "2024-01-15 10:30:00"
      }
    ],
    "num_rooms": 3,
    "check_in_time": "2024-01-15 14:30:00",
    "statusCode": 200
  }
  ```
- **Lưu ý:** 
  - **Booking online:** Phòng đã được gán tự động khi thanh toán thành công, hiển thị trong `rooms` array
  - **Booking walk-in:** Có thể gán phòng khi check-in bằng cách gửi `room_ids`
  - Lễ tân chỉ cần nhập booking code, hệ thống sẽ hiển thị tất cả phòng đã được gán
  - Sau check-in, booking chuyển sang trạng thái `checked_in` và tất cả phòng chuyển sang `in_use`

Response khi chưa tới 12:00 (booking online):
```json
{
  "message": "Chưa tới giờ check-in. Vui lòng quay lại sau 12:00 trưa ngày check-in",
  "check_in_date": "2025-10-31",
  "earliest_check_in_time": "2025-10-31 12:00:00",
  "statusCode": 400
}
```

#### 9.3.7. Check-out
- **POST** `http://localhost:5000/api/bookings/{booking_code}/check-out`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Yêu cầu:** 
  - Booking phải ở trạng thái `checked_in` (đã check-in)
  - Phải có `check_in_time` (đã check-in thực tế)
- **Ví dụ:** `POST http://localhost:5000/api/bookings/9AF1MBNS/check-out`
- **Response:**
  ```json
  {
    "message": "Check-out thành công",
    "check_out_time": "2024-01-17 12:00:00",
    "statusCode": 200
  }
  ```
- **Lưu ý:** Sau check-out, booking chuyển sang trạng thái `checked_out`

#### 9.3.7.1. Check-in với gán phòng (cho walk-in booking)
- **POST** `http://localhost:5000/api/bookings/{booking_code}/check-in`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body (JSON - Optional):** Chỉ cần khi walk-in booking chưa có phòng được gán
  ```json
  {
    "room_ids": [5, 6, 7]
  }
  ```
- **Yêu cầu:** 
  - Booking phải ở trạng thái `confirmed`
  - Walk-in booking có thể chưa có phòng được gán (cần gửi `room_ids`)
  - Online booking đã có phòng được gán tự động khi thanh toán thành công
- **Response:**
  ```json
  {
    "message": "Check-in thành công",
    "booking_code": "A1B2C3",
    "guest_name": "Nguyễn Văn A",
    "room_type": "Deluxe",
    "rooms": [
      {
        "room_id": 5,
        "room_num": 101,
        "assigned_at": "2024-01-15 14:30:00"
      },
      {
        "room_id": 6,
        "room_num": 102,
        "assigned_at": "2024-01-15 14:30:00"
      },
      {
        "room_id": 7,
        "room_num": 103,
        "assigned_at": "2024-01-15 14:30:00"
      }
    ],
    "num_rooms": 3,
    "check_in_time": "2024-01-15 14:30:00",
    "statusCode": 200
  }
  ```
- **Lưu ý:** 
  - **Booking online:** Phòng đã được gán tự động khi thanh toán thành công, không cần gửi `room_ids`
  - **Booking walk-in chưa có phòng:** Bắt buộc phải cung cấp `room_ids` (mảng các room_id)
  - **Booking walk-in đã có phòng:** Không cần `room_ids`, chỉ cần gọi API
  - Sau check-in, booking chuyển sang trạng thái `checked_in` và tất cả phòng chuyển sang `in_use`
  - Tất cả phòng được quản lý qua bảng `booking_rooms`, không có liên kết trực tiếp giữa Booking và Room

#### 9.3.8. Cập nhật trạng thái phòng (Admin only)
- **PUT** `http://localhost:5000/api/bookings/room/:room_id/status`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body (JSON):**
  ```json
  {
    "status": "cleaning"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Cập nhật trạng thái phòng thành công",
    "room": {
      "room_id": 5,
      "room_num": 101,
      "status": "cleaning",
      "previous_status": "checked_out"
    },
    "statusCode": 200
  }
  ```

**Trạng thái phòng và luồng chuyển đổi:**
```
available → booked → in_use → checked_out → cleaning → available
```

**Chi tiết trạng thái:**
- `available` - Phòng sẵn sàng cho đặt phòng
- `booked` - Phòng đã được đặt và chờ check-in
- `in_use` - Phòng đang có khách
- `checked_out` - Khách đã check-out, phòng cần dọn dẹp
- `cleaning` - Phòng đang được dọn dẹp

**Quy tắc chuyển đổi trạng thái:**
- Chỉ được phép chuyển từ `checked_out` → `cleaning` → `available`
- Không thể bỏ qua hoặc chuyển ngược lại
- Admin có thể chuyển trạng thái phòng từ `checked_out` → `cleaning` → `available`

**Yêu cầu khi cập nhật:**
- Phòng phải tồn tại
- Trạng thái mới phải hợp lệ theo luồng
- Chỉ admin mới có thể cập nhật

**Ví dụ luồng hoạt động:**
1. Khách check-out → phòng chuyển sang `checked_out`
2. Admin chuyển phòng sang `cleaning` để dọn dẹp
3. Sau khi dọn xong, admin chuyển phòng sang `available` để đặt lại

#### 9.3.9. Luồng trạng thái booking
```
pending → confirmed → checked_in → checked_out
   ↓         ↓           ↓
cancelled  cancelled   (không thể hủy)
```

**Giải thích:**
- **`pending`**: Đang chờ thanh toán
- **`confirmed`**: Đã thanh toán, phòng đã được gán, chờ check-in
- **`checked_in`**: Đã check-in, đang ở khách sạn
- **`checked_out`**: Đã check-out, hoàn thành
- **`cancelled`**: Đã hủy (có thể hủy ở `pending` hoặc `confirmed`)

**Lưu ý quan trọng:**
- Khi thanh toán thành công, hệ thống tự động gán phòng cụ thể từ loại phòng đã đặt
- Khách đặt **loại phòng** (room_type), không phải phòng cụ thể
- Lễ tân sử dụng `booking_code` để tìm và check-in/check-out

#### 9.3.10. Luồng hoạt động chi tiết

**1. Đặt phòng online:**
```
Khách chọn loại phòng → Tạo temp booking → Thanh toán → Webhook → Gán phòng cụ thể → Check-in
```

**2. Đặt phòng walk-in truyền thống:**
```
Admin tạo booking → Chọn loại phòng → Thanh toán ngay → Gán phòng cụ thể → Check-in
```

**3. Đặt phòng walk-in nhanh (mới):**
```
Tạo user nhanh (chỉ cần tên + phone) → Chọn phòng available → Tạo booking và check-in luôn
→ Phòng: available → in_use ngay
→ Booking: checked_in + payment_status: pending (chưa thanh toán)
→ Check-out: payment_status → paid + phòng: in_use → checked_out
```

**4. Cấu trúc database:**
- `bookings.room_type_id` (NOT NULL) - Loại phòng khách đặt
- `bookings.room_id` (NULL) - Phòng cụ thể (chỉ khi đã gán)
- `bookings.room_assigned_at` (NULL) - Thời gian gán phòng

**5. Trạng thái booking:**
- `pending` → `confirmed` → `checked_in` → `checked_out`
- Khi `confirmed`: Phòng đã được gán, sẵn sàng check-in
- Khi `checked_in`: Khách đã nhận phòng
- Khi `checked_out`: Hoàn tất quá trình

**6. Payment status:**
- `pending`: Chưa thanh toán (walk-in booking)
- `paid`: Đã thanh toán (online booking hoặc sau khi check-out)
- Check-out tự động chuyển `pending` → `paid` cho walk-in booking

**7. Trạng thái phòng tự động thay đổi:**
- Khi đặt phòng thành công: `available` → `booked`
- Khi check-in: `booked` → `in_use`
- Khi check-out: `in_use` → `checked_out`
- Admin cập nhật sau khi dọn dẹp: `checked_out` → `cleaning` → `available`

#### 9.3.11. Tóm tắt thay đổi quan trọng

**✅ Đã sửa:**
1. **Mối quan hệ database:** 
   - Booking ↔ RoomType (chính - trực tiếp)
   - Booking ↔ Room (không còn liên kết trực tiếp)
   - Booking ↔ BookingRoom ↔ Room (many-to-many qua bảng trung gian)
   - **Lưu ý:** Tất cả phòng được quản lý qua bảng `booking_rooms`, không còn field `room_id` trực tiếp trong booking
2. **Redis Temp Booking (Giữ chỗ tạm thời):**
   - **TTL:** 30 phút (1800 giây) - Tự động hết hạn nếu không thanh toán
   - **Logic kiểm tra phòng trống:**
     - Chỉ tính các phòng thực sự trống trong database (đã loại trừ phòng đã được đặt vĩnh viễn)
     - Trừ đi số phòng đang được giữ tạm thời bởi khách hàng khác (chỉ tính tối đa bằng số phòng trống)
     - Đảm bảo không block phòng đã được đặt vĩnh viễn hoặc phòng của chính user hiện tại
   - **Webhook logic:** Khi thanh toán thành công, temp booking hiện tại được bỏ qua khi tính số phòng đang được giữ, đảm bảo thanh toán thành công
   - **Tự động giải phóng:** Nếu không thanh toán trong 30 phút hoặc thanh toán thành công, temp booking tự động bị xóa
3. **API endpoints:** Sử dụng `booking_code` thay vì `id` cho check-in/check-out
4. **Luồng đặt phòng:** Khách đặt loại phòng, hệ thống tự động gán phòng cụ thể qua `booking_rooms`
5. **ENUM booking_status:** Thêm `checked_in` và `checked_out`
6. **Database structure:** 
   - `bookings.room_type_id` (NOT NULL) - Loại phòng khách đặt
   - `bookings.room_id` (NULL, deprecated) - Không còn sử dụng, chỉ để backward compatible
   - `booking_rooms` - Bảng trung gian quản lý nhiều phòng cho một booking
7. **ENUM room status:** Thêm `in_use`, `checked_out` để quản lý trạng thái phòng
8. **Walk-in booking:** Tự động tạo records trong `booking_rooms` khi tạo booking, không cần đợi check-in
9. **Check-out tự động:** Tự động chuyển payment_status từ `pending` → `paid`

**🔄 Luồng hoạt động mới:**
- **Online:** Chọn loại phòng → Temp booking → Thanh toán → Webhook → Tạo `booking_rooms` records → Check-in
- **Walk-in:** Admin tạo booking → Chọn loại phòng → Tự động tạo `booking_rooms` records → Check-in
- **Walk-in nhanh:** Tạo user nhanh → Chọn phòng available → Tạo booking + `booking_rooms` + check-in luôn → Check-out
- **Trạng thái phòng tự động:** `available` → `booked` → `in_use` → `checked_out` → `cleaning` → `available`

**📊 Cấu trúc database:**
- `bookings.room_type_id` (NOT NULL) - Loại phòng khách đặt
- `bookings.room_id` (NULL, deprecated) - Không còn được sử dụng, chỉ để tương thích ngược
- `booking_rooms.booking_id` - ID booking
- `booking_rooms.room_id` - ID phòng được gán
- `booking_rooms.assigned_at` - Thời gian gán phòng
- `rooms.status` - Trạng thái phòng: available, booked, in_use, checked_out, cleaning

**🔑 Lưu ý quan trọng:**
- **Một booking có thể có nhiều phòng:** Mỗi phòng được lưu trong `booking_rooms` table
- **Không có liên kết trực tiếp:** Booking và Room không còn association trực tiếp, tất cả đều qua `booking_rooms`
- **API responses:** Trả về `rooms` (array) thay vì `room` (object) để hiển thị tất cả phòng

**🔄 API mới:**
- **POST** `/api/users/quick-create` - Tạo user nhanh cho walk-in (chỉ cần tên + CCCD)
- **POST** `/api/bookings/walk-in-checkin` - Tạo walk-in booking và check-in luôn
- **PUT** `/api/bookings/room/:room_id/status` - Admin cập nhật trạng thái phòng từ `checked_out` → `cleaning` → `available`
- Check-in hỗ trợ gán phòng: Có thể cung cấp `room_id` trong body khi check-in walk-in booking
- Check-out tự động chuyển `payment_status` từ `pending` → `paid` cho walk-in booking

#### 9.3.12. Hủy booking (User tự hủy - có chính sách hoàn tiền)
- **POST** `http://localhost:5000/api/bookings/1/cancel`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Body:**
  ```json
  {
    "reason": "Thay đổi kế hoạch"
  }
  ```

**Chính sách hủy phòng:**

**Trường hợp 1: Hủy trước 48 giờ check-in (14:00)**
- **Hoàn tiền: 70%** tổng số tiền
- **Phí giữ lại: 30%** - Khách sạn giữ lại làm phí

**Response:**
```json
{
  "message": "Hủy booking thành công",
  "refund_amount": 700000,
  "cancellation_policy": "Hủy trước 48 giờ - hoàn 70%, phí 30%",
  "hours_until_checkin": 72
}
```

**Trường hợp 2: Hủy trong vòng 48 giờ hoặc không đến**
- **Hoàn tiền: 0%** - Mất toàn bộ số tiền

**Response:**
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
- Phòng sẽ được giải phóng khi hủy

**Lưu ý về thời gian:**
- Check-in time mặc định: **14:00 (2:00 PM)**
- **Trước 48h:** Từ hơn 48 giờ trước 14:00 ngày check-in
- **Trong 48h:** Từ 48 giờ trước 14:00 ngày check-in trở đi
- **Ví dụ:** Check-in lúc 14:00 ngày 29, phải hủy trước 14:00 ngày 27

#### 9.3.12.1. Admin hủy booking (Không hoàn tiền tự động)
- **POST** `http://localhost:5000/api/bookings/1/cancel-admin`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Body:**
  ```json
  {
    "reason": "Khách đổi phòng - admin xử lý thủ công",
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
- Chỉ admin mới có quyền sử dụng endpoint này
- Có thể hủy bất kỳ booking nào (trừ checked_out)
- Không tự động hoàn tiền - xử lý thủ công
- `refund_manually: true` - Admin đánh dấu đã hoàn tiền thủ công
- `refund_manually: false` - Không hoàn tiền, xử lý thủ công

**Use case:**
- Khách liên hệ muốn đổi phòng (ngày, loại phòng)
- Admin hủy booking hiện tại (không hoàn tiền) và đặt booking mới
- Admin tự xử lý hoàn tiền thủ công

#### 9.3.12.2. Ví dụ test hủy booking

**Test Case 1: User hủy trước 48h**
```bash
# 1. Tạo booking với check_in_date = 3 ngày nữa
POST /api/bookings/temp-booking
{
  "room_type_id": 1,
  "check_in_date": "2025-01-30",  // 3 ngày nữa
  "check_out_date": "2025-02-01"
}

# 2. Thanh toán thành công
POST /api/bookings/payment-webhook
{
  "orderCode": "...",
  "status": "PAID"
}

# 3. Hủy booking ngay (trước 48h)
POST /api/bookings/1/cancel
Headers: Authorization: Bearer USER_TOKEN
{
  "reason": "Thay đổi kế hoạch"
}

# Response: refund_amount = 700000 (70%)
```

**Test Case 2: User hủy trong 48h**
```bash
# 1. Tạo booking với check_in_date = 1 ngày nữa
POST /api/bookings/temp-booking
{
  "room_type_id": 1,
  "check_in_date": "2025-01-22",  // 1 ngày nữa
  "check_out_date": "2025-01-24"
}

# 2. Thanh toán thành công

# 3. Hủy booking trong 48h
POST /api/bookings/2/cancel
Headers: Authorization: Bearer USER_TOKEN
{
  "reason": "Không thể đi được"
}

# Response: refund_amount = 0 (100% mất)
```

**Test Case 3: Admin hủy booking (không hoàn tiền)**
```bash
# Admin hủy booking cho khách đổi phòng
POST /api/bookings/1/cancel-admin
Headers: Authorization: Bearer ADMIN_TOKEN
{
  "reason": "Khách đổi phòng - đã xử lý thủ công",
  "refund_manually": true
}

# Response: Không hoàn tiền tự động
```

**Test Case 4: User không thể hủy booking của người khác**
```bash
# User A cố gắng hủy booking của User B
POST /api/bookings/2/cancel
Headers: Authorization: Bearer USER_A_TOKEN
{
  "reason": "..."
}

# Response: 403 Forbidden
{
  "message": "Bạn không có quyền hủy booking này"
}
```

#### 9.3.13. Tạo hóa đơn PDF
- **GET** `http://localhost:5000/api/bookings/1/invoice/pdf`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Response:** File PDF download

#### 9.3.14. Xem hóa đơn HTML
- **GET** `http://localhost:5000/api/bookings/1/invoice`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Response:** HTML hóa đơn

### 9.4. HƯỚNG DẪN TEST TỪNG BƯỚC

#### Bước 1: Chuẩn bị dữ liệu (làm 1 lần)
1. **Tạo Hotel** → Lưu `hotel_id`
2. **Tạo Room Type** → Lưu `room_type_id`  
3. **Tạo Room** → Lưu `room_id`
4. **Tạo Room Price** → Cấu hình giá phòng
5. **Tạo Services** → Lưu `service_id`
6. **Tạo User (Customer)** → Lưu `user_id`
7. **Tạo Admin User** → Lưu `admin_id`

#### Bước 2: Test Luồng 1 - Đặt phòng trực tuyến
1. **Đăng nhập customer:**
   ```bash
   POST /api/auth/login
   {
     "email": "customer@example.com",
     "password": "password123"
   }
   ```
   → Lưu `token` từ response

2. **Giữ chỗ tạm thời (ví dụ đặt 1 phòng):**
   ```bash
   POST /api/bookings/temp-booking
   Headers: Authorization: Bearer {token}
   {
     "room_type_id": 1,
     "check_in_date": "2025-10-21",
     "check_out_date": "2025-10-22",
     "num_person": 2,
     "num_rooms": 1
   }
   ```
   → Lưu `temp_booking_key` từ response

   **Đặt nhiều phòng (ví dụ 3 phòng):**
   ```bash
   POST /api/bookings/temp-booking
   Headers: Authorization: Bearer {token}
   {
     "room_type_id": 1,
     "check_in_date": "2025-10-21",
     "check_out_date": "2025-10-22",
     "num_person": 6,
     "num_rooms": 3
   }
   ```
   - Giá sẽ tự động tính: giá 1 phòng × số đêm × 3
   - Hệ thống kiểm tra có đủ 3 phòng trống không
   - Sau thanh toán, sẽ được gán 3 phòng cụ thể

3. **Thêm dịch vụ trả trước:**
   ```bash
   POST /api/bookings/temp-booking/add-service
   Headers: Authorization: Bearer {token}
   {
     "temp_booking_key": "{temp_booking_key}",
     "service_id": 1,
     "quantity": 2,
     "payment_type": "prepaid"
   }
   ```

4. **Tạo link thanh toán PayOS:**
   ```bash
   POST /api/bookings/create-payment-link
   Headers: Authorization: Bearer {token}
   {
     "temp_booking_key": "{temp_booking_key}",
     "promotion_code": "SUMMER2024" // optional
   }
   ```
   → Lưu `payment_url` và `order_code`

5. **Thanh toán qua PayOS** (mô phỏng webhook):
   ```bash
   POST /api/bookings/payment-webhook
   {
     "orderCode": "{order_code}",
     "status": "PAID",
     "buyerName": "Nguyễn Văn A",
     "buyerEmail": "customer@example.com"
   }
   ```

6. **Kiểm tra booking đã tạo:**
   ```bash
   GET /api/bookings/1
   Headers: Authorization: Bearer {token}
   ```

#### Bước 3: Test Luồng 2 - Đặt phòng trực tiếp
1. **Đăng nhập admin:**
   ```bash
   POST /api/auth/login
   {
     "email": "admin@example.com",
     "password": "admin123"
   }
   ```
   → Lưu `admin_token`

2. **Tạo booking walk-in (ví dụ đặt 3 phòng):**
   ```bash
   POST /api/bookings/walk-in
   Headers: Authorization: Bearer {admin_token}
   {
    "user_id": 2,
    "room_type_id": 1,
    "check_in_date": "2025-10-21",
    "check_out_date": "2025-10-22",
    "num_person": 6,
    "num_rooms": 3,
    "note": "Đoàn gia đình 6 người",
    "services": [
      {
        "service_id": 1,
        "quantity": 1,
        "payment_type": "postpaid"
      }
    ]
   }
   ```
   → Lưu `booking_code` từ response

3. **Check-in với booking code (gán phòng khi check-in):**
   ```bash
   POST /api/bookings/{booking_code}/check-in
   Headers: Authorization: Bearer {admin_token}
   {
     "room_ids": [101, 102, 103]
   }
   ```
   - **Lưu ý:** 
     - Nếu booking online: Phòng đã được gán sẵn, không cần gửi `room_ids`
     - Nếu booking walk-in chưa gán phòng: Gửi `room_ids` là mảng các room_id
     - Response sẽ hiển thị tất cả phòng đã gán

4. **Check-out:**
   ```bash
   POST /api/bookings/1/check-out
   Headers: Authorization: Bearer {admin_token}
   ```

5. **Tạo hóa đơn PDF:**
   ```bash
   GET /api/bookings/1/invoice/pdf
   Headers: Authorization: Bearer {admin_token}
   ```

### 9.5. TEST CASES CHI TIẾT

#### Test Case 1: Đặt phòng trực tuyến hoàn chỉnh
1. **Đăng nhập user:** `POST /api/auth/login`
2. **Giữ chỗ tạm thời:** `POST /api/bookings/temp-booking`
3. **Thêm dịch vụ trả trước:** `POST /api/bookings/temp-booking/add-service`
4. **Tạo link thanh toán:** `POST /api/bookings/create-payment-link`
5. **Thanh toán qua PayOS** (mô phỏng)
6. **Webhook xử lý kết quả:** `POST /api/bookings/payment-webhook`
7. **Kiểm tra booking đã tạo:** `GET /api/bookings/1`

#### Test Case 2: Đặt phòng trực tiếp
1. **Đăng nhập admin:** `POST /api/auth/login`
2. **Tạo booking walk-in:** `POST /api/bookings/walk-in`
3. **Check-in:** `POST /api/bookings/1/check-in`
4. **Check-out:** `POST /api/bookings/1/check-out`
5. **Tạo hóa đơn:** `GET /api/bookings/1/invoice/pdf`

#### Test Case 2.1: Đặt phòng walk-in nhanh (MỚI)
1. **Đăng nhập admin:** `POST /api/auth/login`
2. **Tạo user nhanh:** `POST /api/users/quick-create`
   ```json
   {
     "full_name": "Nguyễn Văn A",
     "cccd": "012345678901"
   }
   ```
   → Lưu `user_id`

3. **Tạo booking và check-in luôn:** `POST /api/bookings/walk-in-checkin`
   ```json
   {
     "user_id": "{user_id}",
     "room_id": 5,
     "nights": 1,
     "num_person": 2,
     "note": "Khách VIP"
   }
   ```
   → Booking status: `checked_in`
   → Payment status: `pending` (chưa thanh toán)
   → Phòng: `in_use`
   → Lưu `booking_code`

4. **Check-out:** `POST /api/bookings/{booking_code}/check-out`
   → Payment status: `paid` (tự động chuyển)
   → Phòng: `checked_out`

5. **Admin cập nhật phòng:** `PUT /api/bookings/room/5/status`
   ```json
   { "status": "cleaning" }
   ```
   
6. **Phòng sẵn sàng:** `PUT /api/bookings/room/5/status`
   ```json
   { "status": "available" }
   ```

#### Test Case 3: Email nhắc nhở
1. **Tạo booking với check-in ngày mai**
2. **Đợi 18:00 VN** (cron job chạy)
3. **Kiểm tra email nhắc nhở** trong inbox

#### Test Case 4: Hủy dịch vụ trả trước
1. **Tạo booking với dịch vụ trả trước**
2. **Hủy dịch vụ** (API sẽ được thêm sau)
3. **Kiểm tra hoàn tiền** (trừ phí hủy 10%)

### 9.5. LƯU Ý QUAN TRỌNG

1. **Redis TTL:** Booking tạm thời hết hạn sau 30 phút
2. **PayOS Webhook:** Cần cấu hình webhook URL trong PayOS dashboard
3. **Email Service:** Cần cấu hình SMTP trong .env
4. **PDF Service:** Cần cài đặt Puppeteer (đã tự động cài)
5. **Cron Jobs:** 
   - Promotion expire: 00:00 VN mỗi ngày
   - Email reminder: 18:00 VN mỗi ngày

---

## 10. REVIEW APIs

### Tổng quan
Hệ thống đánh giá cho phép khách hàng:
- Đánh giá trải nghiệm sau khi check-out
- Chỉnh sửa hoặc xóa đánh giá của mình
- Xem các đánh giá của loại phòng (public)

### 10.1. Tạo đánh giá mới
- **POST** `http://localhost:5000/api/reviews`
- **Headers:** 
  - `Authorization: Bearer USER_TOKEN`
- **Body (multipart/form-data):**
  - `booking_id`: 1 (required)
  - `rating`: 5 (required, số từ 1-5)
  - `comment`: "Phòng rất sạch sẽ, dịch vụ tốt!" (optional)
  - `images`: [file upload] (optional, cho phép tối đa 10 ảnh)
- **Response:**
  ```json
  {
    "message": "Tạo review thành công",
    "review": {
      "review_id": 1,
      "user_id": 2,
      "booking_id": 1,
      "rating": 5,
      "comment": "Phòng rất sạch sẽ, dịch vụ tốt!",
      "images": ["https://s3.amazonaws.com/bucket/reviews/url1.jpg", "https://s3.amazonaws.com/bucket/reviews/url2.jpg"],
      "created_at": "2024-01-15T10:30:00.000Z",
      "user": {
        "user_id": 2,
        "full_name": "Nguyễn Văn A",
        "email": "nguyenvana@email.com"
      },
      "booking": {
        "booking_id": 1,
        "booking_code": "A1B2C3",
        "room_type_id": 1
      }
    },
    "statusCode": 201
  }
  ```

**Lưu ý:**
- Chỉ có thể đánh giá sau khi đã check-out
- Mỗi booking chỉ có thể đánh giá 1 lần
- Rating phải là số từ 1 đến 5
- Cho phép upload tối đa 10 ảnh
- Ảnh được upload lên S3 và trả về URL
- Email mời đánh giá sẽ tự động gửi sau khi check-out

### 10.2. Cập nhật đánh giá
- **PUT** `http://localhost:5000/api/reviews/1`
- **Headers:** 
  - `Authorization: Bearer USER_TOKEN`
- **Body (multipart/form-data):**
  - `rating`: 4 (optional, số từ 1-5)
  - `comment`: "Đã cập nhật đánh giá" (optional)
  - `images`: [file upload] (optional, tối đa 10 ảnh, sẽ thay thế toàn bộ ảnh cũ)
- **Response:**
  ```json
  {
    "message": "Cập nhật review thành công",
    "review": { /* review data */ },
    "statusCode": 200
  }
  ```

**Lưu ý:**
- Chỉ user sở hữu review mới có quyền cập nhật

### 10.3. Xóa đánh giá
- **DELETE** `http://localhost:5000/api/reviews/1`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Response:**
  ```json
  {
    "message": "Xóa review thành công",
    "statusCode": 200
  }
  ```

**Lưu ý:**
- Chỉ user sở hữu review mới có quyền xóa

### 10.4. Lấy đánh giá theo loại phòng (Public)
- **GET** `http://localhost:5000/api/reviews/room-type/1?page=1&limit=10`
- **Query params:**
  - `page=1&limit=10` - Phân trang
- **Response:**
  ```json
  {
    "message": "Lấy danh sách reviews thành công",
    "reviews": [
      {
        "review_id": 1,
        "rating": 5,
        "comment": "Phòng rất sạch sẽ, dịch vụ tốt!",
        "image": "review_image.jpg",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z",
        "user": {
          "user_id": 2,
          "full_name": "Nguyễn Văn A"
        },
        "booking": {
          "booking_code": "A1B2C3",
          "room_type_name": "Deluxe"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "pageSize": 10
    },
    "statusCode": 200
  }
  ```

**Lưu ý:**
- API này không cần authentication
- Hiển thị tất cả reviews của loại phòng đó
- Sử dụng để hiển thị review trên trang chi tiết phòng

### 10.5. Lấy tất cả đánh giá (Admin only)
- **GET** `http://localhost:5000/api/reviews/admin/all?page=1&limit=10`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Query params:**
  - `page=1&limit=10` - Phân trang
  - `user_id=2` - Lọc theo user (optional)
  - `booking_id=1` - Lọc theo booking (optional)
  - `rating=5` - Lọc theo rating (optional)
- **Response:**
  ```json
  {
    "message": "Lấy danh sách reviews thành công",
    "reviews": [
      {
        "review_id": 1,
        "rating": 5,
        "comment": "Phòng rất sạch sẽ, dịch vụ tốt!",
        "images": ["https://s3.amazonaws.com/bucket/reviews/url1.jpg"],
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z",
        "user": {
          "user_id": 2,
          "full_name": "Nguyễn Văn A",
          "email": "nguyenvana@email.com",
          "phone": "0123456789"
        },
        "booking": {
          "booking_id": 1,
          "booking_code": "A1B2C3",
          "room_type_name": "Deluxe",
          "room_num": 101,
          "booking_status": "checked_out"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "pageSize": 10
    },
    "statusCode": 200
  }
  ```

**Lưu ý:**
- Chỉ admin mới có quyền truy cập
- Có thể filter theo user_id, booking_id, hoặc rating
- Hiển thị đầy đủ thông tin user và booking

### 10.6. Lấy đánh giá của user hiện tại
- **GET** `http://localhost:5000/api/reviews/my-reviews?page=1&limit=10`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Query params:**
  - `page=1&limit=10` - Phân trang
- **Response:**
  ```json
  {
    "message": "Lấy danh sách reviews của bạn thành công",
    "reviews": [
      {
        "review_id": 1,
        "rating": 5,
        "comment": "Phòng rất sạch sẽ, dịch vụ tốt!",
        "image": "review_image.jpg",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z",
        "booking": {
          "booking_id": 1,
          "booking_code": "A1B2C3",
          "room_type_name": "Deluxe",
          "room_num": 101
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "pageSize": 10
    },
    "statusCode": 200
  }
  ```

### 10.7. Email mời đánh giá
Sau khi check-out, user sẽ nhận email tự động với:
- Lời cảm ơn từ khách sạn
- Thông tin booking
- Link đánh giá trải nghiệm
- Lời mời chia sẻ feedback

### 10.8. Đánh giá trong lịch sử đặt phòng
Khi gọi API `GET /api/bookings/my-bookings`, mỗi booking sẽ có thêm:
```json
{
  "has_review": false,
  "can_review": true,
  "review_link": "http://localhost:3000/review/A1B2C3"
}
```

**Ý nghĩa:**
- `has_review`: Đã có review chưa (true/false)
- `can_review`: Có thể đánh giá không (chỉ true khi đã check-out và chưa có review)
- `review_link`: Link đến trang đánh giá (chỉ có khi `can_review = true`)

**Luồng sử dụng:**
1. User xem lịch sử đặt phòng
2. Thấy booking có `can_review: true`
3. Click vào `review_link` để đánh giá
4. Sau khi đánh giá, `has_review` chuyển thành `true`

---

## 11. TEST FLOW HOÀN CHỈNH - TỪ TẠO TÀI KHOẢN ĐẾN ĐẶT PHÒNG THÀNH CÔNG

### 11.1. CHUẨN BỊ TEST

**Bước 1: Cấu hình Database (chỉ cần làm 1 lần)**
```bash
# 1. Tạo file .env (copy từ SETUP_DATABASE.md)
# 2. Cập nhật thông tin database trong .env
# 3. Không cần tạo database thủ công nữa!
```

**Bước 2: Khởi động server (tự động tạo database)**
```bash
npm start
# Database sẽ được tạo tự động nếu chưa tồn tại
```

**Hoặc reset database (nếu cần):**
```bash
# Xóa và tạo lại database
node reset-database.js
```

### 11.2. TEST FLOW CHI TIẾT

#### **Phase 1: Tạo User Accounts**

**1. Tạo Admin User**
- **POST** `http://localhost:5000/api/auth/register`
- **Body:**
  ```json
  {
    "full_name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "phone": "0987654321",
    "role": "admin"
  }
  ```
- **Response:** Lưu `user_id` từ response

**2. Tạo Customer User**
- **POST** `http://localhost:5000/api/auth/register`
- **Body:**
  ```json
  {
    "full_name": "Nguyễn Văn A",
    "email": "customer@example.com",
    "password": "password123",
    "phone": "0123456789",
    "role": "customer"
  }
  ```
- **Response:** Lưu `user_id` từ response

#### **Phase 2: Đăng nhập và Tạo Dữ liệu Cơ bản**

**3. Đăng nhập Admin**
- **POST** `http://localhost:5000/api/auth/login`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```
- **Response:** Lưu `token` từ response → Dùng làm `ADMIN_TOKEN`

**4. Tạo Hotel**
- **POST** `http://localhost:5000/api/hotels`
- **Headers:** `Authorization: Bearer {ADMIN_TOKEN}`
- **Body:**
  ```json
  {
    "name": "Khách sạn ABC",
    "address": "123 Đường ABC, Quận 1, TP.HCM",
    "phone": "1900-xxxx",
    "email": "info@hotelabc.com",
    "description": "Khách sạn 5 sao tại trung tâm TP.HCM",
    "images": ["hotel1.jpg", "hotel2.jpg"]
  }
  ```
- **Response:** Lưu `hotel_id` từ response

**5. Tạo Room Type**
- **POST** `http://localhost:5000/api/room-types`
- **Headers:** `Authorization: Bearer {ADMIN_TOKEN}`
- **Body:** form data để thêm ảnh
  ```json
  {
    "room_type_name": "Deluxe normal",
    "category": "Deluxe",
    "capacity": 2,
    "description": "Phòng deluxe view biển",
    "amenities": {"wifi": "Tốc độ cao miễn phí", "tv": "Smart TV 55 inch"},
    "area": 35,
    "quantity": 10,
    "images": ["room1.jpg", "room2.jpg"]
  }
  ```
- **Response:** Lưu `room_type_id` từ response

**6. Tạo Room**
- **POST** `http://localhost:5000/api/rooms`
- **Headers:** `Authorization: Bearer {ADMIN_TOKEN}`
- **Body:**
  ```json
  {
    "hotel_id": {hotel_id},
    "room_type_id": {room_type_id},
    "room_num": 101,
    "status": "available"
  }
  ```
- **Response:** Lưu `room_id` từ response

**7. Tạo Room Price**
- **POST** `http://localhost:5000/api/room-prices`
- **Headers:** `Authorization: Bearer {ADMIN_TOKEN}`
- **Body:**
  ```json
  {
    "room_type_id": {room_type_id},
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "price_per_night": 1200000
  }
  ```

**8. Tạo Service**
- **POST** `http://localhost:5000/api/services`
- **Headers:** `Authorization: Bearer {ADMIN_TOKEN}`
- **Body:**
  ```json
  {
    "hotel_id": {hotel_id},
    "name": "Đưa đón sân bay",
    "description": "Dịch vụ đưa đón sân bay Tân Sơn Nhất",
    "price": 200000,
    "service_type": "prepaid",
    "is_available": true
  }
  ```
- **Response:** Lưu `service_id` từ response

#### **Phase 3: Luồng Đặt Phòng Trực Tuyến**

**9. Đăng nhập Customer**
- **POST** `http://localhost:5000/api/auth/login`
- **Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "password123"
  }
  ```
- **Response:** Lưu `token` từ response → Dùng làm `CUSTOMER_TOKEN`

**10. Giữ chỗ tạm thời (Temp Booking)**
- **POST** `http://localhost:5000/api/bookings/temp-booking`
- **Headers:** `Authorization: Bearer {CUSTOMER_TOKEN}`
- **Body:**
  ```json
  {
    "room_id": {room_id},
    "check_in_date": "2025-10-21",
    "check_out_date": "2025-10-22",
    "num_person": 2
  }
  ```
- **Response:** Lưu `temp_booking_key` từ response

**11. Thêm dịch vụ vào temp booking**
- **POST** `http://localhost:5000/api/bookings/temp-booking/add-service`
- **Headers:** `Authorization: Bearer {CUSTOMER_TOKEN}`
- **Body:**
  ```json
  {
    "temp_booking_key": "{temp_booking_key}",
    "service_id": {service_id},
    "quantity": 2,
    "payment_type": "prepaid"
  }
  ```

**12. Tạo Promotion (Admin)**
- **POST** `http://localhost:5000/api/promotions`
- **Headers:** `Authorization: Bearer {ADMIN_TOKEN}`
- **Body:**
  ```json
  {
    "promotion_code": "SUMMER2024",
    "name": "Giảm giá mùa hè",
    "description": "Giảm 20% cho đơn hàng từ 1 triệu",
    "discount_type": "percentage",
    "discount_value": 20,
    "min_order_amount": 1000000,
    "max_discount_amount": 500000,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "usage_limit": 100,
    "is_active": true
  }
  ```
- **Response:** Lưu `promotion_id` từ response

**13. Tạo link thanh toán PayOS (có promotion)**
- **POST** `http://localhost:5000/api/bookings/create-payment-link`
- **Headers:** `Authorization: Bearer {CUSTOMER_TOKEN}`
- **Body:**
  ```json
  {
    "temp_booking_key": "{temp_booking_key}",
    "promotion_code": "SUMMER2024"
  }
  ```
- **Response:** Lưu `payment_url`, `order_code`, và `discount_amount`

**14. Mô phỏng webhook thanh toán thành công**
- **POST** `http://localhost:5000/api/bookings/payment-webhook`
- **Body:**
  ```json
  {
    "orderCode": "{order_code}",
    "status": "PAID",
    "buyerName": "Nguyễn Văn A",
    "buyerEmail": "customer@example.com"
  }
  ```
- **Response:** Lưu `booking_id` từ response

**15. Kiểm tra booking đã tạo (có promotion)**
- **GET** `http://localhost:5000/api/bookings/{booking_id}`
- **Headers:** `Authorization: Bearer {CUSTOMER_TOKEN}`
- **Response:** Kiểm tra `discount_amount` và `final_amount`

#### **Phase 4: Test Walk-in Booking**

**16. Tạo booking walk-in (Admin)**
- **POST** `http://localhost:5000/api/bookings/walk-in`
- **Headers:** `Authorization: Bearer {ADMIN_TOKEN}`
- **Body:**
  ```json
  {
    "user_id": 2,
    "room_id": {room_id},
    "check_in_date": "2025-10-23",
    "check_out_date": "2025-10-24",
    "num_person": 2,
    "note": "Khách VIP",
    "services": [
      {
        "service_id": {service_id},
        "quantity": 1,
        "payment_type": "postpaid"
      }
    ]
  }
  ```

### 11.3. TEST PROMOTION RIÊNG BIỆT

#### **Test Case 1: Promotion hợp lệ**
- **Tạo promotion** với `promotion_code: "SUMMER2024"`
- **Áp dụng promotion** khi tạo payment link
- **Kiểm tra** `discount_amount` và `final_amount` trong response

#### **Test Case 2: Promotion không hợp lệ**
- **Tạo promotion** với `promotion_code: "EXPIRED"`
- **Set end_date** trong quá khứ
- **Áp dụng promotion** → Phải trả về lỗi "Promotion đã hết hạn"

#### **Test Case 3: Promotion không đủ điều kiện**
- **Tạo promotion** với `min_order_amount: 5000000`
- **Tạo booking** với tổng tiền < 5 triệu
- **Áp dụng promotion** → Phải trả về lỗi "Không đủ điều kiện"

#### **Test Case 4: Promotion đã hết lượt sử dụng**
- **Tạo promotion** với `usage_limit: 1`
- **Sử dụng promotion** 1 lần
- **Sử dụng promotion** lần 2 → Phải trả về lỗi "Đã hết lượt sử dụng"

### 11.4. KẾT QUẢ MONG ĐỢI

**Sau khi chạy xong test flow:**
- ✅ 2 user accounts (admin + customer)
- ✅ 1 hotel với 1 room type và 1 room
- ✅ 1 service khách sạn
- ✅ 1 promotion (SUMMER2024)
- ✅ 1 booking trực tuyến (đã thanh toán + có promotion)
- ✅ 1 booking walk-in (chưa thanh toán)

**Dữ liệu được tạo:**
```
Admin: admin@example.com / admin123
Customer: customer@example.com / password123
Hotel ID: 1
Room Type ID: 1
Room ID: 1
Service ID: 1
Promotion ID: 1 (SUMMER2024)
Booking ID: 1 (online + promotion)
Booking ID: 2 (walk-in)
```

### 11.5. SCRIPT TỰ ĐỘNG

**Tạo dữ liệu mẫu nhanh:**
```bash
# Tạo tất cả dữ liệu mẫu (bao gồm promotion)
node create-sample-data.js

# Hoặc tạo từng phần
node test-create-services.js
node test-booking-service.js
```

**Tạo promotion mẫu:**
```bash
# Tạo promotion test
node test-create-promotions.js
```

---

## 12. TROUBLESHOOTING

### Lỗi thường gặp
1. **401 Unauthorized**: Token hết hạn hoặc không hợp lệ
2. **404 Not Found**: Không tìm thấy resource
3. **500 Internal Server Error**: Lỗi server, kiểm tra logs
4. **Validation Error**: Dữ liệu đầu vào không hợp lệ

### Kiểm tra logs
- Xem console logs của server
- Kiểm tra database connection
- Verify Redis connection
- Check PayOS configuration

---

## 13. 🚀 HƯỚNG DẪN TEST PAYOS THẬT

### **Bước 1: Tạo booking tạm thời**
```bash
POST http://localhost:5000/api/bookings/temp-booking
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "room_type_id": 1,
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
    "room_type_id": 1,
    "check_in_date": "2025-10-21",
    "check_out_date": "2025-10-22",
    "num_person": 2,
    "room_price": 500,
    "total_price": 500,
    "nights": 1,
    "room_type_name": "Deluxe"
  }
}
```

### **Bước 2: Thêm dịch vụ (tùy chọn)**
```bash
POST http://localhost:5000/api/bookings/temp-booking/add-service
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
POST http://localhost:5000/api/bookings/create-payment-link
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
- Booking tạm thời đã hết hạn (30 phút TTL)
- Tạo lại flow từ đầu
- Kiểm tra Redis connection

### **Lỗi "Không đủ phòng trống" với held_rooms:**
- Hệ thống đang tính các phòng đang được giữ tạm thời bởi khách hàng khác
- Các phòng này sẽ tự động giải phóng sau 30 phút nếu không thanh toán
- Hoặc sẽ được giải phóng ngay khi khách hàng đó thanh toán thành công
- **Lưu ý:** Hệ thống chỉ tính các phòng thực sự trống trong DB, không tính các phòng đã được đặt vĩnh viễn

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

