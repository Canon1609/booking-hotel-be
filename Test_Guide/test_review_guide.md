# Hướng dẫn Test API Đánh giá (Review)

## Cấu hình cơ bản

**Base URL:** `http://localhost:5000/api/reviews`

> **Lưu ý:** 
> - Tất cả API trả về JSON sẽ luôn bao gồm trường `statusCode` phản ánh HTTP status thực tế
> - Để test các API cần authentication, bạn cần đăng nhập và lấy token từ API `/api/auth/login`
> - Token cần được gửi trong header: `Authorization: Bearer <token>`

---

## 1. Tạo đánh giá mới (Customer)

**Yêu cầu:** User đã đăng nhập và có booking đã checkout

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/reviews`
- **Headers:** 
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data`
- **Body (Form-data):**
  - `booking_id`: `1` (Integer, bắt buộc)
  - `rating`: `5` (Integer từ 1-5, bắt buộc)
  - `comment`: `"Phòng rất đẹp, dịch vụ tốt"` (String, tùy chọn)
  - `images`: File (tối đa 10 ảnh, tùy chọn)

**Response thành công (201):**
```json
{
  "statusCode": 201,
  "message": "Tạo review thành công",
  "review": {
    "review_id": 1,
    "user_id": 1,
    "booking_id": 1,
    "rating": 5,
    "comment": "Phòng rất đẹp, dịch vụ tốt",
    "images": ["https://s3.../image1.jpg"],
    "reply": null,
    "reply_at": null,
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-01-15 10:30:00",
    "user": {
      "user_id": 1,
      "full_name": "Nguyễn Văn A",
      "email": "user@example.com"
    },
    "booking": {
      "booking_id": 1,
      "booking_code": "BK001",
      "room_type_id": 1
    }
  }
}
```

**Lỗi thường gặp:**
- `400`: Thiếu booking_id hoặc rating
- `400`: Rating không hợp lệ (phải từ 1-5)
- `404`: Không tìm thấy booking hoặc không có quyền đánh giá
- `400`: Booking chưa checkout (chỉ có thể đánh giá sau khi checkout)
- `400`: Đã đánh giá booking này rồi

---

## 2. Lấy danh sách đánh giá theo Room Type (Public - Không cần auth)

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/reviews/room-type/:room_type_id`
- **Query Parameters:**
  - `page`: `1` (mặc định: 1)
  - `limit`: `10` (mặc định: 10)

**Ví dụ:**
```
GET http://localhost:5000/api/reviews/room-type/1?page=1&limit=10
```

**Response thành công (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách reviews thành công",
  "reviews": [
    {
      "review_id": 1,
      "rating": 5,
      "comment": "Phòng rất đẹp",
      "images": ["https://s3.../image1.jpg"],
      "reply": "Cảm ơn bạn đã đánh giá!",
      "reply_at": "2024-01-16 09:00:00",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00",
      "user": {
        "user_id": 1,
        "full_name": "Nguyễn Văn A"
      },
      "booking": {
        "booking_code": "BK001",
        "room_type_name": "Deluxe Room"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "pageSize": 10
  }
}
```

---

## 3. Lấy đánh giá của tôi (Customer)

**Yêu cầu:** User đã đăng nhập

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/reviews/my-reviews`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page`: `1` (mặc định: 1)
  - `limit`: `10` (mặc định: 10)

**Ví dụ:**
```
GET http://localhost:5000/api/reviews/my-reviews?page=1&limit=10
```

