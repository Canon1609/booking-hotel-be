const Room = require('../models/room.model');
const { Op, Sequelize } = require('sequelize');
const { RoomType, RoomPrice, Booking, Hotel } = require('../models');
const redisService = require('../utils/redis.util');

exports.createRoom = async (req, res) => {
  try {
    const { hotel_id, room_num, status, room_type_id } = req.body;
    
    // enforce uniqueness of room number within a hotel
    const existing = await Room.findOne({ where: { hotel_id, room_num } });
    if (existing) {
      return res.status(400).json({ message: 'Số phòng đã tồn tại trong khách sạn này' });
    }

    let roomType = null;
    let currentRoomCount = 0;

    // Kiểm tra quantity của loại phòng
    if (room_type_id) {
      roomType = await RoomType.findByPk(room_type_id);
      if (!roomType) {
        return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
      }

      // Đếm số phòng hiện tại của loại phòng này
      currentRoomCount = await Room.count({ where: { room_type_id } });
      
      if (currentRoomCount >= roomType.quantity) {
        return res.status(400).json({ 
          message: `Loại phòng "${roomType.room_type_name}" chỉ được có tối đa ${roomType.quantity} phòng, hiện tại đã có ${currentRoomCount} phòng` 
        });
      }
    }

    const room = await Room.create({ hotel_id, room_num, status, room_type_id });
    return res.status(201).json({ 
      message: 'Tạo phòng thành công', 
      room,
      room_type_info: roomType ? {
        room_type_name: roomType.room_type_name,
        max_quantity: roomType.quantity,
        current_quantity: currentRoomCount + 1,
        remaining_slots: roomType.quantity - (currentRoomCount + 1)
      } : null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { hotel_id, room_num, status, room_type_id } = req.body;
    const room = await Room.findOne({ where: { room_id: id } });
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });

    if (room_num !== undefined || hotel_id !== undefined) {
      const checkHotelId = hotel_id !== undefined ? hotel_id : room.hotel_id;
      const checkRoomNum = room_num !== undefined ? room_num : room.room_num;
      const dup = await Room.findOne({ where: { hotel_id: checkHotelId, room_num: checkRoomNum } });
      if (dup && dup.room_id !== room.room_id) {
        return res.status(400).json({ message: 'Số phòng đã tồn tại trong khách sạn này' });
      }
    }

    // Kiểm tra quantity khi thay đổi room_type_id
    if (room_type_id !== undefined && room_type_id !== room.room_type_id) {
      const roomType = await RoomType.findByPk(room_type_id);
      if (!roomType) {
        return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
      }

      // Đếm số phòng hiện tại của loại phòng mới (trừ phòng hiện tại)
      const currentRoomCount = await Room.count({ 
        where: { 
          room_type_id,
          room_id: { [Op.ne]: id } // Loại trừ phòng hiện tại
        } 
      });
      
      if (currentRoomCount >= roomType.quantity) {
        return res.status(400).json({ 
          message: `Loại phòng "${roomType.room_type_name}" chỉ được có tối đa ${roomType.quantity} phòng, hiện tại đã có ${currentRoomCount} phòng` 
        });
      }
    }

    // images removed for Room

    if (hotel_id !== undefined) room.hotel_id = hotel_id;
    if (room_num !== undefined) room.room_num = room_num;
    if (status !== undefined) room.status = status;
    if (room_type_id !== undefined) room.room_type_id = room_type_id;

    await room.save();
    return res.status(200).json({ message: 'Cập nhật phòng thành công', room });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ where: { room_id: id } });
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    // no images to clean for Room
    await room.destroy();
    return res.status(200).json({ message: 'Xóa phòng thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const { page = 1, limit = 10, hotel_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (hotel_id) where.hotel_id = hotel_id;
    const result = await Room.findAndCountAll({ where, limit: parseInt(limit), offset: parseInt(offset), order: [['created_at', 'DESC']] });
    return res.status(200).json({ rooms: result.rows, total: result.count });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ where: { room_id: id } });
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
    return res.status(200).json({ room });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// no upload middleware for Room


