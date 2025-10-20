const app = require('./app');  // Import app từ app.js
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 5000;

// Hàm tạo database nếu chưa tồn tại
async function createDatabaseIfNotExists() {
  try {
    // Kết nối MySQL không chỉ định database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    const databaseName = process.env.DB_NAME || 'hotel_booking';
    
    // Tạo database nếu chưa tồn tại
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${databaseName}' đã sẵn sàng`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Lỗi tạo database:', error.message);
    process.exit(1);
  }
}

// Hàm đồng bộ hóa database
async function syncDatabase() {
  try {
    // Import sequelize sau khi database đã được tạo
    const { sequelize } = require('./config/database');
    const { ensureImagesColumns, ensureServiceFields, ensureUniqueRoomNumberPerHotel, ensureRoomPricesUpdatedAt, ensurePaymentEnums } = require('./utils/db.util');
    
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Đồng bộ hóa tất cả models
    await sequelize.sync({ alter: false });
    console.log('Database synchronized!');
    
    // Chạy migration một lần cho images columns
    if (process.env.DB_RUN_IMAGES_MIGRATION === 'true') {
      console.log('Running one-time images columns migration...');
      await ensureImagesColumns();
      console.log('Images columns migration complete. You can remove DB_RUN_IMAGES_MIGRATION flag.');
    }
    
    // Chạy migration một lần cho unique room number per hotel
    if (process.env.DB_RUN_ROOM_UNIQ_MIGRATION === 'true') {
      console.log('Running one-time unique room number migration...');
      await ensureUniqueRoomNumberPerHotel();
      console.log('Unique room number migration complete. You can remove DB_RUN_ROOM_UNIQ_MIGRATION flag.');
    }
    
    // Chạy migration một lần cho room prices updated_at
    if (process.env.DB_RUN_ROOMPRICE_UPDATED_AT === 'true') {
      console.log('Running one-time room prices updated_at migration...');
      await ensureRoomPricesUpdatedAt();
      console.log('Room prices updated_at migration complete. You can remove DB_RUN_ROOMPRICE_UPDATED_AT flag.');
    }
    
    // Chạy migration một lần cho service fields
    if (process.env.DB_RUN_SERVICE_FIELDS_MIGRATION === 'true') {
      console.log('Running one-time service fields migration...');
      await ensureServiceFields();
      console.log('Service fields migration complete. You can remove DB_RUN_SERVICE_FIELDS_MIGRATION flag.');
    }
    
    // Chạy migration một lần cho Payment ENUM values
    if (process.env.DB_RUN_PAYMENT_ENUMS_MIGRATION === 'true') {
      console.log('Running one-time Payment ENUM values migration...');
      await ensurePaymentEnums();
      console.log('Payment ENUM values migration complete. You can remove DB_RUN_PAYMENT_ENUMS_MIGRATION flag.');
    }
    
  } catch (error) {
    console.error('❌ Lỗi kết nối database:', error.message);
    process.exit(1);
  }
}

// Khởi động server
async function startServer() {
  try {
    // 1. Tạo database nếu chưa tồn tại
    await createDatabaseIfNotExists();
    
    // 2. Đồng bộ hóa database
    await syncDatabase();
    
    // 3. Khởi động server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: ${process.env.DB_NAME || 'hotel_booking'}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Lỗi khởi động server:', error.message);
    process.exit(1);
  }
}

startServer();
