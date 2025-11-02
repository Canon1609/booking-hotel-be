# Hướng Dẫn Cấu Hình SERVER_URL

## Tổng Quan

Hệ thống đã được tách biệt cấu hình URL ra khỏi code. Tất cả URL được quản lý tập trung thông qua biến môi trường trong file `.env`.

## Cấu Hình File .env

Thêm các biến sau vào file `.env`:

```env
# Server Configuration
SERVER_URL=http://localhost:5000
PORT=5000

# Frontend/Client URLs
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
```

### Giải Thích:

- **SERVER_URL:** URL của backend server (ví dụ: `http://localhost:5000` hoặc `https://api.yourdomain.com`)
- **PORT:** Port mà server chạy (mặc định: 5000)
- **FRONTEND_URL:** URL của frontend application (dùng cho CORS và các link)
- **CLIENT_URL:** Alias của FRONTEND_URL (dùng cho các link redirect, email, etc.)

## Khi Deploy Production

Khi deploy lên server production, chỉ cần cập nhật file `.env`:

```env
# Production Configuration
SERVER_URL=https://api.yourdomain.com
PORT=5000

FRONTEND_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
```

## Các Nơi Đã Sử Dụng SERVER_URL

### 1. Server Configuration (`src/config/config.js`)
- Tập trung quản lý tất cả URL configurations
- Export các constants: `SERVER_URL`, `PORT`, `FRONTEND_URL`, `CLIENT_URL`

### 2. CORS Configuration (`src/app.js`)
- Sử dụng `FRONTEND_URL` cho CORS origin
- Tự động cho phép frontend từ URL được cấu hình

### 3. Server Log (`src/server.js`)
- Hiển thị API URL trong console log: `${SERVER_URL}/api`

### 4. Booking Controller (`src/controllers/bookingController.js`)
- Review link sử dụng `FRONTEND_URL`

### 5. Auth Controller (`src/controllers/authController.js`)
- Email confirmation links
- Password reset links
- Google OAuth redirect URLs
- Tất cả sử dụng `CLIENT_URL`

### 6. User Controller (`src/controllers/userController.js`)
- Email confirmation links sử dụng `CLIENT_URL`

### 7. Email Utilities (`src/utils/emailBooking.util.js`)
- Review request links sử dụng `FRONTEND_URL`

### 8. PayOS Utilities (`src/utils/payos.util.js`)
- Payment return/cancel URLs sử dụng `CLIENT_URL`

## Kiểm Tra Cấu Hình

Để kiểm tra xem cấu hình đã đúng chưa:

1. **Kiểm tra file `.env` có đầy đủ biến:**
   ```bash
   # Xem các biến SERVER_URL, PORT, FRONTEND_URL, CLIENT_URL
   ```

2. **Khởi động server và kiểm tra log:**
   ```bash
   npm start
   # Sẽ hiển thị: 🌐 API: {SERVER_URL}/api
   ```

3. **Test API endpoint:**
   - Sử dụng `SERVER_URL` từ `.env` trong các request

## Lưu Ý

- ✅ **Đã tách biệt:** Tất cả hardcode URL đã được thay thế bằng biến môi trường
- ✅ **Centralized config:** Tất cả config tập trung ở `src/config/config.js`
- ✅ **Easy deployment:** Chỉ cần thay đổi `.env` khi deploy
- ⚠️ **File test guide:** Các file `TEST_*.md` vẫn dùng `http://localhost:5000` làm ví dụ, nhưng đã có note về việc dùng SERVER_URL từ `.env`

## Troubleshooting

### Lỗi: Cannot read property 'SERVER_URL' of undefined
- **Nguyên nhân:** File `.env` chưa có biến `SERVER_URL`
- **Giải pháp:** Thêm `SERVER_URL=http://localhost:5000` vào file `.env`

### Lỗi: CORS error khi gọi API
- **Nguyên nhân:** `FRONTEND_URL` trong `.env` không khớp với URL frontend thực tế
- **Giải pháp:** Cập nhật `FRONTEND_URL` trong `.env` cho đúng

### Links trong email không hoạt động
- **Nguyên nhân:** `CLIENT_URL` hoặc `FRONTEND_URL` không đúng
- **Giải pháp:** Kiểm tra và cập nhật lại trong `.env`