// ============= Availability Search =============
// GET /api/rooms/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=2&hotel_id=1&room_type_id=1&min_price=0&max_price=1000000&sort=price_asc|price_desc&page=1&limit=10
exports.searchAvailability = async (req, res) => {
  try {
    const {
      check_in,
      check_out,
      guests,
      hotel_id,
      room_type_id,
      min_price,
      max_price,
      sort = 'price_asc',
      page = 1,
      limit = 10
    } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({ message: 'Thiếu check_in hoặc check_out' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build base where for Room, RoomType
    const roomWhere = {};
    if (hotel_id) roomWhere.hotel_id = hotel_id;
    if (room_type_id) roomWhere.room_type_id = room_type_id;

    // Exclude rooms held by temp bookings (Redis) that overlap the requested dates
    let heldRoomIds = [];
    try {
      const allTemp = await redisService.getAllTempBookings();
      const holds = Object.values(allTemp || {});
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);
      heldRoomIds = holds
        .filter(tb => {
          if (!tb || !tb.room_id || !tb.check_in_date || !tb.check_out_date) return false;
          const tbIn = new Date(tb.check_in_date);
          const tbOut = new Date(tb.check_out_date);
          // overlap if tbIn < check_out AND tbOut > check_in
          return tbIn < checkOutDate && tbOut > checkInDate;
        })
        .map(tb => tb.room_id);
    } catch (e) {
      // continue without excluding if Redis unavailable
    }
    if (heldRoomIds.length > 0) {
      roomWhere.room_id = { [Op.notIn]: heldRoomIds };
    }

    // Current price record that covers the stay start date
    const priceDateCondition = {
      start_date: { [Op.lte]: new Date(check_in) },
      end_date: { [Op.gte]: new Date(check_in) }
    };

    // Pricing filter
    const priceWhere = { ...priceDateCondition };
    if (min_price) priceWhere.price_per_night = { [Op.gte]: min_price };
    if (max_price) {
      priceWhere.price_per_night = priceWhere.price_per_night
        ? { ...priceWhere.price_per_night, [Op.lte]: max_price }
        : { [Op.lte]: max_price };
    }

    // Availability: exclude rooms that have overlapping confirmed/completed bookings
    const overlappingWhere = {
      [Op.and]: [
        { check_in_date: { [Op.lt]: check_out } },
        { check_out_date: { [Op.gt]: check_in } },
        { booking_status: { [Op.in]: ['confirmed', 'completed'] } }
      ]
    };

    // Sorting
    const order = [];
    if (sort === 'price_desc') order.push([{ model: RoomType, as: 'room_type' }, { model: RoomPrice, as: 'prices' }, 'price_per_night', 'DESC']);
    else order.push([{ model: RoomType, as: 'room_type' }, { model: RoomPrice, as: 'prices' }, 'price_per_night', 'ASC']);

    // Query available rooms (exclude overlapping bookings via LEFT JOIN and NULL filter)
    const { rows, count } = await Room.findAndCountAll({
      where: {
        ...roomWhere,
        '$bookings.booking_id$': { [Op.is]: null } // only rooms without overlapping bookings
      },
      include: [
        { model: Hotel, as: 'hotel', attributes: ['hotel_id', 'name', 'address', 'phone', 'email', 'images'] },
        {
          model: RoomType,
          as: 'room_type',
          attributes: ['room_type_id', 'room_type_name', 'capacity', 'images', 'amenities', 'area'],
          include: [
            {
              model: RoomPrice,
              as: 'prices',
              where: priceWhere,
              required: true,
              attributes: ['price_id', 'start_date', 'end_date', 'price_per_night']
            }
          ]
        },
        {
          model: Booking,
          as: 'bookings',
          required: false,
          where: overlappingWhere,
          attributes: ['booking_id']
        }
      ],
      distinct: true,
      subQuery: false,
      order,
      limit: parseInt(limit),
      offset,
    });

    // Optional guests capacity filter at JS level when capacity stored on RoomType
    const filteredRows = (guests
      ? rows.filter(r => (r.room_type && typeof r.room_type.capacity === 'number' ? r.room_type.capacity >= parseInt(guests) : true))
      : rows);

    return res.status(200).json({
      total: Array.isArray(count) ? count.length : count,
      rooms: filteredRows
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

