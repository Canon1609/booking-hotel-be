const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const serviceController = require('../controllers/serviceController');

// Public
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getServiceById);

// Admin only
router.post('/', protect, adminOnly, serviceController.uploadImages, serviceController.createService);
router.put('/:id', protect, adminOnly, serviceController.uploadImages, serviceController.updateService);
router.delete('/:id', protect, adminOnly, serviceController.deleteService);

module.exports = router;


