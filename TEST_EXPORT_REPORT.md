# Hướng Dẫn Test Chức Năng Xuất Báo Cáo

## Tổng Quan

Hệ thống hỗ trợ 3 loại báo cáo chính:
1. **Báo cáo Doanh thu (Revenue Reports)** - Xuất Excel
2. **Báo cáo Công suất phòng (Occupancy Reports)** - Xuất Excel
3. **Báo cáo Vận hành (Operational Reports)** - Xuất PDF

Tất cả các báo cáo đều yêu cầu quyền Admin/Staff.

## 1. BÁO CÁO DOANH THU (REVENUE REPORTS) - EXCEL

### API Endpoint

```
GET http://localhost:5000/api/reports/revenue?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

**Authentication:** Required (Admin/Staff only)
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ đầy đủ:**
```
GET http://localhost:5000/api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `start_date` (required): Ngày bắt đầu (format: YYYY-MM-DD)
- `end_date` (required): Ngày kết thúc (format: YYYY-MM-DD)

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File download với tên: `bao-cao-doanh-thu-{start_date}-{end_date}.xlsx`

### Nội Dung Báo Cáo

Báo cáo Excel bao gồm các sheet/section:

#### 1.1. Tổng quan Doanh thu
- **Tổng Doanh thu:** Tổng tiền thu được trong khoảng thời gian
- **Doanh thu Tiền phòng:** Tổng từ `booking.total_price`
- **Doanh thu Dịch vụ:** Tổng từ `booking_services.total_price` (chưa bị hủy)
- **Doanh thu Phí hủy:** Phí hủy phòng (nếu có)

#### 1.2. Phân tích Doanh thu
- Tiền phòng (Accommodation)
- Tiền dịch vụ (Services)
- Tiền phạt hủy phòng

#### 1.3. Doanh thu theo Kênh
- **Online (Đặt web):** Doanh thu từ `booking_type = 'online'`
- **Trực tiếp (Walk-in):** Doanh thu từ `booking_type = 'walkin'`

#### 1.4. Doanh thu theo Ngày
- Bảng chi tiết doanh thu từng ngày trong khoảng thời gian

### Test Cases

#### Test Case 1: Báo cáo doanh thu theo tháng

**Request:**
```bash
GET http://localhost:5000/api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File Excel được download thành công
- [ ] Tên file đúng format: `bao-cao-doanh-thu-2024-01-01-2024-01-31.xlsx`
- [ ] Có section "TỔNG QUAN DOANH THU" với các số liệu
- [ ] Có section "PHÂN TÍCH DOANH THU" 
- [ ] Có section "DOANH THU THEO KÊNH"
- [ ] Có section "DOANH THU THEO NGÀY" với bảng chi tiết
- [ ] Số tiền được format đúng (VNĐ, không có dấu phẩy thập phân)
- [ ] Header có màu nền và font đậm

#### Test Case 2: Báo cáo doanh thu theo tuần

**Request:**
```bash
GET http://localhost:5000/api/reports/revenue?start_date=2024-01-01&end_date=2024-01-07
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] Báo cáo chỉ tính trong 7 ngày
- [ ] Doanh thu theo ngày có đúng 7 dòng (hoặc ít hơn nếu không có booking)

#### Test Case 3: Báo cáo doanh thu không có dữ liệu

**Request:**
```bash
GET http://localhost:5000/api/reports/revenue?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File Excel vẫn được tạo
- [ ] Tất cả số liệu = 0 hoặc rỗng
- [ ] Không có lỗi

#### Test Case 4: Thiếu tham số

**Request:**
```bash
GET http://localhost:5000/api/reports/revenue
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] Trả về lỗi 400
- [ ] Message: "Vui lòng cung cấp start_date và end_date"

## 2. BÁO CÁO CÔNG SUẤT PHÒNG (OCCUPANCY REPORTS) - EXCEL

### API Endpoint

```
GET http://localhost:5000/api/reports/occupancy?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

**Authentication:** Required (Admin/Staff only)
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ đầy đủ:**
```
GET http://localhost:5000/api/reports/occupancy?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File download với tên: `bao-cao-cong-suat-{start_date}-{end_date}.xlsx`

### Nội Dung Báo Cáo

#### 2.1. Chỉ số Công suất
- **Tổng số phòng:** Tổng số phòng trong hệ thống
- **Số đêm phòng đã bán (Room Nights Sold):** Tổng số đêm * số phòng
- **Tỷ lệ Lấp đầy trung bình (Occupancy Rate):** Trung bình của (Số phòng đã bán / Tổng số phòng) * 100% theo từng ngày
- **RevPAR (Revenue Per Available Room):** Tổng doanh thu tiền phòng / (Tổng số phòng * Số ngày)

