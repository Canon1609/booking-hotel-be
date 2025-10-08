const express = require('express');
const cors = require('cors');  // Import cors
const app = express();
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
require('dotenv').config();  // Load các biến môi trường từ .env
const { sequelize } = require('./models'); // Khởi tạo models và associations

// Middleware
app.use(express.json());  // Middleware để xử lý JSON request body

// Cấu hình CORS
app.use(cors({
  origin: 'http://localhost:3000',  // Cấp quyền cho frontend từ domain này (có thể thay bằng domain của frontend)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Cho phép các method này
  allowedHeaders: ['Content-Type', 'Authorization'],  // Các header cho phép
}));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);

// Khởi tạo kết nối và đồng bộ database
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync();
    console.log('Database synchronized!');
  } catch (err) {
    console.error('Database init error:', err);
  }
})();

module.exports = app;  // Export app để sử dụng trong server.js
