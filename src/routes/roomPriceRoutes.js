const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { createRoomPrice, updateRoomPrice, deleteRoomPrice, getRoomPrices } = require('../controllers/roomPriceController');

// Public
router.get('/', getRoomPrices);

// Admin
router.post('/', protect, adminOnly, createRoomPrice);
router.put('/:id', protect, adminOnly, updateRoomPrice);
router.delete('/:id', protect, adminOnly, deleteRoomPrice);

module.exports = router;


