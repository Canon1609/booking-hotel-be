const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

// Lấy thông tin profile người dùng
exports.getUserProfile = async (req, res) => {
  try {
    const { user_id } = req.user; // Lấy user_id từ token đã xác thực
    
    const user = await User.findOne({ 
      where: { user_id },
      attributes: ['user_id', 'full_name', 'email', 'phone', 'role', 'created_at'] // Loại bỏ password
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({
      message: 'Lấy thông tin profile thành công',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Cập nhật thông tin profile người dùng
exports.updateUserProfile = async (req, res) => {
  try {
    const { user_id } = req.user; // Lấy user_id từ token đã xác thực
    const { full_name, phone } = req.body;

    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Cập nhật thông tin
    if (full_name) user.full_name = full_name;
    if (phone) user.phone = phone;
    
    await user.save();

    res.status(200).json({
      message: 'Cập nhật thông tin thành công',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xóa tài khoản người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.user; // Lấy user_id từ token đã xác thực

    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await user.destroy();

    res.status(200).json({ message: 'Tài khoản đã được xóa thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};
