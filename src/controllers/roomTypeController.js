const RoomType = require('../models/roomType.model');
const { Op } = require('sequelize');
const multer = require('multer');
const { uploadBufferToS3, deleteFromS3, generateKey, tryExtractKeyFromUrl } = require('../utils/s3.util');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
// accept both 'images' and legacy 'image' to avoid Unexpected field
const uploadImages = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 10 }
]);

exports.createRoomType = async (req, res) => {
  try {
    const { room_type_name, description, amenities, area, quantity } = req.body;
    let amenitiesParsed = null;
    if (amenities !== undefined) {
      if (typeof amenities === 'string' && amenities.trim().length) {
        try {
          amenitiesParsed = JSON.parse(amenities);
        } catch (e) {
          return res.status(400).json({ message: 'amenities phải là JSON hợp lệ' });
        }
      } else if (typeof amenities === 'object' && amenities !== null) {
        amenitiesParsed = amenities;
      }
    }
    let images = [];
    const files = req.files ? [
      ...(Array.isArray(req.files.images) ? req.files.images : []),
      ...(Array.isArray(req.files.image) ? req.files.image : []),
    ] : [];
    if (files.length) {
      for (const f of files) {
        const key = generateKey('room-types', f.originalname);
        const uploaded = await uploadBufferToS3(f.buffer, key, f.mimetype);
        images.push(uploaded.url);
      }
    }
    const roomType = await RoomType.create({ room_type_name, description, amenities: amenitiesParsed, area, quantity, images });
    return res.status(201).json({ message: 'Tạo loại phòng thành công', roomType });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.updateRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_type_name, description, amenities, area, quantity } = req.body;
    let amenitiesParsed = undefined;
    if (amenities !== undefined) {
      if (typeof amenities === 'string' && amenities.trim().length) {
        try {
          amenitiesParsed = JSON.parse(amenities);
        } catch (e) {
          return res.status(400).json({ message: 'amenities phải là JSON hợp lệ' });
        }
      } else if (typeof amenities === 'object' && amenities !== null) {
        amenitiesParsed = amenities;
      } else {
        amenitiesParsed = null;
      }
    }
    const roomType = await RoomType.findOne({ where: { room_type_id: id } });
    if (!roomType) return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    const files = req.files ? [
      ...(Array.isArray(req.files.images) ? req.files.images : []),
      ...(Array.isArray(req.files.image) ? req.files.image : []),
    ] : [];
    if (files.length) {
      if (Array.isArray(roomType.images)) {
        for (const url of roomType.images) {
          const key = tryExtractKeyFromUrl(url);
          if (key) { try { await deleteFromS3(key); } catch (_) {} }
        }
      }
      const urls = [];
      for (const f of files) {
        const key = generateKey('room-types', f.originalname);
        const uploaded = await uploadBufferToS3(f.buffer, key, f.mimetype);
        urls.push(uploaded.url);
      }
      roomType.images = urls;
    }
    if (room_type_name !== undefined) roomType.room_type_name = room_type_name;
    if (description !== undefined) roomType.description = description;
    if (amenitiesParsed !== undefined) roomType.amenities = amenitiesParsed;
    if (area !== undefined) roomType.area = area;
    if (quantity !== undefined) roomType.quantity = quantity;
    // no single image field anymore
    await roomType.save();
    return res.status(200).json({ message: 'Cập nhật loại phòng thành công', roomType });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.deleteRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findOne({ where: { room_type_id: id } });
    if (!roomType) return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    if (Array.isArray(roomType.images)) {
      for (const url of roomType.images) {
        const key = tryExtractKeyFromUrl(url);
        if (key) { try { await deleteFromS3(key); } catch (_) {} }
      }
    }
    await roomType.destroy();
    return res.status(200).json({ message: 'Xóa loại phòng thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getRoomTypes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (search) where.room_type_name = { [Op.like]: `%${search}%` };
    const result = await RoomType.findAndCountAll({ where, limit: parseInt(limit), offset: parseInt(offset), order: [['created_at', 'DESC']] });
    return res.status(200).json({
      roomTypes: result.rows,
      pagination: { currentPage: parseInt(page), totalPages: Math.ceil(result.count / limit), totalItems: result.count }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getRoomTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findOne({ where: { room_type_id: id } });
    if (!roomType) return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    return res.status(200).json({ roomType });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

module.exports.uploadImages = uploadImages;


