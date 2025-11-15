const { Op, Sequelize } = require('sequelize');
const moment = require('moment-timezone');
const { Booking, Room, RoomType, RoomPrice, User, Service, BookingService, BookingRoom, Promotion, Payment, Review } = require('../models');
const redisService = require('../utils/redis.util');
const payOSService = require('../utils/payos.util');
const sendEmail = require('../utils/email.util');
const pdfService = require('../utils/pdf.util');
const { sendInvoiceEmail, sendReviewRequestEmail, sendRefundEmail, sendRefundRequestEmail } = require('../utils/emailBooking.util');
const { FRONTEND_URL } = require('../config/config');

// ========== LUỒNG 1: ĐẶT PHÒNG TRỰC TUYẾN (ONLINE) ==========

// 1.1. Giữ chỗ tạm thời (Redis)
exports.createTempBooking = async (req, res) => {
  try {
    const { room_type_id, check_in_date, check_out_date, num_person = 1, num_rooms = 1 } = req.body;
    const user_id = req.user.id;

    // Kiểm tra thông tin đầu vào
    if (!room_type_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin loại phòng và ngày' 
      });
    }

    // Kiểm tra số lượng phòng
    if (!Number.isInteger(Number(num_rooms)) || Number(num_rooms) < 1) {
      return res.status(400).json({ 
        message: 'Số lượng phòng phải là số nguyên dương' 
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
    // 1. Tìm các phòng đã được đặt vĩnh viễn trong khoảng thời gian này qua BookingRoom
    // QUAN TRỌNG: Logic overlap dates: booking overlap nếu check_in < request_check_out AND check_out > request_check_in
    // QUAN TRỌNG: Chỉ tính các booking còn active (chưa check-out hoàn toàn)
    // Sử dụng Sequelize.literal để đảm bảo logic đúng
    const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const bookedRoomDetails = await BookingRoom.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          // Chỉ tính booking nếu check_out_date >= hôm nay (booking chưa kết thúc)
          // Nếu check_out_date < hôm nay → booking đã kết thúc → không tính vào
          check_out_date: { [Op.gte]: today },
          [Op.and]: [
            Sequelize.literal(`check_in_date < '${checkOut.format('YYYY-MM-DD')}'`),
            Sequelize.literal(`check_out_date > '${checkIn.format('YYYY-MM-DD')}'`)
          ]
        },
        required: true
      }],
      attributes: ['room_id', 'booking_id'],
      raw: false
    });

    console.log(`[ROOM_AVAILABILITY] Checking room_type_id: ${room_type_id}, dates: ${checkIn.format('YYYY-MM-DD')} to ${checkOut.format('YYYY-MM-DD')}`);
    console.log(`[ROOM_AVAILABILITY] Found ${bookedRoomDetails.length} active BookingRoom entries:`);
    bookedRoomDetails.forEach(br => {
      const booking = br.booking;
      console.log(`  - room_id: ${br.room_id}, booking_id: ${booking.booking_id}, status: ${booking.booking_status}, dates: ${booking.check_in_date} to ${booking.check_out_date}`);
    });

    const bookedRoomIds = bookedRoomDetails.map(br => br.room_id);
    console.log(`[ROOM_AVAILABILITY] bookedRoomIds (active bookings):`, bookedRoomIds);

    // Lấy tất cả phòng của loại phòng này, loại trừ các phòng đã được đặt vĩnh viễn
    // QUAN TRỌNG: 
    // - Phòng có status 'available', 'checked_out', 'cleaning' luôn có thể đặt
    // - Phòng có status 'booked' nhưng không có booking active trong khoảng thời gian này 
    //   (đã check-out rồi nhưng admin chưa cập nhật status) → cũng có thể đặt
    // - Phòng có status 'in_use' → không thể đặt (đang có khách ở)
    
    // Bước 1: Lấy tất cả phòng của loại này (không filter status)
    const allRoomsOfType = await Room.findAll({
      where: { room_type_id },
      attributes: ['room_id', 'room_num', 'status']
    });
    console.log(`[ROOM_AVAILABILITY] All rooms of type ${room_type_id}:`, allRoomsOfType.map(r => ({ room_id: r.room_id, room_num: r.room_num, status: r.status })));

    // Bước 2: Filter theo status và loại trừ bookedRoomIds
    const whereClause = { 
      room_type_id,
      status: { [Op.in]: ['available', 'checked_out', 'cleaning', 'booked'] } // Bao gồm cả 'booked' vì có thể đã check-out
    };
    // Loại trừ các phòng đã được đặt vĩnh viễn (confirmed hoặc checked_in) trong khoảng thời gian này
    // Phòng 'booked' nhưng booking đã check-out sẽ KHÔNG nằm trong bookedRoomIds → được tính vào
    if (bookedRoomIds.length > 0) {
      whereClause.room_id = { [Op.notIn]: bookedRoomIds };
    }

    const freeRooms = await Room.findAll({
      where: whereClause
    });

    console.log(`[ROOM_AVAILABILITY] freeRooms count: ${freeRooms.length}, details:`, freeRooms.map(r => ({ room_id: r.room_id, room_num: r.room_num, status: r.status })));

    // 2. Tìm các phòng đang được giữ tạm thời trong Redis (CHỈ TÍNH CÁC PHÒNG THỰC SỰ TRỐNG TRONG DB)
    // QUAN TRỌNG: Chỉ tính temp bookings cho các phòng mà thực sự còn trống trong DB
    // Logic: Kiểm tra lại số phòng đã được đặt vĩnh viễn DỰA TRÊN THỜI GIAN CỦA TEMP BOOKING
    // Nếu temp booking trùng với booking đã được đặt vĩnh viễn (check-out rồi), thì không tính
    let heldRoomsCount = 0;
    try {
      const allTempBookings = await redisService.getAllTempBookings();
      const overlappingTempBookings = Object.values(allTempBookings || {}).filter(tb => {
        if (!tb || !tb.room_type_id || !tb.check_in_date || !tb.check_out_date) return false;
        // Chỉ tính các temp booking khác (không phải của user hiện tại đang tạo)
        if (tb.user_id === user_id) return false; // Bỏ qua temp booking của chính user này
        if (tb.room_type_id !== room_type_id) return false;
        // Kiểm tra trùng khoảng thời gian
        const tbCheckIn = moment(tb.check_in_date);
        const tbCheckOut = moment(tb.check_out_date);
        return tbCheckIn.isBefore(checkOut) && tbCheckOut.isAfter(checkIn);
      });
      
      // QUAN TRỌNG: Kiểm tra lại số phòng đã được đặt vĩnh viễn CHO TỪNG TEMP BOOKING
      // Để xem temp booking đó có còn hợp lệ không (phòng có thực sự còn trống không)
      // Logic: Nếu temp booking đang giữ X phòng, nhưng chỉ còn Y phòng trống (< X),
      // thì temp booking đó không hợp lệ (phòng đã được đặt vĩnh viễn hoặc check-out rồi)
      let validHeldRoomsCount = 0;
      for (const tb of overlappingTempBookings) {
        const tbCheckIn = moment(tb.check_in_date);
        const tbCheckOut = moment(tb.check_out_date);
        const tbNumRooms = Number(tb.num_rooms) || 1;
        
          // Kiểm tra số phòng đã được đặt vĩnh viễn trong khoảng thời gian của temp booking này
          // QUAN TRỌNG: Chỉ tính booking nếu check_out_date >= hôm nay (booking chưa kết thúc)
          const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
          const tbBookedRoomIds = await BookingRoom.findAll({
            include: [{
              model: Booking,
              as: 'booking',
              where: {
                booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
                check_out_date: { [Op.gte]: today }, // Chỉ tính booking chưa kết thúc
                [Op.and]: [
                  Sequelize.literal(`check_in_date < '${tbCheckOut.format('YYYY-MM-DD')}'`),
                  Sequelize.literal(`check_out_date > '${tbCheckIn.format('YYYY-MM-DD')}'`)
                ]
              },
              required: true
            }],
            attributes: ['room_id'],
            raw: true
          }).then(results => results.map(r => r.room_id));
        
        // Số phòng trống cho temp booking này (đã loại trừ phòng đã được đặt vĩnh viễn)
        // QUAN TRỌNG: Bao gồm cả phòng 'booked' nếu không có booking active
        const tbWhereClause = { 
          room_type_id: tb.room_type_id,
          status: { [Op.in]: ['available', 'checked_out', 'cleaning', 'booked'] }
        };
        if (tbBookedRoomIds.length > 0) {
          tbWhereClause.room_id = { [Op.notIn]: tbBookedRoomIds };
        }
        const tbFreeRoomsCount = await Room.count({ where: tbWhereClause });
        
        // QUAN TRỌNG: Chỉ tính temp booking nếu số phòng trống >= số phòng nó đang giữ
        // Điều này đảm bảo temp booking vẫn hợp lệ (phòng chưa bị đặt vĩnh viễn)
        if (tbFreeRoomsCount >= tbNumRooms) {
          validHeldRoomsCount += tbNumRooms;
        } else {
          // Temp booking không hợp lệ (phòng đã được đặt vĩnh viễn hoặc check-out rồi)
          console.log(`[TEMP_BOOKING] Temp booking không hợp lệ: yêu cầu ${tbNumRooms} phòng nhưng chỉ còn ${tbFreeRoomsCount} phòng trống`);
        }
      }
      
      // QUAN TRỌNG: Không dùng Math.min nữa vì ta đã kiểm tra từng temp booking
      // Nhưng vẫn cần đảm bảo không vượt quá số phòng trống (phòng trợ cho edge cases)
      heldRoomsCount = Math.min(validHeldRoomsCount, freeRooms.length);
      
      console.log(`[TEMP_BOOKING] freeRooms: ${freeRooms.length}, validHeldRoomsCount: ${validHeldRoomsCount}, heldRoomsCount: ${heldRoomsCount}`);
    } catch (error) {
      console.error('Error checking Redis temp bookings:', error);
      // Nếu Redis lỗi, vẫn tiếp tục nhưng log warning
    }

    // Tính số phòng thực sự có thể đặt
    const availableRoomsCount = freeRooms.length - heldRoomsCount;

    // Kiểm tra số lượng phòng trống có đủ không (sau khi trừ phòng đang được giữ trong Redis)
    if (availableRoomsCount < num_rooms) {
      const heldInfo = heldRoomsCount > 0 ? ` (${heldRoomsCount} phòng đang được giữ tạm thời bởi khách hàng khác)` : '';
      return res.status(400).json({ 
        message: `Không đủ phòng trống. Yêu cầu: ${num_rooms} phòng, hiện có: ${availableRoomsCount} phòng trống trong khoảng thời gian này${heldInfo}`,
        available_rooms: availableRoomsCount,
        held_rooms: heldRoomsCount,
        total_free_rooms: freeRooms.length
      });
    }

    if (availableRoomsCount === 0) {
      return res.status(400).json({ 
        message: 'Loại phòng này đã hết phòng trống trong khoảng thời gian này',
        held_rooms: heldRoomsCount,
        total_free_rooms: freeRooms.length
      });
    }

    // Lấy giá phòng (đảm bảo bản ghi giá bao phủ toàn bộ khoảng ngày ở)
    const roomPrice = await RoomPrice.findOne({
      where: {
        room_type_id,
        start_date: { [Op.lte]: checkIn.format('YYYY-MM-DD') },
        end_date: { [Op.gte]: checkOut.clone().subtract(1, 'day').format('YYYY-MM-DD') }
      },
      order: [['start_date', 'ASC']]
    });

    if (!roomPrice) {
      return res.status(400).json({ message: 'Không tìm thấy giá phòng cho ngày này' });
    }

    // Tính tổng số đêm
    const nights = checkOut.diff(checkIn, 'days');
    const roomTotalPrice = roomPrice.price_per_night * nights * num_rooms;

    // Tạo booking tạm thời
    const tempBookingData = {
      user_id,
      room_type_id,
      check_in_date: checkIn.format('YYYY-MM-DD'),
      check_out_date: checkOut.format('YYYY-MM-DD'),
      num_person,
      num_rooms: Number(num_rooms),
      room_price: roomPrice.price_per_night,
      total_price: roomTotalPrice,
      nights,
      room_type_name: roomType.room_type_name,
      available_rooms: availableRoomsCount // Sử dụng availableRoomsCount thay vì freeRooms.length
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

// Admin/Staff: Thêm dịch vụ vào booking đã tồn tại (khách có thể phát sinh dịch vụ khi đến)
exports.addServiceToBooking = async (req, res) => {
  try {
    const { id } = req.params; // booking_id
    const { service_id, quantity = 1, payment_type = 'postpaid' } = req.body;

    // Validate đầu vào
    if (!service_id) {
      return res.status(400).json({ message: 'Vui lòng nhập service_id' });
    }
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({ message: 'quantity phải là số nguyên dương' });
    }
    if (!['prepaid', 'postpaid'].includes(payment_type)) {
      return res.status(400).json({ message: "payment_type phải là 'prepaid' hoặc 'postpaid'" });
    }

    // Tìm booking
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Chỉ cho phép thêm dịch vụ khi booking còn hiệu lực
    const allowStatuses = ['confirmed', 'checked_in'];
    if (!allowStatuses.includes(booking.booking_status)) {
      return res.status(400).json({ 
        message: 'Chỉ có thể thêm dịch vụ khi booking đang confirmed hoặc checked_in',
        current_status: booking.booking_status,
        allowed_statuses: allowStatuses
      });
    }

    // Tìm dịch vụ
    const service = await Service.findByPk(service_id);
    if (!service) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    }
    const unitPrice = Number(service.price);
    if (!unitPrice || unitPrice <= 0) {
      return res.status(400).json({ message: 'Giá dịch vụ không hợp lệ' });
    }

    const totalPrice = unitPrice * parsedQuantity;

    // Tạo booking service
    const created = await BookingService.create({
      booking_id: booking.booking_id || booking.id || id,
      service_id,
      quantity: parsedQuantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      payment_type,
      status: 'active'
    });

    // Nếu là prepaid, có thể cộng vào final_price để phản ánh tổng phải trả trước
    if (payment_type === 'prepaid') {
      const currentFinal = Number(booking.final_price) || 0;
      booking.final_price = currentFinal + totalPrice;
      await booking.save();
    }

    return res.status(201).json({
      message: 'Thêm dịch vụ vào booking thành công',
      booking_service: created
    });
  } catch (error) {
    console.error('Error adding service to booking:', error);
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
    
    // Tính tiền phòng thuần (không bao gồm dịch vụ)
    const numRooms = tempBooking.num_rooms || 1;
    const roomTotal = (typeof tempBooking.room_price === 'string' ? parseFloat(tempBooking.room_price) : tempBooking.room_price) * tempBooking.nights * numRooms;
    
    // Lưu riêng tiền phòng thuần và tổng tiền (để tính final_amount)
    tempBooking.room_total_price = roomTotal; // Tiền phòng thuần
    tempBooking.total_price = roomTotal; // booking.total_price chỉ lưu tiền phòng thuần
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

    // Tính tổng tiền cần thanh toán (tiền phòng + dịch vụ prepaid)
    const roomTotal = tempBooking.total_price || 0; // Tiền phòng thuần
    const prepaidTotal = tempBooking.prepaid_services_total || 0; // Tổng dịch vụ prepaid
    const subtotalBeforeDiscount = roomTotal + prepaidTotal; // Tổng trước giảm giá
    
    // Áp dụng promotion nếu có
    let finalAmount = subtotalBeforeDiscount;
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
          discountAmount = (subtotalBeforeDiscount * promotionResult.amount) / 100;
        } else {
          discountAmount = promotionResult.amount;
        }
        finalAmount = Math.max(0, subtotalBeforeDiscount - discountAmount);
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
    // Lưu ánh xạ orderCode -> temp_booking_key để webhook tra cứu nhanh
    const mapped = await redisService.mapOrderCodeToTempKey(orderCode, temp_booking_key);
    console.log(`[PAYMENT_LINK] Mapped orderCode=${orderCode} -> key=${temp_booking_key}, mapped=${mapped}`);

    // Tạo link thanh toán PayOS
    const num_rooms = tempBooking.num_rooms || 1;
    const paymentData = {
      orderCode,
      amount: finalAmount,
      description: `Thanh toan dat phong`,
      items: [
        {
          name: `Phòng ${tempBooking.room_type_name} (${num_rooms} phòng)`,
          quantity: tempBooking.nights,
          price: tempBooking.room_price * tempBooking.nights * num_rooms
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

    // Hỗ trợ nhiều định dạng payload từ PayOS: một số biến thể để an toàn
    const payload = webhookData?.data && typeof webhookData.data === 'object' ? webhookData.data : webhookData;
    const rawStatus = payload?.status || webhookData?.status || payload?.paymentStatus || payload?.resultCode || payload?.code;
    const orderCode = payload?.orderCode || payload?.order_code || payload?.orderId || payload?.order_id || payload?.transactionId || payload?.transaction_id;
    const normalizedStatus = String(rawStatus || '').toUpperCase();
    const isPaid =
      normalizedStatus === 'PAID' ||
      normalizedStatus === 'SUCCEEDED' ||
      normalizedStatus === 'SUCCESS' ||
      normalizedStatus === 'PAYMENT_SUCCESS' ||
      normalizedStatus === 'COMPLETED' ||
      normalizedStatus === '00'; // một số cổng dùng mã '00' là thành công

    if (isPaid) {
      // Tìm booking tạm thời theo orderCode
      // Ưu tiên tìm qua ánh xạ trực tiếp để tránh phụ thuộc vào KEYS
      console.log(`[WEBHOOK] Looking up temp booking by orderCode=${orderCode}`);
      let tempKey = await redisService.getTempKeyByOrderCode(orderCode);
      console.log(`[WEBHOOK] Lookup map result: tempKey=${tempKey || 'null'}`);
      let tempBooking = null;
      if (tempKey) {
        tempBooking = await redisService.getTempBooking(tempKey);
        console.log(`[WEBHOOK] Loaded temp booking by key: ${tempKey} -> ${tempBooking ? 'FOUND' : 'NOT_FOUND'}`);
      }
      // Fallback: quét tất cả nếu chưa tìm thấy
      if (!tempBooking) {
        console.log('[WEBHOOK] Fallback to scan all temp bookings in Redis');
        const allTempBookings = await redisService.getAllTempBookings();
        for (const [key, booking] of Object.entries(allTempBookings)) {
          if (booking.payos_order_code == orderCode) {
            tempBooking = booking;
            tempKey = key;
            break;
          }
        }
        console.log(`[WEBHOOK] Fallback scan result: ${tempBooking ? `FOUND at key=${tempKey}` : 'NOT_FOUND'}`);
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

      // Tìm các phòng đã được đặt vĩnh viễn trong khoảng thời gian này qua BookingRoom
      // QUAN TRỌNG: Chỉ tính booking nếu check_out_date >= hôm nay (booking chưa kết thúc)
      const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
      const bookedRoomIds = await BookingRoom.findAll({
        include: [{
          model: Booking,
          as: 'booking',
          where: {
            booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
            check_out_date: { [Op.gte]: today }, // Chỉ tính booking chưa kết thúc
            [Op.and]: [
              Sequelize.literal(`check_in_date < '${tempBooking.check_out_date}'`),
              Sequelize.literal(`check_out_date > '${tempBooking.check_in_date}'`)
            ]
          },
          required: true
        }],
        attributes: ['room_id'],
        raw: true
      }).then(results => results.map(r => r.room_id));

      // Lấy phòng trống (loại trừ các phòng đã được đặt vĩnh viễn)
      // QUAN TRỌNG: Bao gồm cả phòng 'booked' nếu không có booking active
      const whereClause = { 
        room_type_id: tempBooking.room_type_id,
        status: { [Op.in]: ['available', 'checked_out', 'cleaning', 'booked'] } // Bao gồm 'booked' vì có thể đã check-out
      };
      if (bookedRoomIds.length > 0) {
        whereClause.room_id = { [Op.notIn]: bookedRoomIds };
      }

      const freeRooms = await Room.findAll({
        where: whereClause
      });

      // Tìm các phòng đang được giữ tạm thời trong Redis (CHỈ TÍNH CÁC PHÒNG THỰC SỰ TRỐNG TRONG DB)
      // QUAN TRỌNG: Chỉ tính temp bookings cho các phòng mà thực sự còn trống trong DB
      // VÀ QUAN TRỌNG: Bỏ qua temp booking hiện tại đang thanh toán (vì nó sắp được xóa)
      let heldRoomsCount = 0;
      try {
        const allTempBookings = await redisService.getAllTempBookings();
        
        // Filter để bỏ qua temp booking hiện tại và chỉ lấy các temp booking khác
        const overlappingTempBookings = Object.entries(allTempBookings || {}).filter(([key, tb]) => {
          if (!tb || !tb.room_type_id || !tb.check_in_date || !tb.check_out_date) return false;
          // Bỏ qua temp booking hiện tại (đang thanh toán) - so sánh key hoặc orderCode
          if (tempKey && tempKey === key) {
            console.log(`[WEBHOOK] Bỏ qua temp booking hiện tại: ${key}`);
            return false;
          }
          if (tb.payos_order_code && tb.payos_order_code === orderCode) {
            console.log(`[WEBHOOK] Bỏ qua temp booking hiện tại theo orderCode: ${orderCode}`);
            return false;
          }
          if (tb.room_type_id !== tempBooking.room_type_id) return false;
          // Kiểm tra trùng khoảng thời gian
          const tbCheckIn = moment(tb.check_in_date);
          const tbCheckOut = moment(tb.check_out_date);
          const tempCheckIn = moment(tempBooking.check_in_date);
          const tempCheckOut = moment(tempBooking.check_out_date);
          return tbCheckIn.isBefore(tempCheckOut) && tbCheckOut.isAfter(tempCheckIn);
        }).map(([key, tb]) => tb); // Chỉ lấy value, bỏ key
        
        // QUAN TRỌNG: Chỉ tính số phòng đang được giữ tối đa bằng số phòng thực sự trống trong DB
        // Điều này đảm bảo không block các phòng đã được đặt vĩnh viễn
        const totalHeldRooms = overlappingTempBookings.reduce((sum, tb) => sum + (Number(tb.num_rooms) || 1), 0);
        heldRoomsCount = Math.min(totalHeldRooms, freeRooms.length);
        
        console.log(`[WEBHOOK] Debug - freeRooms: ${freeRooms.length}, totalHeldRooms: ${totalHeldRooms}, heldRoomsCount: ${heldRoomsCount}, tempBooking.num_rooms: ${tempBooking.num_rooms || 1}`);
      } catch (error) {
        console.error('Error checking Redis temp bookings in webhook:', error);
      }
      
      // Tính số phòng thực sự có thể đặt
      // QUAN TRỌNG: Temp booking hiện tại đã được tạo và "giữ chỗ" từ trước
      // Nên số phòng có sẵn = số phòng trống + số phòng của temp booking hiện tại (vì nó sẽ được giải phóng khi tạo booking vĩnh viễn)
      const num_rooms = tempBooking.num_rooms || 1;
      const availableRoomsCount = freeRooms.length - heldRoomsCount + num_rooms; // Cộng lại số phòng của temp booking hiện tại
      
      console.log(`[WEBHOOK] Final calculation - freeRooms: ${freeRooms.length}, heldRoomsCount (others): ${heldRoomsCount}, tempBooking rooms: ${num_rooms}, availableRoomsCount: ${availableRoomsCount}`);
      
      // Kiểm tra: số phòng có sẵn phải >= số phòng cần (không cần check nữa vì đã cộng lại)
      // Nhưng vẫn check để đảm bảo an toàn (trường hợp có lỗi logic)
      if (availableRoomsCount < num_rooms) {
        return res.status(400).json({ 
          message: `Không đủ phòng trống. Yêu cầu: ${num_rooms} phòng, hiện có: ${availableRoomsCount} phòng (${heldRoomsCount} phòng đang được giữ tạm thời bởi khách hàng khác)`,
          available_rooms: availableRoomsCount,
          held_rooms: heldRoomsCount,
          total_free_rooms: freeRooms.length,
          current_booking_rooms: num_rooms
        });
      }

      // Chọn đủ số phòng cần thiết
      const selectedRooms = freeRooms.slice(0, num_rooms);

      // Tạo booking vĩnh viễn (không gán room_id trực tiếp nữa, sẽ dùng BookingRoom)
      const booking = await Booking.create({
        user_id: tempBooking.user_id,
        room_type_id: tempBooking.room_type_id,
        room_id: null, // Không gán room_id trực tiếp, dùng BookingRoom
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
        promotion_id: tempBooking.promotion_id
      });

      // Tạo BookingRoom cho mỗi phòng được gán
      const assignTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
      for (const room of selectedRooms) {
        await BookingRoom.create({
          booking_id: booking.booking_id,
          room_id: room.room_id,
          assigned_at: assignTime
        });

        // Cập nhật trạng thái phòng thành 'booked'
        await Room.update(
          { status: 'booked' },
          { where: { room_id: room.room_id } }
        );
      }

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
      console.log(`[WEBHOOK] Deleted temp booking key: ${tempKey}`);
      // Xóa ánh xạ orderCode -> tempKey (không quan trọng nếu thất bại, TTL sẽ tự hết)
      try {
        await redisService.deleteOrderCodeMap(orderCode);
      } catch (e) {
        console.warn(`[WEBHOOK] Failed to delete orderCode map for ${orderCode}:`, e?.message || e);
      }

      // Gửi email xác nhận
      const user = await User.findByPk(tempBooking.user_id);
      const numRooms = tempBooking.num_rooms || 1;
      if (user && user.email) {
        await sendEmail(
          user.email,
          '🎉 Xác nhận đặt phòng thành công - Hotel Booking',
          `Chào ${user.full_name},\n\nĐặt phòng của bạn đã được xác nhận thành công!\nMã đặt phòng: ${bookingCode}\n\nChi tiết đặt phòng:\n- Phòng: ${tempBooking.room_type_name}\n- Số lượng phòng: ${numRooms} phòng\n- Check-in: ${tempBooking.check_in_date}\n- Check-out: ${tempBooking.check_out_date}\n- Tổng tiền: ${tempBooking.final_amount.toLocaleString('vi-VN')} VNĐ\n\nCảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!\n\nTrân trọng,\nHotel Booking Team`,
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
                      <span class="detail-label">Số lượng phòng:</span>
                      <span class="detail-value"><strong>${numRooms} phòng</strong></span>
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
                  <p><strong>Bean Hotel</strong></p>
                  <p>📧 Email: beanhotelvn@gmail.com | 📞 Hotline: 0366228041</p>
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
      num_rooms = 1,
      note = '',
      services = []
    } = req.body;

    // Kiểm tra thông tin đầu vào
    if (!user_id || !room_type_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin loại phòng và ngày' 
      });
    }

    // Kiểm tra số lượng phòng
    if (!Number.isInteger(Number(num_rooms)) || Number(num_rooms) < 1) {
      return res.status(400).json({ 
        message: 'Số lượng phòng phải là số nguyên dương' 
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
    // Tìm các phòng đã được đặt trong khoảng thời gian này qua BookingRoom
    // QUAN TRỌNG: Chỉ tính booking nếu check_out_date >= hôm nay (booking chưa kết thúc)
    const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const bookedRoomIds = await BookingRoom.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          check_out_date: { [Op.gte]: today }, // Chỉ tính booking chưa kết thúc
          [Op.and]: [
            Sequelize.literal(`check_in_date < '${checkOut.format('YYYY-MM-DD')}'`),
            Sequelize.literal(`check_out_date > '${checkIn.format('YYYY-MM-DD')}'`)
          ]
        },
        required: true
      }],
      attributes: ['room_id'],
      raw: true
    }).then(results => results.map(r => r.room_id));

    // Lấy tất cả phòng của loại phòng này, loại trừ các phòng đã được đặt
    // QUAN TRỌNG: Bao gồm cả phòng 'booked' nếu không có booking active
    const whereClause = { 
      room_type_id,
      status: { [Op.in]: ['available', 'checked_out', 'cleaning', 'booked'] }
    };
    if (bookedRoomIds.length > 0) {
      whereClause.room_id = { [Op.notIn]: bookedRoomIds };
    }

    const freeRooms = await Room.findAll({
      where: whereClause
    });

    // Kiểm tra số lượng phòng trống có đủ không
    if (freeRooms.length < num_rooms) {
      return res.status(400).json({ 
        message: `Không đủ phòng trống. Yêu cầu: ${num_rooms} phòng, hiện có: ${freeRooms.length} phòng trống trong khoảng thời gian này` 
      });
    }

    if (freeRooms.length === 0) {
      return res.status(400).json({ message: 'Loại phòng này đã hết phòng trống trong khoảng thời gian này' });
    }

    // Lấy giá phòng (đảm bảo bản ghi giá bao phủ toàn bộ khoảng ngày ở)
    const roomPrice = await RoomPrice.findOne({
      where: {
        room_type_id,
        start_date: { [Op.lte]: checkIn.format('YYYY-MM-DD') },
        end_date: { [Op.gte]: checkOut.clone().subtract(1, 'day').format('YYYY-MM-DD') }
      },
      order: [['start_date', 'ASC']]
    });

    if (!roomPrice) {
      return res.status(400).json({ message: 'Không tìm thấy giá phòng cho ngày này' });
    }

    // Tính tổng số đêm và giá phòng
    const nights = checkOut.diff(checkIn, 'days');
    const roomTotalPrice = roomPrice.price_per_night * nights * num_rooms;

    // Tạo booking code
    const bookingCode = payOSService.generateBookingCode();

    // Chọn đủ số phòng cần thiết từ phòng trống
    const selectedRooms = freeRooms.slice(0, num_rooms);

    // Tạo booking (không gán room_id trực tiếp, sẽ dùng BookingRoom)
    const booking = await Booking.create({
      user_id,
      room_type_id,
      room_id: null, // Không gán room_id trực tiếp nữa
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

    // Tạo BookingRoom cho mỗi phòng được gán
    const assignTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    for (const room of selectedRooms) {
      await BookingRoom.create({
        booking_id: booking.booking_id,
        room_id: room.room_id,
        assigned_at: assignTime
      });

      // Cập nhật trạng thái phòng thành 'booked'
      await Room.update(
        { status: 'booked' },
        { where: { room_id: room.room_id } }
      );
    }

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
        num_rooms: num_rooms,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        total_price: booking.final_price,
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        available_rooms_remaining: freeRooms.length - num_rooms // Trừ đi số phòng vừa đặt
      }
    });

  } catch (error) {
    console.error('Error creating walk-in booking:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// ========== CÁC API CHUNG ==========

// Lấy lịch sử đặt phòng của user hiện tại
exports.getMyBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    const where = { user_id: userId };

    if (status) where.booking_status = status;

    const result = await Booking.findAndCountAll({
      where,
      include: [
        { model: RoomType, as: 'room_type', attributes: ['room_type_id', 'room_type_name', 'capacity', 'amenities'] },
        { 
          model: BookingRoom, 
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num', 'status'],
            include: [{ model: RoomType, as: 'room_type', attributes: ['room_type_name'] }]
          }]
        },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service', attributes: ['service_id', 'name', 'price'] }] },
        { model: Promotion, as: 'promotion', attributes: ['promotion_id', 'promotion_code', 'name', 'discount_type', 'amount'] },
        { model: Review, as: 'reviews', attributes: ['review_id'], limit: 1 }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      message: 'Lấy lịch sử đặt phòng thành công',
      bookings: result.rows.map(booking => {
        // Lấy danh sách phòng từ BookingRoom
        const rooms = booking.booking_rooms?.map(br => ({
          room_id: br.room.room_id,
          room_num: br.room.room_num,
          status: br.room.status,
          assigned_at: br.assigned_at
        })) || [];
        
        // Không còn fallback vì không có liên kết trực tiếp Booking-Room nữa

        return {
          booking_id: booking.booking_id,
          booking_code: booking.booking_code,
          room_type_name: booking.room_type?.room_type_name,
          rooms: rooms, // Danh sách tất cả phòng
          num_rooms: rooms.length,
          room_num: rooms.length > 0 ? rooms[0].room_num : null,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        num_person: booking.num_person,
        total_price: parseFloat(booking.total_price),
        final_price: parseFloat(booking.final_price || booking.total_price),
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        booking_type: booking.booking_type,
        check_in_time: booking.check_in_time,
        check_out_time: booking.check_out_time,
        note: booking.note,
        created_at: booking.created_at,
        services: booking.booking_services?.map(bs => ({
          service_name: bs.service?.name,
          quantity: bs.quantity,
          unit_price: parseFloat(bs.unit_price),
          total_price: parseFloat(bs.total_price),
          payment_type: bs.payment_type
        })) || [],
        promotion: booking.promotion ? {
          promotion_code: booking.promotion.promotion_code,
          name: booking.promotion.name,
          discount_type: booking.promotion.discount_type,
          amount: parseFloat(booking.promotion.amount)
        } : null,
        has_review: booking.reviews && booking.reviews.length > 0,
        can_review: booking.booking_status === 'checked_out' && (!booking.reviews || booking.reviews.length === 0),
        review_link: booking.booking_status === 'checked_out' && (!booking.reviews || booking.reviews.length === 0) 
          ? `${FRONTEND_URL}/review/${booking.booking_code}` 
          : null
        };
      }),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.count / limit),
        totalItems: result.count,
        pageSize: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting my bookings:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

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
        { model: RoomType, as: 'room_type', attributes: ['room_type_id', 'room_type_name', 'capacity', 'amenities'] },
        { 
          model: BookingRoom, 
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num', 'status'],
            include: [{ model: RoomType, as: 'room_type' }]
          }]
        },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Format bookings để thêm thông tin rooms
    const formattedBookings = result.rows.map(booking => {
      const bookingObj = booking.toJSON();
      const rooms = booking.booking_rooms?.map(br => ({
        room_id: br.room.room_id,
        room_num: br.room.room_num,
        status: br.room.status,
        room_type: br.room.room_type,
        assigned_at: br.assigned_at
      })) || [];
      
      // Không còn fallback vì không có liên kết trực tiếp Booking-Room nữa
      
      return {
        ...bookingObj,
        rooms: rooms,
        num_rooms: rooms.length
      };
    });

    return res.status(200).json({
      bookings: formattedBookings,
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
        { 
          model: BookingRoom, 
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num', 'status'],
            include: [{ model: RoomType, as: 'room_type' }]
          }]
        },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] },
        { model: Promotion, as: 'promotion' },
        { model: Payment, as: 'payments', order: [['created_at', 'DESC']] },
        { model: RoomType, as: 'room_type' }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Lấy danh sách phòng từ BookingRoom
    const rooms = booking.booking_rooms?.map(br => ({
      room_id: br.room.room_id,
        room_num: br.room.room_num,
        status: br.room.status,
      room_type: br.room.room_type,
      assigned_at: br.assigned_at
    })) || [];

    // Không còn fallback vì không có liên kết trực tiếp Booking-Room nữa

    // Format payments để dễ đọc
    const formattedPayments = booking.payments?.map(payment => ({
      payment_id: payment.payment_id,
      amount: parseFloat(payment.amount),
      method: payment.method,
      status: payment.status,
      transaction_id: payment.transaction_id,
      payment_date: payment.payment_date,
      created_at: payment.created_at,
      is_refund: parseFloat(payment.amount) < 0  // Đánh dấu là refund nếu amount < 0
    })) || [];

    // Tính toán tổng tiền đã thanh toán và đã hoàn (chỉ tính các payment đã completed)
    // totalPaid: Tổng tiền khách đã thanh toán (các payment có amount > 0)
    const totalPaid = formattedPayments
      .filter(p => p.amount > 0 && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    // totalRefunded: Tổng tiền đã hoàn lại cho khách (các payment có amount < 0, lấy giá trị tuyệt đối)
    const totalRefunded = formattedPayments
      .filter(p => p.amount < 0 && p.status === 'completed')
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);

    // net_amount: Số tiền thực tế thu được = Tổng đã thanh toán - Tổng đã hoàn
    // Ví dụ: Khách thanh toán 10, bị phạt 30% (hoàn 7) => net_amount = 10 - 7 = 3
    const netAmount = totalPaid - totalRefunded;

    return res.status(200).json({ 
      booking: {
        ...booking.toJSON(),
        rooms: rooms, // Danh sách tất cả phòng
        num_rooms: rooms.length,
        payments: formattedPayments,
        payment_summary: {
          total_paid: totalPaid,
          total_refunded: totalRefunded,
          net_amount: netAmount,
          has_payments: formattedPayments.length > 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting booking by ID:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tìm booking theo mã đặt phòng
// User thường: chỉ có thể tra cứu booking của chính mình
// Admin: có thể tra cứu bất kỳ booking code nào
exports.findBookingByCode = async (req, res) => {
  try {
    const { booking_code } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const booking = await Booking.findOne({
      where: { booking_code },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email', 'phone'] },
        { 
          model: BookingRoom, 
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num', 'status'],
            include: [{
              model: RoomType,
              as: 'room_type',
              attributes: ['room_type_id', 'room_type_name', 'capacity']
            }]
          }]
        },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] },
        { model: RoomType, as: 'room_type', attributes: ['room_type_id', 'room_type_name', 'capacity'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy đặt phòng với mã này' });
    }

    // Kiểm tra quyền: User thường chỉ có thể xem booking của chính mình
    if (!isAdmin && booking.user_id !== userId) {
      return res.status(403).json({ 
        message: 'Bạn chỉ có thể tra cứu booking code của chính mình' 
      });
    }

    // Lấy danh sách phòng từ BookingRoom
    const rooms = booking.booking_rooms?.map(br => ({
      room_id: br.room.room_id,
        room_num: br.room.room_num,
        status: br.room.status,
      room_type: br.room.room_type,
      assigned_at: br.assigned_at
    })) || [];

    // Không còn fallback vì không có liên kết trực tiếp Booking-Room nữa

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
        final_price: booking.final_price,
        check_in_time: booking.check_in_time,
        check_out_time: booking.check_out_time,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        user: booking.user,
        room_type: booking.room_type,
        rooms: rooms, // Danh sách tất cả phòng của booking
        num_rooms: rooms.length,
        services: booking.booking_services || []
      }
    });

  } catch (error) {
    console.error('Error finding booking by code:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Check-in (phòng đã được gán sẵn hoặc có thể gán mới cho walk-in)
exports.checkIn = async (req, res) => {
  try {
    const { booking_code } = req.params;
    const { room_ids } = req.body || {}; // Optional: để gán phòng mới cho walk-in booking (mảng room_ids)

    const booking = await Booking.findOne({
      where: { booking_code },
      include: [
        { model: User, as: 'user', attributes: ['full_name', 'email'] },
        { model: RoomType, as: 'room_type', attributes: ['room_type_name', 'room_type_id'] },
        { 
          model: BookingRoom, 
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num', 'status']
          }]
        }
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

    // Lấy danh sách phòng từ BookingRoom
    let bookingRooms = booking.booking_rooms || [];
    
    // Nếu không có phòng nào (walk-in booking chưa gán), cần gán phòng mới
    if (bookingRooms.length === 0) {
      if (!room_ids || (Array.isArray(room_ids) && room_ids.length === 0)) {
        return res.status(400).json({ 
          message: 'Phòng chưa được gán. Vui lòng cung cấp room_ids (mảng) để gán phòng',
          room_type_id: booking.room_type_id,
          available_rooms_endpoint: `/api/bookings/available-rooms?room_type_id=${booking.room_type_id}&check_in_date=${booking.check_in_date}&check_out_date=${booking.check_out_date}`
        });
      }

      // Kiểm tra và gán phòng
      const roomIdArray = Array.isArray(room_ids) ? room_ids : [room_ids];
      const assignTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
      
      for (const roomId of roomIdArray) {
        const selectedRoom = await Room.findOne({
          where: { room_id: roomId, room_type_id: booking.room_type_id }
        });

        if (!selectedRoom) {
          return res.status(404).json({ message: `Không tìm thấy phòng hợp lệ với ID: ${roomId}` });
        }

        // Kiểm tra conflict qua BookingRoom
        const conflictingBookingRooms = await BookingRoom.findAll({
          include: [{
            model: Booking,
            as: 'booking',
            where: {
              booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
              [Op.or]: [
                {
                  check_in_date: { [Op.lte]: booking.check_out_date },
                  check_out_date: { [Op.gte]: booking.check_in_date }
                }
              ]
            },
            required: true
          }],
          where: { room_id: roomId }
        });

        if (conflictingBookingRooms.length > 0) {
          return res.status(400).json({ message: `Phòng ${selectedRoom.room_num} đã được đặt trong khoảng thời gian này` });
        }

        // Tạo BookingRoom
        await BookingRoom.create({
          booking_id: booking.booking_id,
          room_id: roomId,
          assigned_at: assignTime
        });

        // Cập nhật trạng thái phòng thành 'booked'
        await Room.update(
          { status: 'booked' },
          { where: { room_id: roomId } }
        );
      }

      // Reload booking rooms
      bookingRooms = await BookingRoom.findAll({
        where: { booking_id: booking.booking_id },
        include: [{
          model: Room,
          as: 'room',
          attributes: ['room_id', 'room_num', 'status']
        }]
      });
    }

    // Cập nhật thời gian check-in và trạng thái
    const checkInTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    booking.check_in_time = checkInTime;
    booking.booking_status = 'checked_in';
    await booking.save();

    // Cập nhật trạng thái tất cả phòng thành 'in_use'
    // Lấy room_id từ bookingRooms (có thể là từ include hoặc từ raw data)
    const roomIds = bookingRooms.map(br => {
      // Nếu br là sequelize object với include room, dùng br.room.room_id
      // Nếu br đã có room_id trực tiếp, dùng br.room_id
      return br.room ? br.room.room_id : br.room_id;
    }).filter(id => id != null);
    
    if (roomIds.length > 0) {
      await Room.update(
        { status: 'in_use' },
        { where: { room_id: { [Op.in]: roomIds } } }
      );
    }

    // Lấy thông tin phòng để trả về
    const roomsInfo = bookingRooms.map(br => {
      const room = br.room || br;
      return {
        room_id: room.room_id || br.room_id,
        room_num: room.room_num,
        assigned_at: br.assigned_at
      };
    });

    return res.status(200).json({ 
      message: 'Check-in thành công',
      booking_code: booking.booking_code,
      guest_name: booking.user.full_name,
      room_type: booking.room_type.room_type_name,
      rooms: roomsInfo, // Danh sách tất cả phòng
      num_rooms: roomsInfo.length,
      check_in_time: checkInTime,
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

    // Tổng số phòng thực tế của loại này
    const totalRoomsOfType = await Room.count({ where: { room_type_id } });

    // Tìm các phòng đã được đặt trong khoảng thời gian này qua BookingRoom
    // QUAN TRỌNG: Chỉ tính booking nếu check_out_date >= hôm nay (booking chưa kết thúc)
    const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const bookedRoomIds = await BookingRoom.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          check_out_date: { [Op.gte]: today }, // Chỉ tính booking chưa kết thúc
          [Op.and]: [
            Sequelize.literal(`check_in_date < '${checkOut.format('YYYY-MM-DD')}'`),
            Sequelize.literal(`check_out_date > '${checkIn.format('YYYY-MM-DD')}'`)
          ]
        },
        required: true
      }],
      attributes: ['room_id'],
      raw: true
    }).then(results => results.map(r => r.room_id));

    // Lấy tất cả phòng của loại phòng này, loại trừ các phòng đã được đặt
    // QUAN TRỌNG: Bao gồm cả phòng 'booked' nếu không có booking active
    const whereClause = { 
      room_type_id,
      status: { [Op.in]: ['available', 'checked_out', 'cleaning', 'booked'] }
    };
    if (bookedRoomIds.length > 0) {
      whereClause.room_id = { [Op.notIn]: bookedRoomIds };
    }

    let availableRooms = await Room.findAll({
      where: whereClause
    });

    // Trừ số phòng đang được giữ tạm thời (Redis) theo loại phòng và khoảng ngày
    try {
      const allTemp = await redisService.getAllTempBookings();
      const holds = Object.values(allTemp || {});
      const heldCount = holds.reduce((sum, tb) => {
        if (!tb || !tb.room_type_id || Number(tb.room_type_id) !== Number(room_type_id)) return sum;
        if (!tb.check_in_date || !tb.check_out_date) return sum;
        const tbIn = moment(tb.check_in_date).tz('Asia/Ho_Chi_Minh');
        const tbOut = moment(tb.check_out_date).tz('Asia/Ho_Chi_Minh');
        const isOverlap = tbIn.isBefore(checkOut, 'day') && tbOut.isAfter(checkIn, 'day');
        if (!isOverlap) return sum;
        return sum + (Number(tb.num_rooms) || 1);
      }, 0);

      if (heldCount > 0 && availableRooms.length > 0) {
        const keepCount = Math.max(availableRooms.length - heldCount, 0);
        availableRooms = availableRooms.slice(0, keepCount);
      }
    } catch (e) {
      // Redis unavailable → skip holds
    }

    return res.status(200).json({
      message: 'Danh sách phòng trống',
      room_type_id,
      room_type_name: roomType.room_type_name,
      max_quantity: roomType.quantity,
      check_in_date: checkIn.format('YYYY-MM-DD'),
      check_out_date: checkOut.format('YYYY-MM-DD'),
      total_rooms: totalRoomsOfType,
      available_rooms: availableRooms.length,
      rooms: availableRooms.map(room => ({
        room_id: room.room_id,
        room_num: room.room_num,
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
        {
          model: BookingRoom,
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num']
          }]
        }
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

    // Cập nhật trạng thái tất cả phòng thành 'checked_out' (từ booking_rooms)
    const bookingRoomsToCheckOut = await BookingRoom.findAll({
      where: { booking_id: booking.booking_id }
    });
    if (bookingRoomsToCheckOut.length > 0) {
      const roomIds = bookingRoomsToCheckOut.map(br => br.room_id);
      await Room.update(
        { status: 'checked_out' },
        { where: { room_id: { [Op.in]: roomIds } } }
      );
    }

    // Gửi email mời đánh giá
    try {
      await sendReviewRequestEmail(booking, booking.user);
    } catch (emailError) {
      console.error('Error sending review email:', emailError);
      // Không fail checkout nếu không gửi được email
    }

    return res.status(200).json({ 
      message: 'Check-out thành công',
      check_out_time: booking.check_out_time,
      payment_status: booking.payment_status,
      review_email_sent: true
    });

  } catch (error) {
    console.error('Error checking out:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Hủy booking (User tự hủy - áp dụng chính sách hủy)
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const booking = await Booking.findByPk(id, {
      include: [
        { model: RoomType, as: 'room_type' },
        {
          model: BookingRoom,
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num', 'status']
          }]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Kiểm tra quyền: User chỉ có thể hủy booking của chính mình
    if (!isAdmin && booking.user_id !== userId) {
      return res.status(403).json({ message: 'Bạn không có quyền hủy booking này' });
    }

    // Kiểm tra trạng thái booking
    if (['cancelled', 'checked_in', 'checked_out'].includes(booking.booking_status)) {
      return res.status(400).json({ 
        message: `Không thể hủy booking ở trạng thái: ${booking.booking_status}` 
      });
    }

    // Nếu booking chưa thanh toán hoặc đã hoàn tiền
    if (booking.payment_status !== 'paid') {
      booking.booking_status = 'cancelled';
      booking.note = booking.note ? `${booking.note}\nHủy: ${reason}` : `Hủy: ${reason}`;
      await booking.save();

      return res.status(200).json({ 
        message: 'Hủy booking thành công',
        refund_amount: 0,
        cancellation_policy: 'Không áp dụng vì chưa thanh toán'
      });
    }

    // Tính toán thời gian còn lại trước khi check-in (14:00)
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const checkInDateTime = moment(booking.check_in_date).tz('Asia/Ho_Chi_Minh').set({
      hour: 14,
      minute: 0,
      second: 0
    });

    // Chính sách mới: kiểm tra thời gian từ khi đặt đến lúc hủy
    const createdAt = moment(booking.created_at).tz('Asia/Ho_Chi_Minh');
    const hoursSinceBooking = now.diff(createdAt, 'hours');
    const hoursUntilCheckIn = checkInDateTime.diff(now, 'hours');
    const isWithin1h = hoursSinceBooking <= 1;
    const isWithin48h = hoursUntilCheckIn <= 48;

    let refundAmount = 0;
    let cancellationPolicy = '';
    let penaltyRate = 1; // Tỷ lệ giữ lại (default mất 100%)

    // Dùng final_price (giá cuối cùng sau promotion, dịch vụ) để tính refund, fallback về total_price nếu không có
    const finalPrice = parseFloat(booking.final_price || booking.total_price) || 0;

    // Ngoại lệ 1 tiếng (ưu tiên cao nhất): Nếu hủy trong vòng ≤ 1 tiếng từ lúc đặt → luôn chỉ mất 15% (bất kể còn bao nhiêu giờ trước check-in)
    if (isWithin1h) {
      penaltyRate = 0.15;
      refundAmount = finalPrice * (1 - penaltyRate);
      cancellationPolicy = 'Hủy trong 1 tiếng kể từ lúc đặt: hoàn 85%, phí 15%';
      booking.payment_status = 'partial_refunded';
    } else if (isWithin48h) {
      // Nếu không phải ngoại lệ 1 tiếng, thì xét 48h trước check-in: nếu còn dưới 48h thì mất 100%
      penaltyRate = 1;
      refundAmount = 0;
      cancellationPolicy = 'Hủy trong vòng 48 giờ - mất 100%';
      booking.payment_status = 'paid';
    } else {
      // Còn ≥ 48h trước check-in => phí 30% (hoàn 70%)
      penaltyRate = 0.3;
      refundAmount = finalPrice * (1 - penaltyRate);
      cancellationPolicy = 'Hủy trước 48 giờ - hoàn 70%, phí 30%';
      booking.payment_status = 'partial_refunded';
    }

    if (penaltyRate < 1) {
      // Tạo payment record cho refund
      const refundPayment = await Payment.create({
        booking_id: booking.booking_id,
        amount: -refundAmount, // Số âm để biểu thị hoàn tiền
        method: booking.booking_type === 'online' ? 'payos' : 'cash',
        status: 'completed',
        transaction_id: `REFUND-${booking.booking_code}-${Date.now()}`,
        payment_date: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
        created_at: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
      });

      // Cập nhật trạng thái booking
      booking.booking_status = 'cancelled';
      booking.note = booking.note ? `${booking.note}\nHủy: ${reason}` : `Hủy: ${reason}`;
      await booking.save();

      // Giải phóng tất cả phòng nếu đã được gán (từ booking_rooms)
      const bookingRoomsToRelease = await BookingRoom.findAll({
        where: { booking_id: booking.booking_id }
      });
      if (bookingRoomsToRelease.length > 0) {
        const roomIds = bookingRoomsToRelease.map(br => br.room_id);
        await Room.update(
          { status: 'available' },
          { where: { room_id: { [Op.in]: roomIds } } }
        );
      }

      // Gửi email yêu cầu khách cung cấp STK để hoàn tiền thủ công
      try {
        const user = await User.findByPk(booking.user_id);
        if (user && user.email) {
          await sendRefundRequestEmail(booking, user, {
            amount: refundAmount,
            policy: cancellationPolicy,
            method: refundPayment.method
          });
        }
      } catch (emailErr) {
        console.error('Error sending refund email:', emailErr);
      }

      return res.status(200).json({ 
        message: 'Hủy booking thành công',
        refund_amount: refundAmount,
        cancellation_policy: cancellationPolicy,
        hours_until_checkin: hoursUntilCheckIn,
        booking_status: 'cancelled',
        payment_status: booking.payment_status,
        refund_payment: {
          payment_id: refundPayment.payment_id,
          amount: parseFloat(refundPayment.amount),
          transaction_id: refundPayment.transaction_id,
          payment_date: refundPayment.payment_date
        },
        note: 'Đã ghi nhận hoàn tiền trong hệ thống. Tiền sẽ được xử lý theo phương thức thanh toán ban đầu (PayOS hoặc tiền mặt).'
      });
    } else {
      // Không hoàn tiền trong vòng 48h hoặc không đến
      booking.booking_status = 'cancelled';
      booking.note = booking.note ? `${booking.note}\nHủy: ${reason}` : `Hủy: ${reason}`;
      await booking.save();

      // Giải phóng tất cả phòng nếu đã được gán (từ booking_rooms)
      const bookingRoomsToRelease = await BookingRoom.findAll({
        where: { booking_id: booking.booking_id }
      });
      if (bookingRoomsToRelease.length > 0) {
        const roomIds = bookingRoomsToRelease.map(br => br.room_id);
        await Room.update(
          { status: 'available' },
          { where: { room_id: { [Op.in]: roomIds } } }
        );
      }

      return res.status(200).json({ 
        message: 'Hủy booking thành công',
        refund_amount: 0,
        cancellation_policy: cancellationPolicy,
        hours_until_checkin: hoursUntilCheckIn,
        booking_status: 'cancelled',
        payment_status: 'paid',
        note: 'Không hoàn tiền theo chính sách hủy (hủy trong vòng 48h hoặc no-show).'
      });
    }

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Admin: Hủy booking không hoàn tiền (xử lý thủ công)
exports.cancelBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '', refund_manually = false, refund_amount } = req.body;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: RoomType, as: 'room_type' },
        {
          model: BookingRoom,
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num', 'status']
          }]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    if (['cancelled', 'checked_out'].includes(booking.booking_status)) {
      return res.status(400).json({ 
        message: `Không thể hủy booking ở trạng thái: ${booking.booking_status}` 
      });
    }

    // Admin hủy: có thể chọn hoàn tiền thủ công (một phần hoặc toàn phần)
    booking.booking_status = 'cancelled';
    const manualNote = refund_manually 
      ? ` (Đã hoàn tiền thủ công${refund_amount ? `: ${refund_amount}` : ''})`
      : ' (Không hoàn tiền - xử lý thủ công)';
    booking.note = booking.note 
      ? `${booking.note}\nAdmin hủy: ${reason}${manualNote}`
      : `Admin hủy: ${reason}${manualNote}`;

    await booking.save();

    // Giải phóng tất cả phòng (từ booking_rooms)
    const bookingRoomsToRelease = await BookingRoom.findAll({
      where: { booking_id: booking.booking_id }
    });
    if (bookingRoomsToRelease.length > 0) {
      const roomIds = bookingRoomsToRelease.map(br => br.room_id);
      await Room.update(
        { status: 'available' },
        { where: { room_id: { [Op.in]: roomIds } } }
      );
    }
    return res.status(200).json({ 
      message: 'Admin hủy booking thành công',
      refund_manually,
      refund_amount: refund_amount || 0,
      note: refund_manually 
        ? 'Đã đánh dấu là đã hoàn tiền thủ công' 
        : 'Không hoàn tiền - xử lý thủ công'
    });

  } catch (error) {
    console.error('Error cancelling booking (admin):', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Admin: Đánh dấu đã hoàn tiền (thủ công hoặc PayOS ngoài hệ thống)
exports.refundBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method = 'cash', note = '' } = req.body;

    const booking = await Booking.findByPk(id, { include: [{ model: User, as: 'user' }] });
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Tính giới hạn hoàn tối đa theo policy và số đã hoàn
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const checkInDateTime = moment(booking.check_in_date).tz('Asia/Ho_Chi_Minh').set({ hour: 14, minute: 0, second: 0 });
    const createdAt = moment(booking.created_at).tz('Asia/Ho_Chi_Minh');
    const hoursUntilCheckIn = checkInDateTime.diff(now, 'hours');
    const hoursSinceBooking = now.diff(createdAt, 'hours');
    const isWithin48h = hoursUntilCheckIn <= 48;
    const isWithin1h = hoursSinceBooking <= 1;

    let penaltyRate;
    // Ưu tiên kiểm tra thời gian từ lúc đặt (1h) trước, sau đó mới kiểm tra thời gian đến check-in (48h)
    if (isWithin1h) penaltyRate = 0.15; // phạt 15% (hoàn 85%) - ưu tiên cao nhất
    else if (isWithin48h) penaltyRate = 1; // mất 100%
    else penaltyRate = 0.3; // phạt 30%

    // Dùng final_price (giá cuối cùng sau promotion, dịch vụ) để tính refund, fallback về total_price nếu không có
    const finalPrice = parseFloat(booking.final_price || booking.total_price) || 0;
    const maxPolicyRefund = finalPrice * (1 - penaltyRate);

    // Tổng đã thanh toán (completed, dương) và đã hoàn (completed, âm)
    const totalPaid = (await Payment.sum('amount', { where: { booking_id: booking.booking_id, status: 'completed', amount: { [Op.gt]: 0 } } })) || 0;
    let totalRefundedAbs = Math.abs((await Payment.sum('amount', { where: { booking_id: booking.booking_id, status: 'completed', amount: { [Op.lt]: 0 } } })) || 0);

    // Kiểm tra xem có payment pending không (nếu có thì sẽ được cập nhật, không tạo mới)
    const pendingRefund = await Payment.findOne({
      where: {
        booking_id: booking.booking_id,
        amount: { [Op.lt]: 0 },
        status: 'pending'
      }
    });

    // Nếu có pending refund, thì refundableCap = maxPolicyRefund - (totalRefundedAbs - số tiền pending)
    // Vì pending chưa được tính vào totalRefundedAbs, nhưng khi cập nhật sẽ được tính
    const pendingRefundAbs = pendingRefund ? Math.abs(Number(pendingRefund.amount)) : 0;
    
    // Tính refundableCap: số tiền còn có thể refund
    // Nếu đang cập nhật pending refund, thì không trừ số tiền pending đó
    let refundableCap = Math.max(0, Math.min(maxPolicyRefund, totalPaid) - totalRefundedAbs + pendingRefundAbs);
    
    // Nếu admin đang refund lại số tiền đã refund trước đó (cùng số tiền), cho phép
    // Vì có thể là refund lại hoặc cập nhật refund hiện có
    if (pendingRefund && Math.abs(Number(amount)) === pendingRefundAbs) {
      // Đang cập nhật pending refund với cùng số tiền, cho phép
      refundableCap = Math.max(refundableCap, Math.abs(Number(amount)));
    } else if (!pendingRefund && Math.abs(Number(amount)) === totalRefundedAbs && totalRefundedAbs > 0) {
      // Nếu không có pending nhưng số tiền refund bằng với số đã refund, có thể là refund lại
      // Kiểm tra xem số tiền này có đúng với chính sách 1h không (85% của finalPrice)
      const expected1hRefund = finalPrice * 0.85;
      if (Math.abs(Math.abs(Number(amount)) - expected1hRefund) < 1) {
        // Số tiền đúng với chính sách 1h, cho phép refund lại
        refundableCap = Math.max(refundableCap, Math.abs(Number(amount)));
      }
    }

    // Debug log để kiểm tra
    console.log('Refund Admin Debug:', {
      hoursSinceBooking,
      hoursUntilCheckIn,
      isWithin1h,
      isWithin48h,
      penaltyRate,
      finalPrice,
      totalPrice: parseFloat(booking.total_price) || 0,
      maxPolicyRefund,
      totalPaid,
      totalRefundedAbs,
      refundableCap,
      requestedAmount: Number(amount)
    });

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Vui lòng cung cấp số tiền hoàn hợp lệ' });
    }
    if (Number(amount) > refundableCap) {
      return res.status(400).json({ 
        message: 'Số tiền hoàn vượt quá mức cho phép theo chính sách',
        allowed_max_refund: refundableCap,
        policy: isWithin48h ? 'Trong 48h trước check-in - không hoàn' : (isWithin1h ? 'Trong 1h từ lúc đặt - hoàn tối đa 85%' : 'Trước 48h và >1h từ lúc đặt - hoàn tối đa 70%'),
        debug: {
          hoursSinceBooking,
          hoursUntilCheckIn,
          penaltyRate,
          finalPrice,
          totalPrice: parseFloat(booking.total_price) || 0,
          maxPolicyRefund,
          totalPaid,
          totalRefundedAbs
        }
      });
    }

    // Kiểm tra xem đã có payment refund completed với số tiền tương tự chưa
    // (tránh tạo duplicate khi admin đã refund rồi, nhưng cho phép refund lại nếu là payment từ hệ thống tự động)
    const existingCompletedRefund = await Payment.findOne({
      where: {
        booking_id: booking.booking_id,
        amount: { [Op.lt]: 0 },
        status: 'completed'
      },
      order: [['created_at', 'DESC']]
    });

    // Chỉ chặn duplicate nếu:
    // 1. Có payment refund completed với số tiền giống nhau
    // 2. VÀ payment đó được tạo bởi admin (transaction_id bắt đầu bằng "ADMIN-REFUND-")
    // 3. VÀ payment đó được tạo trong vòng 5 phút gần đây (tránh duplicate click)
    if (existingCompletedRefund) {
      const existingRefundAmount = Math.abs(Number(existingCompletedRefund.amount));
      const requestedAmount = Math.abs(Number(amount));
      const transactionId = existingCompletedRefund.transaction_id || '';
      const isAdminRefund = transactionId.startsWith('ADMIN-REFUND-');
      const refundCreatedAt = moment(existingCompletedRefund.created_at || existingCompletedRefund.payment_date);
      const minutesSinceRefund = moment().diff(refundCreatedAt, 'minutes');
      
      // Chỉ chặn nếu: số tiền giống nhau VÀ là admin refund VÀ được tạo trong vòng 5 phút
      if (Math.abs(existingRefundAmount - requestedAmount) < 1 && isAdminRefund && minutesSinceRefund < 5) {
        return res.status(200).json({
          message: 'Đã hoàn tiền rồi, không tạo duplicate',
          booking_id: booking.booking_id,
          payment_status: booking.payment_status,
          existing_refund_payment: {
            payment_id: existingCompletedRefund.payment_id,
            amount: existingRefundAmount,
            method: existingCompletedRefund.method,
            transaction_id: existingCompletedRefund.transaction_id,
            payment_date: existingCompletedRefund.payment_date
          }
        });
      }
    }

    // Ưu tiên cập nhật bản ghi hoàn tiền đang chờ (nếu có)
    let refundPayment = await Payment.findOne({
      where: {
        booking_id: booking.booking_id,
        amount: { [Op.lt]: 0 },
        status: 'pending'
      },
      order: [['created_at', 'DESC']]
    });

    let refundAmountAbs;
    let isUpdatingPending = false;
    let hasRecalculatedTotalRefunded = false; // Flag để biết đã tính lại totalRefundedAbs chưa
    
    if (refundPayment) {
      // Cập nhật bản ghi pending thành hoàn tất (có thể cập nhật cả số tiền nếu khác)
      isUpdatingPending = true;
      refundPayment.amount = -Math.abs(Number(amount)); // Cập nhật số tiền theo request mới
      refundPayment.method = method;
      refundPayment.status = 'completed';
      refundPayment.transaction_id = `ADMIN-REFUND-${booking.booking_code}-${Date.now()}`;
      refundPayment.payment_date = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
      await refundPayment.save();
      refundAmountAbs = Math.abs(Number(amount)); // Dùng số tiền mới từ request
      
      // Nếu đang cập nhật pending, cần tính lại totalRefundedAbs sau khi cập nhật
      // Vì pending đã được cộng vào totalRefundedAbs ở trên (qua pendingRefundAbs), 
      // nhưng bây giờ nó đã thành completed, nên cần tính lại từ DB
      totalRefundedAbs = Math.abs((await Payment.sum('amount', { where: { booking_id: booking.booking_id, status: 'completed', amount: { [Op.lt]: 0 } } })) || 0);
      hasRecalculatedTotalRefunded = true;
    } else {
      // Chỉ tạo mới nếu chưa có payment refund completed nào
      // (tránh duplicate khi đã hủy booking tạo refund rồi)
      if (!existingCompletedRefund) {
        refundPayment = await Payment.create({
          booking_id: booking.booking_id,
          amount: -Math.abs(Number(amount)),
          method,
          status: 'completed',
          transaction_id: `ADMIN-REFUND-${booking.booking_code}-${Date.now()}`,
          payment_date: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
        });
        refundAmountAbs = Math.abs(Number(amount));
        // Tạo mới thì chưa tính lại, sẽ cộng thêm vào totalRefundedAbs
      } else {
        // Nếu đã có completed refund nhưng số tiền khác, cập nhật số tiền
        refundPayment = existingCompletedRefund;
        refundPayment.amount = -Math.abs(Number(amount));
        refundPayment.method = method;
        refundPayment.transaction_id = `ADMIN-REFUND-${booking.booking_code}-${Date.now()}`;
        refundPayment.payment_date = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
        await refundPayment.save();
        refundAmountAbs = Math.abs(Number(amount));
        // Tính lại totalRefundedAbs sau khi cập nhật
        totalRefundedAbs = Math.abs((await Payment.sum('amount', { where: { booking_id: booking.booking_id, status: 'completed', amount: { [Op.lt]: 0 } } })) || 0);
        hasRecalculatedTotalRefunded = true;
      }
    }

    // Booking: cập nhật trạng thái payment theo mức đã hoàn
    // Nếu đã tính lại totalRefundedAbs (pending hoặc existing completed), dùng giá trị đã tính lại
    // Nếu tạo mới, thì cộng thêm refundAmountAbs
    const totalRefundedAfter = hasRecalculatedTotalRefunded ? totalRefundedAbs : (totalRefundedAbs + refundAmountAbs);
    const fullyRefundedTarget = Math.min(maxPolicyRefund, totalPaid);
    booking.payment_status = totalRefundedAfter >= fullyRefundedTarget - 1e-6 ? 'refunded' : 'partial_refunded';
    const append = `Admin đánh dấu hoàn tiền ${refundAmountAbs.toLocaleString('vi-VN')} VNĐ (${method})${note ? ` - ${note}` : ''}`;
    booking.note = booking.note ? `${booking.note}\n${append}` : append;
    await booking.save();

    // Gửi email xác nhận hoàn tiền cho khách
    try {
      if (booking.user && booking.user.email) {
        await sendRefundEmail(booking, booking.user, {
          amount: refundAmountAbs,
          policy: 'Hoàn tiền thủ công theo yêu cầu',
          method,
          transaction_id: refundPayment.transaction_id,
          payment_date: refundPayment.payment_date
        });
      }
    } catch (emailErr) {
      console.error('Error sending admin refund email:', emailErr);
    }

    return res.status(200).json({
      message: 'Đã đánh dấu hoàn tiền cho booking',
      booking_id: booking.booking_id,
      payment_status: booking.payment_status,
      refund_payment: {
        payment_id: refundPayment.payment_id,
        amount: Math.abs(Number(refundPayment.amount)),
        method: refundPayment.method,
        transaction_id: refundPayment.transaction_id,
        payment_date: refundPayment.payment_date
      }
    });

  } catch (error) {
    console.error('Error admin refund booking:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// Tạo và tải hóa đơn PDF
exports.generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Lấy tên nhân viên (admin/staff) đang tạo hóa đơn từ database
    let staffName = '';
    if (req.user?.id) {
      const staffUser = await User.findByPk(req.user.id, {
        attributes: ['full_name']
      });
      staffName = staffUser?.full_name || '';
    }

    const booking = await Booking.findOne({
      where: { booking_id: id },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email', 'phone'] },
        { model: RoomType, as: 'room_type', attributes: ['room_type_id', 'room_type_name'] },
        {
          model: BookingRoom,
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num']
          }]
        },
        { 
          model: BookingService, 
          as: 'booking_services', 
          where: { status: { [Op.ne]: 'cancelled' } }, // Chỉ lấy dịch vụ chưa bị hủy
          required: false,
          include: [{ 
            model: Service, 
            as: 'service',
            attributes: ['service_id', 'name']
          }] 
        },
        { model: Payment, as: 'payments', attributes: ['payment_id', 'amount', 'method', 'status'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // ========== TẠO DỮ LIỆU HÓA ĐƠN ==========
    const invoiceData = {
      items: [],
      subtotal: 0,
      discount: 0,
      grandTotal: 0,
      paidOnline: 0,
      refunds: 0,
      amountDue: 0,
      paymentMethod: 'Tiền mặt / Thẻ'
    };

    // 1. Tiền phòng (Accommodation)
    // booking.total_price đã chỉ chứa tiền phòng thuần (không bao gồm dịch vụ prepaid)
    const nights = moment(booking.check_out_date).diff(moment(booking.check_in_date), 'days');
    const numRooms = booking.booking_rooms?.length || 1;
    const accommodationTotal = parseFloat(booking.total_price || 0);
    const roomPricePerNight = numRooms > 0 && nights > 0 ? accommodationTotal / (nights * numRooms) : 0;
    
    invoiceData.items.push({
      name: `Tiền phòng (Accommodation) - ${booking.room_type?.room_type_name || 'N/A'}`,
      quantity: nights,
      unitPrice: roomPricePerNight * numRooms,
      total: accommodationTotal
    });

    // 2. Dịch vụ (Services) - Hiển thị tất cả dịch vụ (cả prepaid và postpaid)
    let postpaidServicesTotal = 0; // Tổng dịch vụ postpaid (thêm tại khách sạn, không áp dụng voucher)
    if (booking.booking_services && booking.booking_services.length > 0) {
      for (const bookingService of booking.booking_services) {
        const serviceName = bookingService.service?.name || 'Dịch vụ';
        const paymentType = bookingService.payment_type || 'prepaid';
        const paymentNote = paymentType === 'prepaid' ? ' (Đã trả trước)' : '';
        const serviceTotal = parseFloat(bookingService.total_price || 0);
        
        invoiceData.items.push({
          name: `${serviceName}${paymentNote}`,
          quantity: bookingService.quantity,
          unitPrice: parseFloat(bookingService.unit_price || 0),
          total: serviceTotal
        });
        
        // Tính tổng dịch vụ postpaid (thêm tại khách sạn)
        if (paymentType === 'postpaid') {
          postpaidServicesTotal += serviceTotal;
        }
      }
    }

    // 3. Phụ thu (Surcharges) - Ví dụ: check-out muộn
    // TODO: Thêm logic tính phụ thu check-out muộn nếu có
    // Tạm thời để trống, có thể bổ sung sau

    // Tính tổng chi phí (Subtotal) - CHỈ tính tiền phòng + dịch vụ prepaid (để áp dụng voucher)
    // Dịch vụ postpaid (thêm tại khách sạn) KHÔNG được áp dụng voucher
    let prepaidServicesTotal = 0;
    if (booking.booking_services && booking.booking_services.length > 0) {
      prepaidServicesTotal = booking.booking_services
        .filter(bs => bs.payment_type === 'prepaid')
        .reduce((sum, bs) => sum + parseFloat(bs.total_price || 0), 0);
    }
    const subtotalForDiscount = accommodationTotal + prepaidServicesTotal;
    
    // Áp dụng giảm giá nếu có (CHỈ áp dụng trên tiền phòng + dịch vụ prepaid)
    // Voucher chỉ áp dụng khi thanh toán trên web, không áp dụng cho dịch vụ thêm tại khách sạn
    if (booking.promotion_id) {
      const promotion = await Promotion.findByPk(booking.promotion_id);
      if (promotion) {
        if (promotion.discount_type === 'percentage') {
          invoiceData.discount = (subtotalForDiscount * promotion.amount) / 100;
        } else {
          invoiceData.discount = parseFloat(promotion.amount);
        }
      }
    } else {
      invoiceData.discount = 0;
    }

    // Tính tổng cộng (Grand Total) = (Tiền phòng + Dịch vụ prepaid - Discount) + Dịch vụ postpaid
    // Dịch vụ postpaid (thêm tại khách sạn) không được áp dụng voucher
    const subtotalAfterDiscount = subtotalForDiscount - invoiceData.discount;
    invoiceData.grandTotal = subtotalAfterDiscount + postpaidServicesTotal;
    
    // Lưu subtotal đầy đủ để hiển thị (tất cả items)
    invoiceData.subtotal = invoiceData.items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);

    // Tính toán thanh toán online và hoàn tiền từ bảng Payment
    if (booking.payments && booking.payments.length > 0) {
      for (const payment of booking.payments) {
        const amount = parseFloat(payment.amount || 0);
        if (payment.status === 'completed') {
          if (amount > 0 && payment.method === 'payos') {
            // Thanh toán online qua PayOS
            invoiceData.paidOnline += amount;
          }
          if (amount < 0) {
            // Hoàn tiền (amount âm)
            invoiceData.refunds += Math.abs(amount);
          }
        }
      }
    }

    // Tính số tiền thanh toán khi check-out (Amount Due)
    // = Grand Total - Đã thanh toán online - Đã hoàn tiền
    // GrandTotal bao gồm: (Tiền phòng + Dịch vụ prepaid - Discount) + Dịch vụ postpaid
    // paidOnline là số tiền đã thanh toán online (đã bao gồm discount nếu có)
    invoiceData.amountDue = invoiceData.grandTotal - invoiceData.paidOnline - invoiceData.refunds;
    
    // Nếu đã thanh toán đủ hoặc dư thì amountDue có thể <= 0
    if (invoiceData.amountDue <= 0) {
      invoiceData.amountDue = 0;
    }

    // Xác định phương thức thanh toán
    if (invoiceData.paidOnline > 0 && invoiceData.amountDue === 0) {
      invoiceData.paymentMethod = 'Đã thanh toán online (PayOS)';
    } else if (invoiceData.paidOnline > 0 && invoiceData.amountDue > 0) {
      invoiceData.paymentMethod = 'Online (PayOS) + Tiền mặt / Thẻ';
    } else {
      invoiceData.paymentMethod = 'Tiền mặt / Thẻ';
    }

    // Tạo PDF với staffName
    const pdfBuffer = await pdfService.generateInvoicePDF(booking, invoiceData, staffName);

    // Gửi email hóa đơn nếu có email
    // TODO: Bật lại tính năng gửi email hóa đơn khi cần
    // if (booking.user && booking.user.email) {
    //   try {
    //     await sendInvoiceEmail(booking, booking.user, invoiceData);
    //   } catch (emailError) {
    //     console.error('Error sending invoice email:', emailError);
    //   }
    // }

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
    
    // Lấy tên nhân viên (admin/staff) đang tạo hóa đơn từ database
    let staffName = '';
    if (req.user?.id) {
      const staffUser = await User.findByPk(req.user.id, {
        attributes: ['full_name']
      });
      staffName = staffUser?.full_name || '';
    }

    const booking = await Booking.findOne({
      where: { booking_id: id },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email', 'phone'] },
        { model: RoomType, as: 'room_type', attributes: ['room_type_id', 'room_type_name'] },
        {
          model: BookingRoom,
          as: 'booking_rooms',
          include: [{
            model: Room,
            as: 'room',
            attributes: ['room_id', 'room_num']
          }]
        },
        { 
          model: BookingService, 
          as: 'booking_services', 
          where: { status: { [Op.ne]: 'cancelled' } }, // Chỉ lấy dịch vụ chưa bị hủy
          required: false,
          include: [{ 
            model: Service, 
            as: 'service',
            attributes: ['service_id', 'name']
          }] 
        },
        { model: Payment, as: 'payments', attributes: ['payment_id', 'amount', 'method', 'status'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // ========== TẠO DỮ LIỆU HÓA ĐƠN (giống generateInvoicePDF) ==========
    const invoiceData = {
      items: [],
      subtotal: 0,
      discount: 0,
      grandTotal: 0,
      paidOnline: 0,
      refunds: 0,
      amountDue: 0,
      paymentMethod: 'Tiền mặt / Thẻ'
    };

    // 1. Tiền phòng (Accommodation)
    // booking.total_price đã chỉ chứa tiền phòng thuần (không bao gồm dịch vụ prepaid)
    const nights = moment(booking.check_out_date).diff(moment(booking.check_in_date), 'days');
    const numRooms = booking.booking_rooms?.length || 1;
    const accommodationTotal = parseFloat(booking.total_price || 0);
    const roomPricePerNight = numRooms > 0 && nights > 0 ? accommodationTotal / (nights * numRooms) : 0;
    
    invoiceData.items.push({
      name: `Tiền phòng (Accommodation) - ${booking.room_type?.room_type_name || 'N/A'}`,
      quantity: nights,
      unitPrice: roomPricePerNight * numRooms,
      total: accommodationTotal
    });

    // 2. Dịch vụ (Services) - Hiển thị tất cả dịch vụ (cả prepaid và postpaid)
    let postpaidServicesTotal = 0; // Tổng dịch vụ postpaid (thêm tại khách sạn, không áp dụng voucher)
    if (booking.booking_services && booking.booking_services.length > 0) {
      for (const bookingService of booking.booking_services) {
        const serviceName = bookingService.service?.name || 'Dịch vụ';
        const paymentType = bookingService.payment_type || 'prepaid';
        const paymentNote = paymentType === 'prepaid' ? ' (Đã trả trước)' : '';
        const serviceTotal = parseFloat(bookingService.total_price || 0);
        
        invoiceData.items.push({
          name: `${serviceName}${paymentNote}`,
          quantity: bookingService.quantity,
          unitPrice: parseFloat(bookingService.unit_price || 0),
          total: serviceTotal
        });
        
        // Tính tổng dịch vụ postpaid (thêm tại khách sạn)
        if (paymentType === 'postpaid') {
          postpaidServicesTotal += serviceTotal;
        }
      }
    }

    // Tính tổng chi phí (Subtotal) - CHỈ tính tiền phòng + dịch vụ prepaid (để áp dụng voucher)
    // Dịch vụ postpaid (thêm tại khách sạn) KHÔNG được áp dụng voucher
    let prepaidServicesTotal = 0;
    if (booking.booking_services && booking.booking_services.length > 0) {
      prepaidServicesTotal = booking.booking_services
        .filter(bs => bs.payment_type === 'prepaid')
        .reduce((sum, bs) => sum + parseFloat(bs.total_price || 0), 0);
    }
    const subtotalForDiscount = accommodationTotal + prepaidServicesTotal;
    
    // Áp dụng giảm giá nếu có (CHỈ áp dụng trên tiền phòng + dịch vụ prepaid)
    // Voucher chỉ áp dụng khi thanh toán trên web, không áp dụng cho dịch vụ thêm tại khách sạn
    if (booking.promotion_id) {
      const promotion = await Promotion.findByPk(booking.promotion_id);
      if (promotion) {
        if (promotion.discount_type === 'percentage') {
          invoiceData.discount = (subtotalForDiscount * promotion.amount) / 100;
        } else {
          invoiceData.discount = parseFloat(promotion.amount);
        }
      }
    } else {
      invoiceData.discount = 0;
    }

    // Tính tổng cộng (Grand Total) = (Tiền phòng + Dịch vụ prepaid - Discount) + Dịch vụ postpaid
    // Dịch vụ postpaid (thêm tại khách sạn) không được áp dụng voucher
    const subtotalAfterDiscount = subtotalForDiscount - invoiceData.discount;
    invoiceData.grandTotal = subtotalAfterDiscount + postpaidServicesTotal;
    
    // Lưu subtotal đầy đủ để hiển thị (tất cả items)
    invoiceData.subtotal = invoiceData.items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);

    // Tính toán thanh toán online và hoàn tiền từ bảng Payment
    if (booking.payments && booking.payments.length > 0) {
      for (const payment of booking.payments) {
        const amount = parseFloat(payment.amount || 0);
        if (payment.status === 'completed') {
          if (amount > 0 && payment.method === 'payos') {
            invoiceData.paidOnline += amount;
          }
          if (amount < 0) {
            invoiceData.refunds += Math.abs(amount);
          }
        }
      }
    }

    // Tính số tiền thanh toán khi check-out (Amount Due)
    // = Grand Total - Đã thanh toán online - Đã hoàn tiền
    // GrandTotal bao gồm: (Tiền phòng + Dịch vụ prepaid - Discount) + Dịch vụ postpaid
    // paidOnline là số tiền đã thanh toán online (đã bao gồm discount nếu có)
    invoiceData.amountDue = invoiceData.grandTotal - invoiceData.paidOnline - invoiceData.refunds;
    
    if (invoiceData.amountDue <= 0) {
      invoiceData.amountDue = 0;
    }

    // Xác định phương thức thanh toán
    if (invoiceData.paidOnline > 0 && invoiceData.amountDue === 0) {
      invoiceData.paymentMethod = 'Đã thanh toán online (PayOS)';
    } else if (invoiceData.paidOnline > 0 && invoiceData.amountDue > 0) {
      invoiceData.paymentMethod = 'Online (PayOS) + Tiền mặt / Thẻ';
    } else {
      invoiceData.paymentMethod = 'Tiền mặt / Thẻ';
    }

    // Tạo HTML với staffName
    const htmlContent = pdfService.generateInvoiceHTML(booking, invoiceData, staffName);
    
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

    // Kiểm tra phòng có bị conflict không (kiểm tra qua BookingRoom)
    const conflictingBookingRooms = await BookingRoom.findAll({
      include: [{
        model: Booking,
        as: 'booking',
        where: {
          booking_status: { [Op.in]: ['confirmed', 'checked_in'] },
          [Op.or]: [
            {
              check_in_date: { [Op.lte]: checkOut.format('YYYY-MM-DD') },
              check_out_date: { [Op.gte]: checkIn.format('YYYY-MM-DD') }
            }
          ]
        }
      }],
      where: { room_id }
    });

    if (conflictingBookingRooms.length > 0) {
      return res.status(400).json({ message: 'Phòng đã được đặt trong khoảng thời gian này' });
    }

    // Lấy giá phòng (đảm bảo bản ghi giá bao phủ toàn bộ khoảng ngày ở)
    const roomPrice = await RoomPrice.findOne({
      where: {
        room_type_id: room.room_type_id,
        start_date: { [Op.lte]: checkIn.format('YYYY-MM-DD') },
        end_date: { [Op.gte]: checkOut.clone().subtract(1, 'day').format('YYYY-MM-DD') }
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

    // Tạo booking với status confirmed và payment_status pending (không gán room_id trực tiếp)
    const booking = await Booking.create({
      user_id,
      room_type_id: room.room_type_id,
      room_id: null, // Không gán room_id trực tiếp, dùng BookingRoom
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

    // Tạo BookingRoom để gán phòng
    const assignTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    await BookingRoom.create({
      booking_id: booking.booking_id,
      room_id: room_id,
      assigned_at: assignTime
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
