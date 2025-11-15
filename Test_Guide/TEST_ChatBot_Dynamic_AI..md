# Hướng Dẫn Test ChatBot AI Dynamic (Tự Động Học Từ API Routes)

## Tổng Quan

ChatBot AI Dynamic là hệ thống chatbot mới có khả năng **tự động học** các API routes public từ codebase và tự động tạo tools cho Gemini AI. Hệ thống này:

1. **Tự động quét** các route files public
2. **Tự động generate** OpenAPI 3.0 specification
3. **Tự động convert** thành Gemini function declarations
4. **Tự động execute** các API calls khi AI cần

## Kiến Trúc

### 1. **OpenAPI Generator** (`src/chatbot/openapi.generator.js`)
- Quét các route files public
- Parse Express routes (GET, POST, PUT, DELETE)
- Generate OpenAPI 3.0 spec
- Convert sang Gemini function declarations

### 2. **Chat Router** (`src/chatbot/chat.router.js`)
- Khởi tạo Gemini AI
- Load dynamic tools từ OpenAPI generator
- Xử lý function calling loop
- Execute API calls thông qua HTTP requests

## ⚙️ Cấu Hình

### Biến Môi Trường

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-2.0-flash-exp
SERVER_URL=http://localhost:5000
```

### Public Route Files (Allow-List)

Hệ thống chỉ quét các file này:
- `src/routes/roomRoutes.js`
- `src/routes/hotelRoutes.js`
- `src/routes/postRoutes.js`
- `src/routes/categoryRoutes.js`

**Lưu ý:** Chỉ các routes **KHÔNG có** `protect` hoặc `adminOnly` middleware mới được expose.

## API Endpoints

### 1. List Available Tools

```
GET http://localhost:5000/api/chat/tools
```

**Headers (Optional):**
```
Authorization: Bearer <user_token>
```

Nếu có token, sẽ hiển thị cả user authenticated tools.

**Response:**
```json
{
  "message": "Available API tools",
  "statusCode": 200,
  "tools": [
    {
      "name": "getRooms",
      "description": "Get list of rooms"
    },
    {
      "name": "searchAvailability",
      "description": "Search for available rooms based on criteria"
    }
  ],
  "openapi": {
    "paths": ["/api/rooms", "/api/rooms/availability/search"],
    "totalOperations": 10
  }
}
```

### 2. Chat Endpoint

```
POST http://localhost:5000/api/chat
```

**Headers (Optional):**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

Nếu có token, chatbot sẽ có thêm các tools để:
- Tra cứu booking của chính user
- Xem lịch sử đặt phòng
- Hủy booking của chính mình
- Tạo booking và thanh toán

**Request:**
```json
{
  "message": "Tìm phòng trống từ ngày 25/12/2024 đến 27/12/2024 cho 2 người"
}
```

**Response:**
```json
{
  "message": "Chat thành công",
  "statusCode": 200,
  "response": "Tôi đã tìm thấy các phòng trống...",
  "functionCalls": [
    {
      "name": "searchAvailability",
      "args": {
        "check_in": "2024-12-25",
        "check_out": "2024-12-27",
        "guests": 2
      }
    }
  ]
}
```

### 3. Chat Sessions APIs

Các API quản lý lịch sử chat (lưu trong bảng `chat_sessions`).

1) Lấy tất cả sessions của user hiện tại (cần đăng nhập):

```
GET http://localhost:5000/api/chat/sessions
Authorization: Bearer <user_token>
```

2) Lấy full history của một session cụ thể (cần sở hữu hoặc là admin):

```
GET http://localhost:5000/api/chat/sessions/:session_id
Authorization: Bearer <token>
```

3) Lấy sessions theo user_id:

```
GET http://localhost:5000/api/chat/sessions/by-user/:user_id
Authorization: Bearer <token>
```

- User thường: chỉ lấy được khi `:user_id` trùng với user của mình; nếu `:user_id = null` → trả về rỗng.
- Admin:
  - `:user_id = <id>` → lấy sessions của user đó
  - `:user_id = null` → lấy các sessions không có user_id (khách chưa đăng nhập)
  - `:user_id = all` → lấy tất cả sessions (có và không có user_id)

## Authentication

### Không Đăng Nhập (Public Tools)
- Chỉ có các tools public (rooms, hotels, posts, categories)
- Không thể tra cứu booking cá nhân
- Không thể tạo booking

### Đã Đăng Nhập (User Tools)
Khi gửi request với `Authorization: Bearer <token>`, chatbot sẽ có thêm:

**User Booking Tools:**
- `getMyBookings` - Xem lịch sử đặt phòng của chính mình
- `getBookingById` - Xem chi tiết booking của chính mình
- `createTempBooking` - Tạo booking tạm thời
- `cancelBooking` - Hủy booking của chính mình
- `createPaymentLink` - Tạo link thanh toán

**Ví dụ Request với Token:**
```bash
POST http://localhost:5000/api/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "message": "Cho tôi xem lịch sử đặt phòng của tôi"
}
```

## Các Tools Được Tự Động Tạo

### Room Routes (Public)

1. **getRooms** - Lấy danh sách phòng
   - Query params: `page`, `limit`, `hotel_id`

2. **searchAvailability** - Tìm phòng trống
   - Query params: `check_in`, `check_out`, `guests`, `hotel_id`, `room_type_id`, `min_price`, `max_price`, `sort`, `page`, `limit`

3. **getRoomById** - Lấy thông tin phòng theo ID
   - Path param: `id`

### Hotel Routes

1. **getHotels** - Lấy danh sách khách sạn
2. **getHotelById** - Lấy thông tin khách sạn theo ID

### Post Routes

1. **getPosts** - Lấy danh sách bài viết
2. **getPostById** - Lấy bài viết theo ID
3. **getPostBySlug** - Lấy bài viết theo slug

### Category Routes (Public)

1. **getCategories** - Lấy danh sách categories
2. **getCategoryById** - Lấy category theo ID
3. **getCategoryBySlug** - Lấy category theo slug

### Booking Routes (User Authenticated - Cần đăng nhập)

1. **getMyBookings** - Lấy lịch sử đặt phòng của user hiện tại
2. **getBookingById** - Lấy thông tin booking theo ID (chỉ booking của chính user)
3. **createTempBooking** - Tạo booking tạm thời (giữ chỗ)
4. **cancelBooking** - Hủy booking (chỉ booking của chính user)
5. **createPaymentLink** - Tạo link thanh toán PayOS

## Test Cases

### Test Case 1: Tìm Phòng Trống

```bash
POST http://localhost:5000/api/chat
Content-Type: application/json

