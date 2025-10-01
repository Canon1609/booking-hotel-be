const nodemailer = require('nodemailer');

// Cấu hình Nodemailer với Gmail (hoặc các dịch vụ SMTP khác)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,    // Tài khoản email gửi
    pass: process.env.EMAIL_PASS,    // Mật khẩu ứng dụng Gmail
  },
});

// Hàm gửi email
const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,  // Tài khoản gửi email
    to,                           // Địa chỉ người nhận
    subject,                      // Tiêu đề email
    text,                         // Nội dung email dạng text
    html,                         // Nội dung email dạng HTML (nếu có)
  };

  try {
    await transporter.sendMail(mailOptions);  // Gửi email
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = sendEmail;
