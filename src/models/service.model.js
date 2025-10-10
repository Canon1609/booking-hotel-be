const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment-timezone');

const Service = sequelize.define('Service', {
  service_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  hotel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hotels', key: 'hotel_id' }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Chuyển từ 1 ảnh sang nhiều ảnh (ưu tiên JSON, fallback TEXT ở migration util)
  images: {
    // Lưu ý: cột DB có thể là JSON hoặc TEXT; Sequelize vẫn map STRING nếu cần
    type: DataTypes.JSON,
    allowNull: true
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
  tableName: 'services',
  hooks: {
    beforeUpdate: (service) => {
      service.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = Service;


