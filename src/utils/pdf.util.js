const puppeteer = require('puppeteer');
const moment = require('moment-timezone');

class PDFService {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('PDF service initialized successfully');
    } catch (error) {
      console.error('PDF service initialization failed:', error);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Tạo hóa đơn PDF
  async generateInvoicePDF(booking, invoiceData, staffName = '') {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      
      // Tạo HTML cho hóa đơn
      const htmlContent = this.generateInvoiceHTML(booking, invoiceData, staffName);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Tạo PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      await page.close();
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  // Tạo HTML cho hóa đơn
  generateInvoiceHTML(booking, invoiceData, staffName = '') {
    const currentDate = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    const checkInDate = booking.check_in_time 
      ? moment(booking.check_in_time).format('DD/MM/YYYY HH:mm')
      : moment(booking.check_in_date).format('DD/MM/YYYY') + ' 14:00';
    const checkOutDate = booking.check_out_time 
      ? moment(booking.check_out_time).format('DD/MM/YYYY HH:mm')
      : moment(booking.check_out_date).format('DD/MM/YYYY') + ' 12:00';
    
    // Lấy danh sách số phòng
    const roomNumbers = booking.booking_rooms?.map(br => 
      br.room?.room_num || br.room_num
    ).filter(Boolean).join(', ') || 'N/A';
    
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hóa đơn - ${booking.booking_code}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 20px;
          }
          
          .hotel-name {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          
          .hotel-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #27ae60;
            margin: 20px 0;
          }
          
          .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          
          .invoice-details {
            flex: 1;
          }
          
          .invoice-details h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .detail-row {
            display: flex;
            margin-bottom: 8px;
          }
          
          .detail-label {
            font-weight: bold;
            width: 150px;
            color: #555;
          }
          
          .detail-value {
            flex: 1;
            color: #333;
          }
          
          .booking-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          
          .booking-details h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .services-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .services-table th {
            background-color: #2c3e50;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
          }
          
          .services-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
          }
          
          .services-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          
          .services-table tr:hover {
            background-color: #e8f5e8;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .total-section {
            background-color: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          .total-label {
            font-weight: bold;
            color: #2c3e50;
          }
          
          .total-amount {
            font-weight: bold;
            color: #27ae60;
            font-size: 18px;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          
          .payment-status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
          }
          
          .status-paid {
            background-color: #d4edda;
            color: #155724;
          }
          
          .status-pending {
            background-color: #fff3cd;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">BEAN HOTEL</div>
          <div class="hotel-info">12 Đường Nguyễn Văn Bảo, Phường Hạnh Thông, Quận Gò Vấp, TP.Hồ Chí Minh</div>
          <div class="hotel-info">Hotline: 1900-1234 | Email: beanhotel@gmail.com</div>
        </div>
        
        <div class="invoice-title">HÓA ĐƠN THANH TOÁN</div>
        
        <div class="invoice-info">
          <div class="invoice-details">
            <h3>Thông tin hóa đơn</h3>
            <div class="detail-row">
              <div class="detail-label">Mã đặt phòng:</div>
              <div class="detail-value"><strong>${booking.booking_code || 'N/A'}</strong></div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Ngày giờ xuất HĐ:</div>
              <div class="detail-value">${currentDate}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Thu ngân (Lễ tân):</div>
              <div class="detail-value">${staffName || 'N/A'}</div>
            </div>
          </div>
          
          <div class="invoice-details">
            <h3>Thông tin khách hàng</h3>
            <div class="detail-row">
              <div class="detail-label">Tên khách:</div>
              <div class="detail-value"><strong>${booking.user?.full_name || 'N/A'}</strong></div>
            </div>
          </div>
        </div>
        
        <div class="booking-details">
          <h3>Chi tiết lưu trú</h3>
          <div class="detail-row">
            <div class="detail-label">Thời gian Nhận phòng (Check-in):</div>
            <div class="detail-value"><strong>${checkInDate}</strong></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Thời gian Trả phòng (Check-out):</div>
            <div class="detail-value"><strong>${checkOutDate}</strong></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Loại phòng:</div>
            <div class="detail-value">${booking.room_type?.room_type_name || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Số phòng:</div>
            <div class="detail-value"><strong>${roomNumbers}</strong></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Số lượng khách:</div>
            <div class="detail-value">${booking.num_person} người</div>
          </div>
        </div>
        
        <h3 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Chi tiết các khoản phí</h3>
        <table class="services-table">
          <thead>
            <tr>
              <th>Mô tả</th>
              <th class="text-center">SL</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${parseFloat(item.unitPrice || 0).toLocaleString('vi-VN')}đ</td>
                <td class="text-right"><strong>${parseFloat(item.total || 0).toLocaleString('vi-VN')}đ</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <h3 style="color: #2c3e50; margin-top: 0; margin-bottom: 20px; font-size: 18px;">Tổng kết thanh toán</h3>
          <div class="total-row">
            <div class="total-label">Tổng Chi phí (Subtotal):</div>
            <div class="total-amount">${parseFloat(invoiceData.subtotal || invoiceData.total || 0).toLocaleString('vi-VN')}đ</div>
          </div>
          ${(invoiceData.discount && invoiceData.discount > 0) ? `
            <div class="total-row" style="margin-top: 10px; color: #e74c3c;">
              <div class="total-label">Giảm giá (Mã khuyến mãi):</div>
              <div class="total-amount">-${parseFloat(invoiceData.discount).toLocaleString('vi-VN')}đ</div>
            </div>
          ` : ''}
          <div class="total-row" style="border-top: 2px solid #27ae60; padding-top: 10px; margin-top: 10px; font-size: 18px;">
            <div class="total-label"><strong>${(invoiceData.discount && invoiceData.discount > 0) ? 'TỔNG CỘNG (Sau giảm giá)' : 'TỔNG CỘNG'}:</strong></div>
            <div class="total-amount"><strong>${parseFloat(invoiceData.grandTotal || invoiceData.finalTotal || 0).toLocaleString('vi-VN')}đ</strong></div>
          </div>
          ${invoiceData.paidOnline > 0 ? `
            <div class="total-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
              <div class="total-label">Đã thanh toán (Online):</div>
              <div class="total-amount" style="color: #28a745;">-${parseFloat(invoiceData.paidOnline).toLocaleString('vi-VN')}đ</div>
            </div>
          ` : ''}
          ${invoiceData.refunds > 0 ? `
            <div class="total-row">
              <div class="total-label">Đã hoàn tiền (Refunds):</div>
              <div class="total-amount" style="color: #dc3545;">+${parseFloat(invoiceData.refunds).toLocaleString('vi-VN')}đ</div>
            </div>
          ` : ''}
          <div class="total-row" style="border-top: 3px solid #2c3e50; padding-top: 15px; margin-top: 15px; font-size: 20px; font-weight: bold;">
            <div class="total-label" style="color: #dc3545;">SỐ TIỀN THANH TOÁN KHI CHECK-OUT (Amount Due):</div>
            <div class="total-amount" style="color: #dc3545; font-size: 22px;">${parseFloat(invoiceData.amountDue || 0).toLocaleString('vi-VN')}đ</div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Cảm ơn quý khách! Hẹn gặp lại!</strong></p>
          <p>Phương thức thanh toán: ${invoiceData.paymentMethod || 'Tiền mặt / Thẻ'}</p>
          <p>Hóa đơn được tạo tự động vào ${currentDate}</p>
        </div>
      </body>
      </html>
    `;
  }

  // Tạo PDF danh sách khách đến (Arrival List)
  async generateArrivalListPDF(arrivals, targetDate) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      const htmlContent = this.generateArrivalListHTML(arrivals, targetDate);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        }
      });

      await page.close();
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating arrival list PDF:', error);
      throw error;
    }
  }

  // Tạo HTML cho danh sách khách đến
  generateArrivalListHTML(arrivals, targetDate) {
    const dateStr = targetDate.format('DD/MM/YYYY');
    const currentTime = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Danh sách khách đến - ${dateStr}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; }
          .hotel-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #27ae60; margin: 20px 0; }
          .info-row { margin-bottom: 10px; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2c3e50; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          .room-numbers { font-weight: bold; color: #27ae60; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">BEAN HOTEL</div>
          <div class="report-title">DANH SÁCH KHÁCH ĐẾN</div>
          <div class="info-row">Ngày: <strong>${dateStr}</strong></div>
          <div class="info-row">Xuất báo cáo lúc: ${currentTime}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã Booking</th>
              <th>Tên khách</th>
              <th>SĐT</th>
              <th>Loại phòng</th>
              <th>Số phòng</th>
              <th>Số khách</th>
              <th>Check-in</th>
              <th>Check-out</th>
            </tr>
          </thead>
          <tbody>
            ${arrivals.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; padding: 30px;">Không có khách đến trong ngày này</td>
              </tr>
            ` : arrivals.map((arrival, index) => {
              const roomNumbers = arrival.booking_rooms?.map(br => br.room?.room_num).filter(Boolean).join(', ') || 'N/A';
              const checkInTime = arrival.check_in_time 
                ? moment(arrival.check_in_time).format('DD/MM/YYYY HH:mm')
                : arrival.check_in_date + ' 14:00';
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${arrival.booking_code || 'N/A'}</strong></td>
                  <td>${arrival.user?.full_name || 'N/A'}</td>
                  <td>${arrival.user?.phone || 'N/A'}</td>
                  <td>${arrival.room_type?.room_type_name || 'N/A'}</td>
                  <td class="room-numbers">${roomNumbers}</td>
                  <td>${arrival.num_person}</td>
                  <td>${checkInTime}</td>
                  <td>${moment(arrival.check_out_date).format('DD/MM/YYYY')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Tổng số khách đến: <strong>${arrivals.length}</strong></p>
          <p>Báo cáo được tạo tự động bởi hệ thống Bean Hotel</p>
        </div>
      </body>
      </html>
    `;
  }

  // Tạo PDF danh sách khách đi (Departure List)
  async generateDepartureListPDF(departures, targetDate) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      const htmlContent = this.generateDepartureListHTML(departures, targetDate);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        }
      });

      await page.close();
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating departure list PDF:', error);
      throw error;
    }
  }

  // Tạo HTML cho danh sách khách đi
  generateDepartureListHTML(departures, targetDate) {
    const dateStr = targetDate.format('DD/MM/YYYY');
    const currentTime = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Danh sách khách đi - ${dateStr}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; }
          .hotel-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #dc3545; margin: 20px 0; }
          .info-row { margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2c3e50; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          .room-numbers { font-weight: bold; color: #dc3545; }
          .amount-due { font-weight: bold; color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">BEAN HOTEL</div>
          <div class="report-title">DANH SÁCH KHÁCH ĐI</div>
          <div class="info-row">Ngày: <strong>${dateStr}</strong></div>
          <div class="info-row">Xuất báo cáo lúc: ${currentTime}</div>
          <div class="info-row" style="color: #dc3545; font-weight: bold;">⚠️ Vui lòng chuẩn bị hóa đơn cho các khách này</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã Booking</th>
              <th>Tên khách</th>
              <th>SĐT</th>
              <th>Loại phòng</th>
              <th>Số phòng</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${departures.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align: center; padding: 30px;">Không có khách đi trong ngày này</td>
              </tr>
            ` : departures.map((departure, index) => {
              const roomNumbers = departure.booking_rooms?.map(br => br.room?.room_num).filter(Boolean).join(', ') || 'N/A';
              const checkInTime = departure.check_in_time 
                ? moment(departure.check_in_time).format('DD/MM/YYYY HH:mm')
                : departure.check_in_date + ' 14:00';
              const checkOutTime = departure.check_out_time 
                ? moment(departure.check_out_time).format('DD/MM/YYYY HH:mm')
                : departure.check_out_date + ' 12:00';
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${departure.booking_code || 'N/A'}</strong></td>
                  <td>${departure.user?.full_name || 'N/A'}</td>
                  <td>${departure.user?.phone || 'N/A'}</td>
                  <td>${departure.room_type?.room_type_name || 'N/A'}</td>
                  <td class="room-numbers">${roomNumbers}</td>
                  <td>${checkInTime}</td>
                  <td>${checkOutTime}</td>
                  <td>${departure.booking_status === 'checked_out' ? '<span style="color: #28a745;">Đã check-out</span>' : '<span style="color: #ffc107;">Chưa check-out</span>'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Tổng số khách đi: <strong>${departures.length}</strong></p>
          <p>Báo cáo được tạo tự động bởi hệ thống Bean Hotel</p>
        </div>
      </body>
      </html>
    `;
  }

  // Tạo PDF báo cáo tình trạng phòng (Room Status Report)
  async generateRoomStatusReportPDF(roomsByStatus, totalRooms) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      const htmlContent = this.generateRoomStatusReportHTML(roomsByStatus, totalRooms);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        landscape: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        }
      });

      await page.close();
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating room status report PDF:', error);
      throw error;
    }
  }

  // Tạo HTML cho báo cáo tình trạng phòng
  generateRoomStatusReportHTML(roomsByStatus, totalRooms) {
    const currentTime = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    
    const statusLabels = {
      available: { label: 'Sạch (Sẵn sàng)', color: '#28a745', icon: '✓' },
      booked: { label: 'Đã đặt', color: '#17a2b8', icon: '📅' },
      in_use: { label: 'Đang sử dụng', color: '#ffc107', icon: '🛏️' },
      checked_out: { label: 'Đã trả phòng', color: '#fd7e14', icon: '🚪' },
      cleaning: { label: 'Bẩn (Chờ dọn)', color: '#dc3545', icon: '🧹' }
    };

    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Báo cáo Tình trạng phòng</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; }
          .hotel-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #2c3e50; margin: 20px 0; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; }
          .summary-item { text-align: center; }
          .summary-number { font-size: 24px; font-weight: bold; }
          .summary-label { font-size: 12px; color: #666; margin-top: 5px; }
          .status-section { margin-top: 30px; page-break-inside: avoid; }
          .status-header { background-color: #2c3e50; color: white; padding: 12px; font-weight: bold; border-radius: 5px 5px 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #495057; color: white; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">BEAN HOTEL</div>
          <div class="report-title">BÁO CÁO TÌNH TRẠNG PHÒNG</div>
          <div>Xuất báo cáo lúc: ${currentTime}</div>
        </div>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-number" style="color: #28a745;">${roomsByStatus.available.length}</div>
            <div class="summary-label">Sạch (Sẵn sàng)</div>
          </div>
          <div class="summary-item">
            <div class="summary-number" style="color: #17a2b8;">${roomsByStatus.booked.length}</div>
            <div class="summary-label">Đã đặt</div>
          </div>
          <div class="summary-item">
            <div class="summary-number" style="color: #ffc107;">${roomsByStatus.in_use.length}</div>
            <div class="summary-label">Đang sử dụng</div>
          </div>
          <div class="summary-item">
            <div class="summary-number" style="color: #fd7e14;">${roomsByStatus.checked_out.length}</div>
            <div class="summary-label">Đã trả phòng</div>
          </div>
          <div class="summary-item">
            <div class="summary-number" style="color: #dc3545;">${roomsByStatus.cleaning.length}</div>
            <div class="summary-label">Bẩn (Chờ dọn)</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${totalRooms}</div>
            <div class="summary-label">Tổng số phòng</div>
          </div>
        </div>

        ${Object.entries(roomsByStatus).map(([status, rooms]) => {
          if (rooms.length === 0) return '';
          const statusInfo = statusLabels[status] || { label: status, color: '#666', icon: '' };
          return `
            <div class="status-section">
              <div class="status-header" style="background-color: ${statusInfo.color};">
                ${statusInfo.icon} ${statusInfo.label} (${rooms.length} phòng)
              </div>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Số phòng</th>
                    <th>Loại phòng</th>
                    <th>Khách sạn</th>
                  </tr>
                </thead>
                <tbody>
                  ${rooms.map((room, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td><strong>${room.room_num}</strong></td>
                      <td>${room.room_type?.room_type_name || 'N/A'}</td>
                      <td>${room.hotel?.name || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
        
        <div class="footer">
          <p>Tổng số phòng: <strong>${totalRooms}</strong></p>
          <p>Báo cáo được tạo tự động bởi hệ thống Bean Hotel</p>
        </div>
      </body>
      </html>
    `;
  }

  // Tạo báo cáo doanh thu PDF
  async generateRevenueReportPDF(reportData) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      const htmlContent = this.generateRevenueReportHTML(reportData);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        }
      });

      await page.close();
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating revenue report PDF:', error);
      throw error;
    }
  }

  // Tạo HTML cho báo cáo doanh thu
  generateRevenueReportHTML(reportData) {
    const {
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
    } = reportData;

    const currentTime = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    const dateRange = `Từ ${startDate.format('DD/MM/YYYY')} đến ${endDate.format('DD/MM/YYYY')}`;
    
    const formatCurrency = (amount) => {
      return parseFloat(amount || 0).toLocaleString('vi-VN');
    };

    // Tạo bảng doanh thu theo ngày
    const revenueByDateRows = Object.keys(revenueByDate || {})
      .sort()
      .map(date => {
        const revenue = revenueByDate[date];
        return `
          <tr>
            <td>${moment(date).format('DD/MM/YYYY')}</td>
            <td style="text-align: right;">${formatCurrency(revenue)}đ</td>
          </tr>
        `;
      }).join('');

    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Báo cáo Doanh thu - ${dateRange}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 20px;
          }
          
          .hotel-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          
          .report-title {
            font-size: 20px;
            font-weight: bold;
            color: #27ae60;
            margin: 10px 0;
          }
          
          .date-range {
            font-size: 14px;
            color: #7f8c8d;
            margin-bottom: 10px;
          }
          
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #bdc3c7;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .summary-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #27ae60;
          }
          
          .summary-label {
            font-size: 12px;
            color: #7f8c8d;
            margin-bottom: 5px;
          }
          
          .summary-value {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 12px;
          }
          
          table th {
            background-color: #2c3e50;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
          }
          
          table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e0e0e0;
          }
          
          table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #bdc3c7;
            text-align: center;
            font-size: 11px;
            color: #7f8c8d;
          }
          
          .highlight {
            color: #27ae60;
            font-weight: bold;
          }
          
          .negative {
            color: #e74c3c;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">BEAN HOTEL</div>
          <div class="report-title">BÁO CÁO DOANH THU</div>
          <div class="date-range">${dateRange}</div>
          <div style="font-size: 11px; color: #7f8c8d;">Tạo lúc: ${currentTime}</div>
        </div>

        <div class="section">
          <div class="section-title">TỔNG QUAN DOANH THU</div>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Tổng Doanh thu</div>
              <div class="summary-value highlight">${formatCurrency(totalRevenue)}đ</div>
              <div style="font-size: 10px; color: #7f8c8d; margin-top: 5px;">Tổng số tiền thực tế thu được từ tất cả booking</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Tổng đã hoàn lại</div>
              <div class="summary-value negative">${formatCurrency(totalRefunded)}đ</div>
              <div style="font-size: 10px; color: #7f8c8d; margin-top: 5px;">Tổng số tiền đã hoàn lại cho khách hàng</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Doanh thu Tiền phòng</div>
              <div class="summary-value">${formatCurrency(accommodationRevenue)}đ</div>
              <div style="font-size: 10px; color: #7f8c8d; margin-top: 5px;">Tiền phòng thuần thu được - Chỉ booking không bị hủy</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Doanh thu Dịch vụ</div>
              <div class="summary-value">${formatCurrency(serviceRevenue)}đ</div>
              <div style="font-size: 10px; color: #7f8c8d; margin-top: 5px;">Tiền dịch vụ thu được - Cả prepaid và postpaid</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Doanh thu Phí hủy</div>
              <div class="summary-value">${formatCurrency(cancellationFeeRevenue)}đ</div>
              <div style="font-size: 10px; color: #7f8c8d; margin-top: 5px;">Số tiền giữ lại từ booking bị hủy</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">PHÂN TÍCH DOANH THU</div>
          <table>
            <thead>
              <tr>
                <th>Loại doanh thu</th>
                <th style="text-align: right;">Giá trị (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tiền phòng (Accommodation - Chỉ booking không bị hủy)</td>
                <td style="text-align: right;">${formatCurrency(accommodationRevenue)}đ</td>
              </tr>
              <tr>
                <td>Tiền dịch vụ (Services - Cả prepaid và postpaid)</td>
                <td style="text-align: right;">${formatCurrency(serviceRevenue)}đ</td>
              </tr>
              <tr>
                <td>Tiền phạt hủy phòng (Cancellation Fee - Từ booking bị hủy)</td>
                <td style="text-align: right;">${formatCurrency(cancellationFeeRevenue)}đ</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">DOANH THU THEO KÊNH</div>
          <table>
            <thead>
              <tr>
                <th>Kênh</th>
                <th style="text-align: right;">Doanh thu (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Online (Đặt web - Tổng doanh thu từ booking online)</td>
                <td style="text-align: right;">${formatCurrency(onlineRevenue)}đ</td>
              </tr>
              <tr>
                <td>Trực tiếp (Walk-in - Tổng doanh thu từ booking tại quầy)</td>
                <td style="text-align: right;">${formatCurrency(walkinRevenue)}đ</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${revenueByDateRows ? `
        <div class="section">
          <div class="section-title">DOANH THU THEO NGÀY</div>
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th style="text-align: right;">Doanh thu (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              ${revenueByDateRows}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Báo cáo được tạo tự động bởi hệ thống Bean Hotel</p>
          <p>Thời gian tạo: ${currentTime}</p>
        </div>
      </body>
      </html>
    `;
  }
}

// Singleton instance
const pdfService = new PDFService();

module.exports = pdfService;
