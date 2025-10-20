const { sendEmail } = require('./email.util');
const { Booking, User, Room, RoomType } = require('../models');
const moment = require('moment-timezone');

// Gửi email nhắc nhở cho khách hàng có check-in ngày mai
const sendBookingReminderEmails = async () => {
  try {
    const tomorrow = moment().tz('Asia/Ho_Chi_Minh').add(1, 'day').format('YYYY-MM-DD');
    
    // Tìm tất cả booking có check-in ngày mai và status confirmed
    const bookings = await Booking.findAll({
      where: {
        check_in_date: tomorrow,
        booking_status: 'confirmed'
      },
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['user_id', 'full_name', 'email', 'phone'] 
        },
        { 
          model: Room, 
          as: 'room', 
          include: [{ 
            model: RoomType, 
            as: 'room_type',
            attributes: ['room_type_name', 'description', 'amenities']
          }]
        }
      ]
    });

    console.log(`[EMAIL REMINDER] Tìm thấy ${bookings.length} booking cần nhắc nhở`);

    for (const booking of bookings) {
      if (booking.user && booking.user.email) {
        try {
          const checkInTime = '14:00'; // Giờ check-in mặc định
          const checkOutTime = '12:00'; // Giờ check-out mặc định
          
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2c3e50;">Nhắc nhở check-in ngày mai</h2>
              
              <p>Xin chào <strong>${booking.user.full_name}</strong>,</p>
              
              <p>Chúng tôi xin nhắc nhở bạn về việc check-in vào ngày mai:</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Thông tin đặt phòng</h3>
                <p><strong>Mã đặt phòng:</strong> ${booking.booking_code}</p>
                <p><strong>Loại phòng:</strong> ${booking.room.room_type?.room_type_name || 'N/A'}</p>
                <p><strong>Số phòng:</strong> ${booking.room.room_number}</p>
                <p><strong>Ngày check-in:</strong> ${moment(booking.check_in_date).format('DD/MM/YYYY')} lúc ${checkInTime}</p>
                <p><strong>Ngày check-out:</strong> ${moment(booking.check_out_date).format('DD/MM/YYYY')} lúc ${checkOutTime}</p>
                <p><strong>Số khách:</strong> ${booking.num_person} người</p>
                <p><strong>Tổng tiền:</strong> ${booking.final_price?.toLocaleString('vi-VN') || booking.total_price?.toLocaleString('vi-VN')} VNĐ</p>
              </div>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #27ae60; margin-top: 0;">Lưu ý quan trọng:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Vui lòng mang theo CMND/CCCD để làm thủ tục check-in</li>
                  <li>Giờ check-in: ${checkInTime} - Giờ check-out: ${checkOutTime}</li>
                  <li>Nếu có thay đổi, vui lòng liên hệ hotline: 1900-xxxx</li>
                </ul>
              </div>
              
              <p>Chúng tôi rất mong được phục vụ bạn!</p>
              
              <p>Trân trọng,<br>
              <strong>Khách sạn ABC</strong></p>
            </div>
          `;

          await sendEmail({
            to: booking.user.email,
            subject: `Nhắc nhở check-in ngày mai - ${booking.booking_code}`,
            html: emailContent
          });

          console.log(`[EMAIL REMINDER] Đã gửi email nhắc nhở cho booking ${booking.booking_code}`);
        } catch (emailError) {
          console.error(`[EMAIL REMINDER] Lỗi gửi email cho booking ${booking.booking_code}:`, emailError);
        }
      }
    }

    console.log(`[EMAIL REMINDER] Hoàn thành gửi email nhắc nhở cho ${bookings.length} booking`);
  } catch (error) {
    console.error('[EMAIL REMINDER] Lỗi gửi email nhắc nhở:', error);
  }
};

// Gửi email xác nhận đặt phòng thành công
const sendBookingConfirmationEmail = async (booking, user) => {
  try {
    if (!user || !user.email) {
      console.log('Không có email để gửi xác nhận');
      return;
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Đặt phòng thành công!</h2>
        
        <p>Xin chào <strong>${user.full_name}</strong>,</p>
        
        <p>Cảm ơn bạn đã đặt phòng tại khách sạn chúng tôi. Dưới đây là thông tin chi tiết:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Thông tin đặt phòng</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking.booking_code}</p>
          <p><strong>Loại phòng:</strong> ${booking.room?.room_type?.room_type_name || 'N/A'}</p>
          <p><strong>Số phòng:</strong> ${booking.room?.room_number || 'N/A'}</p>
          <p><strong>Ngày check-in:</strong> ${moment(booking.check_in_date).format('DD/MM/YYYY')}</p>
          <p><strong>Ngày check-out:</strong> ${moment(booking.check_out_date).format('DD/MM/YYYY')}</p>
          <p><strong>Số khách:</strong> ${booking.num_person} người</p>
          <p><strong>Tổng tiền:</strong> ${booking.final_price?.toLocaleString('vi-VN') || booking.total_price?.toLocaleString('vi-VN')} VNĐ</p>
          <p><strong>Trạng thái:</strong> ${booking.booking_status === 'confirmed' ? 'Đã xác nhận' : 'Đang chờ xác nhận'}</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #27ae60; margin-top: 0;">Hướng dẫn check-in:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Vui lòng mang theo CMND/CCCD để làm thủ tục check-in</li>
            <li>Giờ check-in: 14:00 - Giờ check-out: 12:00</li>
            <li>Nếu có thay đổi, vui lòng liên hệ hotline: 1900-xxxx</li>
          </ul>
        </div>
        
        <p>Chúng tôi rất mong được phục vụ bạn!</p>
        
        <p>Trân trọng,<br>
        <strong>Khách sạn ABC</strong></p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Xác nhận đặt phòng thành công - ${booking.booking_code}`,
      html: emailContent
    });

    console.log(`[EMAIL CONFIRMATION] Đã gửi email xác nhận cho booking ${booking.booking_code}`);
  } catch (error) {
    console.error(`[EMAIL CONFIRMATION] Lỗi gửi email xác nhận:`, error);
  }
};

