const sendEmail = require('./email.util');
const { Booking, User, Room, RoomType, BookingRoom } = require('../models');
const moment = require('moment-timezone');

// Gửi email nhắc nhở cho khách hàng có check-in ngày mai
const sendBookingReminderEmails = async () => {
  try {
    const nowVN = moment().tz('Asia/Ho_Chi_Minh');
    const tomorrow = nowVN.clone().add(1, 'day').format('YYYY-MM-DD');
    console.log(`[EMAIL REMINDER] Cron tick at ${nowVN.format('YYYY-MM-DD HH:mm:ss')} VN - querying bookings for check-in date ${tomorrow}`);
    
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
        // Tham chiếu qua booking_rooms -> room -> room_type (tránh join alias 'room' trực tiếp vì online booking không có room_id)
        {
          model: BookingRoom,
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            include: [{
              model: RoomType,
              as: 'room_type',
              attributes: ['room_type_name', 'description', 'amenities']
            }],
            attributes: ['room_id', 'room_num', 'status']
          }],
          attributes: ['booking_room_id', 'room_id', 'assigned_at']
        }
      ]
    });

    console.log(`[EMAIL REMINDER] Tìm thấy ${bookings.length} booking cần nhắc nhở`);

    for (const booking of bookings) {
      if (booking.user && booking.user.email) {
        try {
          // Lấy số lượng phòng từ booking_rooms
          const bookingRooms = await BookingRoom.findAll({
            where: { booking_id: booking.booking_id }
          });
          const numRooms = bookingRooms.length || (booking.room_id ? 1 : 0);

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
                <p><strong>Loại phòng:</strong> ${booking.room?.room_type?.room_type_name || 'N/A'}</p>
                <p><strong>Số lượng phòng:</strong> <strong>${numRooms} phòng</strong></p>
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

          await sendEmail(
            booking.user.email,
            `Nhắc nhở check-in ngày mai - ${booking.booking_code}`,
            null,
            emailContent
          );

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

    // Lấy số lượng phòng từ booking_rooms nếu có
    const bookingRooms = await BookingRoom.findAll({
      where: { booking_id: booking.booking_id }
    });
    const numRooms = bookingRooms.length || (booking.room_id ? 1 : 0);

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Đặt phòng thành công!</h2>
        
        <p>Xin chào <strong>${user.full_name}</strong>,</p>
        
        <p>Cảm ơn bạn đã đặt phòng tại khách sạn chúng tôi. Dưới đây là thông tin chi tiết:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Thông tin đặt phòng</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking.booking_code}</p>
          <p><strong>Loại phòng:</strong> ${booking.room?.room_type?.room_type_name || booking.room_type?.room_type_name || 'N/A'}</p>
          <p><strong>Số lượng phòng:</strong> <strong>${numRooms} phòng</strong></p>
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

    await sendEmail(
      user.email,
      `Xác nhận đặt phòng thành công - ${booking.booking_code}`,
      null,
      emailContent
    );

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

    // Lấy số lượng phòng từ booking_rooms
    const bookingRooms = await BookingRoom.findAll({
      where: { booking_id: booking.booking_id }
    });
    const numRooms = bookingRooms.length || (booking.room_id ? 1 : 0);

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Hóa đơn thanh toán</h2>
        
        <p>Xin chào <strong>${user.full_name}</strong>,</p>
        
        <p>Dưới đây là hóa đơn chi tiết cho booking của bạn:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Thông tin booking</h3>
          <p><strong>Mã đặt phòng:</strong> ${booking.booking_code}</p>
          <p><strong>Loại phòng:</strong> ${booking.room?.room_type?.room_type_name || booking.room_type?.room_type_name || 'N/A'}</p>
          <p><strong>Số lượng phòng:</strong> <strong>${numRooms} phòng</strong></p>
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

    await sendEmail(
      user.email,
      `Hóa đơn thanh toán - ${booking.booking_code}`,
      null,
      emailContent
    );

    console.log(`[EMAIL INVOICE] Đã gửi email hóa đơn cho booking ${booking.booking_code}`);
  } catch (error) {
    console.error(`[EMAIL INVOICE] Lỗi gửi email hóa đơn:`, error);
  }
};

