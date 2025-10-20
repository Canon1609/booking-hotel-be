const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Đảm bảo bạn đã cấu hình kết nối DB trong database.js

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
    allowNull: true  // Cho phép null cho Google OAuth users
  },
  google_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  role: {
    type: DataTypes.ENUM('customer', 'admin',"guest"),
    defaultValue: 'customer'
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false  
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true  
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    allowNull: false
  }
}, {
  timestamps: false,
  tableName: 'users',
  hooks: {
    beforeUpdate: (user) => {
      user.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = User;