**Công thức:**
- Occupancy Rate = (Số phòng đã bán / Tổng số phòng) * 100%
- RevPAR = Tổng doanh thu tiền phòng / (Tổng số phòng * Số ngày trong khoảng thời gian)

#### 2.2. Chi tiết theo Ngày
- Bảng hiển thị từng ngày:
  - Ngày
  - Số phòng đã bán
  - Tổng số phòng
  - Tỷ lệ Lấp đầy (%)

### Test Cases

#### Test Case 1: Báo cáo công suất theo tháng

**Request:**
```bash
GET http://localhost:5000/api/reports/occupancy?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File Excel được download thành công
- [ ] Có section "CHỈ SỐ CÔNG SUẤT" với:
  - [ ] Tổng số phòng
  - [ ] Room Nights Sold
  - [ ] Occupancy Rate (định dạng %)
  - [ ] RevPAR (định dạng VNĐ)
- [ ] Có section "CHI TIẾT THEO NGÀY" với bảng đầy đủ
- [ ] Occupancy Rate tính đúng (0-100%)
- [ ] RevPAR tính đúng

#### Test Case 2: Kiểm tra công thức Occupancy Rate

**Setup:**
- Tổng số phòng = 50
- Trong ngày có 30 phòng được đặt

**Kiểm tra:**
- [ ] Occupancy Rate = 60% (30/50 * 100)

#### Test Case 3: Kiểm tra công thức RevPAR

**Setup:**
- Tổng doanh thu tiền phòng = 50,000,000đ
- Tổng số phòng = 50
- Số ngày = 30

**Kiểm tra:**
- [ ] RevPAR = 50,000,000 / (50 * 30) = 33,333.33đ

## 3. BÁO CÁO VẬN HÀNH (OPERATIONAL REPORTS) - PDF

### 3.1. Danh sách Khách đến (Arrival List)

#### API Endpoint

```
GET http://localhost:5000/api/reports/arrivals?date=YYYY-MM-DD
```

**Authentication:** Required (Admin/Staff only)
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Query Parameters:**
- `date` (optional): Ngày muốn xem (format: YYYY-MM-DD). Nếu không có thì mặc định hôm nay

**Ví dụ đầy đủ:**
- Có date: `GET http://localhost:5000/api/reports/arrivals?date=2024-01-15`
- Không có date (mặc định hôm nay): `GET http://localhost:5000/api/reports/arrivals`

**Response:**
- Content-Type: `application/pdf`
- File download với tên: `danh-sach-khach-den-{date}.pdf`

#### Nội Dung Báo Cáo

- Header: BEAN HOTEL - DANH SÁCH KHÁCH ĐẾN
- Thông tin: Ngày, Thời gian xuất báo cáo
- Bảng chi tiết:
  - STT
  - Mã Booking
  - Tên khách
  - SĐT
  - Loại phòng
  - Số phòng (highlight)
  - Số khách
  - Check-in
  - Check-out
- Footer: Tổng số khách đến

#### Test Cases

**Test Case 1: Danh sách khách đến hôm nay**

**Request:**
```bash
GET http://localhost:5000/api/reports/arrivals
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File PDF được download
- [ ] Header hiển thị đúng ngày hôm nay
- [ ] Bảng có đầy đủ các cột
- [ ] Số phòng được highlight màu xanh
- [ ] Tổng số khách đến hiển thị ở footer

**Test Case 2: Danh sách khách đến ngày cụ thể**

**Request:**
```bash
GET http://localhost:5000/api/reports/arrivals?date=2024-01-15
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] Header hiển thị đúng ngày 15/01/2024
- [ ] Chỉ hiển thị các booking có `check_in_date = 2024-01-15`

**Test Case 3: Không có khách đến**

**Setup:**
- Chọn ngày không có booking check-in

**Kiểm tra:**
- [ ] PDF vẫn được tạo
- [ ] Hiển thị message: "Không có khách đến trong ngày này"
- [ ] Tổng số khách đến = 0

### 3.2. Danh sách Khách đi (Departure List)

#### API Endpoint

```
GET http://localhost:5000/api/reports/departures?date=YYYY-MM-DD
```

**Authentication:** Required (Admin/Staff only)
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Query Parameters:**
- `date` (optional): Ngày muốn xem (format: YYYY-MM-DD). Nếu không có thì mặc định hôm nay

**Ví dụ đầy đủ:**
- Có date: `GET http://localhost:5000/api/reports/departures?date=2024-01-15`
- Không có date (mặc định hôm nay): `GET http://localhost:5000/api/reports/departures`

**Response:**
- Content-Type: `application/pdf`
- File download với tên: `danh-sach-khach-di-{date}.pdf`

#### Nội Dung Báo Cáo

