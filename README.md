# booking-hotel-be
1. Register (POST )
URL: http://localhost:5000/api/auth/register
Body (json)
{
  "full_name": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "password": "123456"
}
Response
{
    "message": "Đăng ký thành công, vui lòng kiểm tra email để xác nhận.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU5MzA1NzczLCJleHAiOjE3NTkzOTIxNzN9.S1CJKS3JXrRueDqmbrk0bdqs1Hx0TFHhf9A1F8lODdo"
}

2. Verify (GET)
http://localhost:5000/api/auth/verify-email?token=(đã gửi trong email xác minh)
{
    "message": "Xác minh email thành công!"
}

3. Login(POST)
URL: http://localhost:5000/api/auth/login
{
  "email": "nguyenvana@example.com",
  "password": "123456"
}
Res
{
    "message": "Đăng nhập thành công",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzU5MzA2NDIzLCJleHAiOjE3NTkzOTI4MjN9.uOdorvEWkLItysErlSbzRIt1BwoyVypMaJspU0GtyOs"
}


Thêm Authorization (JWT):
Chuyển đến tab "Authorization".
Chọn "Bearer Token" từ dropdown "Type".
Nhập JWT hợp lệ vào trường Token. (token lấy từ đăng nhập sau khi đăng nhập thành công)	


5. Forgot pass(POST)
http://localhost:5000/api/auth/forgot-password
Gửi email chứa link reset có token (nhớ lưu token reset)
{
  "email": "nguyenvana@example.com"
}

6.Reset Pass(POST)
http://localhost:5000/api/auth/reset-password		
Đổi mật khẩu mới từ link có token
{
    "token": "TOKEN_LẤY_TỪ_EMAIL_reset",
    "newPassword": "newpassword123",
    "confirmPassword": "newpassword123"
}
------------------------------------------------------------------------------------------------








