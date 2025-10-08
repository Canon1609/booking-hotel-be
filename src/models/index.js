const sequelize = require('../config/database');

// Models
const User = require('./user.model');
const Hotel = require('./hotel.model');
const RoomType = require('./roomType.model');
const Room = require('./room.model');
const RoomPrice = require('./roomPrice.model');
const Promotion = require('./promotion.model');
const Booking = require('./booking.model');
const Payment = require('./payment.model');
const Service = require('./service.model');
const Review = require('./review.model');

// ========== Associations ==========

// User ↔ Booking
User.hasMany(Booking, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

// Hotel ↔ Room
Hotel.hasMany(Room, { foreignKey: 'hotel_id', sourceKey: 'hotel_id', as: 'rooms' });
Room.belongsTo(Hotel, { foreignKey: 'hotel_id', targetKey: 'hotel_id', as: 'hotel' });

// RoomType ↔ Room
RoomType.hasMany(Room, { foreignKey: 'room_type_id', sourceKey: 'room_type_id', as: 'rooms' });
Room.belongsTo(RoomType, { foreignKey: 'room_type_id', targetKey: 'room_type_id', as: 'room_type' });

// RoomType ↔ RoomPrice
RoomType.hasMany(RoomPrice, { foreignKey: 'room_type_id', sourceKey: 'room_type_id', as: 'prices' });
RoomPrice.belongsTo(RoomType, { foreignKey: 'room_type_id', targetKey: 'room_type_id', as: 'room_type' });

// Room ↔ Booking
Room.hasMany(Booking, { foreignKey: 'room_id', sourceKey: 'room_id', as: 'bookings' });
Booking.belongsTo(Room, { foreignKey: 'room_id', targetKey: 'room_id', as: 'room' });

// Promotion ↔ Booking
Promotion.hasMany(Booking, { foreignKey: 'promotion_id', sourceKey: 'promotion_id', as: 'bookings' });
Booking.belongsTo(Promotion, { foreignKey: 'promotion_id', targetKey: 'promotion_id', as: 'promotion' });

// Booking ↔ Payment
Booking.hasMany(Payment, { foreignKey: 'booking_id', sourceKey: 'booking_id', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', targetKey: 'booking_id', as: 'booking' });

// Hotel ↔ Service
Hotel.hasMany(Service, { foreignKey: 'hotel_id', sourceKey: 'hotel_id', as: 'services' });
Service.belongsTo(Hotel, { foreignKey: 'hotel_id', targetKey: 'hotel_id', as: 'hotel' });

// Review ↔ User & Booking
User.hasMany(Review, { foreignKey: 'user_id', sourceKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id', as: 'user' });

Booking.hasOne(Review, { foreignKey: 'booking_id', sourceKey: 'booking_id', as: 'review' });
Review.belongsTo(Booking, { foreignKey: 'booking_id', targetKey: 'booking_id', as: 'booking' });

module.exports = {
  sequelize,
  User,
  Hotel,
  RoomType,
  Room,
  RoomPrice,
  Promotion,
  Booking,
  Payment,
  Service,
  Review
};


