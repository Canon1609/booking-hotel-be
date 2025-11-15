# 🏨 Booking Hotel Backend API

Hệ thống backend quản lý đặt phòng khách sạn với đầy đủ tính năng từ đặt phòng, thanh toán, quản lý đến báo cáo doanh thu.

## 📋 Mục lục

- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [API Documentation](#-api-documentation)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Tài liệu hướng dẫn](#-tài-liệu-hướng-dẫn)

## ✨ Tính năng chính

### 🔐 Xác thực & Phân quyền
- Đăng ký, đăng nhập với JWT
- Xác thực email
- Quên mật khẩu & đặt lại mật khẩu
- Đăng nhập bằng Google OAuth
- Phân quyền Admin/User

### 🛏️ Quản lý đặt phòng
- **Đặt phòng trực tuyến**: Giữ chỗ tạm thời (Redis), thanh toán qua PayOS
- **Đặt phòng tại quầy**: Walk-in booking
- **Quản lý booking**: Xem danh sách, chi tiết, cập nhật trạng thái
- **Check-in/Check-out**: Gán phòng, xử lý checkout
- **Hủy đặt phòng**: Hỗ trợ hủy với chính sách hoàn tiền

### 💳 Thanh toán
- Tích hợp PayOS (thanh toán online)
- Thanh toán tiền mặt tại quầy
- Xử lý hoàn tiền (refund)
- Webhook xác nhận thanh toán tự động
- Tạo hóa đơn PDF

### 🏢 Quản lý khách sạn
- Quản lý thông tin khách sạn
- Quản lý loại phòng (room types)
- Quản lý phòng (rooms) với trạng thái real-time
- Quản lý giá phòng theo ngày (room prices)
- Quản lý dịch vụ (services) với loại thanh toán prepaid/postpaid

### 🎁 Khuyến mãi
- Tạo và quản lý mã giảm giá
- Áp dụng giảm giá theo phần trăm hoặc số tiền cố định
- Tự động tính toán khi đặt phòng

### 💬 Chatbot AI
- Tích hợp Google Generative AI
- Chatbot tự động trả lời câu hỏi về khách sạn
- Lưu lịch sử chat session

### 📊 Báo cáo & Thống kê
- Báo cáo doanh thu theo ngày/tháng/năm
- Xuất báo cáo Excel
- Thống kê booking, phòng trống, doanh thu

### ⭐ Đánh giá & Review
- Khách hàng đánh giá sau khi check-out
- Quản lý review với hình ảnh

### 📝 Quản lý nội dung
- Quản lý bài viết (posts)
- Quản lý danh mục (categories)

### 📧 Email & Thông báo
- Gửi email xác nhận đặt phòng
- Email thông báo thanh toán
- Email nhắc nhở check-in
- Email hóa đơn

### ⏰ Tự động hóa
- Cron job tự động cập nhật trạng thái booking
- Tự động gửi email nhắc nhở
- Tự động giải phóng phòng sau check-out

## 🛠️ Công nghệ sử dụng

### Backend Framework
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - ORM cho MySQL

### Database & Cache
- **MySQL** - Database chính
- **Redis** - Cache và quản lý booking tạm thời

### Payment & Services
- **PayOS** - Cổng thanh toán online
- **AWS S3** - Lưu trữ file và hình ảnh
- **Google Generative AI** - Chatbot AI

### Utilities
- **Puppeteer** - Tạo PDF hóa đơn
- **ExcelJS** - Xuất báo cáo Excel
- **Nodemailer** - Gửi email
- **JWT** - Xác thực token
- **Bcrypt** - Mã hóa mật khẩu
- **Moment.js** - Xử lý ngày tháng

### Security
- **Helmet** - Bảo mật HTTP headers
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - Giới hạn request

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 14.x
- MySQL >= 5.7
- Redis >= 6.x
- npm hoặc yarn

### Các bước cài đặt

1. **Clone repository**
```bash
git clone <repository-url>
cd booking-hotel-be
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Cấu hình môi trường**
```bash
cp .env.example .env
# Chỉnh sửa file .env với thông tin của bạn
```

4. **Chạy MySQL và Redis**
```bash
# MySQL
mysql -u root -p

# Redis
redis-server
```

5. **Khởi chạy ứng dụng**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## ⚙️ Cấu hình

Tạo file `.env` với các biến môi trường sau:

```env
# Server
PORT=5000
SERVER_URL=http://localhost:5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hotel_booking

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# PayOS
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-southeast-1
AWS_BUCKET_NAME=your_bucket_name

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_api_key

# OAuth Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## 🚀 Chạy ứng dụng

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

Ứng dụng sẽ chạy tại: `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Các endpoint chính

#### Authentication (`/api/auth`)
- `POST /register` - Đăng ký tài khoản
- `POST /login` - Đăng nhập
- `GET /verify-email` - Xác thực email
- `POST /forgot-password` - Quên mật khẩu
- `POST /reset-password` - Đặt lại mật khẩu
- `GET /google` - Đăng nhập Google

#### Booking (`/api/bookings`)
- `POST /temp-booking` - Tạo booking tạm thời
- `POST /add-service` - Thêm dịch vụ vào booking
- `POST /payment-link` - Tạo link thanh toán
- `POST /webhook` - Webhook PayOS
- `POST /walkin` - Đặt phòng tại quầy
- `GET /` - Danh sách booking
- `GET /:id` - Chi tiết booking
- `PUT /:id/checkin` - Check-in
- `PUT /:id/checkout` - Check-out
- `PUT /:id/cancel` - Hủy booking
- `GET /:id/invoice` - Xem hóa đơn
- `GET /:id/invoice-pdf` - Tải hóa đơn PDF

#### Rooms (`/api/rooms`)
- `GET /` - Danh sách phòng
- `GET /:id` - Chi tiết phòng
- `POST /` - Tạo phòng (Admin)
- `PUT /:id` - Cập nhật phòng (Admin)
- `DELETE /:id` - Xóa phòng (Admin)

#### Services (`/api/services`)
- `GET /` - Danh sách dịch vụ
- `POST /` - Tạo dịch vụ (Admin)
- `PUT /:id` - Cập nhật dịch vụ (Admin)

#### Reports (`/api/reports`)
- `GET /revenue` - Báo cáo doanh thu
- `GET /revenue/export` - Xuất Excel báo cáo

Xem chi tiết API trong [POSTMAN_API_GUIDE.md](./Test_Guide/POSTMAN_API_GUIDE.md)

## 📁 Cấu trúc thư mục

```
booking-hotel-be/
├── src/
│   ├── config/          # Cấu hình (database, passport, config)
│   ├── controllers/     # Controllers xử lý logic
│   ├── middlewares/     # Middleware (auth, response)
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── utils/           # Utilities (email, PDF, Excel, Redis, etc.)
│   ├── chatbot/         # Chatbot AI
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── Test_Guide/          # Tài liệu hướng dẫn và test
├── docker-compose.yml   # Docker configuration
├── Dockerfile           # Dockerfile
├── package.json         # Dependencies
└── README.md            # File này
```

## 📖 Tài liệu hướng dẫn

Tất cả các tài liệu hướng dẫn chi tiết được đặt trong thư mục `Test_Guide/`:

- [POSTMAN_API_GUIDE.md](./Test_Guide/POSTMAN_API_GUIDE.md) - Hướng dẫn test API với Postman
- [SETUP_DATABASE.md](./Test_Guide/SETUP_DATABASE.md) - Hướng dẫn setup database
- [PAYOS_TEST_GUIDE.md](./Test_Guide/PAYOS_TEST_GUIDE.md) - Hướng dẫn test PayOS
- [PAYOS_PRODUCTION_SETUP.md](./Test_Guide/PAYOS_PRODUCTION_SETUP.md) - Setup PayOS production
- [TEST_INVOICE_GUIDE.md](./Test_Guide/TEST_INVOICE_GUIDE.md) - Hướng dẫn test hóa đơn
- [TEST_REFUND_GUIDE.md](./Test_Guide/TEST_REFUND_GUIDE.md) - Hướng dẫn test hoàn tiền
- [TEST_ADD_SERVICE_TO_BOOKING.md](./Test_Guide/TEST_ADD_SERVICE_TO_BOOKING.md) - Test thêm dịch vụ
- [TEST_EXPORT_REPORT.md](./Test_Guide/TEST_EXPORT_REPORT.md) - Test xuất báo cáo
- [TEST_REDIS_BOOKING.md](./Test_Guide/TEST_REDIS_BOOKING.md) - Test Redis booking
- [TEST_ChatBot_Dynamic_AI..md](./Test_Guide/TEST_ChatBot_Dynamic_AI..md) - Test Chatbot AI
- [CANCELLATION_FEATURE.md](./Test_Guide/CANCELLATION_FEATURE.md) - Tính năng hủy booking
- [CHATBOT_DEPLOYMENT_FIX.md](./Test_Guide/CHATBOT_DEPLOYMENT_FIX.md) - Fix chatbot deployment
- [CONFIG_SERVER_URL.md](./Test_Guide/CONFIG_SERVER_URL.md) - Cấu hình server URL
- [HOTEL_POLICIES.md](./Test_Guide/HOTEL_POLICIES.md) - Chính sách khách sạn

## 🔒 Bảo mật

- JWT authentication cho tất cả API
- Bcrypt hashing cho mật khẩu
- Helmet.js cho HTTP security headers
- Rate limiting để chống DDoS
- Input validation và sanitization
- CORS configuration

## 📝 License

ISC

## 👥 Tác giả

Dự án được phát triển cho mục đích học tập và nghiên cứu.

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.

---

**Lưu ý**: Đây là phiên bản backend API. Để có trải nghiệm đầy đủ, cần kết nối với frontend application.

