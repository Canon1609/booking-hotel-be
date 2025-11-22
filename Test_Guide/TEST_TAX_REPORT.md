# Hướng Dẫn Test API Báo Cáo Thuế

## Tổng Quan

API báo cáo thuế xuất file Excel chuẩn để nộp thuế, bao gồm:
- Thông tin doanh nghiệp
- Tổng hợp doanh thu (chưa VAT, VAT, sau VAT)
- Chi tiết từng hóa đơn/booking
- Format chuẩn theo quy định thuế

**Yêu cầu:** Quyền Admin

## ⚙️ Cấu Hình Server URL

**Quan trọng:** Tất cả URL trong file này sử dụng `http://localhost:5000/api` làm ví dụ. 

Trong môi trường thực tế, hãy sử dụng biến môi trường `SERVER_URL` từ file `.env`:

```env
SERVER_URL=http://localhost:5000
# Hoặc khi deploy:
SERVER_URL=https://your-domain.com
```

## API Endpoint

```
GET http://localhost:5000/api/reports/tax?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

**Authentication:** Required (Admin only)
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ đầy đủ:**
```
GET http://localhost:5000/api/reports/tax?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `start_date` (required): Ngày bắt đầu kỳ báo cáo (format: YYYY-MM-DD)
- `end_date` (required): Ngày kết thúc kỳ báo cáo (format: YYYY-MM-DD)

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File download với tên: `bao-cao-thue-{start_date}-{end_date}.xlsx`

## Nội Dung Báo Cáo

Báo cáo Excel bao gồm các phần:

### 1. Thông Tin Doanh Nghiệp
- Tên doanh nghiệp
- Địa chỉ
- Mã số thuế
- Điện thoại
- Email

### 2. Tổng Hợp Doanh Thu
- **Tổng doanh thu chưa VAT:** Tổng doanh thu trước khi tính VAT
- **Thuế VAT (10%):** Tổng thuế VAT phải nộp
- **Tổng doanh thu sau VAT:** Tổng doanh thu bao gồm VAT
- **Tổng tiền đã hoàn lại:** Tổng số tiền đã hoàn lại cho khách hàng

### 3. Chi Tiết Hóa Đơn
Bảng chi tiết từng booking/hóa đơn bao gồm:
- **STT:** Số thứ tự
- **Mã HĐ:** Mã booking code
- **Ngày HĐ:** Ngày tạo booking (ngày phát hành hóa đơn)
- **Khách hàng:** Tên khách hàng
- **Mã số thuế KH:** CCCD/CMND của khách hàng (nếu có)
- **Địa chỉ KH:** Địa chỉ khách hàng
- **Loại phòng:** Tên loại phòng
- **Số phòng:** Số phòng đã đặt
- **Dịch vụ:** Danh sách dịch vụ đã sử dụng
- **Doanh thu chưa VAT:** Số tiền trước VAT
- **VAT (10%):** Số tiền thuế VAT
- **Tổng tiền:** Tổng tiền sau VAT
- **Phương thức TT:** Phương thức thanh toán (Online/Tiền mặt)
- **Đã hoàn lại:** Số tiền đã hoàn lại (nếu có)

### 4. Dòng Tổng Cộng
Tổng hợp tất cả các cột số tiền ở cuối bảng

## Công Thức Tính Toán

### Tính VAT
- **VAT Rate:** 10% (theo quy định dịch vụ lưu trú)
- **Doanh thu chưa VAT** = Tổng tiền / (1 + 0.1)
- **VAT** = Tổng tiền - Doanh thu chưa VAT
- **Tổng tiền** = Doanh thu chưa VAT + VAT

### Tính Doanh Thu
- Chỉ tính booking có status: `confirmed`, `checked_in`, `checked_out`
- Không tính booking `cancelled`
- Bao gồm: Tiền phòng + Dịch vụ (prepaid + postpaid) - Refunds

## Test Cases

