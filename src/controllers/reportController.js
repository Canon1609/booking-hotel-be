const { Op, Sequelize } = require('sequelize');
const moment = require('moment-timezone');
const { Booking, Room, RoomType, RoomPrice, User, Service, BookingService, BookingRoom, Promotion, Payment, Hotel } = require('../models');
const excelService = require('../utils/excel.util');
const pdfService = require('../utils/pdf.util');

// ========== 1. BÁO CÁO DOANH THU (REVENUE REPORTS) - EXCEL ==========

// 1.1. Xuất báo cáo doanh thu tổng quan
exports.exportRevenueReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp start_date và end_date (format: YYYY-MM-DD)' 
      });
    }

    const startDate = moment(start_date).tz('Asia/Ho_Chi_Minh').startOf('day');
    const endDate = moment(end_date).tz('Asia/Ho_Chi_Minh').endOf('day');

    // Lấy tất cả booking trong khoảng thời gian (bao gồm cả cancelled để tính phí hủy)
    const bookings = await Booking.findAll({
      where: {
        created_at: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        },
        booking_status: {
          [Op.in]: ['confirmed', 'checked_in', 'checked_out', 'cancelled']
        }
      },
      include: [
        { model: RoomType, as: 'room_type' },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] },
        { model: Payment, as: 'payments', where: { status: 'completed' }, required: false }
      ]
    });

    // Tính toán doanh thu
    let totalRevenue = 0; // Tổng doanh thu thực tế thu được
    let totalRefunded = 0; // Tổng tiền đã hoàn lại
    let accommodationRevenue = 0; // Tiền phòng thu được (chỉ booking không cancelled)
    let serviceRevenue = 0; // Tiền dịch vụ thu được (chỉ booking không cancelled)
    let cancellationFeeRevenue = 0; // Phí hủy (từ booking cancelled)
    let onlineRevenue = 0; // Doanh thu từ booking online
    let walkinRevenue = 0; // Doanh thu từ booking walk-in

    const revenueByDate = {}; // Lưu doanh thu theo ngày

    for (const booking of bookings) {
      // Tính tổng tiền đã thanh toán (payments dương) và đã hoàn lại (payments âm) cho booking này
      let bookingPaid = 0; // Tổng tiền đã thanh toán cho booking này
      let bookingRefunded = 0; // Tổng tiền đã hoàn lại cho booking này
      
      if (booking.payments && booking.payments.length > 0) {
        for (const payment of booking.payments) {
          const amount = parseFloat(payment.amount || 0);
          if (amount > 0) {
            bookingPaid += amount;
          } else if (amount < 0) {
            // Payment âm là refund (hoàn tiền)
            bookingRefunded += Math.abs(amount);
          }
        }
      }
      
      // Cộng vào tổng đã hoàn lại toàn hệ thống
      totalRefunded += bookingRefunded;
      
      // Tính tổng tiền dịch vụ (cả prepaid và postpaid)
      let totalServicesAmount = 0;
      let postpaidServicesAmount = 0; // Dịch vụ postpaid (thêm tại khách sạn, thanh toán tiền mặt)
      if (booking.booking_services && booking.booking_services.length > 0) {
        for (const bs of booking.booking_services) {
          if (bs.status !== 'cancelled') {
            const serviceAmount = parseFloat(bs.total_price || 0);
            totalServicesAmount += serviceAmount;
            // Dịch vụ postpaid không có payment record (thanh toán tiền mặt khi checkout)
            if (bs.payment_type === 'postpaid') {
              postpaidServicesAmount += serviceAmount;
            }
          }
        }
      }
      
      // ========== TÍNH DOANH THU THEO TỪNG LOẠI ==========
      
      if (booking.booking_status === 'cancelled') {
        // ========== BOOKING BỊ HỦY: CHỈ TÍNH PHÍ HỦY ==========
        // Phí hủy = Số tiền đã thanh toán - Số tiền hoàn lại
        // Đây là doanh thu từ việc giữ lại một phần tiền khi khách hủy
        // Với booking cancelled, chỉ tính từ payments (không cộng dịch vụ postpaid vì đã hủy)
        const cancellationFee = bookingPaid - bookingRefunded;
        if (cancellationFee > 0) {
          cancellationFeeRevenue += cancellationFee;
          totalRevenue += cancellationFee;
          
          // Phân loại theo kênh
          if (booking.booking_type === 'online') {
            onlineRevenue += cancellationFee;
          } else {
            walkinRevenue += cancellationFee;
          }
          
          // Lưu theo ngày
          const bookingDate = moment(booking.created_at).format('YYYY-MM-DD');
          if (!revenueByDate[bookingDate]) {
            revenueByDate[bookingDate] = 0;
          }
          revenueByDate[bookingDate] += cancellationFee;
        }
      } else {
        // ========== BOOKING KHÔNG BỊ HỦY: TÍNH DOANH THU BÌNH THƯỜNG ==========
        
        // Tính tổng tiền thực tế thu được từ booking này
        // Bao gồm: tiền phòng + dịch vụ (cả prepaid và postpaid) - refunds
        let bookingTotalPaid = bookingPaid; // Từ payments
        
        // Nếu không có payment record (walk-in hoặc booking cũ) thì tính từ booking + dịch vụ
        if (bookingTotalPaid === 0) {
          // Tính tổng: tiền phòng + dịch vụ (cả prepaid và postpaid)
          const roomAmount = parseFloat(booking.total_price || 0);
          bookingTotalPaid = roomAmount + totalServicesAmount;
        } else {
          // Nếu có payment record, có thể chưa bao gồm dịch vụ postpaid
          // Payment record chỉ bao gồm: tiền phòng + dịch vụ prepaid - discount
          // Cần cộng thêm dịch vụ postpaid (thanh toán tiền mặt, không có payment record)
          bookingTotalPaid = bookingTotalPaid + postpaidServicesAmount;
        }
        
        // 1. Doanh thu tiền phòng (Accommodation Revenue)
        // = Tổng tiền phòng thuần từ booking (không bao gồm dịch vụ)
        // Đây là số tiền phòng thực tế thu được (từ booking không cancelled)
        const accommodationAmount = parseFloat(booking.total_price || 0);
        accommodationRevenue += accommodationAmount;

        // 2. Doanh thu dịch vụ (Service Revenue)
        // = Tổng tiền dịch vụ (cả prepaid và postpaid, chỉ tính dịch vụ không bị hủy)
        // Đây là số tiền dịch vụ thực tế thu được (từ booking không cancelled)
        if (booking.booking_services && booking.booking_services.length > 0) {
          for (const bs of booking.booking_services) {
            if (bs.status !== 'cancelled') {
              serviceRevenue += parseFloat(bs.total_price || 0);
            }
          }
        }

        // 3. Tổng doanh thu từ booking này (số tiền thực tế thu được)
        // = Tổng đã thanh toán - Tổng đã hoàn lại (nếu có refund)
        // bookingTotalPaid đã bao gồm: tiền phòng + dịch vụ prepaid (từ payments) + dịch vụ postpaid (cộng thêm)
        const bookingRevenue = bookingTotalPaid - bookingRefunded;
        
        if (bookingRevenue > 0) {
          totalRevenue += bookingRevenue;

          // Phân loại theo kênh
          if (booking.booking_type === 'online') {
            onlineRevenue += bookingRevenue;
          } else {
            walkinRevenue += bookingRevenue;
          }

          // Lưu theo ngày
          const bookingDate = moment(booking.created_at).format('YYYY-MM-DD');
          if (!revenueByDate[bookingDate]) {
            revenueByDate[bookingDate] = 0;
          }
          revenueByDate[bookingDate] += bookingRevenue;
        }
      }
    }

    // Tạo Excel
    const workbook = excelService.createWorkbook();
    const worksheet = workbook.addWorksheet('Báo cáo Doanh thu');

    // Header
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = `BÁO CÁO DOANH THU - BEAN HOTEL`;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Từ ${startDate.format('DD/MM/YYYY')} đến ${endDate.format('DD/MM/YYYY')}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Tổng quan
    worksheet.getCell('A4').value = 'TỔNG QUAN DOANH THU';
    worksheet.getCell('A4').font = { bold: true, size: 14 };
    
    // Giải thích ý nghĩa từng loại doanh thu:
    // - Tổng Doanh thu: Tổng số tiền thực tế thu được từ tất cả booking (đã thanh toán - đã hoàn lại)
    // - Tổng đã hoàn lại: Tổng số tiền đã hoàn lại cho khách hàng (refunds)
    // - Doanh thu Tiền phòng: Tổng tiền phòng thuần thu được (chỉ booking không bị hủy)
    // - Doanh thu Dịch vụ: Tổng tiền dịch vụ thu được (cả prepaid và postpaid, chỉ booking không bị hủy)
    // - Doanh thu Phí hủy: Số tiền giữ lại từ booking bị hủy (đã thanh toán - đã hoàn lại)
    const summaryRows = [
      ['Tổng Doanh thu (Tổng số tiền thực tế thu được từ tất cả booking)', totalRevenue],
      ['Tổng đã hoàn lại (Tổng số tiền đã hoàn lại cho khách hàng)', totalRefunded],
      ['Doanh thu Tiền phòng (Tiền phòng thuần thu được - Chỉ booking không bị hủy)', accommodationRevenue],
      ['Doanh thu Dịch vụ (Tiền dịch vụ thu được - Cả prepaid và postpaid)', serviceRevenue],
      ['Doanh thu Phí hủy (Số tiền giữ lại từ booking bị hủy)', cancellationFeeRevenue]
    ];

    worksheet.addRows([
      [],
      ['Chỉ số', 'Giá trị (VNĐ)'],
      ...summaryRows
    ]);

    // Format header row
    const headerRow = worksheet.getRow(6);
    excelService.formatHeaderRow(worksheet, headerRow);

    // Format số tiền (5 dòng: Tổng Doanh thu, Tổng đã hoàn lại, Tiền phòng, Dịch vụ, Phí hủy)
    for (let i = 7; i <= 11; i++) {
      const cell = worksheet.getCell(`B${i}`);
      excelService.formatCurrencyCell(cell);
    }

    // Phân tích doanh thu
    worksheet.addRows([
      [],
      ['PHÂN TÍCH DOANH THU', ''],
      ['Tiền phòng (Accommodation - Chỉ booking không bị hủy)', accommodationRevenue],
      ['Tiền dịch vụ (Services - Cả prepaid và postpaid)', serviceRevenue],
      ['Tiền phạt hủy phòng (Cancellation Fee - Từ booking bị hủy)', cancellationFeeRevenue]
    ]);

    const analysisStartRow = 13;
    for (let i = analysisStartRow; i <= 15; i++) {
      const cell = worksheet.getCell(`B${i}`);
      excelService.formatCurrencyCell(cell);
    }

    // Doanh thu theo kênh
    worksheet.addRows([
      [],
      ['DOANH THU THEO KÊNH', ''],
      ['Online (Đặt web - Tổng doanh thu từ booking online)', onlineRevenue],
      ['Trực tiếp (Walk-in - Tổng doanh thu từ booking tại quầy)', walkinRevenue]
    ]);

    const channelStartRow = 18;
    for (let i = channelStartRow; i <= 19; i++) {
      const cell = worksheet.getCell(`B${i}`);
      excelService.formatCurrencyCell(cell);
    }

    // Doanh thu theo ngày
    worksheet.addRows([
      [],
      ['DOANH THU THEO NGÀY', ''],
      ['Ngày', 'Doanh thu (VNĐ) (Tổng số tiền thực tế thu được trong ngày)']
    ]);

    const dateHeaderRow = worksheet.getRow(22);
    excelService.formatHeaderRow(worksheet, dateHeaderRow);

    const sortedDates = Object.keys(revenueByDate).sort();
    let currentRow = 23;
    for (const date of sortedDates) {
      worksheet.addRow([
        moment(date).format('DD/MM/YYYY'),
        revenueByDate[date]
      ]);
      excelService.formatCurrencyCell(worksheet.getCell(`B${currentRow}`));
      currentRow++;
    }

    // Set column widths
    worksheet.getColumn('A').width = 30;
    worksheet.getColumn('B').width = 25;

    // Export
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-doanh-thu-${startDate.format('YYYY-MM-DD')}-${endDate.format('YYYY-MM-DD')}.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting revenue report:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// 1.2. Xuất báo cáo doanh thu PDF
exports.exportRevenueReportPDF = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp start_date và end_date (format: YYYY-MM-DD)' 
      });
    }

    const startDate = moment(start_date).tz('Asia/Ho_Chi_Minh').startOf('day');
    const endDate = moment(end_date).tz('Asia/Ho_Chi_Minh').endOf('day');

    // Lấy tất cả booking trong khoảng thời gian (bao gồm cả cancelled để tính phí hủy)
    const bookings = await Booking.findAll({
      where: {
        created_at: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        },
        booking_status: {
          [Op.in]: ['confirmed', 'checked_in', 'checked_out', 'cancelled']
        }
      },
      include: [
        { model: RoomType, as: 'room_type' },
        { model: BookingService, as: 'booking_services', include: [{ model: Service, as: 'service' }] },
        { model: Payment, as: 'payments', where: { status: 'completed' }, required: false }
      ]
    });

    // Tính toán doanh thu (sử dụng lại logic từ exportRevenueReport)
    let totalRevenue = 0; // Tổng doanh thu thực tế thu được
    let totalRefunded = 0; // Tổng tiền đã hoàn lại
    let accommodationRevenue = 0; // Tiền phòng thu được (chỉ booking không cancelled)
    let serviceRevenue = 0; // Tiền dịch vụ thu được (chỉ booking không cancelled)
    let cancellationFeeRevenue = 0; // Phí hủy (từ booking cancelled)
    let onlineRevenue = 0; // Doanh thu từ booking online
    let walkinRevenue = 0; // Doanh thu từ booking walk-in

    const revenueByDate = {}; // Lưu doanh thu theo ngày

    for (const booking of bookings) {
      // Tính tổng tiền đã thanh toán (payments dương) và đã hoàn lại (payments âm) cho booking này
      let bookingPaid = 0; // Tổng tiền đã thanh toán cho booking này
      let bookingRefunded = 0; // Tổng tiền đã hoàn lại cho booking này
      
      if (booking.payments && booking.payments.length > 0) {
        for (const payment of booking.payments) {
          const amount = parseFloat(payment.amount || 0);
          if (amount > 0) {
            bookingPaid += amount;
          } else if (amount < 0) {
            // Payment âm là refund (hoàn tiền)
            bookingRefunded += Math.abs(amount);
          }
        }
      }
      
      // Cộng vào tổng đã hoàn lại toàn hệ thống
      totalRefunded += bookingRefunded;
      
      // Tính tổng tiền dịch vụ (cả prepaid và postpaid)
      let totalServicesAmount = 0;
      let postpaidServicesAmount = 0; // Dịch vụ postpaid (thêm tại khách sạn, thanh toán tiền mặt)
      if (booking.booking_services && booking.booking_services.length > 0) {
        for (const bs of booking.booking_services) {
          if (bs.status !== 'cancelled') {
            const serviceAmount = parseFloat(bs.total_price || 0);
            totalServicesAmount += serviceAmount;
            // Dịch vụ postpaid không có payment record (thanh toán tiền mặt khi checkout)
            if (bs.payment_type === 'postpaid') {
              postpaidServicesAmount += serviceAmount;
            }
          }
        }
      }
      
      // ========== TÍNH DOANH THU THEO TỪNG LOẠI ==========
      
      if (booking.booking_status === 'cancelled') {
        // ========== BOOKING BỊ HỦY: CHỈ TÍNH PHÍ HỦY ==========
        const cancellationFee = bookingPaid - bookingRefunded;
        if (cancellationFee > 0) {
          cancellationFeeRevenue += cancellationFee;
          totalRevenue += cancellationFee;
          
          // Phân loại theo kênh
          if (booking.booking_type === 'online') {
            onlineRevenue += cancellationFee;
          } else {
            walkinRevenue += cancellationFee;
          }
          
          // Lưu theo ngày
          const bookingDate = moment(booking.created_at).format('YYYY-MM-DD');
          if (!revenueByDate[bookingDate]) {
            revenueByDate[bookingDate] = 0;
          }
          revenueByDate[bookingDate] += cancellationFee;
        }
      } else {
        // ========== BOOKING KHÔNG BỊ HỦY: TÍNH DOANH THU BÌNH THƯỜNG ==========
        
        // Tính tổng tiền thực tế thu được từ booking này
        let bookingTotalPaid = bookingPaid; // Từ payments
        
        // Nếu không có payment record (walk-in hoặc booking cũ) thì tính từ booking + dịch vụ
        if (bookingTotalPaid === 0) {
          // Tính tổng: tiền phòng + dịch vụ (cả prepaid và postpaid)
          const roomAmount = parseFloat(booking.total_price || 0);
          bookingTotalPaid = roomAmount + totalServicesAmount;
        } else {
          // Nếu có payment record, có thể chưa bao gồm dịch vụ postpaid
          // Payment record chỉ bao gồm: tiền phòng + dịch vụ prepaid - discount
          // Cần cộng thêm dịch vụ postpaid (thanh toán tiền mặt, không có payment record)
          bookingTotalPaid = bookingTotalPaid + postpaidServicesAmount;
        }
        
        // 1. Doanh thu tiền phòng (Accommodation Revenue)
        const accommodationAmount = parseFloat(booking.total_price || 0);
        accommodationRevenue += accommodationAmount;

        // 2. Doanh thu dịch vụ (Service Revenue)
        if (booking.booking_services && booking.booking_services.length > 0) {
          for (const bs of booking.booking_services) {
            if (bs.status !== 'cancelled') {
              serviceRevenue += parseFloat(bs.total_price || 0);
            }
          }
        }

        // 3. Tổng doanh thu từ booking này (số tiền thực tế thu được)
        const bookingRevenue = bookingTotalPaid - bookingRefunded;
        
        if (bookingRevenue > 0) {
          totalRevenue += bookingRevenue;

          // Phân loại theo kênh
          if (booking.booking_type === 'online') {
            onlineRevenue += bookingRevenue;
          } else {
            walkinRevenue += bookingRevenue;
          }

          // Lưu theo ngày
          const bookingDate = moment(booking.created_at).format('YYYY-MM-DD');
          if (!revenueByDate[bookingDate]) {
            revenueByDate[bookingDate] = 0;
          }
          revenueByDate[bookingDate] += bookingRevenue;
        }
      }
    }

    // Tạo PDF
    const reportData = {
      startDate,
      endDate,
      totalRevenue,
      totalRefunded,
      accommodationRevenue,
      serviceRevenue,
      cancellationFeeRevenue,
      onlineRevenue,
      walkinRevenue,
      revenueByDate
    };

    const pdfBuffer = await pdfService.generateRevenueReportPDF(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-doanh-thu-${startDate.format('YYYY-MM-DD')}-${endDate.format('YYYY-MM-DD')}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting revenue report PDF:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// ========== 2. BÁO CÁO CÔNG SUẤT PHÒNG (OCCUPANCY REPORTS) - EXCEL ==========

// 2.1. Xuất báo cáo công suất phòng
exports.exportOccupancyReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Vui lòng cung cấp start_date và end_date (format: YYYY-MM-DD)' 
      });
    }

    const startDate = moment(start_date).tz('Asia/Ho_Chi_Minh').startOf('day');
    const endDate = moment(end_date).tz('Asia/Ho_Chi_Minh').endOf('day');

    // Lấy tất cả phòng
    const allRooms = await Room.findAll({
      include: [{ model: RoomType, as: 'room_type' }]
    });
    const totalRooms = allRooms.length;

    // Lấy các booking trong khoảng thời gian
    const bookings = await Booking.findAll({
      where: {
        [Op.or]: [
          {
            check_in_date: { [Op.lte]: endDate.format('YYYY-MM-DD') },
            check_out_date: { [Op.gte]: startDate.format('YYYY-MM-DD') }
          }
        ],
        booking_status: {
          [Op.in]: ['confirmed', 'checked_in', 'checked_out']
        }
      },
      include: [
        { model: BookingRoom, as: 'booking_rooms', include: [{ model: Room, as: 'room' }] },
        { model: RoomType, as: 'room_type' }
      ]
    });

    // Tính toán
    let totalRoomNightsSold = 0;
    let totalAccommodationRevenue = 0;
    const occupancyByDate = {}; // Lưu occupancy rate theo ngày

    // Tính số đêm phòng đã bán
    for (const booking of bookings) {
      const checkIn = moment(booking.check_in_date);
      const checkOut = moment(booking.check_out_date);
      const nights = checkOut.diff(checkIn, 'days');
      const numRooms = booking.booking_rooms?.length || 1;
      
      totalRoomNightsSold += nights * numRooms;
      totalAccommodationRevenue += parseFloat(booking.total_price || 0);

      // Tính occupancy theo từng ngày
      let currentDate = checkIn.clone();
      while (currentDate.isBefore(checkOut)) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        if (!occupancyByDate[dateStr]) {
          occupancyByDate[dateStr] = { sold: 0, total: totalRooms };
        }
        occupancyByDate[dateStr].sold += numRooms;
        currentDate.add(1, 'day');
      }
    }

    // Tính RevPAR
    const totalDays = endDate.diff(startDate, 'days') + 1;
    const revPAR = totalAccommodationRevenue / (totalRooms * totalDays);

    // Tính Occupancy Rate trung bình
    let totalOccupancyRate = 0;
    let dateCount = 0;
    for (const dateStr in occupancyByDate) {
      const data = occupancyByDate[dateStr];
      const rate = (data.sold / data.total) * 100;
      totalOccupancyRate += rate;
      dateCount++;
    }
    const avgOccupancyRate = dateCount > 0 ? totalOccupancyRate / dateCount : 0;

    // Tạo Excel
    const workbook = excelService.createWorkbook();
    const worksheet = workbook.addWorksheet('Báo cáo Công suất');

    // Header
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = `BÁO CÁO CÔNG SUẤT PHÒNG - BEAN HOTEL`;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = `Từ ${startDate.format('DD/MM/YYYY')} đến ${endDate.format('DD/MM/YYYY')}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Tổng quan
    worksheet.addRows([
      [],
      ['CHỈ SỐ CÔNG SUẤT', ''],
      ['Chỉ số', 'Giá trị'],
      ['Tổng số phòng', totalRooms],
      ['Số đêm phòng đã bán (Room Nights Sold)', totalRoomNightsSold],
      ['Tỷ lệ Lấp đầy trung bình (Occupancy Rate)', `${avgOccupancyRate.toFixed(2)}%`],
      ['RevPAR (Revenue Per Available Room)', revPAR]
    ]);

    // Format
    const headerRow = worksheet.getRow(5);
    excelService.formatHeaderRow(worksheet, headerRow);

    // Format RevPAR
    excelService.formatCurrencyCell(worksheet.getCell('C9'));

    // Chi tiết theo ngày
    worksheet.addRows([
      [],
      ['CHI TIẾT THEO NGÀY', '', '', ''],
      ['Ngày', 'Số phòng đã bán', 'Tổng số phòng', 'Tỷ lệ Lấp đầy (%)']
    ]);

    const dateHeaderRow = worksheet.getRow(12);
    excelService.formatHeaderRow(worksheet, dateHeaderRow);

    const sortedDates = Object.keys(occupancyByDate).sort();
    let currentRow = 13;
    for (const dateStr of sortedDates) {
      const data = occupancyByDate[dateStr];
      const rate = (data.sold / data.total) * 100;
      worksheet.addRow([
        moment(dateStr).format('DD/MM/YYYY'),
        data.sold,
        data.total,
        `${rate.toFixed(2)}%`
      ]);
      currentRow++;
    }

    // Set column widths
    worksheet.getColumn('A').width = 25;
    worksheet.getColumn('B').width = 20;
    worksheet.getColumn('C').width = 20;
    worksheet.getColumn('D').width = 20;

    // Export
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-cong-suat-${startDate.format('YYYY-MM-DD')}-${endDate.format('YYYY-MM-DD')}.xlsx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting occupancy report:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// ========== 3. BÁO CÁO VẬN HÀNH (OPERATIONAL REPORTS) - PDF ==========

// 3.1. Danh sách khách đến (Arrival List)
exports.exportArrivalList = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? moment(date).tz('Asia/Ho_Chi_Minh') : moment().tz('Asia/Ho_Chi_Minh');

    // Lấy các booking check-in hôm nay
    const arrivals = await Booking.findAll({
      where: {
        check_in_date: targetDate.format('YYYY-MM-DD'),
        booking_status: {
          [Op.in]: ['confirmed', 'checked_in']
        }
      },
      include: [
        { model: User, as: 'user', attributes: ['full_name', 'phone', 'email'] },
        { model: RoomType, as: 'room_type' },
        { 
          model: BookingRoom, 
          as: 'booking_rooms',
          include: [{ model: Room, as: 'room', attributes: ['room_num'] }]
        }
      ],
      order: [['check_in_date', 'ASC']]
    });

    // Tạo PDF
    const pdfBuffer = await pdfService.generateArrivalListPDF(arrivals, targetDate);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="danh-sach-khach-den-${targetDate.format('YYYY-MM-DD')}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting arrival list:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// 3.2. Danh sách khách đi (Departure List)
exports.exportDepartureList = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? moment(date).tz('Asia/Ho_Chi_Minh') : moment().tz('Asia/Ho_Chi_Minh');

    // Lấy các booking check-out hôm nay
    const departures = await Booking.findAll({
      where: {
        check_out_date: targetDate.format('YYYY-MM-DD'),
        booking_status: {
          [Op.in]: ['checked_in', 'checked_out']
        }
      },
      include: [
        { model: User, as: 'user', attributes: ['full_name', 'phone', 'email'] },
        { model: RoomType, as: 'room_type' },
        { 
          model: BookingRoom, 
          as: 'booking_rooms',
          include: [{ model: Room, as: 'room', attributes: ['room_num'] }]
        }
      ],
      order: [['check_out_date', 'ASC']]
    });

    // Tạo PDF
    const pdfBuffer = await pdfService.generateDepartureListPDF(departures, targetDate);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="danh-sach-khach-di-${targetDate.format('YYYY-MM-DD')}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting departure list:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

// 3.3. Báo cáo tình trạng phòng (Room Status Report)
exports.exportRoomStatusReport = async (req, res) => {
  try {
    // Lấy tất cả phòng
    const rooms = await Room.findAll({
      include: [
        { model: RoomType, as: 'room_type', attributes: ['room_type_name'] },
        { model: Hotel, as: 'hotel', attributes: ['name'] }
      ],
      order: [['room_num', 'ASC']]
    });

    // Nhóm theo status
    const roomsByStatus = {
      available: [],
      booked: [],
      in_use: [],
      checked_out: [],
      cleaning: []
    };

    rooms.forEach(room => {
      if (roomsByStatus[room.status]) {
        roomsByStatus[room.status].push(room);
      }
    });

    // Tạo PDF
    const pdfBuffer = await pdfService.generateRoomStatusReportPDF(roomsByStatus, rooms.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-tinh-trang-phong-${moment().format('YYYY-MM-DD')}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting room status report:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

