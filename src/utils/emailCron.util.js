const cron = require('node-cron');
const { sendBookingReminderEmails } = require('./emailBooking.util');

// Chạy mỗi ngày lúc 18:00 để gửi email nhắc nhở check-in ngày mai
const startEmailReminderCron = () => {
  cron.schedule('0 18 * * *', sendBookingReminderEmails, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log('[EMAIL CRON] Email reminder job started (runs daily at 18:00 VN time)');

  // Test schedule: chạy mỗi 1 phút 
  // cron.schedule('*/1 * * * *', sendBookingReminderEmails, {
  //   scheduled: true,
  //   timezone: "Asia/Ho_Chi_Minh"
  // });
  // console.log('[EMAIL CRON] TEST MODE enabled (runs every 1 minute, VN time)');
};

module.exports = {
  startEmailReminderCron
};
