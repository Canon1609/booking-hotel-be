const { Op } = require('sequelize');
const moment = require('moment-timezone');
const { Booking, Room, RoomType, RoomPrice, User, Service, BookingService, Promotion, Payment } = require('../models');
const redisService = require('../utils/redis.util');
const payOSService = require('../utils/payos.util');
const sendEmail = require('../utils/email.util');
const pdfService = require('../utils/pdf.util');
const { sendInvoiceEmail } = require('../utils/emailBooking.util');

// ========== LUỒNG 1: ĐẶT PHÒNG TRỰC TUYẾN (ONLINE) ==========

// 1.1. Giữ chỗ tạm thời (Redis)
exports.createTempBooking = async (req, res) => {
  try {
    const { room_type_id, check_in_date, check_out_date, num_person = 1 } = req.body;
    const user_id = req.user.id;

    // Kiểm tra thông tin đầu vào
    if (!room_type_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin loại phòng và ngày' 
      });
    }

    // Kiểm tra loại phòng có tồn tại không
    const roomType = await RoomType.findOne({ 
      where: { room_type_id },
      include: [{ model: RoomPrice, as: 'prices' }]
    });

    if (!roomType) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    }

    // Kiểm tra số lượng phòng tối đa của loại phòng
    if (roomType.quantity <= 0) {
      return res.status(400).json({ message: 'Loại phòng này không có phòng nào' });
    }

    // Kiểm tra tính khả dụng của phòng
    const checkIn = moment(check_in_date).tz('Asia/Ho_Chi_Minh');
    const checkOut = moment(check_out_date).tz('Asia/Ho_Chi_Minh');

    if (checkIn.isBefore(moment().tz('Asia/Ho_Chi_Minh'), 'day')) {
      return res.status(400).json({ message: 'Ngày check-in không được trong quá khứ' });
    }

    if (checkOut.isSameOrBefore(checkIn)) {
      return res.status(400).json({ message: 'Ngày check-out phải sau ngày check-in' });
    }

    // Kiểm tra số phòng thực tế có vượt quá quantity không
    const totalRoomsOfType = await Room.count({ where: { room_type_id } });
    if (totalRoomsOfType > roomType.quantity) {
      return res.status(400).json({ 
        message: `Loại phòng này chỉ được có tối đa ${roomType.quantity} phòng, nhưng hiện tại có ${totalRoomsOfType} phòng` 
      });
    }

    // Kiểm tra loại phòng có còn trống không trong khoảng thời gian này
    const availableRooms = await Room.findAll({
      where: { room_type_id },
      include: [{
        model: Booking,
        as: 'bookings',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          [Op.or]: [
            {
              check_in_date: { [Op.lte]: checkOut.format('YYYY-MM-DD') },
              check_out_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
            }
          ]
        },
        required: false
      }]
    });

    // Lọc ra các phòng chưa được đặt
    const freeRooms = availableRooms.filter(room => !room.bookings || room.bookings.length === 0);

    if (freeRooms.length === 0) {
      return res.status(400).json({ message: 'Loại phòng này đã hết phòng trống trong khoảng thời gian này' });
    }

    // Lấy giá phòng
    const roomPrice = await RoomPrice.findOne({
      where: {
        room_type_id,
        start_date: { [Op.lte]: checkIn.format('YYYY-MM-DD') },
        end_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
      },
      order: [['start_date', 'ASC']]
    });

    if (!roomPrice) {
      return res.status(400).json({ message: 'Không tìm thấy giá phòng cho ngày này' });
    }

    // Tính tổng số đêm
    const nights = checkOut.diff(checkIn, 'days');
    const roomTotalPrice = roomPrice.price_per_night * nights;

    // Tạo booking tạm thời
    const tempBookingData = {
      user_id,
      room_type_id,
      check_in_date: checkIn.format('YYYY-MM-DD'),
      check_out_date: checkOut.format('YYYY-MM-DD'),
      num_person,
      room_price: roomPrice.price_per_night,
      total_price: roomTotalPrice,
      nights,
      room_type_name: roomType.room_type_name,
      available_rooms: freeRooms.length
    };

    // Tạo key Redis
    const tempKey = redisService.generateTempBookingKey(
      user_id, 
      room_type_id, 
      checkIn.format('YYYY-MM-DD'), 
      checkOut.format('YYYY-MM-DD')
    );

    // Lưu vào Redis với TTL 30 phút
    await redisService.saveTempBooking(tempKey, tempBookingData);

    return res.status(200).json({
      message: 'Giữ chỗ tạm thời thành công',
      temp_booking_key: tempKey,
      expires_in: 1800, // 30 phút
      booking_data: tempBookingData
    });

  } catch (error) {
    console.error('Error creating temp booking:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// 1.2. Thêm dịch vụ vào booking tạm thời
exports.addServiceToTempBooking = async (req, res) => {
  try {
    const { temp_booking_key, service_id, quantity = 1, payment_type = 'prepaid' } = req.body;

    if (!temp_booking_key || !service_id) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập mã booking tạm thời và dịch vụ' 
      });
    }

    // Lấy booking tạm thời từ Redis
    const tempBooking = await redisService.getTempBooking(temp_booking_key);
    if (!tempBooking) {
      return res.status(404).json({ message: 'Booking tạm thời không tồn tại hoặc đã hết hạn' });
    }

    // Kiểm tra dịch vụ
    const service = await Service.findOne({ where: { service_id } });
    if (!service) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    }

    // Kiểm tra giá dịch vụ
    if (!service.price || service.price <= 0) {
      return res.status(400).json({ message: 'Dịch vụ chưa có giá hoặc giá không hợp lệ' });
    }

    // Thêm dịch vụ vào booking tạm thời
    if (!tempBooking.services) {
      tempBooking.services = [];
    }

    // Kiểm tra xem dịch vụ đã tồn tại chưa
    const existingServiceIndex = tempBooking.services.findIndex(s => s.service_id === service_id);
    
    const servicePrice = parseFloat(service.price);
    const serviceTotal = servicePrice * quantity;
    const serviceData = {
      service_id,
      service_name: service.name,
      quantity,
      unit_price: servicePrice,
      total_price: serviceTotal,
      payment_type
    };

    if (existingServiceIndex >= 0) {
      // Cập nhật dịch vụ đã tồn tại
      tempBooking.services[existingServiceIndex] = serviceData;
    } else {
      // Thêm dịch vụ mới
      tempBooking.services.push(serviceData);
    }

    // Cập nhật tổng tiền
    const prepaidServices = tempBooking.services.filter(s => s.payment_type === 'prepaid');
    const prepaidTotal = prepaidServices.reduce((sum, s) => sum + (s.total_price || 0), 0);
    
    const roomTotal = (typeof tempBooking.room_price === 'string' ? parseFloat(tempBooking.room_price) : tempBooking.room_price) * tempBooking.nights;
    tempBooking.total_price = roomTotal + prepaidTotal;
    tempBooking.prepaid_services_total = prepaidTotal;

    // Lưu lại vào Redis
    await redisService.saveTempBooking(temp_booking_key, tempBooking);

    return res.status(200).json({
      message: 'Thêm dịch vụ thành công',
      service: serviceData,
      updated_booking: tempBooking
    });

  } catch (error) {
    console.error('Error adding service to temp booking:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// 1.3. Tạo link thanh toán PayOS
exports.createPaymentLink = async (req, res) => {
  try {
    const { temp_booking_key, promotion_code } = req.body;

    if (!temp_booking_key) {
      return res.status(400).json({ message: 'Vui lòng nhập mã booking tạm thời' });
    }

    // Lấy booking tạm thời từ Redis
    const tempBooking = await redisService.getTempBooking(temp_booking_key);
    if (!tempBooking) {
      return res.status(404).json({ message: 'Booking tạm thời không tồn tại hoặc đã hết hạn' });
    }

    // Áp dụng promotion nếu có
    let finalAmount = tempBooking.total_price;
    let discountAmount = 0;
    let promotion = null;

    if (promotion_code) {
      const promotionResult = await Promotion.findOne({
        where: { 
          promotion_code,
          status: 'active',
          start_date: { [Op.lte]: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') },
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') } }
          ]
        }
      });

      if (promotionResult) {
        promotion = promotionResult;
        if (promotionResult.discount_type === 'percentage') {
          discountAmount = (finalAmount * promotionResult.amount) / 100;
        } else {
          discountAmount = promotionResult.amount;
        }
        finalAmount = Math.max(0, finalAmount - discountAmount);
      }
    }

    // Tạo orderCode và bookingCode
    const orderCode = payOSService.generateOrderCode();
    const bookingCode = payOSService.generateBookingCode();

    // Cập nhật booking tạm thời với thông tin thanh toán
    tempBooking.payos_order_code = orderCode;
    tempBooking.booking_code = bookingCode;
    tempBooking.final_amount = finalAmount;
    tempBooking.discount_amount = discountAmount;
    tempBooking.promotion_id = promotion?.promotion_id || null;

    await redisService.saveTempBooking(temp_booking_key, tempBooking);

    // Tạo link thanh toán PayOS
    const paymentData = {
      orderCode,
      amount: finalAmount,
      description: `Thanh toán đặt phòng ${tempBooking.room_type_name} - ${bookingCode}`,
      items: [
        {
          name: `Phòng ${tempBooking.room_type_name}`,
          quantity: tempBooking.nights,
          price: tempBooking.room_price * tempBooking.nights
        },
        ...(tempBooking.services?.filter(s => s.payment_type === 'prepaid') || []).map(s => ({
          name: s.service_name,
          quantity: s.quantity,
          price: s.total_price
        }))
      ],
      buyerName: req.user.full_name || 'Khách hàng',
      buyerEmail: req.user.email || '',
      buyerPhone: req.user.phone || ''
    };

    const paymentResult = await payOSService.createPaymentLink(paymentData);

    if (!paymentResult.success) {
      return res.status(400).json({ 
        message: 'Tạo link thanh toán thất bại', 
        error: paymentResult.error 
      });
    }

    return res.status(200).json({
      message: 'Tạo link thanh toán thành công',
      payment_url: paymentResult.checkoutUrl,
      qr_code: paymentResult.qrCode,
      order_code: orderCode,
      booking_code: bookingCode,
      amount: finalAmount,
      expires_in: 1800 // 30 phút
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// 1.4. Xử lý kết quả thanh toán (Webhook)
exports.handlePaymentWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    // Xác thực webhook từ PayOS
    const isValid = await payOSService.verifyWebhookData(webhookData);
    if (!isValid) {
      return res.status(400).json({ message: 'Webhook không hợp lệ' });
    }
    
    console.log('Webhook received:', webhookData);

    const { orderCode, status } = webhookData;

    if (status === 'PAID') {
      // Tìm booking tạm thời theo orderCode
      // Tạm thời tìm tất cả temp bookings và filter theo orderCode
      const allTempBookings = await redisService.getAllTempBookings();
      let tempBooking = null;
      let tempKey = null;

      for (const [key, booking] of Object.entries(allTempBookings)) {
        if (booking.payos_order_code == orderCode) {
          tempBooking = booking;
          tempKey = key;
          break;
        }
      }

      if (!tempBooking) {
        console.log('Temp booking not found for orderCode:', orderCode);
        return res.status(404).json({ message: 'Phiên đặt phòng đã hết hạn' });
      }

      // Kiểm tra booking_code có tồn tại chưa, nếu có thì tạo mới
      let bookingCode = tempBooking.booking_code;
      let existingBooking = await Booking.findOne({ where: { booking_code: bookingCode } });
      
      while (existingBooking) {
        bookingCode = payOSService.generateBookingCode();
        existingBooking = await Booking.findOne({ where: { booking_code: bookingCode } });
      }

      // Tự động gán phòng cụ thể từ loại phòng
      const assignedRoom = await Room.findOne({
        where: { 
          room_type_id: tempBooking.room_type_id,
          status: 'available'
        },
        include: [{
          model: Booking,
          as: 'bookings',
          where: {
            booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
            [Op.or]: [
              {
                check_in_date: { [Op.lte]: tempBooking.check_out_date },
                check_out_date: { [Op.gte]: tempBooking.check_in_date }
              }
            ]
          },
          required: false
        }]
      });

      // Lọc ra phòng chưa được đặt
      const availableRooms = await Room.findAll({
        where: { 
          room_type_id: tempBooking.room_type_id,
          status: 'available'
        },
        include: [{
          model: Booking,
          as: 'bookings',
          where: {
            booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
            [Op.or]: [
              {
                check_in_date: { [Op.lte]: tempBooking.check_out_date },
                check_out_date: { [Op.gte]: tempBooking.check_in_date }
              }
            ]
          },
          required: false
        }]
      });

      const freeRooms = availableRooms.filter(room => !room.bookings || room.bookings.length === 0);
      
      if (freeRooms.length === 0) {
        return res.status(400).json({ message: 'Loại phòng này đã hết phòng trống' });
      }

      // Chọn phòng đầu tiên có sẵn
      const selectedRoom = freeRooms[0];

      // Tạo booking vĩnh viễn với phòng đã được gán
      const booking = await Booking.create({
        user_id: tempBooking.user_id,
        room_type_id: tempBooking.room_type_id,
        room_id: selectedRoom.room_id, // Gán phòng cụ thể
        check_in_date: tempBooking.check_in_date,
        check_out_date: tempBooking.check_out_date,
        num_person: tempBooking.num_person,
        total_price: tempBooking.total_price,
        final_price: tempBooking.final_amount,
        booking_status: 'confirmed',
        payment_status: 'paid',
        booking_type: 'online',
        booking_code: bookingCode,
        payos_order_code: tempBooking.payos_order_code,
        promotion_id: tempBooking.promotion_id,
        room_assigned_at: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
      });

      // Cập nhật trạng thái phòng thành 'booked'
      await Room.update(
        { status: 'booked' },
        { where: { room_id: selectedRoom.room_id } }
      );

      // Tạo booking services
      if (tempBooking.services && tempBooking.services.length > 0) {
        for (const service of tempBooking.services) {
          await BookingService.create({
            booking_id: booking.booking_id,
            service_id: service.service_id,
            quantity: service.quantity,
            unit_price: service.unit_price,
            total_price: service.total_price,
            payment_type: service.payment_type,
            status: 'active'
          });
        }
      }

      // Tạo payment record
      await Payment.create({
        booking_id: booking.booking_id,
        amount: tempBooking.final_amount,
        method: 'payos',
        status: 'completed',
        transaction_id: orderCode.toString(),
        payment_date: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
      });

      // Xóa booking tạm thời khỏi Redis
      await redisService.deleteTempBooking(tempKey);

      // Gửi email xác nhận
      const user = await User.findByPk(tempBooking.user_id);
      if (user && user.email) {
        await sendEmail(
          user.email,
          '🎉 Xác nhận đặt phòng thành công - Hotel Booking',
          `Chào ${user.full_name},\n\nĐặt phòng của bạn đã được xác nhận thành công!\nMã đặt phòng: ${bookingCode}\n\nChi tiết đặt phòng:\n- Phòng: ${tempBooking.room_type_name}\n- Check-in: ${tempBooking.check_in_date}\n- Check-out: ${tempBooking.check_out_date}\n- Tổng tiền: ${tempBooking.final_amount.toLocaleString('vi-VN')} VNĐ\n\nCảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!\n\nTrân trọng,\nHotel Booking Team`,
          `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Xác nhận đặt phòng thành công</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
                .content { padding: 40px 30px; }
                .success-icon { font-size: 48px; margin-bottom: 20px; }
                .booking-details { background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e9ecef; }
                .detail-row:last-child { border-bottom: none; margin-bottom: 0; }
                .detail-label { font-weight: 600; color: #495057; }
                .detail-value { color: #212529; }
                .total-amount { background-color: #28a745; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 20px; font-weight: bold; margin: 25px 0; }
                .footer { background-color: #6c757d; color: white; padding: 20px; text-align: center; font-size: 14px; }
                .qr-code { text-align: center; margin: 20px 0; }
                .btn { display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
                .btn:hover { background-color: #0056b3; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="success-icon">🎉</div>
                  <h1>Đặt phòng thành công!</h1>
                  <p>Chào ${user.full_name}, đặt phòng của bạn đã được xác nhận</p>
                </div>
                
                <div class="content">
                  <div class="booking-details">
                    <h3 style="margin-top: 0; color: #495057;">📋 Chi tiết đặt phòng</h3>
                    <div class="detail-row">
                      <span class="detail-label">Mã đặt phòng:</span>
                      <span class="detail-value"><strong>${bookingCode}</strong></span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Loại phòng:</span>
                      <span class="detail-value">${tempBooking.room_type_name}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Ngày nhận phòng:</span>
                      <span class="detail-value">${tempBooking.check_in_date}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Ngày trả phòng:</span>
                      <span class="detail-value">${tempBooking.check_out_date}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Số người:</span>
                      <span class="detail-value">${tempBooking.num_person} người</span>
                    </div>
                    ${tempBooking.services && tempBooking.services.length > 0 ? `
                    <div class="detail-row">
                      <span class="detail-label">Dịch vụ đã chọn:</span>
                      <span class="detail-value">
                        ${tempBooking.services.map(s => `${s.service_name} (x${s.quantity})`).join(', ')}
                      </span>
                    </div>
                    ` : ''}
                  </div>
                  
                  <div class="total-amount">
                    💰 Tổng thanh toán: ${tempBooking.final_amount.toLocaleString('vi-VN')} VNĐ
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <h3 style="color: #495057;">🎯 Hướng dẫn tiếp theo</h3>
                    <p>Vui lòng đến khách sạn đúng giờ check-in với mã đặt phòng này. Chúng tôi sẽ chuẩn bị sẵn phòng cho bạn!</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" class="btn">📱 Xem chi tiết</a>
                    <a href="#" class="btn">📞 Liên hệ hỗ trợ</a>
                  </div>
                </div>
                
                <div class="footer">
                  <p><strong>Hotel Booking System</strong></p>
                  <p>📧 Email: support@hotelbooking.com | 📞 Hotline: 1900-xxxx</p>
                  <p>Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
                </div>
              </div>
            </body>
            </html>
          `
        );
      }

      return res.status(200).json({ 
        message: 'Thanh toán thành công',
        booking_id: booking.booking_id,
        booking_code: bookingCode
      });
    }

    return res.status(200).json({ message: 'Webhook processed' });

  } catch (error) {
    console.error('Error handling payment webhook:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// ========== LUỒNG 2: ĐẶT PHÒNG TRỰC TIẾP (WALK-IN) ==========

// 2.1. Tạo booking trực tiếp (Admin/Staff)
exports.createWalkInBooking = async (req, res) => {
  try {
    const { 
      user_id, 
      room_type_id, 
      check_in_date, 
      check_out_date, 
      num_person = 1,
      note = '',
      services = []
    } = req.body;

    // Kiểm tra thông tin đầu vào
    if (!user_id || !room_type_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin loại phòng và ngày' 
      });
    }

    // Kiểm tra loại phòng có tồn tại không
    const roomType = await RoomType.findOne({ 
      where: { room_type_id },
      include: [{ model: RoomPrice, as: 'prices' }]
    });

    if (!roomType) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    }

    // Kiểm tra số lượng phòng tối đa của loại phòng
    if (roomType.quantity <= 0) {
      return res.status(400).json({ message: 'Loại phòng này không có phòng nào' });
    }

    // Kiểm tra tính khả dụng của phòng
    const checkIn = moment(check_in_date).tz('Asia/Ho_Chi_Minh');
    const checkOut = moment(check_out_date).tz('Asia/Ho_Chi_Minh');

    if (checkOut.isSameOrBefore(checkIn)) {
      return res.status(400).json({ message: 'Ngày check-out phải sau ngày check-in' });
    }

    // Kiểm tra số phòng thực tế có vượt quá quantity không
    const totalRoomsOfType = await Room.count({ where: { room_type_id } });
    if (totalRoomsOfType > roomType.quantity) {
      return res.status(400).json({ 
        message: `Loại phòng này chỉ được có tối đa ${roomType.quantity} phòng, nhưng hiện tại có ${totalRoomsOfType} phòng` 
      });
    }

    // Kiểm tra loại phòng có còn trống không trong khoảng thời gian này
    const availableRooms = await Room.findAll({
      where: { room_type_id },
      include: [{
        model: Booking,
        as: 'bookings',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          [Op.or]: [
            {
              check_in_date: { [Op.lte]: checkOut.format('YYYY-MM-DD') },
              check_out_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
            }
          ]
        },
        required: false
      }]
    });

    // Lọc ra các phòng chưa được đặt
    const freeRooms = availableRooms.filter(room => !room.bookings || room.bookings.length === 0);

    if (freeRooms.length === 0) {
      return res.status(400).json({ message: 'Loại phòng này đã hết phòng trống trong khoảng thời gian này' });
    }

    // Lấy giá phòng
    const roomPrice = await RoomPrice.findOne({
      where: {
        room_type_id,
        start_date: { [Op.lte]: checkIn.format('YYYY-MM-DD') },
        end_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
      },
      order: [['start_date', 'ASC']]
    });

    if (!roomPrice) {
      return res.status(400).json({ message: 'Không tìm thấy giá phòng cho ngày này' });
    }

    // Tính tổng số đêm và giá phòng
    const nights = checkOut.diff(checkIn, 'days');
    const roomTotalPrice = roomPrice.price_per_night * nights;

    // Tạo booking code
    const bookingCode = payOSService.generateBookingCode();

    // Tạo booking
    const booking = await Booking.create({
      user_id,
      room_type_id,
      check_in_date: checkIn.format('YYYY-MM-DD'),
      check_out_date: checkOut.format('YYYY-MM-DD'),
      num_person,
      total_price: roomTotalPrice,
      final_price: roomTotalPrice,
      booking_status: 'confirmed',
      payment_status: 'paid', // Walk-in đã thanh toán tiền mặt
      booking_type: 'walkin',
      booking_code: bookingCode,
      note
    });

    // Tạo booking services nếu có
    let servicesTotal = 0;
    if (services && services.length > 0) {
      for (const service of services) {
        const serviceData = await Service.findByPk(service.service_id);
        if (serviceData) {
          const serviceTotal = serviceData.price * service.quantity;
          servicesTotal += serviceTotal;

          await BookingService.create({
            booking_id: booking.booking_id,
            service_id: service.service_id,
            quantity: service.quantity,
            unit_price: serviceData.price,
            total_price: serviceTotal,
            payment_type: service.payment_type || 'postpaid',
            status: 'active'
          });
        }
      }

      // Cập nhật tổng tiền nếu có dịch vụ trả trước
      const prepaidServices = services.filter(s => s.payment_type === 'prepaid');
      if (prepaidServices.length > 0) {
        const prepaidTotal = prepaidServices.reduce((sum, s) => {
          const serviceData = services.find(serv => serv.service_id === s.service_id);
          return sum + (serviceData?.price * s.quantity || 0);
        }, 0);
        
        booking.final_price = roomTotalPrice + prepaidTotal;
        await booking.save();
      }
    }

    return res.status(201).json({
      message: 'Tạo booking thành công',
      booking: {
        booking_id: booking.booking_id,
        booking_code: booking.booking_code,
        room_type: roomType.room_type_name,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        total_price: booking.final_price,
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        available_rooms_remaining: freeRooms.length - 1 // Trừ đi 1 phòng vừa đặt
      }
    });

  } catch (error) {
    console.error('Error creating walk-in booking:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// ========== CÁC API CHUNG ==========

// Lấy danh sách booking
exports.getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, user_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.booking_status = status;
    if (type) where.booking_type = type;
    if (user_id) where.user_id = user_id;

    const result = await Booking.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email', 'phone'] },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'room_type' }] },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      bookings: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.count / limit),
        totalItems: result.count
      }
    });

  } catch (error) {
    console.error('Error getting bookings:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy booking theo ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      where: { booking_id: id },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email', 'phone'] },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'room_type' }] },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] },
        { model: Promotion, as: 'promotion' }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    return res.status(200).json({ booking });

  } catch (error) {
    console.error('Error getting booking by ID:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tìm booking theo mã đặt phòng (cho check-in)
exports.findBookingByCode = async (req, res) => {
  try {
    const { booking_code } = req.params;

    const booking = await Booking.findOne({
      where: { booking_code },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email', 'phone'] },
        { 
          model: Room, 
          as: 'room', 
          attributes: ['room_id', 'room_num'],
          include: [{ 
            model: RoomType, 
            as: 'room_type', 
            attributes: ['room_type_id', 'room_type_name', 'capacity'] 
          }]
        },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đặt phòng với mã này' });
    }

    return res.status(200).json({
      message: 'Tìm thấy đặt phòng',
      booking: {
        booking_id: booking.booking_id,
        booking_code: booking.booking_code,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        num_person: booking.num_person,
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        total_price: booking.total_price,
        check_in_time: booking.check_in_time,
        check_out_time: booking.check_out_time,
        user: booking.user,
        room: {
          room_id: booking.room.room_id,
          room_num: booking.room.room_num,
          room_type: booking.room.room_type
        },
        services: booking.booking_services || []
      }
    });

  } catch (error) {
    console.error('Error finding booking by code:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Check-in (phòng đã được gán sẵn hoặc có thể gán mới)
exports.checkIn = async (req, res) => {
  try {
    const { booking_code } = req.params;
    const { room_id } = req.body || {}; // Optional: để gán phòng mới cho walk-in booking

    const booking = await Booking.findOne({
      where: { booking_code },
      include: [
        { model: User, as: 'user', attributes: ['full_name', 'email'] },
        { model: RoomType, as: 'room_type', attributes: ['room_type_name', 'room_type_id'] },
        { model: Room, as: 'room', attributes: ['room_id', 'room_num'] }
      ]
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    if (booking.booking_status !== 'confirmed') {
      return res.status(400).json({ message: 'Booking không ở trạng thái confirmed' });
    }

    if (booking.check_in_time) {
      return res.status(400).json({ message: 'Khách đã check-in rồi' });
    }

    // Nếu booking chưa có phòng (walk-in booking), cần gán phòng mới
    if (!booking.room_id) {
      if (!room_id) {
        return res.status(400).json({ 
          message: 'Phòng chưa được gán. Vui lòng cung cấp room_id để gán phòng',
          room_type_id: booking.room_type_id,
          available_rooms_endpoint: `/api/bookings/available-rooms?room_type_id=${booking.room_type_id}&check_in_date=${booking.check_in_date}&check_out_date=${booking.check_out_date}`
        });
      }

      // Kiểm tra phòng có tồn tại và hợp lệ không
      const selectedRoom = await Room.findOne({
        where: { room_id, room_type_id: booking.room_type_id },
        include: [{
          model: Booking,
          as: 'bookings',
          where: {
            booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
            [Op.or]: [
              {
                check_in_date: { [Op.lte]: booking.check_out_date },
                check_out_date: { [Op.gte]: booking.check_in_date }
              }
            ]
          },
          required: false
        }]
      });

      if (!selectedRoom) {
        return res.status(404).json({ message: 'Không tìm thấy phòng hợp lệ' });
      }

      // Kiểm tra phòng có trống không
      if (selectedRoom.bookings && selectedRoom.bookings.length > 0) {
        return res.status(400).json({ message: 'Phòng này đã được đặt trong khoảng thời gian này' });
      }

      // Gán phòng cho booking
      booking.room_id = room_id;
      await booking.save();

      // Cập nhật trạng thái phòng thành 'booked' khi gán phòng
      await Room.update(
        { status: 'booked' },
        { where: { room_id: room_id } }
      );
    }

    // Cập nhật thời gian check-in và trạng thái
    booking.check_in_time = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    booking.booking_status = 'checked_in';
    await booking.save();

    // Cập nhật trạng thái phòng thành 'in_use'
    await Room.update(
      { status: 'in_use' },
      { where: { room_id: booking.room_id } }
    );

    return res.status(200).json({ 
      message: 'Check-in thành công',
      booking_code: booking.booking_code,
      guest_name: booking.user.full_name,
      room_type: booking.room_type.room_type_name,
      room_number: booking.room.room_num,
      check_in_time: booking.check_in_time,
      room_assigned_at: booking.room_assigned_at,
      statusCode: 200
    });

  } catch (error) {
    console.error('Error checking in:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Lấy danh sách phòng trống của một loại phòng (cho lễ tân)
exports.getAvailableRoomsForType = async (req, res) => {
  try {
    const { room_type_id, check_in_date, check_out_date } = req.query;

    if (!room_type_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin loại phòng và ngày' 
      });
    }

    const checkIn = moment(check_in_date).tz('Asia/Ho_Chi_Minh');
    const checkOut = moment(check_out_date).tz('Asia/Ho_Chi_Minh');

    // Kiểm tra loại phòng có tồn tại không
    const roomType = await RoomType.findByPk(room_type_id);
    if (!roomType) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    }

    // Lấy tất cả phòng của loại phòng này
    const allRooms = await Room.findAll({
      where: { room_type_id },
      include: [{
        model: Booking,
        as: 'bookings',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          [Op.or]: [
            {
              check_in_date: { [Op.lte]: checkOut.format('YYYY-MM-DD') },
              check_out_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
            }
          ]
        },
        required: false
      }]
    });

    // Lọc ra các phòng trống
    const availableRooms = allRooms.filter(room => !room.bookings || room.bookings.length === 0);

    return res.status(200).json({
      message: 'Danh sách phòng trống',
      room_type_id,
      room_type_name: roomType.room_type_name,
      max_quantity: roomType.quantity,
      check_in_date: checkIn.format('YYYY-MM-DD'),
      check_out_date: checkOut.format('YYYY-MM-DD'),
      total_rooms: allRooms.length,
      available_rooms: availableRooms.length,
      rooms: availableRooms.map(room => ({
        room_id: room.room_id,
        room_num: room.room_num,
        floor: room.floor,
        status: 'available'
      }))
    });

  } catch (error) {
    console.error('Error getting available rooms:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Check-out
exports.checkOut = async (req, res) => {
  try {
    const { booking_code } = req.params;

    const booking = await Booking.findOne({
      where: { booking_code },
      include: [
        { model: User, as: 'user', attributes: ['full_name', 'email'] },
        { model: RoomType, as: 'room_type', attributes: ['room_type_name'] },
        { model: Room, as: 'room', attributes: ['room_id', 'room_num'] }
      ]
    });
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    if (booking.booking_status !== 'checked_in') {
      return res.status(400).json({ 
        message: 'Booking phải ở trạng thái checked_in (đã check-in)',
        current_status: booking.booking_status,
        required_status: 'checked_in'
      });
    }

    if (!booking.check_in_time) {
      return res.status(400).json({ message: 'Khách chưa check-in, không thể check-out' });
    }

    if (booking.check_out_time) {
      return res.status(400).json({ message: 'Khách đã check-out rồi' });
    }

    booking.check_out_time = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    booking.booking_status = 'checked_out';
    booking.payment_status = 'paid'; // Cập nhật payment_status thành paid khi check-out
    await booking.save();

    // Cập nhật trạng thái phòng thành 'checked_out'
    await Room.update(
      { status: 'checked_out' },
      { where: { room_id: booking.room_id } }
    );

    return res.status(200).json({ 
      message: 'Check-out thành công',
      check_out_time: booking.check_out_time,
      payment_status: booking.payment_status
    });

  } catch (error) {
    console.error('Error checking out:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Hủy booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking đã bị hủy' });
    }

    if (booking.booking_status === 'completed') {
      return res.status(400).json({ message: 'Không thể hủy booking đã hoàn thành' });
    }

    booking.booking_status = 'cancelled';
    booking.note = booking.note ? `${booking.note}\nHủy: ${reason}` : `Hủy: ${reason}`;
    await booking.save();

    return res.status(200).json({ message: 'Hủy booking thành công' });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tạo và tải hóa đơn PDF
exports.generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      where: { booking_id: id },
      include: [
        { model: User, as: 'user' },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'room_type' }] },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Tạo dữ liệu hóa đơn
    const invoiceData = {
      items: [],
      total: 0,
      discount: 0,
      tax: 0,
      finalTotal: 0
    };

    // Thêm phòng vào hóa đơn
    const nights = moment(booking.check_out_date).diff(moment(booking.check_in_date), 'days');
    const roomPrice = booking.total_price / nights;
    
    invoiceData.items.push({
      name: `Phòng ${booking.room?.room_type?.room_type_name || 'N/A'}`,
      quantity: nights,
      unitPrice: roomPrice,
      total: booking.total_price
    });

    // Thêm dịch vụ vào hóa đơn
    if (booking.booking_services && booking.booking_services.length > 0) {
      for (const bookingService of booking.booking_services) {
        invoiceData.items.push({
          name: bookingService.service?.service_name || 'Dịch vụ',
          quantity: bookingService.quantity,
          unitPrice: bookingService.unit_price,
          total: bookingService.total_price
        });
      }
    }

    // Tính tổng
    invoiceData.total = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
    
    // Áp dụng giảm giá nếu có
    if (booking.promotion_id) {
      const promotion = await Promotion.findByPk(booking.promotion_id);
      if (promotion) {
        if (promotion.discount_type === 'percentage') {
          invoiceData.discount = (invoiceData.total * promotion.amount) / 100;
        } else {
          invoiceData.discount = promotion.amount;
        }
      }
    }

    // Tính thuế (10%)
    const subtotal = invoiceData.total - invoiceData.discount;
    invoiceData.tax = Math.round(subtotal * 0.1);
    invoiceData.finalTotal = subtotal + invoiceData.tax;

    // Tạo PDF
    const pdfBuffer = await pdfService.generateInvoicePDF(booking, invoiceData);

    // Gửi email hóa đơn nếu có email
    if (booking.user && booking.user.email) {
      try {
        await sendInvoiceEmail(booking, booking.user, invoiceData);
      } catch (emailError) {
        console.error('Error sending invoice email:', emailError);
      }
    }

    // Trả về PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${booking.booking_code}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Xem hóa đơn (trả về HTML)
exports.viewInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      where: { booking_id: id },
      include: [
        { model: User, as: 'user' },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'room_type' }] },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Tạo dữ liệu hóa đơn (tương tự như generateInvoicePDF)
    const invoiceData = {
      items: [],
      total: 0,
      discount: 0,
      tax: 0,
      finalTotal: 0
    };

    const nights = moment(booking.check_out_date).diff(moment(booking.check_in_date), 'days');
    const roomPrice = booking.total_price / nights;
    
    invoiceData.items.push({
      name: `Phòng ${booking.room?.room_type?.room_type_name || 'N/A'}`,
      quantity: nights,
      unitPrice: roomPrice,
      total: booking.total_price
    });

    if (booking.booking_services && booking.booking_services.length > 0) {
      for (const bookingService of booking.booking_services) {
        invoiceData.items.push({
          name: bookingService.service?.service_name || 'Dịch vụ',
          quantity: bookingService.quantity,
          unitPrice: bookingService.unit_price,
          total: bookingService.total_price
        });
      }
    }

    invoiceData.total = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
    
    if (booking.promotion_id) {
      const promotion = await Promotion.findByPk(booking.promotion_id);
      if (promotion) {
        if (promotion.discount_type === 'percentage') {
          invoiceData.discount = (invoiceData.total * promotion.amount) / 100;
        } else {
          invoiceData.discount = promotion.amount;
        }
      }
    }

    const subtotal = invoiceData.total - invoiceData.discount;
    invoiceData.tax = Math.round(subtotal * 0.1);
    invoiceData.finalTotal = subtotal + invoiceData.tax;

    // Tạo HTML
    const htmlContent = pdfService.generateInvoiceHTML(booking, invoiceData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);

  } catch (error) {
    console.error('Error viewing invoice:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Admin: Cập nhật trạng thái phòng (checked_out -> cleaning -> available)
exports.updateRoomStatus = async (req, res) => {
  try {
    const { room_id } = req.params;
    const { status } = req.body;

    // Kiểm tra phòng có tồn tại không
    const room = await Room.findByPk(room_id);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    // Kiểm tra status hợp lệ
    const validStatuses = ['checked_out', 'cleaning', 'available'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Trạng thái không hợp lệ', 
        valid_statuses: validStatuses 
      });
    }

    // Kiểm tra trạng thái hiện tại và chỉ cho phép chuyển đổi theo luồng
    // checked_out -> cleaning -> available
    if (room.status === 'checked_out' && status !== 'cleaning') {
      return res.status(400).json({ 
        message: 'Phòng checked_out chỉ có thể chuyển sang cleaning',
        current_status: room.status,
        requested_status: status
      });
    }

    if (room.status === 'cleaning' && status !== 'available') {
      return res.status(400).json({ 
        message: 'Phòng cleaning chỉ có thể chuyển sang available',
        current_status: room.status,
        requested_status: status
      });
    }

    if (room.status === 'available' && status !== 'available') {
      return res.status(400).json({ 
        message: 'Phòng đã available, không thể chuyển sang trạng thái khác',
        current_status: room.status,
        requested_status: status
      });
    }

    // Cập nhật trạng thái phòng
    await Room.update(
      { status: status },
      { where: { room_id: room_id } }
    );

    const updatedRoom = await Room.findByPk(room_id);

    return res.status(200).json({ 
      message: 'Cập nhật trạng thái phòng thành công',
      room: {
        room_id: updatedRoom.room_id,
        room_num: updatedRoom.room_num,
        status: updatedRoom.status,
        previous_status: room.status
      }
    });

  } catch (error) {
    console.error('Error updating room status:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tạo walk-in booking và check-in luôn
exports.createWalkInAndCheckIn = async (req, res) => {
  try {
    const { 
      user_id,
      room_id, 
      nights: nightsCount = 1, // Số đêm ở (mặc định 1 đêm)
      num_person = 1,
      note = '',
      services = []
    } = req.body;

    // Kiểm tra thông tin đầu vào
    if (!user_id || !room_id) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin: user_id, room_id' 
      });
    }

    // Check-in date là ngày hiện tại
    const checkInDate = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    // Check-out date là ngày hiện tại + số đêm
    const checkOutDate = moment().tz('Asia/Ho_Chi_Minh').add(nightsCount, 'days').format('YYYY-MM-DD');
    
    const checkIn = moment(checkInDate).tz('Asia/Ho_Chi_Minh');
    const checkOut = moment(checkOutDate).tz('Asia/Ho_Chi_Minh');

    // Kiểm tra phòng có tồn tại không
    const room = await Room.findOne({
      where: { room_id },
      include: [{ model: RoomType, as: 'room_type' }]
    });

    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    // Kiểm tra phòng có available không
    if (room.status !== 'available') {
      return res.status(400).json({ 
        message: `Phòng không sẵn sàng, trạng thái hiện tại: ${room.status}`,
        current_status: room.status,
        required_status: 'available'
      });
    }

    // Kiểm tra loại phòng
    const roomType = await RoomType.findByPk(room.room_type_id);
    if (!roomType) {
      return res.status(404).json({ message: 'Không tìm thấy loại phòng' });
    }

    // Kiểm tra phòng có bị conflict không
    const conflictingBooking = await Booking.findOne({
      where: {
        room_id,
        booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
        [Op.or]: [
          {
            check_in_date: { [Op.lte]: checkOut.format('YYYY-MM-DD') },
            check_out_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
          }
        ]
      }
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'Phòng đã được đặt trong khoảng thời gian này' });
    }

    // Lấy giá phòng
    const roomPrice = await RoomPrice.findOne({
      where: {
        room_type_id: room.room_type_id,
        start_date: { [Op.lte]: checkIn.format('YYYY-MM-DD') },
        end_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
      },
      order: [['start_date', 'ASC']]
    });

    if (!roomPrice) {
      return res.status(400).json({ message: 'Không tìm thấy giá phòng cho ngày này' });
    }

    // Tính tổng giá phòng
    const roomTotalPrice = roomPrice.price_per_night * nightsCount;

    // Tạo booking code
    const bookingCode = payOSService.generateBookingCode();

    // Tạo booking với status confirmed và payment_status pending
    const booking = await Booking.create({
      user_id,
      room_type_id: room.room_type_id,
      room_id: room_id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      num_person,
      total_price: roomTotalPrice,
      final_price: roomTotalPrice,
      booking_status: 'confirmed',
      payment_status: 'pending', // Chưa thanh toán
      booking_type: 'walkin',
      booking_code: bookingCode,
      note,
      check_in_time: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') // Check-in luôn
    });

    // Cập nhật trạng thái booking thành checked_in
    booking.booking_status = 'checked_in';
    await booking.save();

    // Cập nhật trạng thái phòng từ available -> in_use (gán phòng và check-in luôn)
    await Room.update(
      { status: 'in_use' },
      { where: { room_id } }
    );

    // Tạo booking services nếu có
    if (services && services.length > 0) {
      for (const service of services) {
        const serviceData = await Service.findByPk(service.service_id);
        if (serviceData) {
          const serviceTotal = serviceData.price * service.quantity;

          await BookingService.create({
            booking_id: booking.booking_id,
            service_id: service.service_id,
            quantity: service.quantity,
            unit_price: serviceData.price,
            total_price: serviceTotal,
            payment_type: service.payment_type || 'postpaid',
            status: 'active'
          });
        }
      }
    }

    return res.status(201).json({
      message: 'Tạo walk-in booking và check-in thành công',
      booking: {
        booking_id: booking.booking_id,
        booking_code: booking.booking_code,
        room_type: roomType.room_type_name,
        room_id: room.room_id,
        room_num: room.room_num,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        nights: nightsCount, // Số đêm ở
        num_person: booking.num_person,
        total_price: booking.total_price,
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        check_in_time: booking.check_in_time
      }
    });

  } catch (error) {
    console.error('Error creating walk-in and check-in:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};
