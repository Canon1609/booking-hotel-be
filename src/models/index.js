const { sequelize } = require('../config/database');

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
const BookingService = require('./bookingService.model');
const Review = require('./review.model');
const Category = require('./category.model');
const Post = require('./post.model');

// ========== Associations ==========
// Tạm thời chỉ giữ lại các associations cần thiết để tránh lỗi "Too many keys"

// User ↔ Booking
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Hotel ↔ Room
Hotel.hasMany(Room, { foreignKey: 'hotel_id', as: 'rooms' });
Room.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

// RoomType ↔ Room
RoomType.hasMany(Room, { foreignKey: 'room_type_id', as: 'rooms' });
Room.belongsTo(RoomType, { foreignKey: 'room_type_id', as: 'room_type' });

// RoomType ↔ RoomPrice
RoomType.hasMany(RoomPrice, { foreignKey: 'room_type_id', as: 'prices' });
RoomPrice.belongsTo(RoomType, { foreignKey: 'room_type_id', as: 'room_type' });

// RoomType ↔ Booking (MỐI QUAN HỆ CHÍNH)
RoomType.hasMany(Booking, { foreignKey: 'room_type_id', as: 'bookings' });
Booking.belongsTo(RoomType, { foreignKey: 'room_type_id', as: 'room_type' });

// Room ↔ Booking (MỐI QUAN HỆ PHỤ - chỉ khi đã gán phòng)
Room.hasMany(Booking, { foreignKey: 'room_id', as: 'bookings' });
Booking.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// Booking ↔ Payment
Booking.hasMany(Payment, { foreignKey: 'booking_id', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Booking ↔ Promotion
Promotion.hasMany(Booking, { foreignKey: 'promotion_id', as: 'bookings' });
Booking.belongsTo(Promotion, { foreignKey: 'promotion_id', as: 'promotion' });

// Hotel ↔ Service
Hotel.hasMany(Service, { foreignKey: 'hotel_id', as: 'services' });
Service.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

// Booking ↔ BookingService
Booking.hasMany(BookingService, { foreignKey: 'booking_id', as: 'booking_services' });
BookingService.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Service ↔ BookingService
Service.hasMany(BookingService, { foreignKey: 'service_id', as: 'booking_services' });
BookingService.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

// User ↔ Post
User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Category ↔ Post
Category.hasMany(Post, { foreignKey: 'category_id', as: 'posts' });
Post.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// User ↔ Review
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Booking ↔ Review
Booking.hasMany(Review, { foreignKey: 'booking_id', as: 'reviews' });
Review.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

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
  BookingService,
  Review,
  Category,
  Post
};


