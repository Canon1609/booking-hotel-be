const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
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
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
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
    beforeUpdate: (price) => {
      price.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = RoomPrice;


