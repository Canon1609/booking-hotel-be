const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const promotionController = require('../controllers/promotionController');

// Public routes
router.get('/', promotionController.getPromotions);
router.get('/:id', promotionController.getPromotionById);
router.post('/validate', promotionController.validatePromotionCode);
router.post('/apply', promotionController.applyPromotionCode);

// Admin only routes
router.post('/', protect, adminOnly, promotionController.createPromotion);
router.put('/:id', protect, adminOnly, promotionController.updatePromotion);
router.delete('/:id', protect, adminOnly, promotionController.deletePromotion);
router.post('/update-expired', protect, adminOnly, promotionController.updateExpiredPromotions);

module.exports = router;
