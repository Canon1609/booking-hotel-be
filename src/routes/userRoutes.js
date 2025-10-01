const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, deleteUser } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// Lấy thông tin profile người dùng (Bảo vệ với middleware)
router.get('/profile', protect, getUserProfile);

// Cập nhật thông tin profile người dùng (Bảo vệ với middleware)
router.put('/profile', protect, updateUserProfile);

// Xóa tài khoản người dùng (Bảo vệ với middleware)
router.delete('/profile', protect, deleteUser);

module.exports = router;