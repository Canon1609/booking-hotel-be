const { Op } = require('sequelize');
const Promotion = require('../models/promotion.model');
const moment = require('moment-timezone');

// Tạo promotion mới
exports.createPromotion = async (req, res) => {
  try {
    const { promotion_code, discount_type, amount, start_date, end_date, quantity = 0 } = req.body;

    // Kiểm tra promotion code đã tồn tại
    const existingPromotion = await Promotion.findOne({ where: { promotion_code } });
    if (existingPromotion) {
      return res.status(400).json({ message: 'Mã promotion đã tồn tại' });
    }

    // Validate discount type và amount
    if (discount_type === 'percentage' && (amount < 0 || amount > 100)) {
      return res.status(400).json({ message: 'Phần trăm giảm giá phải từ 0-100%' });
    }

    if (discount_type === 'fixed' && amount <= 0) {
      return res.status(400).json({ message: 'Số tiền giảm phải lớn hơn 0' });
    }

    // Validate dates
    const startDate = moment(start_date).tz('Asia/Ho_Chi_Minh');
    const endDate = end_date ? moment(end_date).tz('Asia/Ho_Chi_Minh') : null;

    if (endDate && endDate.isBefore(startDate)) {
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
    }

    const promotion = await Promotion.create({
      promotion_code,
      discount_type,
      amount,
      start_date: startDate.format('YYYY-MM-DD HH:mm:ss'),
      end_date: endDate ? endDate.format('YYYY-MM-DD HH:mm:ss') : null,
      quantity
    });

    return res.status(201).json({ message: 'Tạo promotion thành công', promotion });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Cập nhật promotion
exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { promotion_code, discount_type, amount, start_date, end_date, quantity, status } = req.body;

    const promotion = await Promotion.findOne({ where: { promotion_id: id } });
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy promotion' });
    }

    // Kiểm tra promotion code trùng lặp (nếu có thay đổi)
    if (promotion_code && promotion_code !== promotion.promotion_code) {
      const existingPromotion = await Promotion.findOne({ where: { promotion_code } });
      if (existingPromotion) {
        return res.status(400).json({ message: 'Mã promotion đã tồn tại' });
      }
    }

    // Validate data
    if (discount_type === 'percentage' && (amount < 0 || amount > 100)) {
      return res.status(400).json({ message: 'Phần trăm giảm giá phải từ 0-100%' });
    }

    if (discount_type === 'fixed' && amount <= 0) {
      return res.status(400).json({ message: 'Số tiền giảm phải lớn hơn 0' });
    }

    // Cập nhật fields
    if (promotion_code) promotion.promotion_code = promotion_code;
    if (discount_type) promotion.discount_type = discount_type;
    if (amount !== undefined) promotion.amount = amount;
    if (start_date) promotion.start_date = moment(start_date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    if (end_date !== undefined) {
      promotion.end_date = end_date ? moment(end_date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : null;
    }
    if (quantity !== undefined) promotion.quantity = quantity;
    if (status) promotion.status = status;

    await promotion.save();
    return res.status(200).json({ message: 'Cập nhật promotion thành công', promotion });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xóa promotion
exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findOne({ where: { promotion_id: id } });
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy promotion' });
    }

    await promotion.destroy();
    return res.status(200).json({ message: 'Xóa promotion thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy danh sách promotions
exports.getPromotions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { promotion_code: { [Op.like]: `%${search}%` } }
      ];
    }

    const result = await Promotion.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      promotions: result.rows,
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

// Lấy promotion theo ID
exports.getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findOne({ where: { promotion_id: id } });
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy promotion' });
    }
    return res.status(200).json({ promotion });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Kiểm tra promotion code
exports.validatePromotionCode = async (req, res) => {
  try {
    const { promotion_code } = req.body;

    if (!promotion_code) {
      return res.status(400).json({ message: 'Vui lòng nhập mã promotion' });
    }

    const promotion = await Promotion.findOne({ where: { promotion_code } });
    if (!promotion) {
      return res.status(404).json({ message: 'Mã promotion không tồn tại' });
    }

    // Kiểm tra trạng thái
    if (promotion.status !== 'active') {
      return res.status(400).json({ message: 'Mã promotion không còn hiệu lực' });
    }

    const now = moment().tz('Asia/Ho_Chi_Minh');
    const startDate = moment(promotion.start_date).tz('Asia/Ho_Chi_Minh');
    const endDate = promotion.end_date ? moment(promotion.end_date).tz('Asia/Ho_Chi_Minh') : null;

    // Kiểm tra thời gian hiệu lực
    if (now.isBefore(startDate)) {
      return res.status(400).json({ message: 'Mã promotion chưa có hiệu lực' });
    }

    if (endDate && now.isAfter(endDate)) {
      return res.status(400).json({ message: 'Mã promotion đã hết hạn' });
    }

    return res.status(200).json({
      message: 'Mã promotion hợp lệ',
      promotion: {
        promotion_id: promotion.promotion_id,
        promotion_code: promotion.promotion_code,
        discount_type: promotion.discount_type,
        amount: promotion.amount,
        start_date: promotion.start_date,
        end_date: promotion.end_date
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Áp dụng promotion code với tổng tiền (dùng khi checkout)
exports.applyPromotionCode = async (req, res) => {
  try {
    const { promotion_code, total_amount } = req.body;

    if (!promotion_code || !total_amount) {
      return res.status(400).json({ message: 'Vui lòng nhập mã promotion và tổng tiền' });
    }

    const promotion = await Promotion.findOne({ where: { promotion_code } });
    if (!promotion) {
      return res.status(404).json({ message: 'Mã promotion không tồn tại' });
    }

    // Kiểm tra trạng thái
    if (promotion.status !== 'active') {
      return res.status(400).json({ message: 'Mã promotion không còn hiệu lực' });
    }

    const now = moment().tz('Asia/Ho_Chi_Minh');
    const startDate = moment(promotion.start_date).tz('Asia/Ho_Chi_Minh');
    const endDate = promotion.end_date ? moment(promotion.end_date).tz('Asia/Ho_Chi_Minh') : null;

    // Kiểm tra thời gian hiệu lực
    if (now.isBefore(startDate)) {
      return res.status(400).json({ message: 'Mã promotion chưa có hiệu lực' });
    }

    if (endDate && now.isAfter(endDate)) {
      return res.status(400).json({ message: 'Mã promotion đã hết hạn' });
    }

    // Tính toán giảm giá
    let discount_amount = 0;
    if (promotion.discount_type === 'percentage') {
      discount_amount = (total_amount * promotion.amount) / 100;
    } else {
      discount_amount = promotion.amount;
    }

    // Đảm bảo không giảm quá tổng tiền
    if (discount_amount > total_amount) {
      discount_amount = total_amount;
    }

    const final_amount = total_amount - discount_amount;

    return res.status(200).json({
      message: 'Áp dụng promotion thành công',
      promotion: {
        promotion_id: promotion.promotion_id,
        promotion_code: promotion.promotion_code,
        discount_type: promotion.discount_type,
        discount_amount,
        final_amount
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tự động cập nhật trạng thái expired (có thể gọi định kỳ)
exports.updateExpiredPromotions = async (req, res) => {
  try {
    const now = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    
    const result = await Promotion.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          end_date: { [Op.lt]: now }
        }
      }
    );

    return res.status(200).json({
      message: `Đã cập nhật ${result[0]} promotion hết hạn`,
      updated_count: result[0]
    });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};
