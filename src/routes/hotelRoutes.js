const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { createHotel, updateHotel, deleteHotel, getHotels, getHotelById, uploadImages } = require('../controllers/hotelController');

// Public list and detail
router.get('/', getHotels);
router.get('/:id', getHotelById);

// Admin only create/update/delete
router.post('/', protect, adminOnly, uploadImages, createHotel);
router.put('/:id', protect, adminOnly, uploadImages, updateHotel);
router.delete('/:id', protect, adminOnly, deleteHotel);

module.exports = router;