- Header: BEAN HOTEL - DANH SÁCH KHÁCH ĐI
- Warning: "⚠️ Vui lòng chuẩn bị hóa đơn cho các khách này"
- Thông tin: Ngày, Thời gian xuất báo cáo
- Bảng chi tiết:
  - STT
  - Mã Booking
  - Tên khách
  - SĐT
  - Loại phòng
  - Số phòng (highlight màu đỏ)
  - Check-in
  - Check-out
  - Trạng thái (Đã check-out / Chưa check-out)
- Footer: Tổng số khách đi

#### Test Cases

**Test Case 1: Danh sách khách đi hôm nay**

**Request:**
```bash
GET http://localhost:5000/api/reports/departures
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File PDF được download
- [ ] Có warning về việc chuẩn bị hóa đơn
- [ ] Số phòng highlight màu đỏ
- [ ] Trạng thái hiển thị đúng (Đã check-out / Chưa check-out)

### 3.3. Báo cáo Tình trạng phòng (Room Status Report)

#### API Endpoint

```
GET http://localhost:5000/api/reports/room-status
```

**Authentication:** Required (Admin/Staff only)
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ đầy đủ:**
```
GET http://localhost:5000/api/reports/room-status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
- Content-Type: `application/pdf`
- File download với tên: `bao-cao-tinh-trang-phong-{today}.pdf`

#### Nội Dung Báo Cáo

- Header: BEAN HOTEL - BÁO CÁO TÌNH TRẠNG PHÒNG
- Summary box: Hiển thị số lượng phòng theo từng trạng thái:
  - Sạch (Sẵn sàng) - màu xanh
  - Đã đặt - màu xanh dương
  - Đang sử dụng - màu vàng
  - Đã trả phòng - màu cam
  - Bẩn (Chờ dọn) - màu đỏ
  - Tổng số phòng
- Chi tiết theo trạng thái:
  - Mỗi trạng thái có một section riêng
  - Bảng liệt kê: STT, Số phòng, Loại phòng, Khách sạn

**Lưu ý:** PDF xuất ở chế độ landscape (ngang) để hiển thị nhiều thông tin hơn.

#### Test Cases

**Test Case 1: Báo cáo tình trạng phòng**

**Request:**
```bash
GET http://localhost:5000/api/reports/room-status
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Kiểm tra:**
- [ ] File PDF được download (landscape)
- [ ] Summary box hiển thị đầy đủ các trạng thái
- [ ] Có section cho mỗi trạng thái (chỉ hiển thị nếu có phòng)
- [ ] Bảng chi tiết có đầy đủ thông tin
- [ ] Màu sắc phân biệt rõ ràng các trạng thái

**Test Case 2: Kiểm tra tổng số phòng**

**Kiểm tra:**
- [ ] Tổng số phòng = Tổng của tất cả các trạng thái
- [ ] Không có phòng nào bị thiếu

## Test Với Postman

### 1. Import Collection

Tạo các request mới trong Postman:

#### Báo cáo Doanh thu (Excel)
```
GET http://localhost:5000/api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31
Headers: Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ với Postman:**
- Method: GET
- URL: `http://localhost:5000/api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31`
- Headers:
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Click Send → File Excel sẽ được download tự động

#### Báo cáo Công suất (Excel)
```
GET http://localhost:5000/api/reports/occupancy?start_date=2024-01-01&end_date=2024-01-31
Headers: Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ với Postman:**
- Method: GET
- URL: `http://localhost:5000/api/reports/occupancy?start_date=2024-01-01&end_date=2024-01-31`
- Headers:
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`

#### Danh sách Khách đến (PDF)
```
GET http://localhost:5000/api/reports/arrivals?date=2024-01-15
Headers: Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ với Postman:**
- Method: GET
- URL: `http://localhost:5000/api/reports/arrivals?date=2024-01-15`
- Headers:
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Nếu không có `date`, mặc định là hôm nay: `http://localhost:5000/api/reports/arrivals`

#### Danh sách Khách đi (PDF)
```
GET http://localhost:5000/api/reports/departures?date=2024-01-15
Headers: Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ với Postman:**
- Method: GET
- URL: `http://localhost:5000/api/reports/departures?date=2024-01-15`
- Headers:
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Nếu không có `date`, mặc định là hôm nay: `http://localhost:5000/api/reports/departures`

#### Báo cáo Tình trạng phòng (PDF)
```
GET http://localhost:5000/api/reports/room-status
Headers: Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Ví dụ với Postman:**
- Method: GET
- URL: `http://localhost:5000/api/reports/room-status`
- Headers:
  - `Authorization: Bearer YOUR_ADMIN_TOKEN`

### 2. Send Request

- Click "Send"
- Response sẽ là file Excel hoặc PDF (binary)
- Postman sẽ tự động download file

### 3. Kiểm Tra File

