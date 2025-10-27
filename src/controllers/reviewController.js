const multer = require('multer');
const { Review, Booking, User, RoomType, Room } = require('../models');
const { Op } = require('sequelize');
const { uploadBufferToS3, generateKey, deleteFromS3, tryExtractKeyFromUrl } = require('../utils/s3.util');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadImages = upload.array('images', 10); // Cho phép tối đa 10 ảnh

// Tạo review mới
exports.uploadImages = uploadImages; // Export middleware để sử dụng trong routes

exports.createReview = async (req, res) => {
  try {
    const { booking_id, rating, comment } = req.body;
    const user_id = req.user.id;

    // Kiểm tra đầu vào
    if (!booking_id || !rating) {
      return res.status(400).json({ message: 'Vui lòng cung cấp booking_id và rating' });
    }

    // Validation rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating phải là số từ 1 đến 5' });
    }

    // Kiểm tra booking có tồn tại và thuộc về user không
    const booking = await Booking.findOne({
      where: { 
        booking_id,
        user_id 
      },
      include: [
        { model: RoomType, as: 'room_type', attributes: ['room_type_id', 'room_type_name'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking hoặc bạn không có quyền đánh giá booking này' });
    }

    // Kiểm tra booking đã checkout chưa
    if (booking.booking_status !== 'checked_out') {
      return res.status(400).json({ 
        message: 'Chỉ có thể đánh giá sau khi đã check-out',
        booking_status: booking.booking_status
      });
    }

    // Kiểm tra đã đánh giá chưa
    const existingReview = await Review.findOne({
      where: { 
        booking_id,
        user_id 
      }
    });

    if (existingReview) {
      return res.status(400).json({ message: 'Bạn đã đánh giá booking này rồi' });
    }

    // Upload images nếu có
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const key = generateKey('reviews', file.originalname);
        const uploaded = await uploadBufferToS3(file.buffer, key, file.mimetype);
        imageUrls.push(uploaded.url);
      }
    }

    // Tạo review
    const review = await Review.create({
      user_id,
      booking_id,
      rating: ratingNum,
      comment: comment || null,
      images: imageUrls.length > 0 ? imageUrls : null
    });

    // Lấy thông tin đầy đủ của review
    const reviewWithDetails = await Review.findOne({
      where: { review_id: review.review_id },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email'] },
        { model: Booking, as: 'booking', attributes: ['booking_id', 'booking_code', 'room_type_id'] }
      ]
    });

    return res.status(201).json({
      message: 'Tạo review thành công',
      review: reviewWithDetails
    });

  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Cập nhật review
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    // Tìm review
    const review = await Review.findOne({
      where: { 
        review_id: id,
        user_id 
      }
    });

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy review hoặc bạn không có quyền chỉnh sửa' });
    }

    // Cập nhật review
    if (rating !== undefined) {
      const ratingNum = parseInt(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ message: 'Rating phải là số từ 1 đến 5' });
      }
      review.rating = ratingNum;
    }
    if (comment !== undefined) review.comment = comment;

    // Upload và cập nhật images nếu có
    if (req.files && req.files.length > 0) {
      // Xóa ảnh cũ nếu có
      if (review.images && Array.isArray(review.images)) {
        for (const url of review.images) {
          const key = tryExtractKeyFromUrl(url);
          if (key) {
            try {
              await deleteFromS3(key);
            } catch (err) {
              console.error('Error deleting old image:', err);
            }
          }
        }
      }
      
      // Upload ảnh mới
      const newImageUrls = [];
      for (const file of req.files) {
        const key = generateKey('reviews', file.originalname);
        const uploaded = await uploadBufferToS3(file.buffer, key, file.mimetype);
        newImageUrls.push(uploaded.url);
      }
      review.images = newImageUrls;
    }

    await review.save();

    // Lấy thông tin đầy đủ
    const updatedReview = await Review.findOne({
      where: { review_id: id },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email'] },
        { model: Booking, as: 'booking', attributes: ['booking_id', 'booking_code', 'room_type_id'] }
      ]
    });

    return res.status(200).json({
      message: 'Cập nhật review thành công',
      review: updatedReview
    });

  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xóa review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const review = await Review.findOne({
      where: { 
        review_id: id,
        user_id 
      }
    });

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy review hoặc bạn không có quyền xóa' });
    }

    // Xóa ảnh khỏi S3 nếu có
    if (review.images && Array.isArray(review.images)) {
      for (const url of review.images) {
        const key = tryExtractKeyFromUrl(url);
        if (key) {
          try {
            await deleteFromS3(key);
          } catch (err) {
            console.error('Error deleting image:', err);
          }
        }
      }
    }

    await review.destroy();

    return res.status(200).json({ message: 'Xóa review thành công' });

  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy reviews theo room type (public - không cần auth)
exports.getReviewsByRoomType = async (req, res) => {
  try {
    const { room_type_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Tìm tất cả bookings của room type này
    const bookings = await Booking.findAll({
      where: { room_type_id },
      attributes: ['booking_id']
    });

    const bookingIds = bookings.map(b => b.booking_id);

    if (bookingIds.length === 0) {
      return res.status(200).json({
        message: 'Chưa có review nào cho loại phòng này',
        reviews: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalItems: 0,
          pageSize: parseInt(limit)
        }
      });
    }

    // Lấy reviews
    const result = await Review.findAndCountAll({
      where: {
        booking_id: { [Op.in]: bookingIds }
      },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email'] },
        { 
          model: Booking, 
          as: 'booking', 
          attributes: ['booking_id', 'booking_code', 'room_type_id'],
          include: [
            { model: RoomType, as: 'room_type', attributes: ['room_type_name'] }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      message: 'Lấy danh sách reviews thành công',
      reviews: result.rows.map(review => ({
        review_id: review.review_id,
        rating: review.rating,
        comment: review.comment,
        images: review.images,
        created_at: review.created_at,
        updated_at: review.updated_at,
        user: {
          user_id: review.user.user_id,
          full_name: review.user.full_name
        },
        booking: {
          booking_code: review.booking.booking_code,
          room_type_name: review.booking.room_type.room_type_name
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.count / limit),
        totalItems: result.count,
        pageSize: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting reviews by room type:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy review của user hiện tại
exports.getMyReviews = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await Review.findAndCountAll({
      where: { user_id },
      include: [
        { 
          model: Booking, 
          as: 'booking',
          attributes: ['booking_id', 'booking_code', 'room_type_id'],
          include: [
            { model: RoomType, as: 'room_type', attributes: ['room_type_name'] },
            { model: Room, as: 'room', attributes: ['room_num'] }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      message: 'Lấy danh sách reviews của bạn thành công',
      reviews: result.rows.map(review => ({
        review_id: review.review_id,
        rating: review.rating,
        comment: review.comment,
        images: review.images,
        created_at: review.created_at,
        updated_at: review.updated_at,
        booking: {
          booking_id: review.booking.booking_id,
          booking_code: review.booking.booking_code,
          room_type_name: review.booking.room_type.room_type_name,
          room_num: review.booking.room?.room_num
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.count / limit),
        totalItems: result.count,
        pageSize: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting my reviews:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};
