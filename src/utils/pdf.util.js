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
          <div class="total-row" style="border-top: 2px solid #27ae60; padding-top: 10px; margin-top: 10px; font-size: 18px;">
            <div class="total-label"><strong>TỔNG CỘNG (Grand Total):</strong></div>
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
}

// Singleton instance
const pdfService = new PDFService();

module.exports = pdfService;