// Gửi email hóa đơn khi check-out
const sendInvoiceEmail = async (booking, user, invoiceData) => {
  try {
    if (!user || !user.email) {
      console.log('Không có email để gửi hóa đơn');
      return;
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Hóa đơn thanh toán</h2>
        
        <p>Xin chào <strong>${user.full_name}</strong>,</p>
        
        <p>Dưới đây là hóa đơn chi tiết cho booking của bạn:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Thông tin booking</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking.booking_code}</p>
          <p><strong>Loại phòng:</strong> ${booking.room?.room_type?.room_type_name || 'N/A'}</p>
          <p><strong>Số phòng:</strong> ${booking.room?.room_number || 'N/A'}</p>
          <p><strong>Check-in:</strong> ${moment(booking.check_in_time).format('DD/MM/YYYY HH:mm')}</p>
          <p><strong>Check-out:</strong> ${moment(booking.check_out_time).format('DD/MM/YYYY HH:mm')}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Chi tiết hóa đơn</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Dịch vụ</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Số lượng</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Đơn giá</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.unitPrice.toLocaleString('vi-VN')} VNĐ</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.total.toLocaleString('vi-VN')} VNĐ</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8f9fa; font-weight: bold;">
                <td colspan="3" style="padding: 10px; text-align: right;">Tổng cộng:</td>
                <td style="padding: 10px; text-align: right;">${invoiceData.total.toLocaleString('vi-VN')} VNĐ</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
        
        <p>Trân trọng,<br>
        <strong>Khách sạn ABC</strong></p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Hóa đơn thanh toán - ${booking.booking_code}`,
      html: emailContent
    });

    console.log(`[EMAIL INVOICE] Đã gửi email hóa đơn cho booking ${booking.booking_code}`);
  } catch (error) {
    console.error(`[EMAIL INVOICE] Lỗi gửi email hóa đơn:`, error);
  }
};

module.exports = {
  sendBookingReminderEmails,
  sendBookingConfirmationEmail,
  sendInvoiceEmail
};
