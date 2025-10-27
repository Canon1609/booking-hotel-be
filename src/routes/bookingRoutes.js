const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// ========== LUỒNG 1: ĐẶT PHÒNG TRỰC TUYẾN (ONLINE) ==========

// 1.1. Giữ chỗ tạm thời (Redis) - User
router.post('/temp-booking', protect, bookingController.createTempBooking);

// 1.2. Thêm dịch vụ vào booking tạm thời - User
router.post('/temp-booking/add-service', protect, bookingController.addServiceToTempBooking);

// 1.3. Tạo link thanh toán PayOS - User
router.post('/create-payment-link', protect, bookingController.createPaymentLink);

// 1.4. Webhook xử lý kết quả thanh toán - PayOS
router.post('/payment-webhook', bookingController.handlePaymentWebhook);

// ========== LUỒNG 2: ĐẶT PHÒNG TRỰC TIẾP (WALK-IN) ==========

// 2.1. Tạo booking trực tiếp - Admin/Staff
router.post('/walk-in', protect, adminOnly, bookingController.createWalkInBooking);

// ========== CÁC API CHUNG ==========

// Lấy danh sách booking - Admin/Staff
router.get('/', protect, adminOnly, bookingController.getBookings);

// Lấy booking theo ID - User (chỉ booking của mình) hoặc Admin
router.get('/:id', protect, bookingController.getBookingById);

// Tìm booking theo mã đặt phòng (cho check-in) - Admin/Staff
router.get('/code/:booking_code', protect, adminOnly, bookingController.findBookingByCode);

// Lấy danh sách phòng trống của một loại phòng - Admin/Staff
router.get('/available-rooms', protect, adminOnly, bookingController.getAvailableRoomsForType);

// Check-in - Admin/Staff
router.post('/:booking_code/check-in', protect, adminOnly, bookingController.checkIn);

// Check-out - Admin/Staff
router.post('/:booking_code/check-out', protect, adminOnly, bookingController.checkOut);

// Hủy booking - User (chỉ booking của mình) hoặc Admin
router.post('/:id/cancel', protect, bookingController.cancelBooking);

// Tạo và tải hóa đơn PDF - Admin/Staff
router.get('/:id/invoice/pdf', protect, adminOnly, bookingController.generateInvoicePDF);

// Xem hóa đơn HTML - Admin/Staff
router.get('/:id/invoice', protect, adminOnly, bookingController.viewInvoice);

// Cập nhật trạng thái phòng - Admin/Staff
router.put('/room/:room_id/status', protect, adminOnly, bookingController.updateRoomStatus);

module.exports = router;
