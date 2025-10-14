const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment-timezone');

const Promotion = sequelize.define('Promotion', {
  promotion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  promotion_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  discount_type: {
    type: DataTypes.ENUM('fixed', 'percentage'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true  // Cho phép null cho voucher vĩnh viễn
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'),
    allowNull: false,
    defaultValue: 'active'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
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
  tableName: 'promotions',
  hooks: {
    beforeUpdate: (promotion) => {
      promotion.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = Promotion;


