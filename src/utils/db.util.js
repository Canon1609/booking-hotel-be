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
}

module.exports = {
  ensureImagesColumns
};


