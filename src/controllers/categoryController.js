const { Op } = require('sequelize');
const Category = require('../models/category.model');

// Tạo category mới
exports.createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    // Kiểm tra slug đã tồn tại
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      return res.status(400).json({ message: 'Slug đã tồn tại' });
    }

    const category = await Category.create({ name, slug });
    return res.status(201).json({ message: 'Tạo danh mục thành công', category });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Cập nhật category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;

    const category = await Category.findOne({ where: { category_id: id } });
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    // Kiểm tra slug trùng lặp (nếu có thay đổi)
    if (slug && slug !== category.slug) {
      const existingCategory = await Category.findOne({ where: { slug } });
      if (existingCategory) {
        return res.status(400).json({ message: 'Slug đã tồn tại' });
      }
    }

    if (name) category.name = name;
    if (slug) category.slug = slug;

    await category.save();
    return res.status(200).json({ message: 'Cập nhật danh mục thành công', category });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xóa category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findOne({ where: { category_id: id } });
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    await category.destroy();
    return res.status(200).json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy danh sách categories
exports.getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } }
      ];
    }

    const result = await Category.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      categories: result.rows,
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

// Lấy category theo ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findOne({ where: { category_id: id } });
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
    return res.status(200).json({ category });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy category theo slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ where: { slug } });
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
    return res.status(200).json({ category });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};
