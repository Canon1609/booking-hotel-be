const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, resetPassword, changePassword, verifyEmail } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');  // Bảo vệ route

// Đăng ký người dùng
router.post('/register', register);
// Xác minh email người dùng
router.get('/verify-email', verifyEmail);
// Đăng nhập người dùng
router.post('/login', login);

// Quên mật khẩu
router.post('/forgot-password', forgotPassword);

// Đặt lại mật khẩu
router.post('/reset-password', resetPassword);

// Đổi mật khẩu (Bảo vệ với middleware)
router.post('/change-password', protect, changePassword);

module.exports = router;