{
  "message": "Tôi cần tìm phòng trống từ 25/12 đến 27/12 cho 2 người"
}
```

**Expected:**
- AI sẽ gọi function `searchAvailability`
- Với args: `{check_in: "2024-12-25", check_out: "2024-12-27", guests: 2}`
- Trả về danh sách phòng trống

### Test Case 2: Xem Thông Tin Khách Sạn

```bash
POST http://localhost:5000/api/chat
Content-Type: application/json

{
  "message": "Cho tôi xem thông tin khách sạn ID 1"
}
```

**Expected:**
- AI sẽ gọi function `getHotelById`
- Với args: `{id: "1"}`
- Trả về thông tin khách sạn

### Test Case 3: Xem Danh Sách Bài Viết

```bash
POST http://localhost:5000/api/chat
Content-Type: application/json

{
  "message": "Hiển thị danh sách bài viết"
}
```

**Expected:**
- AI sẽ gọi function `getPosts`
- Trả về danh sách bài viết

### Test Case 4: Tra Cứu Booking (Yêu Cầu Đăng Nhập)

```bash
POST http://localhost:5000/api/chat
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "message": "Cho tôi xem lịch sử đặt phòng của tôi"
}
```

**Expected:**
- AI sẽ gọi function `getMyBookings`
- Với token trong header
- Trả về danh sách booking của user

### Test Case 5: Tra Cứu Booking Không Đăng Nhập

```bash
POST http://localhost:5000/api/chat
Content-Type: application/json

