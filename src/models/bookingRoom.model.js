const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const BookingRoom = sequelize.define('BookingRoom', {
  booking_room_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  booking_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bookings', key: 'booking_id' }
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'rooms', key: 'room_id' },
    comment: 'Phòng cụ thể được gán cho booking này'
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời gian phòng được gán (khi check-in hoặc khi tạo booking)'
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
  tableName: 'booking_rooms',
  indexes: [
    { unique: true, fields: ['booking_id', 'room_id'], name: 'uniq_booking_room' }
  ],
  hooks: {
    beforeUpdate: (bookingRoom) => {
      bookingRoom.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = BookingRoom;

