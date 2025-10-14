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
require('dotenv').config();  // Load các biến môi trường từ .env
const { sequelize } = require('./models'); // Khởi tạo models và associations
const { ensureImagesColumns, ensureUniqueRoomNumberPerHotel, ensureRoomPricesUpdatedAt } = require('./utils/db.util');
const responseMiddleware = require('./middlewares/responseMiddleware');
const { startPromotionCron } = require('./utils/cron.util');

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

// Khởi tạo kết nối và đồng bộ database
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync();
    if (String(process.env.DB_RUN_IMAGES_MIGRATION || '').toLowerCase() === 'true') {
      console.log('Running one-time images columns migration...');
      await ensureImagesColumns();
      console.log('Images columns migration complete. You can remove DB_RUN_IMAGES_MIGRATION flag.');
    }
    if (String(process.env.DB_RUN_ROOM_UNIQ_MIGRATION || '').toLowerCase() === 'true') {
      console.log('Ensuring unique room number per hotel...');
      await ensureUniqueRoomNumberPerHotel();
      console.log('Unique index ensured. You can remove DB_RUN_ROOM_UNIQ_MIGRATION flag.');
    }
    if (String(process.env.DB_RUN_ROOMPRICE_UPDATED_AT || '').toLowerCase() === 'true') {
      console.log('Ensuring room_prices.updated_at column...');
      await ensureRoomPricesUpdatedAt();
      console.log('room_prices.updated_at ensured. You can remove DB_RUN_ROOMPRICE_UPDATED_AT flag.');
    }
    console.log('Database synchronized!');
    
    // Khởi tạo cron job cho promotions
    startPromotionCron();
  } catch (err) {
    console.error('Database init error:', err);
  }
})();

module.exports = app;  // Export app để sử dụng trong server.js
