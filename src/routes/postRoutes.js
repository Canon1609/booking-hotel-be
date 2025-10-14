const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const postController = require('../controllers/postController');

// Public routes
router.get('/', postController.getPosts);
router.get('/:id', postController.getPostById);
router.get('/slug/:slug', postController.getPostBySlug);

// Protected routes (cần đăng nhập)
router.post('/', protect, postController.uploadImages, postController.createPost);
router.put('/:id', protect, postController.uploadImages, postController.updatePost);
router.delete('/:id', protect, postController.deletePost);

module.exports = router;
