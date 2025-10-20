const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const Booking = sequelize.define('Booking', {
  booking_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'user_id' }
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'rooms', key: 'room_id' }
  },
  check_in_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  check_out_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  num_person: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  total_price: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  booking_status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  final_price: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  promotion_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'promotions', key: 'promotion_id' }
  },
  booking_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  booking_type: {
    type: DataTypes.ENUM('online', 'walkin'),
    allowNull: false,
    defaultValue: 'online',
    comment: 'online: đặt trực tuyến, walkin: đặt trực tiếp'
  },
  temp_booking_key: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Key Redis cho booking tạm thời'
  },
  payos_order_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Mã đơn hàng PayOS'
  },
  check_in_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian check-in thực tế'
  },
  check_out_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian check-out thực tế'
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
  tableName: 'bookings',
  hooks: {
    beforeUpdate: (booking) => {
      booking.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = Booking;


