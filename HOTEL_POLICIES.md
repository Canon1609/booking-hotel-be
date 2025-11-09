# 📋 CHÍNH SÁCH KHÁCH SẠN

## Mục lục
1. [Chính sách hủy đổi và hoàn tiền](#1-chính-sách-hủy-đổi-và-hoàn-tiền)
2. [Chính sách check-in và check-out](#2-chính-sách-check-in-và-check-out)
3. [Chính sách thanh toán](#3-chính-sách-thanh-toán)
4. [Chính sách bảo mật dữ liệu cá nhân](#4-chính-sách-bảo-mật-dữ-liệu-cá-nhân)
5. [Quy định đặt phòng](#5-quy-định-đặt-phòng)
6. [Quy định sử dụng dịch vụ](#6-quy-định-sử-dụng-dịch-vụ)
7. [Quy định khác](#7-quy-định-khác)

---

## 1. CHÍNH SÁCH HỦY ĐỔI VÀ HOÀN TIỀN

### 1.1. Tổng quan

Khách sạn áp dụng chính sách hủy đổi và hoàn tiền linh hoạt, công bằng cho khách hàng. Chính sách được áp dụng tự động dựa trên thời gian hủy so với thời gian check-in.

### 1.2. Quy tắc áp dụng

**⚠️ LƯU Ý QUAN TRỌNG:**
- Chính sách chỉ áp dụng cho các booking đã thanh toán (`payment_status = 'paid'`)
- Không thể hủy booking đã check-in hoặc đã check-out
- Thời gian check-in mặc định: **14:00 (2:00 PM)** ngày check-in
- Tất cả thời gian được tính theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)

### 1.3. Chính sách hủy phòng (ưu tiên theo thứ tự)

#### 🎯 Ngoại lệ 1 tiếng (Ưu tiên cao nhất)

**Điều kiện:** Hủy trong vòng **≤ 1 tiếng** kể từ lúc đặt phòng

**Chính sách:**
- ✅ **Hoàn tiền: 85%** tổng giá trị booking
- ❌ **Phí giữ lại: 15%** - Khách sạn giữ lại làm phí hủy
- 📝 **Trạng thái:** `partial_refunded`
- ⏰ **Áp dụng:** Bất kể còn bao nhiêu giờ trước check-in

**Ví dụ:**
- Đặt phòng: 27/01/2025 lúc 10:00
- Hủy phòng: 27/01/2025 lúc 10:30 (30 phút sau)
- Check-in: 28/01/2025 lúc 14:00
- **Kết quả:** Hoàn 85%, phí 15% (ngoại lệ áp dụng)

#### 📅 Trường hợp 1: Hủy trước 48 giờ (không phải ngoại lệ 1 tiếng)

**Điều kiện:** 
- Hủy **≥ 48 giờ** trước 14:00 ngày check-in
- **VÀ** đã qua hơn 1 tiếng kể từ lúc đặt phòng

**Chính sách:**
- ✅ **Hoàn tiền: 70%** tổng giá trị booking
- ❌ **Phí giữ lại: 30%** - Khách sạn giữ lại làm phí hủy
- 📝 **Trạng thái:** `partial_refunded`

**Ví dụ:**
- Đặt phòng: 25/01/2025 lúc 10:00
- Hủy phòng: 27/01/2025 lúc 10:00 (2 ngày sau, > 1 tiếng)
- Check-in: 29/01/2025 lúc 14:00 (còn 48 giờ)
- **Kết quả:** Hoàn 70%, phí 30%

#### ⏰ Trường hợp 2: Hủy trong vòng 48 giờ (không phải ngoại lệ 1 tiếng)

**Điều kiện:**
- Hủy **< 48 giờ** trước 14:00 ngày check-in
- **VÀ** đã qua hơn 1 tiếng kể từ lúc đặt phòng

**Chính sách:**
- ❌ **Hoàn tiền: 0%** - Mất toàn bộ số tiền
- 📝 **Trạng thái:** `paid` (giữ nguyên)
- ⚠️ **Lưu ý:** Bao gồm cả trường hợp không đến (no-show)

**Ví dụ:**
- Đặt phòng: 27/01/2025 lúc 10:00
- Hủy phòng: 28/01/2025 lúc 10:00 (1 ngày sau, > 1 tiếng)
- Check-in: 29/01/2025 lúc 14:00 (còn 28 giờ < 48h)
- **Kết quả:** Mất 100% (0% hoàn)

### 1.4. Quy trình hoàn tiền

#### 1.4.1. Hoàn tiền tự động (User tự hủy)

Khi khách hàng tự hủy booking thông qua hệ thống:

1. **Hệ thống tự động tính toán** số tiền hoàn theo chính sách
2. **Tạo bản ghi hoàn tiền** trong hệ thống với trạng thái `pending`
3. **Gửi email** yêu cầu khách cung cấp thông tin tài khoản ngân hàng để hoàn tiền
4. **Admin xử lý hoàn tiền thủ công** qua chuyển khoản hoặc PayOS
5. **Admin đánh dấu hoàn tiền** trong hệ thống → Gửi email xác nhận cho khách

**Phương thức hoàn tiền:**
- Booking online (PayOS): Hoàn qua PayOS hoặc chuyển khoản
- Booking walk-in (tiền mặt): Hoàn qua chuyển khoản hoặc tiền mặt

#### 1.4.2. Hoàn tiền thủ công (Admin hủy)

Khi admin hủy booking cho khách:

1. **Admin hủy booking** → Không hoàn tiền tự động
2. **Admin xử lý hoàn tiền thủ công** theo thỏa thuận với khách
3. **Admin đánh dấu hoàn tiền** trong hệ thống với số tiền và phương thức
4. **Hệ thống gửi email** xác nhận hoàn tiền cho khách

**Lưu ý:**
- Admin có thể hoàn một phần hoặc toàn bộ tùy theo thỏa thuận
- Số tiền hoàn không được vượt quá mức cho phép theo chính sách

### 1.5. Chính sách đổi phòng

**Không hỗ trợ "đổi" trực tiếp.** Khách hàng muốn đổi phòng phải:

1. **Hủy đặt phòng hiện tại** (chịu chính sách hủy)
2. **Đặt phòng mới** với loại phòng/ngày mới
3. **Hoặc liên hệ admin** để admin hủy và đặt lại (xử lý thủ công)

### 1.6. Điều kiện không thể hủy

Không thể hủy booking trong các trường hợp sau:

- ✅ Booking đã check-in (`booking_status = 'checked_in'`)
- ✅ Booking đã check-out (`booking_status = 'checked_out'`)
- ✅ Booking chưa thanh toán (`payment_status = 'pending'`) - Có thể hủy nhưng không áp dụng chính sách hoàn tiền

### 1.7. Quyền hủy booking

- **Khách hàng:** Chỉ có thể hủy booking của chính mình
- **Admin:** Có thể hủy bất kỳ booking nào (trừ đã check-out)

---

## 2. CHÍNH SÁCH CHECK-IN VÀ CHECK-OUT

### 2.1. Giờ check-in

#### 2.1.1. Booking online (đặt phòng trực tuyến)

**Giờ check-in mặc định:** **14:00 (2:00 PM)** ngày check-in

**Quy định:**
- ✅ Booking online chỉ được check-in từ **12:00 trưa** ngày check-in trở đi
- ❌ Không thể check-in trước 12:00 trưa ngày check-in
- 📝 Phòng đã được gán sẵn khi đặt phòng thành công

**Ví dụ:**
- Check-in date: 28/01/2025
- Có thể check-in từ: 28/01/2025 lúc 12:00 trưa
- Giờ check-in mặc định: 28/01/2025 lúc 14:00

#### 2.1.2. Booking walk-in (đặt phòng trực tiếp tại khách sạn)

**Quy định:**
- ✅ Có thể check-in ngay khi đặt phòng
- ✅ Admin/Staff có thể gán phòng khi check-in
- 📝 Phòng có thể chưa được gán khi tạo booking (cần gán khi check-in)

### 2.2. Giờ check-out

**Giờ check-out mặc định:** **12:00 trưa** ngày check-out

**Quy định:**
- ✅ Khách có thể check-out sớm hơn giờ quy định
- ⚠️ Check-out muộn có thể phát sinh phụ thu (tùy theo chính sách)
- 📝 Khi check-out, hệ thống tự động cập nhật `payment_status = 'paid'` cho walk-in booking

### 2.3. Quy trình check-in

1. **Khách đến khách sạn** với mã đặt phòng (booking code)
2. **Nhân viên lễ tân** xác minh booking trong hệ thống
3. **Kiểm tra điều kiện check-in:**
   - Booking ở trạng thái `confirmed`
   - Đã thanh toán (với booking online)
   - Đã đến giờ check-in (với booking online)
4. **Thực hiện check-in:**
   - Ghi nhận thời gian check-in
   - Cập nhật trạng thái booking: `confirmed` → `checked_in`
   - Cập nhật trạng thái phòng: `booked` → `in_use`
5. **Gán phòng cho khách** (nếu chưa gán - walk-in booking)

### 2.4. Quy trình check-out

1. **Khách đến lễ tân** để check-out
2. **Nhân viên lễ tân** kiểm tra:
   - Booking ở trạng thái `checked_in`
   - Đã thanh toán đầy đủ (dịch vụ phát sinh, phụ thu nếu có)
3. **Thực hiện check-out:**
   - Ghi nhận thời gian check-out
   - Cập nhật trạng thái booking: `checked_in` → `checked_out`
   - Cập nhật trạng thái phòng: `in_use` → `checked_out`
   - Cập nhật `payment_status = 'paid'` (cho walk-in booking)
4. **Tạo hóa đơn** (nếu cần)
5. **Gửi email mời đánh giá** cho khách

### 2.5. Trạng thái phòng sau check-out

Sau khi khách check-out, phòng sẽ trải qua các trạng thái:

1. **`checked_out`** → Phòng đã trả, chờ dọn dẹp
2. **`cleaning`** → Phòng đang được dọn dẹp (admin cập nhật)
3. **`available`** → Phòng sẵn sàng cho booking mới (admin cập nhật)

**Lưu ý:** Chỉ admin mới có quyền cập nhật trạng thái phòng theo luồng trên.

---

## 3. CHÍNH SÁCH THANH TOÁN

### 3.1. Phương thức thanh toán

#### 3.1.1. Booking online (đặt phòng trực tuyến)

**Phương thức:** Thanh toán qua PayOS

**Quy trình:**
1. Khách chọn phòng và ngày ở
2. Hệ thống tạo booking tạm thời (giữ chỗ 30 phút)
3. Khách thanh toán qua link PayOS (QR code hoặc web)
4. PayOS xác nhận thanh toán → Webhook gửi về hệ thống
5. Hệ thống tạo booking vĩnh viễn và gán phòng
6. Gửi email xác nhận đặt phòng cho khách

**Lưu ý:**
- Booking tạm thời hết hạn sau 30 phút nếu chưa thanh toán
- Phải thanh toán đầy đủ trước khi check-in

#### 3.1.2. Booking walk-in (đặt phòng trực tiếp)

**Phương thức:** Thanh toán tiền mặt hoặc thẻ tại khách sạn

**Quy trình:**
1. Khách đến khách sạn và yêu cầu đặt phòng
2. Admin/Staff tạo booking trong hệ thống
3. Khách thanh toán tại quầy lễ tân
4. Admin cập nhật `payment_status = 'paid'`
5. Check-in ngay (nếu phòng sẵn sàng)

**Lưu ý:**
- Có thể thanh toán một phần khi đặt, phần còn lại khi check-out
- Khi check-out, hệ thống tự động cập nhật `payment_status = 'paid'`

### 3.2. Trạng thái thanh toán

Hệ thống quản lý các trạng thái thanh toán sau:

- **`pending`**: Chưa thanh toán
- **`paid`**: Đã thanh toán đầy đủ
- **`partial_refunded`**: Đã hoàn tiền một phần
- **`refunded`**: Đã hoàn tiền toàn bộ

### 3.3. Thanh toán dịch vụ

#### 3.3.1. Dịch vụ trả trước (Prepaid)

- Thanh toán khi đặt phòng (cùng với tiền phòng)
- Áp dụng cho: Dịch vụ spa, tour, bữa ăn đặt trước...

#### 3.3.2. Dịch vụ trả sau (Postpaid)

- Thanh toán khi check-out hoặc khi sử dụng
- Áp dụng cho: Mini bar, dịch vụ phòng, giặt ủi...

### 3.4. Hóa đơn

**Tạo hóa đơn:**
- Hóa đơn được tạo khi check-out hoặc theo yêu cầu
- Hóa đơn bao gồm:
  - Tiền phòng (Accommodation)
  - Dịch vụ đã sử dụng
  - Phụ thu (nếu có)
  - Giảm giá (nếu có)
  - Tổng thanh toán online (nếu có)
  - Số tiền đã hoàn (nếu có)
  - Số tiền còn lại phải thanh toán

**Định dạng:**
- PDF: Tải về hoặc gửi email
- HTML: Xem trực tiếp trên trình duyệt

---

## 4. CHÍNH SÁCH BẢO MẬT DỮ LIỆU CÁ NHÂN

### 4.1. Cam kết bảo mật

Khách sạn cam kết bảo vệ thông tin cá nhân của khách hàng theo các nguyên tắc:

- ✅ **Bảo mật:** Thông tin được mã hóa và lưu trữ an toàn
- ✅ **Minh bạch:** Khách hàng được thông báo về việc thu thập và sử dụng dữ liệu
- ✅ **Kiểm soát:** Khách hàng có quyền truy cập, chỉnh sửa và xóa dữ liệu của mình
- ✅ **Tuân thủ:** Tuân thủ các quy định về bảo vệ dữ liệu cá nhân

### 4.2. Thông tin thu thập

Khách sạn thu thập các thông tin sau:

#### 4.2.1. Thông tin đăng ký tài khoản

- Họ và tên
- Email
- Số điện thoại
- Ngày sinh (tùy chọn)
- Mật khẩu (được mã hóa bằng bcrypt)
- CCCD/CMND (tùy chọn)

#### 4.2.2. Thông tin đặt phòng

- Thông tin khách hàng
- Ngày check-in/check-out
- Loại phòng và số lượng
- Số người ở
- Dịch vụ đã chọn
- Thông tin thanh toán

#### 4.2.3. Thông tin sử dụng dịch vụ

- Lịch sử đặt phòng
- Lịch sử thanh toán
- Đánh giá và phản hồi
- Lịch sử chat với chatbot

### 4.3. Mục đích sử dụng dữ liệu

Dữ liệu được sử dụng cho các mục đích:

1. **Xử lý đặt phòng:** Tạo và quản lý booking
2. **Thanh toán:** Xử lý thanh toán và hoàn tiền
3. **Dịch vụ khách hàng:** Hỗ trợ và giải đáp thắc mắc
4. **Cải thiện dịch vụ:** Phân tích và cải thiện trải nghiệm
5. **Marketing:** Gửi thông tin khuyến mãi (với sự đồng ý)
6. **Tuân thủ pháp luật:** Đáp ứng yêu cầu pháp lý

### 4.4. Bảo mật dữ liệu

#### 4.4.1. Mã hóa

- **Mật khẩu:** Được mã hóa bằng bcrypt (one-way hashing)
- **Token JWT:** Được ký bằng secret key, có thời hạn
- **Kết nối:** HTTPS cho tất cả giao tiếp

#### 4.4.2. Xác thực và phân quyền

- **JWT Token:** Xác thực người dùng qua JWT token
- **Phân quyền:** 
  - Khách hàng chỉ có thể truy cập dữ liệu của chính mình
  - Admin có quyền truy cập toàn bộ hệ thống
- **Middleware bảo vệ:** Tất cả API quan trọng đều được bảo vệ bằng authentication middleware

#### 4.4.3. Lưu trữ

- **Database:** Dữ liệu được lưu trữ trong database có bảo mật
- **Backup:** Dữ liệu được sao lưu định kỳ
- **Access Control:** Chỉ nhân viên được ủy quyền mới có thể truy cập

### 4.5. Quyền của khách hàng

Khách hàng có các quyền sau đối với dữ liệu của mình:

#### 4.5.1. Quyền truy cập

- Xem thông tin cá nhân
- Xem lịch sử đặt phòng
- Xem lịch sử thanh toán

#### 4.5.2. Quyền chỉnh sửa

- Cập nhật thông tin cá nhân (họ tên, số điện thoại, ngày sinh)
- Thay đổi mật khẩu

#### 4.5.3. Quyền xóa

- Xóa tài khoản (sẽ xóa tất cả dữ liệu liên quan)
- **Lưu ý:** Dữ liệu đặt phòng đã hoàn tất có thể được lưu trữ theo yêu cầu pháp lý

### 4.6. Chia sẻ dữ liệu

Khách sạn **KHÔNG** chia sẻ dữ liệu cá nhân với bên thứ ba, trừ:

- **Nhà cung cấp dịch vụ:** PayOS (xử lý thanh toán), Email service (gửi email)
- **Yêu cầu pháp lý:** Khi có yêu cầu từ cơ quan nhà nước có thẩm quyền
- **Với sự đồng ý:** Khi khách hàng đồng ý chia sẻ

### 4.7. Cookie và Tracking

- **Session Cookie:** Sử dụng để duy trì phiên đăng nhập
- **Analytics:** Có thể sử dụng công cụ phân tích để cải thiện dịch vụ
- **Third-party:** Không chia sẻ cookie với bên thứ ba không cần thiết

### 4.8. Bảo mật tài khoản

Khách hàng có trách nhiệm:

- ✅ Bảo mật thông tin đăng nhập (email, mật khẩu)
- ✅ Không chia sẻ tài khoản với người khác
- ✅ Đăng xuất sau khi sử dụng trên thiết bị công cộng
- ✅ Báo cáo ngay nếu phát hiện hoạt động bất thường

### 4.9. OAuth và đăng nhập bên thứ ba

- **Google OAuth:** Hỗ trợ đăng nhập bằng Google (tùy chọn)
- **Dữ liệu Google:** Chỉ thu thập email và tên hiển thị
- **Bảo mật:** Tuân thủ chính sách bảo mật của Google

### 4.10. Liên hệ về bảo mật

Nếu có thắc mắc hoặc yêu cầu về bảo mật dữ liệu, vui lòng liên hệ:

- **Email:** support@hotelbooking.com
- **Hotline:** 1900-xxxx
- **Thời gian:** 24/7

---

## 5. QUY ĐỊNH ĐẶT PHÒNG

### 5.1. Điều kiện đặt phòng

- ✅ Khách hàng phải có tài khoản (hoặc đăng ký mới)
- ✅ Phòng phải còn trống trong khoảng thời gian yêu cầu
- ✅ Ngày check-in không được trong quá khứ
- ✅ Ngày check-out phải sau ngày check-in
- ✅ Số lượng phòng yêu cầu không được vượt quá số phòng có sẵn

### 5.2. Giữ chỗ tạm thời

- **Thời gian giữ chỗ:** 30 phút (1800 giây)
- **Tự động hủy:** Booking tạm thời sẽ tự động hết hạn nếu không thanh toán trong 30 phút
- **Redis:** Booking tạm thời được lưu trong Redis với TTL 30 phút

### 5.3. Xác nhận đặt phòng

- **Booking online:** Xác nhận ngay sau khi thanh toán thành công
- **Booking walk-in:** Xác nhận khi admin tạo booking
- **Email xác nhận:** Gửi email xác nhận cho khách hàng

### 5.4. Mã đặt phòng

- Mỗi booking có một mã đặt phòng duy nhất (booking code)
- Mã đặt phòng được sử dụng để:
  - Tra cứu booking
  - Check-in/Check-out
  - Hủy booking
  - Xem hóa đơn

---

## 6. QUY ĐỊNH SỬ DỤNG DỊCH VỤ

### 6.1. Dịch vụ khách sạn

- **Dịch vụ có sẵn:** Spa, nhà hàng, bar, gym, bể bơi...
- **Đặt trước:** Một số dịch vụ cần đặt trước
- **Thanh toán:** Có thể thanh toán trước hoặc sau khi sử dụng

### 6.2. Dịch vụ phòng

- **Mini bar:** Thanh toán khi check-out
- **Room service:** Thanh toán khi sử dụng
- **Giặt ủi:** Thanh toán khi check-out

### 6.3. Hủy dịch vụ

- Dịch vụ đã thanh toán trước có thể được hủy theo chính sách riêng
- Dịch vụ chưa sử dụng có thể được hủy miễn phí (tùy loại dịch vụ)

---

## 7. QUY ĐỊNH KHÁC

### 7.1. Đánh giá và phản hồi

- Khách hàng có thể đánh giá sau khi check-out
- Đánh giá bao gồm: điểm số, nhận xét, hình ảnh
- Email mời đánh giá được gửi tự động sau khi check-out

### 7.2. Khuyến mãi

- Khuyến mãi có thể được áp dụng khi đặt phòng
- Mã khuyến mãi có thời hạn và điều kiện sử dụng
- Không thể kết hợp nhiều khuyến mãi cho một booking

### 7.3. Trách nhiệm của khách hàng

- Cung cấp thông tin chính xác khi đặt phòng
- Thanh toán đầy đủ theo quy định
- Tuân thủ nội quy khách sạn
- Bảo quản tài sản của khách sạn

### 7.4. Trách nhiệm của khách sạn

- Cung cấp dịch vụ đúng như đã cam kết
- Bảo vệ thông tin cá nhân của khách hàng
- Xử lý khiếu nại kịp thời và công bằng
- Hoàn tiền theo chính sách đã công bố

### 7.5. Khiếu nại và giải quyết tranh chấp

- Khách hàng có thể khiếu nại qua email hoặc hotline
- Khách sạn sẽ xử lý trong vòng 7 ngày làm việc
- Tranh chấp sẽ được giải quyết theo pháp luật Việt Nam

### 7.6. Thay đổi chính sách

- Khách sạn có quyền thay đổi chính sách
- Thông báo trước ít nhất 30 ngày cho các thay đổi quan trọng
- Chính sách mới áp dụng cho các booking mới

### 7.7. Liên hệ

**Thông tin liên hệ:**

- **Email:** support@hotelbooking.com
- **Hotline:** 1900-xxxx
- **Địa chỉ:** [Địa chỉ khách sạn]
- **Thời gian hỗ trợ:** 24/7

---

## 📝 GHI CHÚ

- Tất cả thời gian được tính theo múi giờ Việt Nam (UTC+7)
- Chính sách này có hiệu lực từ ngày [Ngày có hiệu lực]
- Phiên bản: 1.0
- Cập nhật lần cuối: [Ngày cập nhật]

---

**© 2025 Hotel Booking System. All rights reserved.**

