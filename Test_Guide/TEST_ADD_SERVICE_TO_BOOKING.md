## Thêm dịch vụ vào booking đã tồn tại (Admin/Staff)

Endpoint mới:

- Method: POST
- Path: `/api/bookings/:id/add-service`
- Auth: Yêu cầu `Authorization: Bearer <token>` và quyền Admin/Staff

Body JSON:

```json
{
  "service_id": 1,
  "quantity": 2,
  "payment_type": "postpaid"
}
```

Ghi chú:
- `payment_type`: `postpaid` (mặc định) hoặc `prepaid`.
- Hệ thống chỉ cho phép thêm khi `booking_status` là `confirmed` hoặc `checked_in`.

### Cách test bằng curl

Thay `<BOOKING_ID>` và `<TOKEN>` cho phù hợp:

```bash
curl -X POST "http://localhost:3000/api/bookings/<BOOKING_ID>/add-service" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "service_id": 1,
    "quantity": 2,
    "payment_type": "postpaid"
  }'
```

Kết quả mong đợi (ví dụ):

```json
{
  "message": "Thêm dịch vụ vào booking thành công",
  "booking_service": {
    "booking_service_id": 10,
    "booking_id": 123,
    "service_id": 1,
    "quantity": 2,
    "unit_price": "200000.00",
    "total_price": "400000.00",
    "payment_type": "postpaid",
    "status": "active",
    "updated_at": "2025-11-11T03:00:00.000Z",
    "created_at": "2025-11-11T03:00:00.000Z"
  }
}
```

### Cách test bằng Postman
1. Tạo request POST tới `http://localhost:3000/api/bookings/<BOOKING_ID>/add-service`
2. Tab Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer <TOKEN>`
3. Tab Body (raw JSON):
   ```json
   {
     "service_id": 1,
     "quantity": 1,
     "payment_type": "postpaid"
   }
   ```
4. Gửi request và kiểm tra trường `booking_service` trả về.

### Kiểm tra dữ liệu trong DB
- Bảng `booking_services` sẽ có bản ghi mới.
- Nếu gửi `payment_type = "prepaid"`, trường `final_price` của bảng `bookings` sẽ được cộng thêm tương ứng.

### Liên quan hóa đơn
- Hóa đơn khi xem/đẩy PDF đã lấy dữ liệu từ `booking_services`, nên dịch vụ thêm mới sẽ xuất hiện trong hóa đơn và tổng thanh toán tại bước check-out.


