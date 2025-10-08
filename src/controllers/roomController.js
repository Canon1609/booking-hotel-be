const multer = require('multer');
const Room = require('../models/room.model');
const { uploadBufferToS3, deleteFromS3, generateKey, tryExtractKeyFromUrl } = require('../utils/s3.util');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadImages = upload.array('images', 10);

exports.createRoom = async (req, res) => {
  try {
    const { hotel_id, room_num, status, room_type_id } = req.body;
    const images = [];
    if (req.files && req.files.length) {
      for (const f of req.files) {
        const key = generateKey('rooms', f.originalname);
        const uploaded = await uploadBufferToS3(f.buffer, key, f.mimetype);
        images.push(uploaded.url);
      }
    }
    const room = await Room.create({ hotel_id, room_num, status, room_type_id, images });
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

    if (req.files && req.files.length) {
      if (Array.isArray(room.images)) {
        for (const url of room.images) {
          const key = tryExtractKeyFromUrl(url);
          if (key) { try { await deleteFromS3(key); } catch (_) {} }
        }
      }
      const urls = [];
      for (const f of req.files) {
        const key = generateKey('rooms', f.originalname);
        const uploaded = await uploadBufferToS3(f.buffer, key, f.mimetype);
        urls.push(uploaded.url);
      }
      room.images = urls;
    }

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
    if (Array.isArray(room.images)) {
      for (const url of room.images) {
        const key = tryExtractKeyFromUrl(url);
        if (key) { try { await deleteFromS3(key); } catch (_) {} }
      }
    }
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

module.exports.uploadImages = uploadImages;


