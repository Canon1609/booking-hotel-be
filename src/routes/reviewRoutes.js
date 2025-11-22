const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Lấy tất cả reviews (Admin only)
router.get('/admin/all', protect, adminOnly, reviewController.getAllReviews);

// Lấy reviews theo room type (public - không cần auth)
router.get('/room-type/:room_type_id', reviewController.getReviewsByRoomType);

// Tạo review mới (cần auth + upload images)
router.post('/', protect, reviewController.uploadImages, reviewController.createReview);

// Lấy reviews của user hiện tại (cần auth)
router.get('/my-reviews', protect, reviewController.getMyReviews);

// Cập nhật review (cần auth - chỉ user sở hữu + upload images)
router.put('/:id', protect, reviewController.uploadImages, reviewController.updateReview);

// Xóa review (cần auth - chỉ user sở hữu hoặc admin)
router.delete('/:id', protect, reviewController.deleteReview);

// Admin phản hồi đánh giá (cần auth + admin)
router.post('/:id/reply', protect, adminOnly, reviewController.replyToReview);

module.exports = router;
