# 🔧 Hướng Dẫn Sửa Lỗi Chatbot Sau Khi Deploy

## ❌ Vấn Đề

Sau khi deploy, chatbot không trả lời chính xác như khi chạy local. Thay vì gọi API để lấy dữ liệu thực tế, chatbot chỉ hỏi lại người dùng.

## 🔍 Nguyên Nhân

Chatbot sử dụng `SERVER_URL` để gọi các API function của chính nó. Nếu `SERVER_URL` không được cấu hình đúng trong production (mặc định là `localhost`), các function call sẽ thất bại, khiến chatbot không thể lấy dữ liệu.

## ✅ Giải Pháp

### 1. Kiểm Tra Biến Môi Trường SERVER_URL

**Trên server production, kiểm tra file `.env`:**

```bash
# SSH vào server
ssh user@your-server

# Kiểm tra file .env
cat .env | grep SERVER_URL
```

**Phải có dòng:**
```env
SERVER_URL=https://api.beanhotelvn.id.vn
```

**KHÔNG được là:**
```env
SERVER_URL=http://localhost:5000  # ❌ SAI
```

### 2. Cập Nhật File .env

Nếu `SERVER_URL` chưa đúng, sửa file `.env`:

```env
# Server Configuration
SERVER_URL=https://api.beanhotelvn.id.vn
PORT=5000

# Frontend/Client URLs  
FRONTEND_URL=https://beanhotelvn.id.vn
CLIENT_URL=https://beanhotelvn.id.vn
```

### 3. Restart Server

Sau khi cập nhật `.env`, restart server:

```bash
# Nếu dùng PM2
pm2 restart all

# Hoặc nếu dùng Docker
docker-compose restart

# Hoặc nếu chạy trực tiếp
# Dừng server (Ctrl+C) và chạy lại
npm start
```

### 4. Kiểm Tra Logs

Sau khi restart, kiểm tra logs để xác nhận `SERVER_URL` đã được load đúng:

```bash
# Xem logs
pm2 logs
# hoặc
docker-compose logs -f app
```

**Tìm dòng:**
```
🌐 SERVER_URL for chatbot API calls: https://api.beanhotelvn.id.vn
```

Nếu vẫn thấy `http://localhost:5000`, có nghĩa là biến môi trường chưa được load đúng.

### 5. Test Chatbot

Test lại chatbot với câu hỏi:
```
"Tôi cần phòng vào ngày 20/11 tới đây"
```

**Kết quả mong đợi:**
- Chatbot phải gọi API `getRoomsAvailability` 
- Trả về danh sách phòng cụ thể với thông tin chi tiết
- KHÔNG chỉ hỏi lại người dùng

**Kiểm tra logs khi test:**
```
🔧 Executing API tool: GET https://api.beanhotelvn.id.vn/api/rooms/availability?check_in=2024-11-20&check_out=2024-11-21
✅ API response status: 200
```

Nếu thấy lỗi `ECONNREFUSED` hoặc URL là `localhost`, có nghĩa là `SERVER_URL` vẫn chưa đúng.

## 🔧 Các Cải Tiến Đã Thực Hiện

### 1. Cải Thiện System Instruction
- Thêm hướng dẫn rõ ràng: **BẮT BUỘC** phải gọi function khi người dùng yêu cầu tìm phòng
- Không được chỉ hỏi lại mà không gọi function

### 2. Cải Thiện Error Handling
- Thêm logging chi tiết khi API call thất bại
- Phát hiện lỗi kết nối (ECONNREFUSED, ENOTFOUND)
- Thông báo lỗi rõ ràng nếu `SERVER_URL` không đúng

### 3. Cải Thiện Response Formatting
- Format kết quả phòng đẹp hơn khi có dữ liệu
- Hiển thị giá tiền đã format theo định dạng Việt Nam

### 4. Thêm Logging
- Log `SERVER_URL` khi khởi động server
- Log `SERVER_URL` mỗi khi gọi API tool
- Log chi tiết khi có lỗi

## 📋 Checklist Deploy

- [ ] File `.env` có `SERVER_URL=https://api.beanhotelvn.id.vn`
- [ ] File `.env` có `FRONTEND_URL` và `CLIENT_URL` đúng
- [ ] Restart server sau khi cập nhật `.env`
- [ ] Kiểm tra logs xác nhận `SERVER_URL` đã load đúng
- [ ] Test chatbot với câu hỏi tìm phòng
- [ ] Xác nhận chatbot gọi API và trả về kết quả cụ thể

## 🐛 Troubleshooting

### Vấn đề: Logs vẫn hiển thị `localhost:5000`

**Giải pháp:**
1. Kiểm tra file `.env` có đúng không
2. Đảm bảo server đã restart sau khi sửa `.env`
3. Nếu dùng Docker, kiểm tra `docker-compose.yml` có map biến môi trường đúng không
4. Nếu dùng PM2, kiểm tra PM2 có load `.env` không (có thể cần dùng `dotenv` hoặc `pm2 ecosystem`)

### Vấn đề: API call vẫn thất bại dù SERVER_URL đúng

**Kiểm tra:**
1. Server có đang chạy không: `curl https://api.beanhotelvn.id.vn/api/rooms/availability?check_in=2024-11-20&check_out=2024-11-21`
2. Firewall có chặn không
3. SSL certificate có hợp lệ không
4. Network connectivity từ server đến chính nó

### Vấn đề: Chatbot vẫn chỉ hỏi lại

**Kiểm tra:**
1. Xem logs có function call không
2. Nếu không có function call, có thể do:
   - Gemini model không nhận diện được cần gọi function
   - System instruction chưa đủ rõ ràng
   - Model version khác nhau giữa local và production
3. Thử câu hỏi rõ ràng hơn: "Tìm phòng trống từ ngày 20/11/2024 đến 21/11/2024"

## 📞 Liên Hệ

Nếu vẫn gặp vấn đề sau khi làm theo hướng dẫn, vui lòng:
1. Cung cấp logs từ server
2. Cung cấp response từ chatbot
3. Cung cấp cấu hình `.env` (ẩn thông tin nhạy cảm)

