const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sendEmail = require('../utils/email.util');
const { signToken } = require('../utils/jwt.util');

// Lấy thông tin profile người dùng
exports.getUserProfile = async (req, res) => {
  try {
    const { id: user_id } = req.user; // Lấy user_id từ token đã xác thực
    
    const user = await User.findOne({ 
      where: { user_id },
      attributes: ['user_id', 'full_name', 'email', 'phone', 'date_of_birth', 'role', 'is_verified', 'created_at', 'updated_at'] // Loại bỏ password
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
    const { id: user_id } = req.user; // Lấy user_id từ token đã xác thực
    const { full_name, phone, date_of_birth } = req.body;

    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Cập nhật thông tin
    if (full_name) user.full_name = full_name;
    if (phone) user.phone = phone;
    if (date_of_birth) user.date_of_birth = date_of_birth;
    
    await user.save();

    res.status(200).json({
      message: 'Cập nhật thông tin thành công',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        date_of_birth: user.date_of_birth,
        role: user.role,
        is_verified: user.is_verified,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xóa tài khoản người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { id: user_id } = req.user; // Lấy user_id từ token đã xác thực

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

// ========== ADMIN APIs ==========

// Lấy danh sách tất cả người dùng (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: ['user_id', 'full_name', 'email', 'phone', 'date_of_birth', 'role', 'is_verified', 'created_at', 'updated_at'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      message: 'Lấy danh sách người dùng thành công',
      users: users.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.count / limit),
        totalUsers: users.count,
        usersPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy người dùng theo ID (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { user_id: id },
      attributes: ['user_id', 'full_name', 'email', 'phone', 'date_of_birth', 'role', 'is_verified', 'created_at', 'updated_at']
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({
      message: 'Lấy thông tin người dùng thành công',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tạo người dùng mới (Admin only)
exports.createUser = async (req, res) => {
  try {
    const { full_name, email, phone, date_of_birth, password, role = 'customer' } = req.body;

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hashed = await bcrypt.hash(password, saltRounds);

    // Tạo user mới
    const newUser = await User.create({
      full_name,
      email,
      phone,
      date_of_birth,
      password_hashed,
      role
    });

    // Gửi email xác nhận cho user mới
    const token = signToken({ id: newUser.user_id, role: newUser.role });
    const { CLIENT_URL } = require('../config/config');
    const confirmationLink = `${CLIENT_URL}/verify-email?token=${token}`;
    const emailSubject = '🎉 Chào mừng đến với Bean Hotel - Xác nhận tài khoản';
    const emailText = `Chào ${full_name},\n\nChào mừng bạn đến với Bean Hotel!\n\nTài khoản của bạn đã được tạo bởi quản trị viên. Vui lòng nhấp vào đường dẫn sau để xác nhận đăng ký tài khoản: ${confirmationLink}\n\nTrân trọng,\nĐội ngũ Bean Hotel`;
    const emailHTML = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px;">
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: 300;">🏨 Bean Hotel</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">Trải nghiệm nghỉ dưỡng tuyệt vời</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 24px;">🎉 Chào mừng ${full_name}!</h2>
          <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0;">
            Tài khoản của bạn đã được tạo bởi quản trị viên Bean Hotel. Để hoàn tất quá trình đăng ký, 
            vui lòng xác nhận email của bạn bằng cách nhấp vào nút bên dưới.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationLink}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    transition: all 0.3s ease;">
            ✨ Xác nhận tài khoản
          </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="color: #6c757d; font-size: 14px; margin: 0; text-align: center;">
            <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu tạo tài khoản này, 
            vui lòng bỏ qua email này.
          </p>
        </div>
        
        <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
          <p style="color: #7f8c8d; font-size: 14px; margin: 0; text-align: center;">
            Trân trọng,<br>
            <strong style="color: #2c3e50;">Đội ngũ Bean Hotel</strong><br>
            📧 <a href="mailto:beanhotelvn@gmail.com" style="color: #667eea; text-decoration: none;">beanhotelvn@gmail.com</a>
          </p>
        </div>
      </div>
    </div>`;

    try {
      await sendEmail(email, emailSubject, emailText, emailHTML);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Không dừng quá trình tạo user nếu gửi email thất bại
    }

    res.status(201).json({
      message: 'Tạo người dùng thành công và đã gửi email xác nhận',
      user: {
        user_id: newUser.user_id,
        full_name: newUser.full_name,
        email: newUser.email,
        phone: newUser.phone,
        date_of_birth: newUser.date_of_birth,
        role: newUser.role,
        is_verified: newUser.is_verified,
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Cập nhật người dùng (Admin toàn quyền)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, date_of_birth, role, is_verified } = req.body;

    const user = await User.findOne({ where: { user_id: id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra email trùng lặp (nếu có thay đổi email)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã được sử dụng' });
      }
    }

    // Cập nhật thông tin
    if (full_name) user.full_name = full_name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (date_of_birth !== undefined) user.date_of_birth = date_of_birth;
    if (role) user.role = role;
    if (is_verified !== undefined) user.is_verified = is_verified;

    await user.save();

    res.status(200).json({
      message: 'Cập nhật người dùng thành công',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        date_of_birth: user.date_of_birth,
        role: user.role,
        is_verified: user.is_verified,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xóa người dùng (Admin only)
exports.deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ where: { user_id: id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await user.destroy();

    res.status(200).json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tìm kiếm người dùng theo email
exports.searchUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email để tìm kiếm' });
    }

    const users = await User.findAll({
      where: {
        email: { [Op.like]: `%${email}%` }
      },
      attributes: ['user_id', 'full_name', 'email', 'phone', 'date_of_birth', 'role', 'is_verified', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      message: 'Tìm kiếm người dùng thành công',
      users,
      total: users.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findOne({ where: { user_id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hashed);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    // Hash mật khẩu mới
    const saltRounds = 10;
    const newPasswordHashed = await bcrypt.hash(newPassword, saltRounds);

    // Cập nhật mật khẩu
    user.password_hashed = newPasswordHashed;
    await user.save();

    res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tạo người dùng nhanh cho walk-in booking (chỉ cần tên và CCCD)
exports.createQuickUser = async (req, res) => {
  try {
    const { full_name, cccd } = req.body;

    // Kiểm tra thông tin bắt buộc
    if (!full_name || !cccd) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ tên và số CCCD' 
      });
    }

    // Kiểm tra CCCD đã tồn tại chưa
    const existingUser = await User.findOne({ where: { cccd } });
    if (existingUser) {
      return res.status(200).json({
        message: 'Tìm thấy người dùng đã tồn tại',
        user: {
          user_id: existingUser.user_id,
          full_name: existingUser.full_name,
          cccd: existingUser.cccd,
          is_existing: true
        }
      });
    }

    // Tạo user mới với role customer và các field khác null
    const user = await User.create({
      full_name,
      cccd,
      email: null,
      phone: null,
      password_hashed: null,
      role: 'customer',
      is_verified: false,
      date_of_birth: null
    });

    return res.status(201).json({
      message: 'Tạo người dùng thành công',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        cccd: user.cccd,
        role: user.role,
        is_existing: false
      }
    });

  } catch (error) {
    console.error('Error creating quick user:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};