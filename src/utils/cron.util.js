const cron = require('node-cron');
const { Op } = require('sequelize');
const Promotion = require('../models/promotion.model');
const moment = require('moment-timezone');

// Chạy mỗi ngày lúc 00:00 để kiểm tra promotions hết hạn
const updateExpiredPromotions = async () => {
  try {
    const now = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    
    const result = await Promotion.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          end_date: { [Op.lt]: now }
        }
      }
    );

    if (result[0] > 0) {
      console.log(`[CRON] Đã cập nhật ${result[0]} promotion hết hạn lúc ${now}`);
    } else {
      console.log(`[CRON] Không có promotion nào hết hạn lúc ${now}`);
    }
  } catch (error) {
    console.error('[CRON] Lỗi khi cập nhật promotions hết hạn:', error.message);
  }
};

// Khởi tạo cron job
const startPromotionCron = () => {
  // Chạy mỗi ngày lúc 00:00 (giờ VN)
  cron.schedule('0 0 * * *', updateExpiredPromotions, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log('[CRON] Promotion auto-expire job started (runs daily at 00:00 VN time)');
};

module.exports = {
  startPromotionCron,
  updateExpiredPromotions
};
