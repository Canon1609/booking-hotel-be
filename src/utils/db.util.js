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

module.exports = {
  ensureImagesColumns,
  ensureServiceFields,
  ensureUniqueRoomNumberPerHotel,
  ensurePaymentEnums
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


