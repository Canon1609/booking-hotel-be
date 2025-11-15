# Hướng dẫn Test Redis Booking Lock

## Mục đích
Test tính năng giữ chỗ tạm thời (30 phút) để đảm bảo:
- Khi user A đã giữ chỗ 1 phòng trong Redis
- User B không thể đặt phòng đó cho đến khi:
  - User A thanh toán thành công (tạo booking vĩnh viễn)
  - Hoặc 30 phút hết hạn

## Cách test

### Bước 1: Setup
1. Đảm bảo Redis đang chạy
2. Có ít nhất 1 phòng trống của loại phòng cần test
3. Chuẩn bị 2 tài khoản user (User A và User B)

### Bước 2: User A giữ chỗ
**API:** `POST /api/bookings/temp-booking`
**Headers:** `Authorization: Bearer USER_A_TOKEN`
**Body:**
```json
{
  "room_type_id": 1,
  "check_in_date": "2024-12-15",
  "check_out_date": "2024-12-17",
  "num_person": 2,
  "num_rooms": 1
}
```

**Response:**
```json
{
  "message": "Giữ chỗ tạm thời thành công",
  "temp_booking_key": "temp_booking:1:1:2024-12-15:2024-12-17:...",
  "expires_in": 1800,
  "booking_data": {
    "user_id": 1,
    "room_type_id": 1,
    "num_rooms": 1,
    ...
  }
}
```

→ **Lưu `temp_booking_key`**

### Bước 3: User B cố gắng đặt cùng loại phòng (NÊN BỊ TỪ CHỐI)
**API:** `POST /api/bookings/temp-booking`
**Headers:** `Authorization: Bearer USER_B_TOKEN`
**Body:**
```json
{
  "room_type_id": 1,
  "check_in_date": "2024-12-15",
  "check_out_date": "2024-12-17",
  "num_person": 2,
  "num_rooms": 1
}
```

**Expected Response (400):**
```json
{
  "message": "Không đủ phòng trống. Yêu cầu: 1 phòng, hiện có: 0 phòng trống trong khoảng thời gian này (1 phòng đang được giữ tạm thời bởi khách hàng khác)",
  "available_rooms": 0,
  "held_rooms": 1,
  "total_free_rooms": 1
}
```

### Bước 4: User A tạo payment link và thanh toán
**API:** `POST /api/bookings/create-payment-link`
**Headers:** `Authorization: Bearer USER_A_TOKEN`
**Body:**
```json
{
  "temp_booking_key": "temp_booking:1:1:2024-12-15:2024-12-17:...",
  "services": []
}
```

→ Thanh toán thành công → Webhook được gọi → Booking vĩnh viễn được tạo → Redis temp booking bị xóa

### Bước 5: User B thử lại (NÊN THÀNH CÔNG hoặc BỊ TỪ CHỐI nếu phòng đã được đặt vĩnh viễn)
**API:** `POST /api/bookings/temp-booking`
**Headers:** `Authorization: Bearer USER_B_TOKEN`
**Body:** (giống Bước 3)

**Kết quả:**
- Nếu User A đã thanh toán → User B sẽ bị từ chối vì phòng đã được đặt vĩnh viễn
- Nếu User A chưa thanh toán (chờ 30 phút) → User B có thể đặt được sau 30 phút

## Test Case 2: Test với nhiều phòng

### Scenario: Có 3 phòng trống, User A giữ 2 phòng

1. **User A giữ 2 phòng:**
```json
{
  "room_type_id": 1,
  "check_in_date": "2024-12-15",
  "check_out_date": "2024-12-17",
  "num_rooms": 2
}
```

2. **User B cố đặt 2 phòng (NÊN BỊ TỪ CHỐI):**
```json
{
  "room_type_id": 1,
  "check_in_date": "2024-12-15",
  "check_out_date": "2024-12-17",
  "num_rooms": 2
}
```
→ Chỉ còn 1 phòng trống (3 - 2 = 1), không đủ 2 phòng

