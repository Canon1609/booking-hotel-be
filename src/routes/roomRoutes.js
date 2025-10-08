const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { createRoom, updateRoom, deleteRoom, getRooms, getRoomById, uploadImages } = require('../controllers/roomController');

// Public
router.get('/', getRooms);
router.get('/:id', getRoomById);

// Admin only
router.post('/', protect, adminOnly, uploadImages, createRoom);
router.put('/:id', protect, adminOnly, uploadImages, updateRoom);
router.delete('/:id', protect, adminOnly, deleteRoom);

module.exports = router;


