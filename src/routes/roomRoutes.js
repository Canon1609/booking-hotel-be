const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { createRoom, updateRoom, deleteRoom, getRooms, getRoomById, searchAvailability } = require('../controllers/roomController');

// Public
router.get('/', getRooms);
router.get('/availability/search', searchAvailability);
router.get('/:id', getRoomById);

// Admin only
router.post('/', protect, adminOnly, createRoom);
router.put('/:id', protect, adminOnly, updateRoom);
router.delete('/:id', protect, adminOnly, deleteRoom);

module.exports = router;


