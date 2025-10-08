const multer = require('multer');
const Hotel = require('../models/hotel.model');
const { uploadBufferToS3, deleteFromS3, generateKey, tryExtractKeyFromUrl } = require('../utils/s3.util');

// Multer memory storage to capture file buffer
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware: single image field 'image'
const uploadImage = upload.single('image');

// Create Hotel (Admin)
exports.createHotel = async (req, res) => {
  try {
    const { name, address, description, phone, email } = req.body;
    let imageUrl;

    if (req.file) {
      const key = generateKey('hotels', req.file.originalname);
      const uploaded = await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
      imageUrl = uploaded.url;
    }

    const hotel = await Hotel.create({ name, address, description, image: imageUrl, phone, email });
    return res.status(201).json({ message: 'Tạo khách sạn thành công', hotel });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Update Hotel (Admin)
exports.updateHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, description, phone, email } = req.body;

    const hotel = await Hotel.findOne({ where: { hotel_id: id } });
    if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn' });

    // Replace image if provided
    if (req.file) {
      // delete old if existed
      if (hotel.image) {
        const key = tryExtractKeyFromUrl(hotel.image);
        if (key) await deleteFromS3(key);
      }
      const key = generateKey('hotels', req.file.originalname);
      const uploaded = await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
      hotel.image = uploaded.url;
    }

    if (name !== undefined) hotel.name = name;
    if (address !== undefined) hotel.address = address;
    if (description !== undefined) hotel.description = description;
    if (phone !== undefined) hotel.phone = phone;
    if (email !== undefined) hotel.email = email;

    await hotel.save();
    return res.status(200).json({ message: 'Cập nhật khách sạn thành công', hotel });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Delete Hotel (Admin)
exports.deleteHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const hotel = await Hotel.findOne({ where: { hotel_id: id } });
    if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn' });

    if (hotel.image) {
      const key = tryExtractKeyFromUrl(hotel.image);
      if (key) await deleteFromS3(key);
    }

    await hotel.destroy();
    return res.status(200).json({ message: 'Xóa khách sạn thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// List and Get
exports.getHotels = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } }
      ];
    }

    const result = await Hotel.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      hotels: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.count / limit),
        totalItems: result.count
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getHotelById = async (req, res) => {
  try {
    const { id } = req.params;
    const hotel = await Hotel.findOne({ where: { hotel_id: id } });
    if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn' });
    return res.status(200).json({ hotel });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

module.exports.uploadImage = uploadImage;


