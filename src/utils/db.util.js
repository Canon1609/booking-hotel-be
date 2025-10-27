const { sequelize } = require('../config/database');

async function columnExists(tableName, columnName) {
  const dbName = process.env.DB_NAME;
  const [rows] = await sequelize.query(
    'SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    { replacements: [dbName, tableName, columnName] }
  );
  const cnt = Array.isArray(rows) ? rows[0].cnt : rows.cnt;
  return Number(cnt) > 0;
}

async function addImagesColumnIfMissing(tableName) {
  const has = await columnExists(tableName, 'images');
  if (!has) {
    // Prefer JSON; fallback to TEXT if JSON not supported
    try {
      await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`images\` JSON NULL`);
    } catch (err) {
      // Fallback to TEXT
      await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`images\` TEXT NULL`);
    }
  }
}

async function ensureImagesColumns() {
  await addImagesColumnIfMissing('hotels');
  await addImagesColumnIfMissing('room_types');
  await addImagesColumnIfMissing('services');
}

async function ensureServiceFields() {
  // Thêm trường price nếu chưa có
  const hasPrice = await columnExists('services', 'price');
  if (!hasPrice) {
    await sequelize.query('ALTER TABLE `services` ADD COLUMN `price` DECIMAL(10,2) NOT NULL DEFAULT 0');
  }

  // Thêm trường service_type nếu chưa có
  const hasServiceType = await columnExists('services', 'service_type');
  if (!hasServiceType) {
    await sequelize.query('ALTER TABLE `services` ADD COLUMN `service_type` ENUM(\'prepaid\', \'postpaid\') NOT NULL DEFAULT \'prepaid\'');
  }

  // Thêm trường is_available nếu chưa có
  const hasIsAvailable = await columnExists('services', 'is_available');
  if (!hasIsAvailable) {
    await sequelize.query('ALTER TABLE `services` ADD COLUMN `is_available` BOOLEAN NOT NULL DEFAULT TRUE');
  }
}

async function ensureUniqueRoomNumberPerHotel() {
  // Create unique index if not exists
  try {
    await sequelize.query('CREATE UNIQUE INDEX `uniq_hotel_room_num` ON `rooms` (`hotel_id`, `room_num`)');
  } catch (e) {
    // ignore if already exists
  }
}

// Đảm bảo Payment model có đủ ENUM values
async function ensurePaymentEnums() {
  try {
    console.log('Checking Payment ENUM values...');
    
    // Kiểm tra và cập nhật method ENUM
    await sequelize.query(`
      ALTER TABLE payments 
      MODIFY COLUMN method ENUM('cash', 'banking', 'payos') NOT NULL
    `);
    
    // Kiểm tra và cập nhật status ENUM
    await sequelize.query(`
      ALTER TABLE payments 
      MODIFY COLUMN status ENUM('pending', 'success', 'failed', 'completed') NOT NULL DEFAULT 'pending'
    `);
    
    console.log('Payment ENUM values updated successfully');
  } catch (error) {
    console.error('Error updating Payment ENUM values:', error);
  }
}

// Cập nhật booking_status ENUM với checked_in và checked_out
async function ensureBookingStatusEnum() {
  try {
    await sequelize.query(`
      ALTER TABLE \`bookings\` 
      MODIFY COLUMN \`booking_status\` 
      ENUM('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out') 
      NOT NULL DEFAULT 'pending'
    `);
    console.log('✅ Updated booking_status ENUM to include checked_in and checked_out');
  } catch (error) {
    console.error('Error updating booking_status ENUM:', error);
  }
}

// Cập nhật room status ENUM với in_use và checked_out
async function ensureRoomStatusEnum() {
  try {
    await sequelize.query(`
      ALTER TABLE \`rooms\` 
      MODIFY COLUMN \`status\` 
      ENUM('available', 'booked', 'in_use', 'checked_out', 'cleaning') 
      NOT NULL DEFAULT 'available'
    `);
    console.log('✅ Updated room status ENUM to include in_use and checked_out');
  } catch (error) {
    console.error('Error updating room status ENUM:', error);
  }
}

// Thêm cột cccd vào bảng users nếu chưa có
async function ensureUserCccdColumn() {
  try {
    const hasCccdColumn = await columnExists('users', 'cccd');
    if (!hasCccdColumn) {
      await sequelize.query(`
        ALTER TABLE \`users\` 
        ADD COLUMN \`cccd\` VARCHAR(20) NULL COMMENT 'Số CCCD/CMND'
      `);
      console.log('✅ Added cccd column to users table');
    }
  } catch (error) {
    console.error('Error adding cccd column to users:', error);
  }
}

// Cập nhật cột email để cho phép NULL
async function ensureUserEmailNullable() {
  try {
    // Kiểm tra xem email có phải là NOT NULL không
    const [results] = await sequelize.query(`
      SELECT IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'email'
    `, { replacements: [process.env.DB_NAME || 'hotel_booking'] });
    
    if (results.length > 0 && results[0].IS_NULLABLE === 'NO') {
      await sequelize.query(`
        ALTER TABLE \`users\` 
        MODIFY COLUMN \`email\` VARCHAR(255) NULL
      `);
      console.log('✅ Updated email column to allow NULL');
    }
  } catch (error) {
    console.error('Error updating email column:', error);
  }
}

// Thêm room_type_id vào bảng bookings và cập nhật room_id thành nullable
async function ensureBookingRoomType() {
  try {
    // Kiểm tra xem room_type_id đã tồn tại chưa
    const roomTypeExists = await columnExists('bookings', 'room_type_id');
    
    if (!roomTypeExists) {
      // Thêm cột room_type_id
      await sequelize.query(`
        ALTER TABLE \`bookings\` 
        ADD COLUMN \`room_type_id\` INT NOT NULL AFTER \`user_id\`,
        ADD FOREIGN KEY (\`room_type_id\`) REFERENCES \`room_types\`(\`room_type_id\`)
      `);
      console.log('✅ Added room_type_id column to bookings table');
    }
    
    // Cập nhật room_id thành nullable
    await sequelize.query(`
      ALTER TABLE \`bookings\` 
      MODIFY COLUMN \`room_id\` INT NULL,
      ADD COLUMN \`room_assigned_at\` DATETIME NULL COMMENT 'Thời gian lễ tân chỉ định phòng'
    `);
    console.log('✅ Updated room_id to nullable and added room_assigned_at');
    
  } catch (error) {
    console.error('Error updating booking room type structure:', error);
  }
}

module.exports = {
  ensureImagesColumns,
  ensureServiceFields,
  ensureUniqueRoomNumberPerHotel,
  ensurePaymentEnums,
  ensureBookingStatusEnum,
  ensureBookingRoomType,
  ensureRoomStatusEnum,
  ensureUserCccdColumn,
  ensureUserEmailNullable
};

// Add updated_at to room_prices if missing
async function ensureRoomPricesUpdatedAt() {
  const exists = await columnExists('room_prices', 'updated_at');
  if (!exists) {
    await sequelize.query('ALTER TABLE `room_prices` ADD COLUMN `updated_at` DATETIME NULL');
    // initialize updated_at = created_at if exists, else NOW()
    await sequelize.query('UPDATE `room_prices` SET `updated_at` = COALESCE(`created_at`, NOW())');
  }
}

module.exports.ensureRoomPricesUpdatedAt = ensureRoomPricesUpdatedAt;


