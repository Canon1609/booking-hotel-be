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

module.exports = { protect };
