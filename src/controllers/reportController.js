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
    let totalRevenue = 0;
    let accommodationRevenue = 0;
    let serviceRevenue = 0;
    let cancellationFeeRevenue = 0;
    let onlineRevenue = 0;
    let walkinRevenue = 0;

    const revenueByDate = {}; // Lưu doanh thu theo ngày

    for (const booking of bookings) {
      // Tính tổng tiền đã thanh toán (payments dương)
      let totalPaid = 0;
      let totalRefunded = 0;
      
      if (booking.payments && booking.payments.length > 0) {
        for (const payment of booking.payments) {
          const amount = parseFloat(payment.amount || 0);
          if (amount > 0) {
            totalPaid += amount;
          } else if (amount < 0) {
            // Payment âm là refund
            totalRefunded += Math.abs(amount);
          }
        }
      }
      
      // Nếu không có payment thì dùng final_price hoặc total_price
      if (totalPaid === 0 && booking.booking_status !== 'cancelled') {
        totalPaid = parseFloat(booking.final_price || booking.total_price || 0);
      }

      // Doanh thu tiền phòng (chỉ tính booking không bị hủy)
      if (booking.booking_status !== 'cancelled') {
        const accommodationAmount = parseFloat(booking.total_price || 0);
        accommodationRevenue += accommodationAmount;
      }

      // Doanh thu dịch vụ (chỉ tính các dịch vụ không bị hủy)
      if (booking.booking_services && booking.booking_services.length > 0) {
        for (const bs of booking.booking_services) {
          if (bs.status !== 'cancelled') {
            serviceRevenue += parseFloat(bs.total_price || 0);
          }
        }
      }

      // Doanh thu từ phí hủy (chỉ tính cho booking cancelled)
      // Phí hủy = Số tiền đã thanh toán - Số tiền hoàn lại
      if (booking.booking_status === 'cancelled' && totalPaid > 0) {
        const cancellationFee = totalPaid - totalRefunded;
        if (cancellationFee > 0) {
          cancellationFeeRevenue += cancellationFee;
        }
      }

      // Tổng doanh thu từ booking này = Tổng đã thanh toán - Tổng đã hoàn lại
      // Đối với booking cancelled: doanh thu = phí hủy
      // Đối với booking khác: doanh thu = tổng đã thanh toán - tổng đã hoàn lại
      let bookingRevenue = 0;
      if (booking.booking_status === 'cancelled') {
        // Doanh thu từ booking cancelled = phí hủy
        bookingRevenue = totalPaid - totalRefunded;
      } else {
        // Doanh thu từ booking bình thường = tổng đã thanh toán - tổng đã hoàn lại
        bookingRevenue = totalPaid - totalRefunded;
      }

      // Chỉ tính doanh thu dương
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
    
    const summaryRows = [
      ['Tổng Doanh thu', totalRevenue],
      ['Doanh thu Tiền phòng', accommodationRevenue],
      ['Doanh thu Dịch vụ', serviceRevenue],
      ['Doanh thu Phí hủy', cancellationFeeRevenue]
    ];

    worksheet.addRows([
      [],
      ['Chỉ số', 'Giá trị (VNĐ)'],
      ...summaryRows
    ]);

    // Format header row
    const headerRow = worksheet.getRow(6);
    excelService.formatHeaderRow(worksheet, headerRow);

    // Format số tiền
    for (let i = 7; i <= 10; i++) {
      const cell = worksheet.getCell(`B${i}`);
      excelService.formatCurrencyCell(cell);
    }

    // Phân tích doanh thu
    worksheet.addRows([
      [],
      ['PHÂN TÍCH DOANH THU', ''],
      ['Tiền phòng (Accommodation)', accommodationRevenue],
      ['Tiền dịch vụ (Services)', serviceRevenue],
      ['Tiền phạt hủy phòng', cancellationFeeRevenue]
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
      ['Online (Đặt web)', onlineRevenue],
      ['Trực tiếp (Walk-in)', walkinRevenue]
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
      ['Ngày', 'Doanh thu (VNĐ)']
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

