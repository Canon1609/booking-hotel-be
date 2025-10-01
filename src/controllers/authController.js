const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const sendEmail = require('../utils/email.util');  // Gửi email
const { signToken, verifyToken } = require('../utils/jwt.util');  // Tạo và xác thực JWT token

// Đăng ký người dùng
exports.register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Kiểm tra xem người dùng đã tồn tại chưa
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký' });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo người dùng mới
    const newUser = await User.create({
      full_name,
      email,
      password_hashed: hashedPassword,
    });

    // Tạo token JWT cho người dùng
    const token = signToken({ id: newUser.user_id });

    // Gửi email xác nhận
    const confirmationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    const emailSubject = 'Xác nhận đăng ký tài khoản';
    const emailText = `Chào ${full_name},\n\nVui lòng nhấp vào đường dẫn sau để xác nhận đăng ký tài khoản: ${confirmationLink}`;
    const emailHTML = `<p>Chào ${full_name},</p><p>Vui lòng nhấp vào đường dẫn sau để xác nhận đăng ký tài khoản:</p><a href="${confirmationLink}">${confirmationLink}</a>`;

    await sendEmail(email, emailSubject, emailText, emailHTML);

    res.status(201).json({
      message: 'Đăng ký thành công, vui lòng kiểm tra email để xác nhận.',
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};
// Xác minh email người dùng
exports.verifyEmail = async (req, res) => {
    try {
      const { token } = req.query;
      const decoded = verifyToken(token);  // Giải mã token
  
      const user = await User.findOne({ where: { user_id: decoded.id } });
      if (!user) {
        return res.status(400).json({ message: 'Token không hợp lệ' });
      }
  
      // Cập nhật trạng thái xác minh email
      user.is_verified = true;
      await user.save();
  
      res.status(200).json({ message: 'Xác minh email thành công!' });
    } catch (error) {
      res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
    }
  };
  

// Đăng nhập người dùng
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email không tồn tại' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hashed);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không đúng' });
    }

    // Tạo token JWT cho người dùng
    const token = signToken({ id: user.user_id });

    res.status(200).json({ message: 'Đăng nhập thành công', token });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Quên mật khẩu
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email không tồn tại' });
    }

    // Tạo token reset mật khẩu
    const token = signToken({ id: user.user_id });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    const emailSubject = 'Yêu cầu đặt lại mật khẩu';
    const emailText = `Chào ${user.full_name},\n\nVui lòng nhấp vào đường dẫn sau để đặt lại mật khẩu của bạn: ${resetLink}`;
    const emailHTML = `<p>Chào ${user.full_name},</p><p>Vui lòng nhấp vào đường dẫn sau để đặt lại mật khẩu của bạn:</p><a href="${resetLink}">${resetLink}</a>`;

    await sendEmail(email, emailSubject, emailText, emailHTML);

    res.status(200).json({ message: 'Đã gửi email để đặt lại mật khẩu' });
  } catch (error) {
    res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;
  
      // Kiểm tra nếu mật khẩu mới và mật khẩu xác nhận không khớp
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Mật khẩu mới và xác nhận mật khẩu không khớp' });
      }
  
      // Giải mã token và kiểm tra tính hợp lệ
      const decoded = verifyToken(token);
      const user = await User.findOne({ where: { user_id: decoded.id } });
      if (!user) {
        return res.status(400).json({ message: 'Token không hợp lệ' });
      }
  
      // Mã hóa mật khẩu mới
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Cập nhật mật khẩu cho người dùng
      user.password_hashed = hashedPassword;
      await user.save();
  
      res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
    }
  };
  

// Đổi mật khẩu
exports.changePassword = async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const { id } = req.user;  // Sử dụng req.user.id thay vì req.user.user_id
  
      if (!id) {
        return res.status(400).json({ message: 'User ID không hợp lệ' });
      }
  
      const user = await User.findOne({ where: { user_id: id } });  // Truy vấn người dùng từ `user_id`
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }
  
      // Kiểm tra nếu mật khẩu cũ trùng với mật khẩu mới
      if (oldPassword === newPassword) {
        return res.status(400).json({ message: 'Mật khẩu cũ và mật khẩu mới không được trùng nhau' });
      }
  
      // Kiểm tra mật khẩu cũ có đúng không
      const isMatch = await bcrypt.compare(oldPassword, user.password_hashed);
      if (!isMatch) {
        return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
      }
  
      // Mã hóa mật khẩu mới và lưu lại
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      user.password_hashed = hashedPassword;
      await user.save();
  
      res.status(200).json({ message: 'Mật khẩu đã được thay đổi' });
    } catch (error) {
      res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
    }
  };
  