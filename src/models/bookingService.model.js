const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingService = sequelize.define('BookingService', {
  booking_service_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  booking_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'booking_id'
    }
  },
  service_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'services',
      key: 'service_id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_type: {
    type: DataTypes.ENUM('prepaid', 'postpaid'),
    allowNull: false,
    comment: 'prepaid: trả trước, postpaid: trả sau'
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'active'
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Phí hủy dịch vụ'
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Số tiền hoàn lại sau khi trừ phí hủy'
  }
}, {
  tableName: 'booking_services',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BookingService;
