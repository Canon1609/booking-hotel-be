# Hướng dẫn Test API User Management bằng Postman

## Cấu hình cơ bản

**Base URL:** `http://localhost:5000/api/users` (hoặc port bạn đang sử dụng)

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

## 4. Cách tạo Admin User để test

### Bước 1: Tạo user thường
Đăng ký một user bình thường qua API register

### Bước 2: Cập nhật role thành admin (qua database)
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Bước 3: Đăng nhập với user admin
Sử dụng API login để lấy token admin

---

## 5. Response Examples

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
  }
}
```

### Lỗi (400/401/403/404):
```json
{
  "message": "Email đã được sử dụng"
}
```

---

## 6. Lưu ý quan trọng

1. **Token Authentication:** Tất cả API (trừ register/login) đều cần token trong header `Authorization: Bearer TOKEN`

2. **Admin Role:** Các API admin cần user có role = 'admin'

3. **Date Format:** Sử dụng định dạng `YYYY-MM-DD` cho date_of_birth

4. **Password:** Mật khẩu sẽ được hash tự động, không lưu plain text

5. **Timezone:** Tất cả thời gian đều theo múi giờ Hà Nội (UTC+7)

6. **Validation:** 
   - Email phải unique
   - Password tối thiểu 6 ký tự
   - Phone có thể null
   - date_of_birth có thể null

---

## 7. Test Cases gợi ý

### Test User APIs:
1. Đăng ký → Đăng nhập → Lấy profile
2. Cập nhật profile → Kiểm tra thay đổi
3. Đổi mật khẩu → Đăng nhập với mật khẩu mới
4. Xóa tài khoản → Thử đăng nhập lại (sẽ lỗi)

### Test Admin APIs:
1. Tạo admin user → Đăng nhập admin
2. Tạo user mới → Lấy danh sách users
3. Tìm kiếm user theo email
4. Cập nhật user → Xóa user
5. Test phân quyền (user thường không thể truy cập admin APIs)
