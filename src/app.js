const express = require('express');
const cors = require('cors');  // Import cors
const session = require('express-session');
const passport = require('./config/passport');
const app = express();
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const roomRoutes = require('./routes/roomRoutes');
const roomTypeRoutes = require('./routes/roomTypeRoutes');
const roomPriceRoutes = require('./routes/roomPriceRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const postRoutes = require('./routes/postRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
require('dotenv').config();  // Load các biến môi trường từ .env
const { sequelize } = require('./models'); // Khởi tạo models và associations
const { ensureImagesColumns, ensureUniqueRoomNumberPerHotel, ensureRoomPricesUpdatedAt } = require('./utils/db.util');
const responseMiddleware = require('./middlewares/responseMiddleware');
const { startPromotionCron } = require('./utils/cron.util');
const { startEmailReminderCron } = require('./utils/emailCron.util');
const redisService = require('./utils/redis.util');
const payOSService = require('./utils/payos.util');

// Middleware
app.use(express.json());  // Middleware để xử lý JSON request body
app.use(express.urlencoded({ extended: true })); // Middleware để xử lý form-data
app.use(responseMiddleware); // Ensure statusCode is present in all JSON responses

// Session và Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true nếu dùng HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

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
app.use('/api/rooms', roomRoutes);
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/room-prices', roomPriceRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/bookings', bookingRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint không tồn tại' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Có lỗi xảy ra!';
  res.status(status).json({ message, error: process.env.NODE_ENV === 'production' ? undefined : err.stack });
});

// Khởi tạo các service khác (không bao gồm database)
(async () => {
  try {
    // Khởi tạo Redis (tạm thời tắt để test)
    try {
      await redisService.connect();
    } catch (error) {
      console.warn('Redis not available, continuing without Redis...');
    }
    
    // Khởi tạo PayOS
    try {
      await payOSService.initialize();
    } catch (error) {
      console.warn('PayOS not configured, continuing without PayOS...');
    }
    
    // Khởi tạo cron job cho promotions
    startPromotionCron();
    
    // Khởi tạo cron job cho email nhắc nhở
    startEmailReminderCron();
  } catch (err) {
    console.error('Service init error:', err);
  }
})();

module.exports = app;  // Export app để sử dụng trong server.js
