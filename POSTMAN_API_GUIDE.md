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
      "room_id": 1,
      "hotel": {
        "hotel_id": 1,
        "hotel_name": "Khách sạn ABC",
        "address": "123 Đường ABC",
        "city": "TP.HCM"
      },
      "room_type": {
        "room_type_id": 1,
        "room_type_name": "Deluxe",
        "capacity": 2,
        "images": ["room1.jpg"],
        "amenities": {"wifi": "miễn phí"},
        "area": 30,
        "prices": [
          {
            "price_id": 10,
            "start_date": "2025-10-01T00:00:00.000Z",
            "end_date": "2025-10-31T00:00:00.000Z",
            "price_per_night": 1200000
          }
        ]
      }
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
1. **Khách đặt phòng:** Chọn loại phòng (room_type_id) - không phải phòng cụ thể
2. **Thanh toán thành công:** Hệ thống tự động gán phòng cụ thể từ loại phòng đã đặt
3. **Check-in:** Lễ tân sử dụng booking_code để xác nhận với phòng đã được gán sẵn
4. **Check-out:** Lễ tân sử dụng booking_code để hoàn tất quá trình

#### 9.1.1. Giữ chỗ tạm thời (Redis)
- **POST** `http://localhost:5000/api/bookings/temp-booking`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Body:**
  ```json
  {
    "room_type_id": 1,
    "check_in_date": "2024-01-15",
    "check_out_date": "2024-01-17",
    "num_person": 2
  }
  ```
- **Response:**
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
      "room_price": 500000,
      "total_price": 1000000,
      "nights": 2,
      "room_type_name": "Deluxe"
    },
    "statusCode": 200
  }
  ```

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

### 9.2. LUỒNG 2: ĐẶT PHÒNG TRỰC TIẾP (WALK-IN)

#### 9.2.1. Tạo booking trực tiếp
- **POST** `http://localhost:5000/api/bookings/walk-in`
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
  }
  ```

### 9.3. CÁC API CHUNG

#### 9.3.1. Lấy danh sách booking
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
        "room": {
          "room_id": 1,
          "room_number": "101",
          "room_type": {
            "room_type_name": "Deluxe"
          }
        }
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

#### 9.3.2. Lấy booking theo ID
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
      "room": {
        "room_id": 1,
        "room_number": "101",
        "room_type": {
          "room_type_name": "Deluxe"
        }
      },
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

#### 9.3.3. Tìm booking theo mã đặt phòng (cho check-in)
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
      "total_price": 1000000,
      "user": {
        "user_id": 2,
        "full_name": "Nguyễn Văn A",
        "email": "nguyenvana@email.com",
        "phone": "0123456789"
      },
      "room": {
        "room_id": 1,
        "room_num": 101,
        "room_type": {
          "room_type_id": 1,
          "room_type_name": "Deluxe",
          "capacity": 2
        }
      },
      "services": []
    }
  }
  ```

#### 9.3.4. Lấy danh sách phòng trống (cho lễ tân)
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
        "floor": 1,
        "status": "available"
      },
      {
        "room_id": 7,
        "room_num": "102",
        "floor": 1,
        "status": "available"
      }
    ]
  }
  ```

#### 9.3.5. Check-in (phòng đã được gán sẵn)
- **POST** `http://localhost:5000/api/bookings/{booking_code}/check-in`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Yêu cầu:** 
  - Booking phải ở trạng thái `confirmed`
  - Phòng đã được gán sẵn khi thanh toán thành công
- **Ví dụ:** `POST http://localhost:5000/api/bookings/9AF1MBNS/check-in`
- **Response:**
  ```json
  {
    "message": "Check-in thành công",
    "booking_code": "9AF1MBNS",
    "guest_name": "Nguyễn Văn A",
    "room_type": "Deluxe",
    "room_number": "101",
    "check_in_time": "2024-01-15 14:30:00",
    "room_assigned_at": "2024-01-15 10:30:00",
    "statusCode": 200
  }
  ```
- **Lưu ý:** 
  - Phòng đã được gán tự động khi thanh toán thành công
  - Lễ tân chỉ cần xác nhận check-in, không cần chỉ định phòng
  - Sau check-in, booking chuyển sang trạng thái `checked_in`

#### 9.3.6. Check-out
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