- **Excel:** Mở bằng Microsoft Excel hoặc Google Sheets
- **PDF:** Mở bằng Adobe Reader hoặc browser

## Test Với cURL

### Báo cáo Doanh thu (Excel)
```bash
curl -X GET \
  "http://localhost:5000/api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
  --output revenue-report.xlsx
```

### Báo cáo Công suất (Excel)
```bash
curl -X GET \
  "http://localhost:5000/api/reports/occupancy?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output occupancy-report.xlsx
```

### Danh sách Khách đến (PDF)
```bash
curl -X GET \
  "http://localhost:5000/api/reports/arrivals?date=2024-01-15" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output arrivals.pdf
```

**Không có date (mặc định hôm nay):**
```bash
curl -X GET \
  "http://localhost:5000/api/reports/arrivals" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output arrivals-today.pdf
```

### Danh sách Khách đi (PDF)
```bash
curl -X GET \
  "http://localhost:5000/api/reports/departures?date=2024-01-15" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output departures.pdf
```

**Không có date (mặc định hôm nay):**
```bash
curl -X GET \
  "http://localhost:5000/api/reports/departures" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output departures-today.pdf
```

### Báo cáo Tình trạng phòng (PDF)
```bash
curl -X GET \
  "http://localhost:5000/api/reports/room-status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output room-status.pdf
```

## Lỗi Thường Gặp

### 1. Lỗi 400: Thiếu tham số
- **Nguyên nhân:** Thiếu `start_date` hoặc `end_date` (cho báo cáo Excel)
- **Giải pháp:** Kiểm tra query parameters

### 2. Lỗi 403: Không có quyền
- **Nguyên nhân:** Token không phải admin/staff
- **Giải pháp:** Đăng nhập với tài khoản admin/staff

### 3. File Excel không mở được
- **Nguyên nhân:** File bị lỗi trong quá trình tạo
- **Giải pháp:** Kiểm tra log server, đảm bảo exceljs được cài đúng

### 4. File PDF trống hoặc lỗi
- **Nguyên nhân:** Puppeteer chưa khởi tạo hoặc lỗi render
- **Giải pháp:** Kiểm tra log server, đảm bảo Puppeteer đã được cài đặt

### 5. Số liệu tính sai
- **Nguyên nhân:** Logic tính toán sai hoặc dữ liệu không đầy đủ
- **Giải pháp:** 
  - Kiểm tra booking có đầy đủ relationships không
  - Kiểm tra payment có status 'completed' không
  - Kiểm tra booking_services có status != 'cancelled' không

## Checklist Hoàn Chỉnh

Trước khi release, đảm bảo:

### Báo cáo Excel:
- [ ] File Excel có thể mở được
- [ ] Format số tiền đúng (VNĐ, không có dấu phẩy thập phân)
- [ ] Header có màu nền và font đậm
- [ ] Các công thức tính toán đúng
- [ ] Tên file đúng format

### Báo cáo PDF:
- [ ] File PDF có thể mở được
- [ ] Layout đẹp, dễ đọc
- [ ] Header và footer hiển thị đúng
- [ ] Bảng có đầy đủ thông tin
- [ ] Màu sắc phân biệt rõ ràng (nếu có)
- [ ] Tên file đúng format

## Ghi Chú

- **Base URL:** Tất cả API endpoints sử dụng `http://localhost:5000/api`
- Tất cả báo cáo đều yêu cầu quyền Admin/Staff
- Thời gian tính theo timezone Asia/Ho_Chi_Minh
- Excel reports sử dụng thư viện ExcelJS
- PDF reports sử dụng Puppeteer (giống hóa đơn)
- Báo cáo vận hành nên được in hàng ngày để sử dụng tại lễ tân
- Báo cáo doanh thu và công suất nên xuất định kỳ (tuần/tháng) cho quản lý

## Tổng Hợp Tất Cả API Endpoints

### 1. Báo cáo Doanh thu (Excel)
```
GET http://localhost:5000/api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### 2. Báo cáo Công suất phòng (Excel)
```
GET http://localhost:5000/api/reports/occupancy?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### 3. Danh sách Khách đến (PDF)
```
GET http://localhost:5000/api/reports/arrivals?date=2024-01-15
Authorization: Bearer YOUR_ADMIN_TOKEN

Hoặc (mặc định hôm nay):
GET http://localhost:5000/api/reports/arrivals
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### 4. Danh sách Khách đi (PDF)
```
GET http://localhost:5000/api/reports/departures?date=2024-01-15
Authorization: Bearer YOUR_ADMIN_TOKEN

Hoặc (mặc định hôm nay):
GET http://localhost:5000/api/reports/departures
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### 5. Báo cáo Tình trạng phòng (PDF)
```
GET http://localhost:5000/api/reports/room-status
Authorization: Bearer YOUR_ADMIN_TOKEN
```

