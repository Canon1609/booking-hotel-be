const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { createRoomType, updateRoomType, deleteRoomType, getRoomTypes, getRoomTypeById, uploadImages } = require('../controllers/roomTypeController');

// Public
router.get('/', getRoomTypes);
router.get('/:id', getRoomTypeById);

// Admin
router.post('/', protect, adminOnly, uploadImages, createRoomType);
router.put('/:id', protect, adminOnly, uploadImages, updateRoomType);
router.delete('/:id', protect, adminOnly, deleteRoomType);

module.exports = router;


