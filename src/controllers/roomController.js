const Room = require('../models/room.model');

exports.createRoom = async (req, res) => {
  try {
    const { hotel_id, room_num, status, room_type_id } = req.body;
    // enforce uniqueness of room number within a hotel
    const existing = await Room.findOne({ where: { hotel_id, room_num } });
    if (existing) {
      return res.status(400).json({ message: 'Số phòng đã tồn tại trong khách sạn này' });
    }
    const room = await Room.create({ hotel_id, room_num, status, room_type_id });
    return res.status(201).json({ message: 'Tạo phòng thành công', room });
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


