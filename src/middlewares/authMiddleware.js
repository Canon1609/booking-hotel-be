const { verifyToken } = require('../utils/jwt.util');

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];  // Lấy token từ header
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = verifyToken(token);  // Giải mã token
    req.user = decoded;  // Lưu thông tin người dùng vào req.user
    next();
    
    console.log(decoded);
    

  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

// Middleware kiểm tra quyền admin
const adminOnly = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

module.exports = { protect, adminOnly };
