const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const Review = sequelize.define('Review', {
  review_id: {
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
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of image URLs'
  },
  booking_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bookings', key: 'booking_id' }
  },
  reply: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Admin reply to review'
  },
  reply_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Time when admin replied'
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
  tableName: 'reviews',
  hooks: {
    beforeUpdate: (review) => {
      review.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = Review;