// Gửi email mời đánh giá sau khi check-out
const sendReviewRequestEmail = async (booking, user) => {
  try {
    if (!user || !user.email) {
      console.log('Không có email để gửi mời đánh giá');
      return;
    }

    // Lấy số lượng phòng từ booking_rooms
    const bookingRooms = await BookingRoom.findAll({
      where: { booking_id: booking.booking_id }
    });
    const numRooms = bookingRooms.length || (booking.room_id ? 1 : 0);

    // Tạo link đánh giá (frontend sẽ xử lý phần này)
    const { FRONTEND_URL } = require('../config/config');
    const reviewLink = `${FRONTEND_URL}/review/${booking.booking_code}`;

    const emailContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .thank-you-icon { 
            font-size: 48px; 
            margin-bottom: 20px; 
          }
          .booking-details { 
            background-color: #f8f9fa; 
            border-radius: 8px; 
            padding: 25px; 
            margin: 25px 0; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 15px; 
            padding-bottom: 10px; 
            border-bottom: 1px solid #e9ecef; 
          }
          .detail-row:last-child { 
            border-bottom: none; 
            margin-bottom: 0; 
          }
          .detail-label { 
            font-weight: 600; 
            color: #495057; 
          }
          .detail-value { 
            color: #212529; 
          }
          .review-section { 
            background-color: #fff3cd; 
            border-left: 4px solid #ffc107; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 25px 0; 
          }
          .review-section h3 { 
            margin-top: 0; 
            color: #856404; 
          }
          .btn { 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white !important; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: bold; 
            text-align: center; 
          }
          .btn:hover { 
            opacity: 0.9; 
          }
          .footer { 
            background-color: #6c757d; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
          }
          .important-note { 
            background-color: #d1ecf1; 
            border-left: 4px solid #0c5460; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 8px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="thank-you-icon">💖</div>
            <h1>Cảm ơn bạn đã chọn Bean Hotel!</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; line-height: 1.6;">Xin chào <strong>${user.full_name}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Cảm ơn bạn đã tin tưởng và lựa chọn Bean Hotel cho kỳ nghỉ của mình. Chúng tôi rất trân trọng sự ủng hộ của bạn!
            </p>
            
            <div class="booking-details">
              <h3 style="margin-top: 0; color: #495057;">Thông tin đặt phòng</h3>
              <div class="detail-row">
                <span class="detail-label">Mã đặt phòng:</span>
                <span class="detail-value"><strong>${booking.booking_code}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Loại phòng:</span>
                <span class="detail-value">${booking.room_type?.room_type_name || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Số lượng phòng:</span>
                <span class="detail-value"><strong>${numRooms} phòng</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ngày check-in:</span>
                <span class="detail-value">${moment(booking.check_in_date).format('DD/MM/YYYY')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ngày check-out:</span>
                <span class="detail-value">${moment(booking.check_out_date).format('DD/MM/YYYY')}</span>
              </div>
            </div>
            
            <div class="review-section">
              <h3>⭐ Giúp chúng tôi cải thiện dịch vụ</h3>
              <p style="line-height: 1.6; margin-bottom: 0;">
                Trải nghiệm của bạn là điều quan trọng nhất đối với chúng tôi! 
                Chúng tôi rất mong nhận được phản hồi của bạn để có thể phục vụ tốt hơn trong tương lai.
              </p>
              <p style="line-height: 1.6;">
                Đánh giá của bạn sẽ giúp các khách hàng khác có thêm thông tin hữu ích 
                và giúp chúng tôi không ngừng nâng cao chất lượng dịch vụ.
              </p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${reviewLink}" class="btn" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  ✍️ Đánh giá trải nghiệm
                </a>
              </div>
            </div>
            
            <div class="important-note">
              <strong>💡 Lưu ý:</strong> Bạn chỉ có thể đánh giá một lần cho mỗi đặt phòng. 
              Đánh giá của bạn sẽ được hiển thị công khai để giúp các khách hàng khác tham khảo.
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Một lần nữa, chúng tôi xin cảm ơn bạn đã đến với Bean Hotel. 
              Chúng tôi rất mong được phục vụ bạn trong những lần tiếp theo!
            </p>
            
            <p style="line-height: 1.6;">
              Trân trọng,<br>
              <strong>Bean Hotel Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Bean Hotel</strong></p>
            <p>📧 Email: info@beanhotel.com | 📞 Hotline: 1900-xxxx</p>
            <p>Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</p>
            <p>Rất hân hạnh được phục vụ bạn!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      user.email,
      `Cảm ơn bạn đã chọn Bean Hotel - Mời đánh giá trải nghiệm`,
      null,
      emailContent
    );

    console.log(`[REVIEW EMAIL] Đã gửi email mời đánh giá cho booking ${booking.booking_code}`);
  } catch (error) {
    console.error(`[REVIEW EMAIL] Lỗi gửi email mời đánh giá:`, error);
  }
};

module.exports = {
  sendBookingReminderEmails,
  sendBookingConfirmationEmail,
  sendInvoiceEmail,
  sendReviewRequestEmail,
  // Gửi email xác nhận hoàn tiền cho khách
  sendRefundEmail: async (booking, user, refundInfo) => {
    try {
      if (!user || !user.email) return;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Xác nhận hoàn tiền</h2>
          <p>Xin chào <strong>${user.full_name}</strong>,</p>
          <p>Chúng tôi xác nhận yêu cầu hủy đặt phòng <strong>${booking.booking_code}</strong> đã được xử lý.</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Số tiền hoàn:</strong> ${Number(refundInfo.amount).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Chính sách:</strong> ${refundInfo.policy || 'Theo quy định khách sạn'}</p>
            ${refundInfo.method ? `<p><strong>Phương thức:</strong> ${refundInfo.method === 'payos' ? 'PayOS' : refundInfo.method}</p>` : ''}
            ${refundInfo.transaction_id ? `<p><strong>Mã giao dịch:</strong> ${refundInfo.transaction_id}</p>` : ''}
            ${refundInfo.payment_date ? `<p><strong>Thời gian:</strong> ${refundInfo.payment_date}</p>` : ''}
          </div>
          <p>Nếu bạn thanh toán online, khoản tiền sẽ được hoàn về phương thức thanh toán ban đầu trong 3–7 ngày làm việc (tùy ngân hàng).</p>
          <p>Trân trọng,<br/><strong>Hotel Booking Team</strong></p>
        </div>
      `;

      await sendEmail(
        user.email,
        `Xác nhận hoàn tiền - ${booking.booking_code}`,
        null,
        emailHtml
      );
    } catch (err) {
      console.error('[EMAIL REFUND] Lỗi gửi email hoàn tiền:', err);
    }
  }
  ,
  // Gửi email yêu cầu khách cung cấp STK để hoàn tiền
  sendRefundRequestEmail: async (booking, user, refundInfo) => {
    try {
      if (!user || !user.email) return;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style=\"color: #e67e22;\">Yêu cầu thông tin hoàn tiền</h2>
          <p>Xin chào <strong>${user.full_name}</strong>,</p>
          <p>Yêu cầu hủy đặt phòng <strong>${booking.booking_code}</strong> của bạn đã được chấp nhận.</p>
          <div style=\"background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;\">
            <p><strong>Số tiền sẽ hoàn:</strong> ${Number(refundInfo.amount).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Chính sách:</strong> ${refundInfo.policy || 'Theo quy định hủy trước 48h: hoàn 70%'} </p>
          </div>
          <p>Vui lòng trả lời email này với thông tin <strong>Số tài khoản ngân hàng</strong> của bạn để chúng tôi tiến hành hoàn tiền:</p>
          <ul>
            <li>Chủ tài khoản</li>
            <li>Số tài khoản</li>
            <li>Ngân hàng</li>
            <li>Chi nhánh (nếu có)</li>
          </ul>
          <p>Sau khi nhận được thông tin, chúng tôi sẽ xử lý hoàn tiền trong vòng 1-3 ngày làm việc.</p>
          <p>Trân trọng,<br/><strong>Hotel Booking Team</strong></p>
        </div>
      `;

      await sendEmail(
        user.email,
        `Yêu cầu thông tin hoàn tiền - ${booking.booking_code}`,
        null,
        emailHtml
      );
    } catch (err) {
      console.error('[EMAIL REFUND REQUEST] Lỗi gửi email yêu cầu STK:', err);
    }
  }
};
