# 🗄️ Hướng dẫn Cấu hình Database Tự động

## 📋 Tổng quan

Từ bây giờ, khi chạy `npm start`, hệ thống sẽ **tự động tạo database** nếu chưa tồn tại, không cần tạo thủ công trong MySQL Workbench nữa!

## ⚙️ Cấu hình

### 1. Tạo file `.env` trong thư mục gốc

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hotel_booking

# Server Configuration
SERVER_URL=http://localhost:5000
PORT=5000
NODE_ENV=development

# Frontend/Client URLs
FRONTEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=your_session_secret_key_here

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PayOS Configuration (Optional)
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
PAYOS_WEBHOOK_URL=${SERVER_URL}/api/bookings/payment-webhook
# Lưu ý: PayOS cần absolute URL. Khi deploy, thay bằng URL production.
# Ví dụ: PAYOS_WEBHOOK_URL=https://api.yourdomain.com/api/bookings/payment-webhook

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=your_email@gmail.com

# Google OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Migration Flags (Set to true for first run, then false)
DB_RUN_IMAGES_MIGRATION=true
DB_RUN_ROOM_UNIQ_MIGRATION=true
DB_RUN_ROOMPRICE_UPDATED_AT=true
DB_RUN_SERVICE_FIELDS_MIGRATION=true
```

### 2. Cập nhật thông tin database

Thay đổi các giá trị sau trong file `.env`:
- `DB_PASSWORD`: Mật khẩu MySQL của bạn
- `DB_NAME`: Tên database (mặc định: `hotel_booking`)
- `JWT_SECRET`: Chuỗi bí mật cho JWT (tạo ngẫu nhiên)
- `SESSION_SECRET`: Chuỗi bí mật cho session (tạo ngẫu nhiên)

## 🚀 Cách sử dụng

### **Lần đầu chạy:**
```bash
# 1. Cài đặt dependencies
npm install

# 2. Tạo file .env (copy từ .env.example và cập nhật)

# 3. Khởi động server (tự động tạo database)
npm start
```

### **Các lần chạy tiếp theo:**
```bash
# Chỉ cần chạy
npm start
```

## 🔄 Quy trình tự động

Khi chạy `npm start`, hệ thống sẽ:

1. **Kết nối MySQL** (không chỉ định database)
2. **Tạo database** `hotel_booking` nếu chưa tồn tại
3. **Kết nối database** `hotel_booking`
4. **Đồng bộ hóa tất cả bảng** (tự động tạo/cập nhật)
5. **Chạy migrations** (nếu có flag)
6. **Khởi động server**

## 📊 Kết quả

Sau khi chạy thành công, bạn sẽ thấy:

```
✅ Database 'hotel_booking' đã sẵn sàng
Database connected
Database synchronized!
🚀 Server running on port 5000
📊 Database: hotel_booking
🌐 API: http://localhost:5000/api
```

## 🐛 Troubleshooting

### **Lỗi kết nối MySQL:**
- Kiểm tra MySQL đã chạy chưa
- Kiểm tra thông tin trong `.env`
- Kiểm tra user có quyền tạo database

### **Lỗi tạo database:**
- Kiểm tra user MySQL có quyền `CREATE DATABASE`
- Kiểm tra tên database không bị trùng

### **Lỗi đồng bộ bảng:**
- Kiểm tra cấu trúc models
- Xem logs chi tiết để debug

## 📝 Lưu ý

- **Migration flags**: Chỉ set `true` lần đầu, sau đó set `false`
- **Database sẽ được tạo tự động** với charset `utf8mb4`
- **Tất cả bảng sẽ được đồng bộ** theo models
- **Không cần tạo database thủ công** nữa!

## 🎉 Kết luận

Bây giờ bạn chỉ cần:
1. Cấu hình `.env`
2. Chạy `npm start`
3. Database và server sẽ sẵn sàng!

**Không cần MySQL Workbench nữa!** 🚀
