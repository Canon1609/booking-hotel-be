const express = require('express');
const router = express.Router();
const { 
  getUserProfile, 
  updateUserProfile, 
  deleteUser,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUserById,
  searchUserByEmail,
  changePassword
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// ========== USER APIs ==========

// Lấy thông tin profile người dùng (Bảo vệ với middleware)
router.get('/profile', protect, getUserProfile);

// Cập nhật thông tin profile người dùng (Bảo vệ với middleware)
router.put('/profile', protect, updateUserProfile);

// Xóa tài khoản người dùng (Bảo vệ với middleware)
router.delete('/profile', protect, deleteUser);

// Đổi mật khẩu (Bảo vệ với middleware)
router.put('/change-password', protect, changePassword);

// ========== ADMIN APIs ==========

// Lấy danh sách tất cả người dùng (Admin only)
router.get('/', protect, adminOnly, getAllUsers);

// Lấy người dùng theo ID (Admin only)
router.get('/:id', protect, adminOnly, getUserById);

// Tạo người dùng mới (Admin only)
router.post('/', protect, adminOnly, createUser);

// Cập nhật người dùng (Admin toàn quyền)
router.put('/:id', protect, adminOnly, updateUser);

// Xóa người dùng (Admin only)
router.delete('/:id', protect, adminOnly, deleteUserById);

// Tìm kiếm người dùng theo email
router.get('/search/email', protect, adminOnly, searchUserByEmail);

module.exports = router;