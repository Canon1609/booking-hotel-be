const Room = require('../models/room.model');
const { Op, Sequelize } = require('sequelize');
const { RoomType, RoomPrice, Booking, Hotel, BookingRoom } = require('../models');
const moment = require('moment-timezone');
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
      limit
    } = req.query;

    if (!check_in || !check_out) {
      return res.status(400).json({ message: 'Thiếu check_in hoặc check_out' });
    }

    // Chỉ áp dụng limit và offset nếu có limit, nếu không thì trả về tất cả
    const parsedLimit = limit ? parseInt(limit) : null;
    const parsedPage = parseInt(page) || 1;
    const offset = parsedLimit ? (parsedPage - 1) * parsedLimit : null;

    // Normalize dates using Asia/Ho_Chi_Minh timezone to avoid UTC shift
    const checkInTz = moment(check_in).tz('Asia/Ho_Chi_Minh');
    const checkOutTz = moment(check_out).tz('Asia/Ho_Chi_Minh');
    const checkInStr = checkInTz.format('YYYY-MM-DD');
    const checkOutStr = checkOutTz.format('YYYY-MM-DD');

    // Build base where for Room, RoomType
    const roomWhere = {};
    // Keep a copy that does NOT exclude booked/held rooms for total counting
    const baseRoomWhere = {};
    if (hotel_id) {
      roomWhere.hotel_id = hotel_id;
      baseRoomWhere.hotel_id = hotel_id;
    }
    if (room_type_id) {
      roomWhere.room_type_id = room_type_id;
      baseRoomWhere.room_type_id = room_type_id;
    }

    // Compute held counts by room_type (Redis temp bookings) overlapping requested dates
    // We don't assign specific room_ids during hold, so we will trim results by counts per type later
    let heldCountByType = {};
    try {
      const allTemp = await redisService.getAllTempBookings();
      const holds = Object.values(allTemp || {});
      const checkInDate = checkInTz.clone();
      const checkOutDate = checkOutTz.clone();
      heldCountByType = holds.reduce((acc, tb) => {
        if (!tb || !tb.room_type_id || !tb.check_in_date || !tb.check_out_date) return acc;
        const tbIn = moment(tb.check_in_date).tz('Asia/Ho_Chi_Minh');
        const tbOut = moment(tb.check_out_date).tz('Asia/Ho_Chi_Minh');
        const isOverlap = tbIn.isBefore(checkOutDate, 'day') && tbOut.isAfter(checkInDate, 'day');
        if (!isOverlap) return acc;
        const typeId = Number(tb.room_type_id);
        const num = Number(tb.num_rooms) || 1;
        acc[typeId] = (acc[typeId] || 0) + num;
        return acc;
      }, {});
    } catch (e) {
      // Redis might be unavailable; proceed without holds
      heldCountByType = {};
    }

    // Current price record that covers the stay start date
    const priceDateCondition = {
      start_date: { [Op.lte]: checkInStr },
      end_date: { [Op.gte]: checkInStr }
    };

    // Pricing filter
    const priceWhere = { ...priceDateCondition };
    if (min_price) priceWhere.price_per_night = { [Op.gte]: min_price };
    if (max_price) {
      priceWhere.price_per_night = priceWhere.price_per_night
        ? { ...priceWhere.price_per_night, [Op.lte]: max_price }
        : { [Op.lte]: max_price };
    }

    // Availability: tìm các room_id đã được đặt trong khoảng thời gian này qua BookingRoom
    const bookedRoomIds = await BookingRoom.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          [Op.or]: [{
            check_in_date: { [Op.lt]: checkOutStr },
            check_out_date: { [Op.gt]: checkInStr }
          }]
        },
        required: true
      }],
      attributes: ['room_id'],
      raw: true
    }).then(results => [...new Set(results.map(r => r.room_id))]); // Remove duplicates

    // Loại trừ các phòng đã được đặt
    if (bookedRoomIds.length > 0) {
      roomWhere.room_id = { [Op.notIn]: bookedRoomIds };
      // baseRoomWhere keeps all rooms for total counts
    }

    // Sorting
    const order = [];
    if (sort === 'price_desc') order.push([{ model: RoomType, as: 'room_type' }, { model: RoomPrice, as: 'prices' }, 'price_per_night', 'DESC']);
    else order.push([{ model: RoomType, as: 'room_type' }, { model: RoomPrice, as: 'prices' }, 'price_per_night', 'ASC']);

    // Query available rooms (không include Booking nữa, đã filter qua where clause)
    const { rows, count } = await Room.findAndCountAll({
      where: roomWhere,
      include: [
        { model: Hotel, as: 'hotel', attributes: ['hotel_id', 'name', 'address', 'phone', 'email', 'images'] },
        {
          model: RoomType,
          as: 'room_type',
          required: true,
          attributes: ['room_type_id', 'room_type_name', 'description', 'capacity', 'images', 'amenities', 'area'],
          include: [
            {
              model: RoomPrice,
              as: 'prices',
              where: priceWhere,
              required: true,
              attributes: ['price_id', 'start_date', 'end_date', 'price_per_night']
            }
          ]
        }
      ],
      distinct: true,
      subQuery: false,
      order,
      ...(parsedLimit && { limit: parsedLimit }),
      ...(offset !== null && { offset }),
    });

    // Optional guests capacity filter at JS level when capacity stored on RoomType
    let filteredRows = (guests
      ? rows.filter(r => (r.room_type && typeof r.room_type.capacity === 'number' ? r.room_type.capacity >= parseInt(guests) : true))
      : rows);

    // Trim rows by held counts per room_type to reflect temporarily unavailable rooms
    if (filteredRows.length > 0 && Object.keys(heldCountByType).length > 0) {
      const groupedByType = filteredRows.reduce((acc, room) => {
        const rt = room.room_type;
        if (!rt) return acc;
        const key = Number(rt.room_type_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(room);
        return acc;
      }, {});

      const trimmed = [];
      for (const [typeIdStr, list] of Object.entries(groupedByType)) {
        const typeId = Number(typeIdStr);
        const heldCount = heldCountByType[typeId] || 0;
        const keepCount = Math.max(list.length - heldCount, 0);
        if (keepCount > 0) {
          trimmed.push(...list.slice(0, keepCount));
        }
      }
      filteredRows = trimmed;
    }

    // Build availability summary by room type
    const availableCountByType = {};
    const roomTypeInfoById = {};
    filteredRows.forEach(r => {
      const rt = r.room_type;
      if (!rt) return;
      const key = rt.room_type_id;
      availableCountByType[key] = (availableCountByType[key] || 0) + 1;
      if (!roomTypeInfoById[key]) {
        roomTypeInfoById[key] = {
          room_type_id: rt.room_type_id,
          room_type_name: rt.room_type_name,
          description: rt.description,
          capacity: rt.capacity,
          amenities: rt.amenities,
          area: rt.area,
          images: rt.images,
        };
      }
    });

    // Get total rooms per room type (respecting only base filters; DO NOT exclude booked/held)
    const totalRoomsRaw = await Room.findAll({
      where: { ...baseRoomWhere },
      attributes: [
        'room_type_id',
        [Sequelize.fn('COUNT', Sequelize.col('room_id')), 'total_rooms']
      ],
      group: ['room_type_id']
    });
    const totalByType = {};
    totalRoomsRaw.forEach(row => {
      const data = row.get({ plain: true });
      totalByType[data.room_type_id] = parseInt(data.total_rooms, 10) || 0;
    });

    // Compose summary list (include types present either in available or total)
    const typeIds = new Set([
      ...Object.keys(totalByType).map(id => String(id)),
      ...Object.keys(availableCountByType).map(id => String(id))
    ]);
    // Backfill RoomType info for types that don't appear in available rows (sold-out)
    const missingTypeIds = Array.from(typeIds)
      .map(id => parseInt(id, 10))
      .filter(id => !roomTypeInfoById[id]);

    if (missingTypeIds.length > 0) {
      const missingTypes = await RoomType.findAll({
        where: { room_type_id: missingTypeIds },
        attributes: ['room_type_id', 'room_type_name', 'description', 'capacity', 'images', 'amenities', 'area']
      });
      missingTypes.forEach(rt => {
        const data = rt.get({ plain: true });
        roomTypeInfoById[data.room_type_id] = {
          room_type_id: data.room_type_id,
          room_type_name: data.room_type_name,
          description: data.description,
          capacity: data.capacity,
          amenities: data.amenities,
          area: data.area,
          images: data.images
        };
      });
    }

    // Get prices for all room types in summary
    const allTypeIds = Array.from(typeIds).map(id => parseInt(id, 10));
    const roomPrices = await RoomPrice.findAll({
      where: {
        room_type_id: { [Op.in]: allTypeIds },
        ...priceDateCondition
      },
      attributes: ['room_type_id', 'price_id', 'start_date', 'end_date', 'price_per_night'],
      order: [['room_type_id', 'ASC'], ['start_date', 'ASC']]
    });

    // Group prices by room_type_id
    const pricesByRoomType = {};
    roomPrices.forEach(price => {
      const typeId = price.room_type_id;
      if (!pricesByRoomType[typeId]) {
        pricesByRoomType[typeId] = [];
      }
      pricesByRoomType[typeId].push({
        price_id: price.price_id,
        start_date: price.start_date,
        end_date: price.end_date,
        price_per_night: price.price_per_night
      });
    });

    const summaryByRoomType = Array.from(typeIds).map(id => {
      const roomTypeId = parseInt(id, 10);
      const totalRooms = totalByType[roomTypeId] || 0;
      // availableCountByType was computed AFTER trimming held rooms, so do not subtract holds again
      const availableRooms = availableCountByType[roomTypeId] || 0;
      const info = roomTypeInfoById[roomTypeId] || { room_type_id: roomTypeId };
      return {
        ...info,
        total_rooms: totalRooms,
        booked_rooms: Math.max(totalRooms - availableRooms, 0),
        available_rooms: availableRooms,
        sold_out: availableRooms === 0,
        availability_text: availableRooms > 0 ? `Còn ${availableRooms} phòng` : 'Hết phòng',
        prices: pricesByRoomType[roomTypeId] || []
      };
    }).sort((a, b) => a.room_type_id - b.room_type_id);

    return res.status(200).json({
      total: filteredRows.length,
      rooms: filteredRows,
      summary_by_room_type: summaryByRoomType
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

