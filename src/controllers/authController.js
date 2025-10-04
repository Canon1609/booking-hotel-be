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
    const token = signToken({ id: newUser.user_id, role: newUser.role });

    // Gửi email xác nhận
    const confirmationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    const emailSubject = '🎉 Chào mừng đến với Bean Hotel - Xác nhận tài khoản';
    const emailText = `Chào ${full_name},\n\nChào mừng bạn đến với Bean Hotel!\n\nVui lòng nhấp vào đường dẫn sau để xác nhận đăng ký tài khoản: ${confirmationLink}\n\nTrân trọng,\nĐội ngũ Bean Hotel`;
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
            Cảm ơn bạn đã đăng ký tài khoản tại Bean Hotel. Để hoàn tất quá trình đăng ký, 
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
    const token = signToken({ id: user.user_id, role: user.role });

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
    const token = signToken({ id: user.user_id, role: user.role });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    const emailSubject = '🔐 Bean Hotel - Yêu cầu đặt lại mật khẩu';
    const emailText = `Chào ${user.full_name},\n\nChúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Bean Hotel của bạn.\n\nVui lòng nhấp vào đường dẫn sau để đặt lại mật khẩu: ${resetLink}\n\nTrân trọng,\nĐội ngũ Bean Hotel`;
    const emailHTML = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px;">
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: 300;">🏨 Bean Hotel</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">Trải nghiệm nghỉ dưỡng tuyệt vời</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 24px;">🔐 Đặt lại mật khẩu</h2>
          <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0;">
            Chào <strong>${user.full_name}</strong>,<br><br>
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Bean Hotel của bạn. 
            Để tạo mật khẩu mới, vui lòng nhấp vào nút bên dưới.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
                    transition: all 0.3s ease;">
            🔑 Đặt lại mật khẩu
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #ffc107;">
          <p style="color: #856404; font-size: 14px; margin: 0; text-align: center;">
            <strong>⚠️ Lưu ý bảo mật:</strong><br>
            • Liên kết này chỉ có hiệu lực trong 1 giờ<br>
            • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này<br>
            • Không chia sẻ liên kết này với bất kỳ ai
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
      const { id } = req.user;  // Sử dụng req.user.id
  
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
  