#### 9.3.7. Luồng trạng thái booking
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

#### 9.3.8. Luồng hoạt động chi tiết

**1. Đặt phòng online:**
```
Khách chọn loại phòng → Tạo temp booking → Thanh toán → Webhook → Gán phòng cụ thể → Check-in
```

**2. Đặt phòng walk-in:**
```
Admin tạo booking → Chọn loại phòng → Thanh toán ngay → Gán phòng cụ thể → Check-in
```

**3. Cấu trúc database:**
- `bookings.room_type_id` (NOT NULL) - Loại phòng khách đặt
- `bookings.room_id` (NULL) - Phòng cụ thể (chỉ khi đã gán)
- `bookings.room_assigned_at` (NULL) - Thời gian gán phòng

**4. Trạng thái booking:**
- `pending` → `confirmed` → `checked_in` → `checked_out`
- Khi `confirmed`: Phòng đã được gán, sẵn sàng check-in
- Khi `checked_in`: Khách đã nhận phòng
- Khi `checked_out`: Hoàn tất quá trình

#### 9.3.9. Tóm tắt thay đổi quan trọng

**✅ Đã sửa:**
1. **Mối quan hệ database:** Booking ↔ RoomType (chính), Booking ↔ Room (phụ)
2. **API endpoints:** Sử dụng `booking_code` thay vì `id` cho check-in/check-out
3. **Luồng đặt phòng:** Khách đặt loại phòng, hệ thống tự động gán phòng cụ thể
4. **ENUM booking_status:** Thêm `checked_in` và `checked_out`
5. **Database migration:** Thêm `room_type_id`, `room_assigned_at` vào bảng bookings

**🔄 Luồng hoạt động mới:**
- **Online:** Chọn loại phòng → Temp booking → Thanh toán → Webhook → Gán phòng → Check-in
- **Walk-in:** Admin tạo booking → Chọn loại phòng → Thanh toán → Gán phòng → Check-in

**📊 Cấu trúc database:**
- `bookings.room_type_id` (NOT NULL) - Loại phòng khách đặt
- `bookings.room_id` (NULL) - Phòng cụ thể (chỉ khi đã gán)
- `bookings.room_assigned_at` (NULL) - Thời gian gán phòng

#### 9.3.8. Hủy booking
- **POST** `http://localhost:5000/api/bookings/1/cancel`
- **Headers:** `Authorization: Bearer USER_TOKEN`
- **Body:**
  ```json
  {
    "reason": "Thay đổi kế hoạch"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Hủy booking thành công",
    "statusCode": 200
  }
  ```

#### 9.3.6. Tạo hóa đơn PDF
- **GET** `http://localhost:5000/api/bookings/1/invoice/pdf`
- **Headers:** `Authorization: Bearer ADMIN_TOKEN`
- **Response:** File PDF download

#### 9.3.7. Xem hóa đơn HTML
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

2. **Giữ chỗ tạm thời:**
   ```bash
   POST /api/bookings/temp-booking
   Headers: Authorization: Bearer {token}
   {
     "room_id": 1,
     "check_in_date": "2025-10-21",
     "check_out_date": "2025-10-22",
     "num_person": 2
   }
   ```
   → Lưu `temp_booking_key` từ response

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

2. **Tạo booking walk-in:**
   ```bash
   POST /api/bookings/walk-in
   Headers: Authorization: Bearer {admin_token}
   {
     "user_id": 2,
     "room_id": 1,
     "check_in_date": "2025-10-21",
     "check_out_date": "2025-10-22",
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

3. **Check-in:**
   ```bash
   POST /api/bookings/1/check-in
   Headers: Authorization: Bearer {admin_token}
   ```

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

## 10. TEST FLOW HOÀN CHỈNH - TỪ TẠO TÀI KHOẢN ĐẾN ĐẶT PHÒNG THÀNH CÔNG

### 10.1. CHUẨN BỊ TEST

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

### 10.2. TEST FLOW CHI TIẾT

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

### 10.3. TEST PROMOTION RIÊNG BIỆT

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

### 10.4. KẾT QUẢ MONG ĐỢI

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

### 10.5. SCRIPT TỰ ĐỘNG

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

## 11. TROUBLESHOOTING

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

## 12. 🚀 HƯỚNG DẪN TEST PAYOS THẬT

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

