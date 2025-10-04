const express = require('express');
const cors = require('cors');  // Import cors
const app = express();
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();  // Load các biến môi trường từ .env

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

module.exports = app;  // Export app để sử dụng trong server.js
