const { Sequelize, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const RoomPrice = sequelize.define('RoomPrice', {
  price_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  room_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'room_types', key: 'room_type_id' }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  price_per_night: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
  }
}, {
  timestamps: false,
  tableName: 'room_prices',
  hooks: {
    beforeCreate: async (price) => {
      await validateNoOverlap(price);
      price.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    },
    beforeUpdate: async (price) => {
      await validateNoOverlap(price);
      price.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

// Validation function to check for overlapping price periods
async function validateNoOverlap(price) {
  const { room_type_id, start_date, end_date, price_id } = price;
  
  if (!room_type_id || !start_date || !end_date) {
    return; // Skip validation if required fields are missing
  }

  const whereClause = {
    room_type_id: room_type_id,
    [Op.and]: [
      { start_date: { [Op.lt]: end_date } },
      { end_date: { [Op.gt]: start_date } }
    ]
  };

  // Exclude current record when updating
  if (price_id) {
    whereClause.price_id = { [Op.ne]: price_id };
  }

  const overlappingPrice = await RoomPrice.findOne({
    where: whereClause
  });

  if (overlappingPrice) {
    const error = new Error(`Khoảng thời gian giá bị trùng lặp với bản ghi ID ${overlappingPrice.price_id} (${overlappingPrice.start_date} - ${overlappingPrice.end_date})`);
    error.name = 'SequelizeValidationError';
    throw error;
  }
}

module.exports = RoomPrice;


