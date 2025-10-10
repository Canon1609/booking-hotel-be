const multer = require('multer');
const { Op } = require('sequelize');
const Service = require('../models/service.model');
const { uploadBufferToS3, deleteFromS3, generateKey, tryExtractKeyFromUrl } = require('../utils/s3.util');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadImages = upload.array('images', 10);

exports.createService = async (req, res) => {
  try {
    const { hotel_id, name, description } = req.body;
    const imageUrls = [];
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const key = generateKey('services', file.originalname);
        const uploaded = await uploadBufferToS3(file.buffer, key, file.mimetype);
        imageUrls.push(uploaded.url);
      }
    }
    const service = await Service.create({ hotel_id, name, description, images: imageUrls });
    return res.status(201).json({ message: 'Tạo dịch vụ thành công', service });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { hotel_id, name, description } = req.body;
    const service = await Service.findOne({ where: { service_id: id } });
    if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });

    if (req.files && req.files.length) {
      if (Array.isArray(service.images)) {
        for (const url of service.images) {
          const key = tryExtractKeyFromUrl(url);
          if (key) { try { await deleteFromS3(key); } catch (_) {} }
        }
      }
      const newUrls = [];
      for (const f of req.files) {
        const key = generateKey('services', f.originalname);
        const uploaded = await uploadBufferToS3(f.buffer, key, f.mimetype);
        newUrls.push(uploaded.url);
      }
      service.images = newUrls;
    }

    if (hotel_id !== undefined) service.hotel_id = hotel_id;
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;

    await service.save();
    return res.status(200).json({ message: 'Cập nhật dịch vụ thành công', service });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findOne({ where: { service_id: id } });
    if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    if (Array.isArray(service.images)) {
      for (const url of service.images) {
        const key = tryExtractKeyFromUrl(url);
        if (key) { try { await deleteFromS3(key); } catch (_) {} }
      }
    }
    await service.destroy();
    return res.status(200).json({ message: 'Xóa dịch vụ thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', hotel_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (hotel_id) where.hotel_id = hotel_id;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const result = await Service.findAndCountAll({ where, limit: parseInt(limit), offset: parseInt(offset), order: [['created_at', 'DESC']] });
    return res.status(200).json({ services: result.rows, pagination: { currentPage: parseInt(page), totalPages: Math.ceil(result.count / limit), totalItems: result.count } });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findOne({ where: { service_id: id } });
    if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    return res.status(200).json({ service });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

module.exports.uploadImages = uploadImages;


