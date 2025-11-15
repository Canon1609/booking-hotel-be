const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// ========== BÁO CÁO DOANH THU (REVENUE REPORTS) ==========

// Xuất báo cáo doanh thu Excel
// GET /api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31
router.get('/revenue', protect, adminOnly, reportController.exportRevenueReport);

// Xuất báo cáo doanh thu PDF
// GET /api/reports/revenue/pdf?start_date=2024-01-01&end_date=2024-01-31
router.get('/revenue/pdf', protect, adminOnly, reportController.exportRevenueReportPDF);

// ========== BÁO CÁO CÔNG SUẤT PHÒNG (OCCUPANCY REPORTS) - EXCEL ==========

// Xuất báo cáo công suất phòng
// GET /api/reports/occupancy?start_date=2024-01-01&end_date=2024-01-31
router.get('/occupancy', protect, adminOnly, reportController.exportOccupancyReport);

// ========== BÁO CÁO VẬN HÀNH (OPERATIONAL REPORTS) - PDF ==========

// Danh sách khách đến (Arrival List)
// GET /api/reports/arrivals?date=2024-01-15 (nếu không có date thì mặc định hôm nay)
router.get('/arrivals', protect, adminOnly, reportController.exportArrivalList);

// Danh sách khách đi (Departure List)
// GET /api/reports/departures?date=2024-01-15 (nếu không có date thì mặc định hôm nay)
router.get('/departures', protect, adminOnly, reportController.exportDepartureList);

// Báo cáo tình trạng phòng (Room Status Report)
// GET /api/reports/room-status
router.get('/room-status', protect, adminOnly, reportController.exportRoomStatusReport);

module.exports = router;