3. **User B đặt 1 phòng (NÊN THÀNH CÔNG):**
```json
{
  "room_type_id": 1,
  "check_in_date": "2024-12-15",
  "check_out_date": "2024-12-17",
  "num_rooms": 1
}
```
→ Còn 1 phòng, đủ để đặt

## Test Case 2.2: Availability giảm ngay trong 30 phút giữ chỗ, và trở lại sau khi hết hạn

1. User A giữ 1 phòng loại X cho ngày `2025-11-20` → `2025-11-21` (API giữ chỗ ở trên)  
2. Gọi tra cứu:
   - `GET /api/rooms/availability/search?check_in=2025-11-20&check_out=2025-11-21&room_type_id={X}`
   - Kỳ vọng: số phòng còn lại của loại X giảm đi đúng số đã giữ (ví dụ từ 5 còn 4). Trường `total` và danh sách `rooms` phản ánh số đã bị trừ.
3. Không thanh toán, chờ > 30 phút (TTL hết hạn).  
4. Gọi lại tra cứu cùng tham số:  
   - Kỳ vọng: số phòng trở lại như ban đầu (ví dụ 5), vì giữ chỗ đã hết hạn trên Redis.

## Test Case 2.1: Hiển thị còn lại khi có giữ chỗ (theo yêu cầu)

- Giả sử loại phòng đơn còn 5 phòng trống trong ngày 2024-11-20 → 2024-11-21
- Khi có 1 user giữ chỗ 1 phòng (TTL 30 phút) cho đúng khoảng ngày đó
- Trong lúc đang giữ (chưa hết TTL, chưa thanh toán), các API tra cứu sẽ hiển thị còn lại 4 phòng:
  - **API tra cứu danh sách phòng/summary:** `GET /api/rooms/availability/search?check_in=2024-11-20&check_out=2024-11-21&room_type_id={id}`
  - **API xem phòng trống theo loại (lễ tân):** `GET /api/bookings/available-rooms?room_type_id={id}&check_in_date=2024-11-20&check_out_date=2024-11-21`

Kết quả sẽ phản ánh số phòng tạm giữ trong Redis bằng cách trừ trực tiếp vào số phòng còn trống của loại phòng tương ứng trong khoảng ngày trùng lặp.

## Test Case 3: Test TTL (Time To Live)

1. **User A giữ chỗ** → Lưu vào Redis với TTL 30 phút
2. **Chờ 30 phút** (hoặc dùng Redis CLI để xóa key)
3. **User B thử đặt** → Nên thành công vì temp booking đã hết hạn

### Cách xóa key Redis thủ công để test:
```bash
# Kết nối Redis CLI
redis-cli

# Xem tất cả temp bookings
KEYS temp_booking:*

# Xóa một key cụ thể
DEL temp_booking:1:1:2024-12-15:2024-12-17:...

# Hoặc xóa tất cả
FLUSHDB
```

## Kiểm tra Redis

### Xem tất cả temp bookings trong Redis:
```bash
redis-cli
KEYS temp_booking:*
```

### Xem chi tiết một temp booking:
```bash
redis-cli
GET temp_booking:1:1:2024-12-15:2024-12-17:...
```

### Xem TTL còn lại:
```bash
redis-cli
TTL temp_booking:1:1:2024-12-15:2024-12-17:...
```

## Lưu ý

1. **Redis phải đang chạy** - Nếu Redis không kết nối được, hệ thống vẫn hoạt động nhưng không có cơ chế giữ chỗ tạm thời
2. **TTL tự động** - Mỗi temp booking tự động hết hạn sau 30 phút
3. **Xóa sau khi thanh toán** - Khi thanh toán thành công, temp booking sẽ bị xóa khỏi Redis
4. **Không block chính user** - User đang tạo temp booking sẽ không bị block bởi temp booking của chính họ