### Test Case 1: Báo cáo thuế theo tháng

**Request:**
```bash
GET http://localhost:5000/api/reports/tax?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File Excel được download thành công
- [ ] Tên file đúng format: `bao-cao-thue-2024-01-01-2024-01-31.xlsx`
- [ ] Có phần "THÔNG TIN DOANH NGHIỆP" với đầy đủ thông tin
- [ ] Có phần "TỔNG HỢP DOANH THU" với 4 chỉ tiêu:
  - [ ] Tổng doanh thu chưa VAT
  - [ ] Thuế VAT (10%)
  - [ ] Tổng doanh thu sau VAT
  - [ ] Tổng tiền đã hoàn lại
- [ ] Có phần "CHI TIẾT HÓA ĐƠN" với bảng chi tiết
- [ ] Bảng chi tiết có đầy đủ 14 cột
- [ ] Có dòng "TỔNG CỘNG" ở cuối bảng
- [ ] Số tiền được format đúng (VNĐ, không có dấu phẩy thập phân)
- [ ] Header có màu nền và font đậm
- [ ] Cột có độ rộng phù hợp, dễ đọc

### Test Case 2: Báo cáo thuế theo quý

**Request:**
```bash
GET http://localhost:5000/api/reports/tax?start_date=2024-01-01&end_date=2024-03-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File Excel được download thành công
- [ ] Tất cả booking trong quý được liệt kê
- [ ] Tổng hợp đúng tổng doanh thu của quý
- [ ] VAT được tính đúng 10%

### Test Case 3: Báo cáo thuế theo năm

**Request:**
```bash
GET http://localhost:5000/api/reports/tax?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File Excel được download thành công
- [ ] Tất cả booking trong năm được liệt kê
- [ ] Tổng hợp đúng tổng doanh thu của năm
- [ ] File không quá lớn (có thể cần phân trang nếu quá nhiều booking)

### Test Case 4: Báo cáo thuế với booking có refund

**Yêu cầu:** Có booking đã thanh toán nhưng sau đó bị refund một phần

**Kiểm tra:**
- [ ] Cột "Đã hoàn lại" hiển thị đúng số tiền
- [ ] Doanh thu được tính = Tổng thanh toán - Refund
- [ ] VAT được tính trên doanh thu sau khi trừ refund

### Test Case 5: Báo cáo thuế với booking có dịch vụ postpaid

**Yêu cầu:** Có booking với dịch vụ postpaid (thanh toán tiền mặt tại khách sạn)

**Kiểm tra:**
- [ ] Dịch vụ postpaid được tính vào doanh thu
- [ ] VAT được tính trên cả tiền phòng và dịch vụ postpaid
- [ ] Cột "Phương thức TT" hiển thị "Tiền mặt" cho booking walk-in

### Test Case 6: Báo cáo thuế với booking online

**Kiểm tra:**
- [ ] Cột "Phương thức TT" hiển thị "Online" cho booking online
- [ ] Doanh thu được tính đúng từ payment records

### Test Case 7: Kiểm tra tính toán VAT

**Kiểm tra:**
- [ ] Doanh thu chưa VAT + VAT = Tổng tiền (làm tròn)
- [ ] VAT = Tổng tiền / 11 * 10 (hoặc Tổng tiền - Doanh thu chưa VAT)
- [ ] Tổng cộng ở cuối bảng khớp với tổng hợp ở trên

### Test Case 8: Kiểm tra format Excel

**Kiểm tra:**
- [ ] Header có màu nền xanh đậm (#2c3e50)
- [ ] Header có font màu trắng, đậm
- [ ] Số tiền được format với dấu phẩy phân cách hàng nghìn
- [ ] Cột có độ rộng phù hợp, không bị cắt chữ
- [ ] Dòng tổng cộng có font đậm

### Test Case 9: Kiểm tra quyền truy cập

**Test với user không phải admin:**
```bash
GET http://localhost:5000/api/reports/tax?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer USER_TOKEN
```

**Kiểm tra:**
- [ ] Trả về lỗi 403 Forbidden
- [ ] Message: "Chỉ admin mới có quyền truy cập"

### Test Case 10: Kiểm tra validation

**Test thiếu start_date:**
```bash
GET http://localhost:5000/api/reports/tax?end_date=2024-01-31
```

**Test thiếu end_date:**
```bash
GET http://localhost:5000/api/reports/tax?start_date=2024-01-01
```

**Kiểm tra:**
- [ ] Trả về lỗi 400 Bad Request
- [ ] Message: "Vui lòng cung cấp start_date và end_date (format: YYYY-MM-DD)"

## Sử Dụng với Postman

### Bước 1: Đăng nhập Admin

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_password"
}
```