**Response thành công (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách reviews của bạn thành công",
  "reviews": [
    {
      "review_id": 1,
      "rating": 5,
      "comment": "Phòng rất đẹp",
      "images": ["https://s3.../image1.jpg"],
      "reply": "Cảm ơn bạn đã đánh giá!",
      "reply_at": "2024-01-16 09:00:00",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00",
      "booking": {
        "booking_id": 1,
        "booking_code": "BK001",
        "room_type_name": "Deluxe Room",
        "rooms": [
          {
            "room_id": 1,
            "room_num": "101"
          }
        ]
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "pageSize": 10
  }
}
```

---

## 4. Lấy tất cả đánh giá (Admin Only)

**Yêu cầu:** User đã đăng nhập và có role = 'admin'

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/reviews/admin/all`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Query Parameters:**
  - `page`: `1` (mặc định: 1)
  - `limit`: `10` (mặc định: 10)
  - `user_id`: `1` (tùy chọn - lọc theo user_id)
  - `booking_id`: `1` (tùy chọn - lọc theo booking_id)
  - `rating`: `5` (tùy chọn - lọc theo rating)

**Ví dụ:**
```
GET http://localhost:5000/api/reviews/admin/all?page=1&limit=10&rating=5
```

**Response thành công (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách reviews thành công",
  "reviews": [
    {
      "review_id": 1,
      "rating": 5,
      "comment": "Phòng rất đẹp",
      "images": ["https://s3.../image1.jpg"],
      "reply": "Cảm ơn bạn đã đánh giá!",
      "reply_at": "2024-01-16 09:00:00",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00",
      "user": {
        "user_id": 1,
        "full_name": "Nguyễn Văn A",
        "email": "user@example.com",
        "phone": "0123456789"
      },
      "booking": {
        "booking_id": 1,
        "booking_code": "BK001",
        "room_type_name": "Deluxe Room",
        "rooms": [
          {
            "room_id": 1,
            "room_num": "101"
          }
        ],
        "booking_status": "checked_out"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "pageSize": 10
  }
}
```

**Lỗi thường gặp:**
- `403`: Chỉ admin mới có quyền truy cập

---

## 5. Cập nhật đánh giá

### 5.1. Customer cập nhật đánh giá của mình

**Yêu cầu:** User đã đăng nhập và chỉ có thể cập nhật đánh giá của chính mình

- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/reviews/:id`
- **Headers:** 
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data`
- **Body (Form-data):**
  - `rating`: `4` (Integer từ 1-5, tùy chọn)
  - `comment`: `"Đã cập nhật: Phòng tốt nhưng wifi hơi chậm"` (String, tùy chọn)
  - `images`: File (tối đa 10 ảnh, tùy chọn - sẽ thay thế toàn bộ ảnh cũ)

**Ví dụ:**
```
PUT http://localhost:5000/api/reviews/1
```

**Response thành công (200):**
```json
{
  "statusCode": 200,
  "message": "Cập nhật review thành công",
  "review": {
    "review_id": 1,
    "user_id": 1,
    "booking_id": 1,
    "rating": 4,
    "comment": "Đã cập nhật: Phòng tốt nhưng wifi hơi chậm",
    "images": ["https://s3.../new-image.jpg"],
    "reply": "Cảm ơn bạn đã đánh giá!",
    "reply_at": "2024-01-16 09:00:00",
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-01-16 11:00:00",
    "user": {
      "user_id": 1,
      "full_name": "Nguyễn Văn A",
      "email": "user@example.com"
    },
    "booking": {
      "booking_id": 1,
      "booking_code": "BK001",
      "room_type_id": 1
    }
  }
}
```

**Lỗi thường gặp:**
- `404`: Không tìm thấy review hoặc không có quyền chỉnh sửa (không phải review của bạn)
- `400`: Rating không hợp lệ (phải từ 1-5)

### 5.2. Admin cập nhật bất kỳ đánh giá nào

**Yêu cầu:** User đã đăng nhập và có role = 'admin'

- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/reviews/:id`
- **Headers:** 
  - `Authorization: Bearer <admin_token>`
  - `Content-Type: multipart/form-data`
- **Body (Form-data):** (tương tự như trên)

**Lưu ý:** Admin có thể cập nhật bất kỳ đánh giá nào, không chỉ của mình.

---

## 6. Xóa đánh giá

### 6.1. Customer xóa đánh giá của mình

**Yêu cầu:** User đã đăng nhập và chỉ có thể xóa đánh giá của chính mình

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/api/reviews/:id`
- **Headers:** `Authorization: Bearer <token>`

**Ví dụ:**
```
DELETE http://localhost:5000/api/reviews/1
```

**Response thành công (200):**
```json
{
  "statusCode": 200,
  "message": "Xóa review thành công"
}
```

**Lỗi thường gặp:**
- `404`: Không tìm thấy review hoặc không có quyền xóa (không phải review của bạn)

### 6.2. Admin xóa bất kỳ đánh giá nào

**Yêu cầu:** User đã đăng nhập và có role = 'admin'

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/api/reviews/:id`
- **Headers:** `Authorization: Bearer <admin_token>`

**Lưu ý:** Admin có thể xóa bất kỳ đánh giá nào, không chỉ của mình.

---

## 7. Admin phản hồi đánh giá

**Yêu cầu:** User đã đăng nhập và có role = 'admin'

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/reviews/:id/reply`
- **Headers:** 
  - `Authorization: Bearer <admin_token>`
  - `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "reply": "Cảm ơn bạn đã đánh giá! Chúng tôi rất vui khi nhận được phản hồi tích cực từ bạn. Chúng tôi sẽ tiếp tục cải thiện dịch vụ để mang lại trải nghiệm tốt nhất cho khách hàng."
}
```

**Ví dụ:**
```
POST http://localhost:5000/api/reviews/1/reply
```

**Response thành công (200):**
```json
{
  "statusCode": 200,
  "message": "Phản hồi đánh giá thành công",
  "review": {
    "review_id": 1,
    "user_id": 1,
    "booking_id": 1,
    "rating": 5,
    "comment": "Phòng rất đẹp, dịch vụ tốt",
    "images": ["https://s3.../image1.jpg"],
    "reply": "Cảm ơn bạn đã đánh giá! Chúng tôi rất vui khi nhận được phản hồi tích cực từ bạn.",
    "reply_at": "2024-01-16 09:00:00",
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-01-16 09:00:00",
    "user": {
      "user_id": 1,
      "full_name": "Nguyễn Văn A",
      "email": "user@example.com"
    },
    "booking": {
      "booking_id": 1,
      "booking_code": "BK001",
      "room_type_id": 1
    }
  }
}
```

**Lỗi thường gặp:**
- `400`: Thiếu nội dung phản hồi hoặc reply rỗng
- `404`: Không tìm thấy review
- `403`: Chỉ admin mới có quyền phản hồi

**Lưu ý:** 
- Admin có thể cập nhật lại phản hồi bằng cách gọi lại API này với nội dung mới
- `reply_at` sẽ được cập nhật tự động mỗi khi admin phản hồi

---

## Tóm tắt quyền hạn

### Customer (Khách hàng):
- ✅ Tạo đánh giá cho booking của mình (sau khi checkout)
- ✅ Xem đánh giá của mình
- ✅ Xem đánh giá công khai theo room type
- ✅ Chỉnh sửa đánh giá của mình
- ✅ Xóa đánh giá của mình
- ❌ Không thể chỉnh sửa/xóa đánh giá của người khác
- ❌ Không thể phản hồi đánh giá

### Admin:
- ✅ Xem tất cả đánh giá (với filter)
- ✅ Phản hồi bất kỳ đánh giá nào
- ✅ Chỉnh sửa bất kỳ đánh giá nào
- ✅ Xóa bất kỳ đánh giá nào
- ✅ Toàn quyền trên tất cả đánh giá

---

## Test Cases đề xuất

### Test Case 1: Customer tạo đánh giá
1. Đăng nhập với tài khoản customer
2. Tạo đánh giá cho booking đã checkout
3. Kiểm tra response có đầy đủ thông tin

### Test Case 2: Customer chỉnh sửa đánh giá của mình
1. Đăng nhập với tài khoản customer
2. Cập nhật đánh giá của chính mình
3. Kiểm tra đánh giá đã được cập nhật

### Test Case 3: Customer không thể chỉnh sửa đánh giá của người khác
1. Đăng nhập với tài khoản customer A
2. Thử cập nhật đánh giá của customer B
3. Kiểm tra lỗi 404

### Test Case 4: Admin phản hồi đánh giá
1. Đăng nhập với tài khoản admin
2. Phản hồi một đánh giá
3. Kiểm tra reply và reply_at đã được cập nhật

### Test Case 5: Admin chỉnh sửa đánh giá của customer
1. Đăng nhập với tài khoản admin
2. Chỉnh sửa đánh giá của customer
3. Kiểm tra đánh giá đã được cập nhật

### Test Case 6: Admin xóa đánh giá
1. Đăng nhập với tài khoản admin
2. Xóa một đánh giá
3. Kiểm tra đánh giá đã bị xóa

### Test Case 7: Xem đánh giá công khai
1. Không cần đăng nhập
2. Lấy danh sách đánh giá theo room type
3. Kiểm tra response có bao gồm reply nếu có

---

## Lưu ý khi test

1. **Token Authentication:** Tất cả API (trừ xem đánh giá công khai) đều cần token trong header
2. **Upload ảnh:** Khi tạo/cập nhật đánh giá với ảnh, sử dụng `multipart/form-data` và gửi file trong field `images`
3. **Phân quyền:** Đảm bảo test cả trường hợp customer và admin để kiểm tra phân quyền
4. **Validation:** Kiểm tra các validation như rating phải từ 1-5, reply không được rỗng
5. **Database:** Đảm bảo có dữ liệu test (bookings đã checkout, reviews, users với role admin)