{
  "message": "Cho tôi xem lịch sử đặt phòng của tôi"
}
```

**Expected:**
- AI sẽ thông báo cần đăng nhập
- Hoặc không có function `getMyBookings` trong tools

```bash
POST http://localhost:5000/api/chat
Content-Type: application/json

{
  "message": "Hiển thị danh sách bài viết"
}
```

**Expected:**
- AI sẽ gọi function `getPosts`
- Trả về danh sách bài viết

## Cách Thêm Routes Mới

### Thêm Route File Mới

1. Thêm file vào `PUBLIC_ROUTE_FILES` trong `src/chatbot/openapi.generator.js`:
```javascript
const PUBLIC_ROUTE_FILES = [
  'src/routes/roomRoutes.js',
  'src/routes/hotelRoutes.js',
  'src/routes/postRoutes.js',
  'src/routes/categoryRoutes.js',
  'src/routes/yourNewRoutes.js' // Thêm ở đây
];
```

2. Thêm base path vào `basePaths`:
```javascript
const basePaths = {
  'src/routes/roomRoutes.js': '/api/rooms',
  // ... existing paths
  'src/routes/yourNewRoutes.js': '/api/your-path'
};
```

3. Restart server - tools sẽ tự động được generate!

### Thêm Route Public Mới Vào File Hiện Tại

Chỉ cần thêm route vào file route (không có `protect` hoặc `adminOnly`):

```javascript
// Public route - sẽ tự động được expose
router.get('/new-route', yourHandler);

// Protected route - sẽ bị skip
router.post('/admin-route', protect, adminOnly, adminHandler);
```

## Lưu Ý

### 1. Security

- **Chỉ public routes** được expose (không có `protect`/`adminOnly`)
- AI chỉ có thể gọi các API trong allow-list
- Tất cả API calls được thực hiện qua HTTP (có thể log và monitor)

### 2. Performance

- OpenAPI spec được generate **một lần** khi server start
- Tools được cache trong memory
- API calls được thực hiện qua HTTP (có thể có latency)

### 3. Error Handling

- Nếu API call fail, error sẽ được trả về cho AI
- AI sẽ cố gắng xử lý error và thông báo cho user
- Logs chi tiết trong console để debug

## Troubleshooting

### Không thấy tools trong response

**Kiểm tra:**
1. Routes có được định nghĩa đúng không?
2. Routes có bị protect/adminOnly không?
3. Check console logs khi server start - có thấy "Generated X dynamic API tools" không?

### Function call không hoạt động

**Kiểm tra:**
1. API endpoint có hoạt động không? (test trực tiếp bằng Postman)
2. SERVER_URL có đúng không?
3. Check console logs - có thấy "Executing API tool" không?

### Lỗi format parameters

**Giải pháp:**
- Parameters được infer từ route path và common patterns
- Nếu cần custom parameters, sửa function `inferQueryParams` trong `openapi.generator.js`

## So Sánh Với ChatBot Cũ

| Feature | ChatBot Cũ | ChatBot Dynamic |
|---------|-----------|-----------------|
| Tools | Hard-coded trong code | Tự động từ routes |
| Thêm tool mới | Phải sửa code | Chỉ cần thêm route |
| Maintenance | Khó maintain | Dễ maintain |
| Security | Manual check | Auto-filter protected routes |
| Scalability | Khó scale | Dễ scale |

## Kết Luận

ChatBot Dynamic là giải pháp linh hoạt và dễ maintain hơn. Khi bạn thêm routes mới, AI sẽ tự động học và sử dụng chúng mà không cần sửa code chatbot!

