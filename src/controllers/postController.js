const { Op } = require('sequelize');
const Post = require('../models/post.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');
const { uploadBufferToS3, deleteFromS3, generateKey, tryExtractKeyFromUrl } = require('../utils/s3.util');
const multer = require('multer');
const moment = require('moment-timezone');

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024 },
  preservePath: true
});
const uploadImages = upload.fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);

// Tạo post mới
exports.createPost = async (req, res) => {
  try {
    console.log('=== CREATE POST DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    
    const { category_id, title, slug, content, status = 'draft' } = req.body;
    // Xử lý tags có thể có dấu cách thừa
    const tags = req.body.tags || req.body['tags'] || req.body['tags'];
    const user_id = req.user.id; // Lấy từ token đã xác thực
    
    // Kiểm tra slug đã tồn tại
    const existingPost = await Post.findOne({ where: { slug } });
    if (existingPost) {
      return res.status(400).json({ message: 'Slug đã tồn tại' });
    }

    // Kiểm tra category tồn tại
    const category = await Category.findOne({ where: { category_id } });
    if (!category) {
      return res.status(404).json({ message: 'Danh mục không tồn tại' });
    }

    let coverImageUrl = null;
    let imageUrls = [];

    // Xử lý ảnh đại diện
    if (req.files && req.files.cover_image && req.files.cover_image[0]) {
      const file = req.files.cover_image[0];
      const key = generateKey('posts/cover', file.originalname);
      const uploaded = await uploadBufferToS3(file.buffer, key, file.mimetype);
      coverImageUrl = uploaded.url;
    }

    // Xử lý ảnh bổ sung
    if (req.files && req.files.images && req.files.images.length) {
      for (const file of req.files.images) {
        const key = generateKey('posts/images', file.originalname);
        const uploaded = await uploadBufferToS3(file.buffer, key, file.mimetype);
        imageUrls.push(uploaded.url);
      }
    }

    // Parse tags nếu là string
    let parsedTags = null;
    console.log('Original tags:', tags, 'Type:', typeof tags);
    if (tags) {
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
          console.log('Parsed as JSON:', parsedTags);
        } catch (e) {
          parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          console.log('Parsed as comma-separated:', parsedTags);
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
        console.log('Already array:', parsedTags);
      }
    }
    console.log('Final parsedTags:', parsedTags);

    const postData = {
      user_id,
      category_id,
      title,
      slug,
      content,
      cover_image_url: coverImageUrl,
      images: imageUrls,
      tags: parsedTags,
      status
    };

    // Nếu status là published, set published_at
    if (status === 'published') {
      postData.published_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }

    const post = await Post.create(postData);
    
    // Lấy thông tin đầy đủ với relations
    const fullPost = await Post.findOne({
      where: { post_id: post.post_id },
      include: [
        { model: User, as: 'author', attributes: ['user_id', 'full_name', 'email'] },
        { model: Category, as: 'category', attributes: ['category_id', 'name', 'slug'] }
      ]
    });

    return res.status(201).json({ message: 'Tạo bài viết thành công', post: fullPost });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Cập nhật post
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, title, slug, content, status } = req.body;
    // Xử lý tags có thể có dấu cách thừa
    const tags = req.body.tags || req.body['tags '] || req.body['tags'];

    const post = await Post.findOne({ where: { post_id: id } });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Kiểm tra quyền sở hữu (chỉ admin hoặc tác giả mới được sửa)
    if (req.user.role !== 'admin' && post.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa bài viết này' });
    }

    // Kiểm tra slug trùng lặp (nếu có thay đổi)
    if (slug && slug !== post.slug) {
      const existingPost = await Post.findOne({ where: { slug } });
      if (existingPost) {
        return res.status(400).json({ message: 'Slug đã tồn tại' });
      }
    }

    // Kiểm tra category tồn tại (nếu có thay đổi)
    if (category_id && category_id !== post.category_id) {
      const category = await Category.findOne({ where: { category_id } });
      if (!category) {
        return res.status(404).json({ message: 'Danh mục không tồn tại' });
      }
    }

    // Xử lý ảnh đại diện
    if (req.files && req.files.cover_image && req.files.cover_image[0]) {
      // Xóa ảnh cũ
      if (post.cover_image_url) {
        const key = tryExtractKeyFromUrl(post.cover_image_url);
        if (key) { try { await deleteFromS3(key); } catch (_) {} }
      }

      const file = req.files.cover_image[0];
      const key = generateKey('posts/cover', file.originalname);
      const uploaded = await uploadBufferToS3(file.buffer, key, file.mimetype);
      post.cover_image_url = uploaded.url;
    }

    // Xử lý ảnh bổ sung
    if (req.files && req.files.images && req.files.images.length) {
      // Xóa ảnh cũ
      if (Array.isArray(post.images)) {
        for (const url of post.images) {
          const key = tryExtractKeyFromUrl(url);
          if (key) { try { await deleteFromS3(key); } catch (_) {} }
        }
      }

      const imageUrls = [];
      for (const file of req.files.images) {
        const key = generateKey('posts/images', file.originalname);
        const uploaded = await uploadBufferToS3(file.buffer, key, file.mimetype);
        imageUrls.push(uploaded.url);
      }
      post.images = imageUrls;
    }

    // Cập nhật fields
    if (category_id) post.category_id = category_id;
    if (title) post.title = title;
    if (slug) post.slug = slug;
    if (content) post.content = content;
    if (tags !== undefined) {
      let parsedTags = null;
      if (tags) {
        if (typeof tags === 'string') {
          try {
            parsedTags = JSON.parse(tags);
          } catch (e) {
            parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          }
        } else if (Array.isArray(tags)) {
          parsedTags = tags;
        }
      }
      post.tags = parsedTags;
    }
    if (status) {
      post.status = status;
      // Nếu chuyển từ draft sang published và chưa có published_at
      if (status === 'published' && !post.published_at) {
        post.published_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
      }
    }

    await post.save();

    // Lấy thông tin đầy đủ với relations
    const fullPost = await Post.findOne({
      where: { post_id: post.post_id },
      include: [
        { model: User, as: 'author', attributes: ['user_id', 'full_name', 'email'] },
        { model: Category, as: 'category', attributes: ['category_id', 'name', 'slug'] }
      ]
    });

    return res.status(200).json({ message: 'Cập nhật bài viết thành công', post: fullPost });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xóa post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findOne({ where: { post_id: id } });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    // Kiểm tra quyền sở hữu (chỉ admin hoặc tác giả mới được xóa)
    if (req.user.role !== 'admin' && post.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài viết này' });
    }

    // Xóa ảnh đại diện
    if (post.cover_image_url) {
      const key = tryExtractKeyFromUrl(post.cover_image_url);
      if (key) { try { await deleteFromS3(key); } catch (_) {} }
    }

    // Xóa ảnh bổ sung
    if (Array.isArray(post.images)) {
      for (const url of post.images) {
        const key = tryExtractKeyFromUrl(url);
        if (key) { try { await deleteFromS3(key); } catch (_) {} }
      }
    }

    await post.destroy();
    return res.status(200).json({ message: 'Xóa bài viết thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy danh sách posts
exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category_id, search, tag } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (category_id) where.category_id = category_id;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }
    if (tag) {
      where.tags = { [Op.contains]: [tag] };
    }

    const result = await Post.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['user_id', 'full_name', 'email'] },
        { model: Category, as: 'category', attributes: ['category_id', 'name', 'slug'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      posts: result.rows,
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

// Lấy post theo ID
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findOne({
      where: { post_id: id },
      include: [
        { model: User, as: 'author', attributes: ['user_id', 'full_name', 'email'] },
        { model: Category, as: 'category', attributes: ['category_id', 'name', 'slug'] }
      ]
    });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    return res.status(200).json({ post });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy post theo slug
exports.getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Post.findOne({
      where: { slug },
      include: [
        { model: User, as: 'author', attributes: ['user_id', 'full_name', 'email'] },
        { model: Category, as: 'category', attributes: ['category_id', 'name', 'slug'] }
      ]
    });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    return res.status(200).json({ post });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

module.exports.uploadImages = uploadImages;