Lưu token từ response.

### Bước 2: Gọi API Báo Cáo Thuế

1. Tạo request mới trong Postman
2. Method: `GET`
3. URL: `http://localhost:5000/api/reports/tax?start_date=2024-01-01&end_date=2024-01-31`
4. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
5. Click "Send"
6. File Excel sẽ được download tự động

### Bước 3: Kiểm Tra File Excel

1. Mở file Excel đã download
2. Kiểm tra các phần:
   - Thông tin doanh nghiệp
   - Tổng hợp doanh thu
   - Chi tiết hóa đơn
   - Format và styling

## Sử Dụng với cURL

```bash
# Đăng nhập và lấy token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}' \
  | jq -r '.token')

# Gọi API báo cáo thuế
curl -X GET "http://localhost:5000/api/reports/tax?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o bao-cao-thue.xlsx
```

## Lưu Ý

1. **VAT Rate:** Hiện tại cố định 10%. Nếu cần thay đổi, sửa biến `VAT_RATE` trong code.

2. **Thông tin Doanh nghiệp:** Lấy từ bảng `hotels`. Đảm bảo đã cập nhật đầy đủ thông tin:
   - Tên doanh nghiệp
   - Địa chỉ
   - Mã số thuế (nếu có trường này trong model)
   - Điện thoại
   - Email

3. **Thông tin Khách hàng:** 
   - Mã số thuế KH lấy từ trường `cccd` của User
   - Địa chỉ KH hiện tại là "N/A" (có thể thêm vào User model sau)

4. **Booking Status:** Chỉ tính booking có status `confirmed`, `checked_in`, `checked_out`. Booking `cancelled` không được tính vào báo cáo thuế.

5. **Refunds:** Số tiền đã hoàn lại được hiển thị riêng và không tính vào doanh thu chịu thuế.

6. **Format Excel:** File Excel được format chuẩn với:
   - Header có màu nền và font đậm
   - Số tiền format VNĐ
   - Cột có độ rộng phù hợp

## Troubleshooting

### Lỗi: "Vui lòng cung cấp start_date và end_date"
- **Nguyên nhân:** Thiếu query parameters
- **Giải pháp:** Thêm `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` vào URL

### Lỗi: "Chỉ admin mới có quyền truy cập"
- **Nguyên nhân:** Token không phải của admin
- **Giải pháp:** Đăng nhập với tài khoản admin và lấy token mới

### File Excel không mở được
- **Nguyên nhân:** File bị corrupt hoặc format không đúng
- **Giải pháp:** Kiểm tra lại code tạo Excel, đảm bảo buffer được gửi đúng

### Số liệu không khớp
- **Nguyên nhân:** Logic tính toán sai hoặc dữ liệu không đúng
- **Giải pháp:** 
  - Kiểm tra lại logic tính VAT
  - Kiểm tra booking status
  - Kiểm tra payment records

## Kết Luận

API báo cáo thuế cung cấp file Excel chuẩn để nộp thuế, bao gồm đầy đủ thông tin theo quy định. Đảm bảo test kỹ các trường hợp trên trước khi sử dụng trong production.

