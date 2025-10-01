const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Đảm bảo bạn đã cấu hình kết nối DB trong database.js

const moment = require('moment-timezone');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  password_hashed: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('customer', 'admin'),
    defaultValue: 'customer'
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false  // Trạng thái xác minh email
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').toDate()  // Trả về đối tượng Date thay vì chuỗi
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').toDate()  // Trả về đối tượng Date thay vì chuỗi
  }
}, {
  timestamps: false,
  tableName: 'users'
});

module.exports = User;
