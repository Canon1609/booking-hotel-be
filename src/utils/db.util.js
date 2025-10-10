const sequelize = require('../config/database');

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

async function ensureUniqueRoomNumberPerHotel() {
  // Create unique index if not exists
  try {
    await sequelize.query('CREATE UNIQUE INDEX `uniq_hotel_room_num` ON `rooms` (`hotel_id`, `room_num`)');
  } catch (e) {
    // ignore if already exists
  }
}

module.exports = {
  ensureImagesColumns,
  ensureUniqueRoomNumberPerHotel
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


