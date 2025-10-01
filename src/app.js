const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');  // Kiểm tra đường dẫn và cách import
const authRoutes = require('./routes/authRoutes');  // Kiểm tra đường dẫn và cách import

// Middleware
app.use(express.json());  // Middleware để xử lý JSON request body

// Routes
app.use('/api/users', userRoutes);  // Liên kết các route với controller
app.use('/api/auth', authRoutes);   // Liên kết các route với controller

module.exports = app;  // Export app để sử dụng trong server.js
