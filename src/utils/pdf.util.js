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
  async generateInvoicePDF(booking, invoiceData) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      
      // Tạo HTML cho hóa đơn
      const htmlContent = this.generateInvoiceHTML(booking, invoiceData);
      
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
  generateInvoiceHTML(booking, invoiceData) {
    const currentDate = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm');
    const checkInDate = moment(booking.check_in_time).format('DD/MM/YYYY HH:mm');
    const checkOutDate = moment(booking.check_out_time).format('DD/MM/YYYY HH:mm');
    
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
          <div class="hotel-name">KHÁCH SẠN ABC</div>
          <div class="hotel-info">123 Đường ABC, Quận 1, TP.HCM</div>
          <div class="hotel-info">Hotline: 1900-xxxx | Email: info@hotelabc.com</div>
        </div>
        
        <div class="invoice-title">HÓA ĐƠN THANH TOÁN</div>
        
        <div class="invoice-info">
          <div class="invoice-details">
            <h3>Thông tin hóa đơn</h3>
            <div class="detail-row">
              <div class="detail-label">Mã hóa đơn:</div>
              <div class="detail-value">${booking.booking_code}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Ngày tạo:</div>
              <div class="detail-value">${currentDate}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Trạng thái:</div>
              <div class="detail-value">
                <span class="payment-status ${booking.payment_status === 'paid' ? 'status-paid' : 'status-pending'}">
                  ${booking.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                </span>
              </div>
            </div>
          </div>
          
          <div class="invoice-details">
            <h3>Thông tin khách hàng</h3>
            <div class="detail-row">
              <div class="detail-label">Tên khách:</div>
              <div class="detail-value">${booking.user?.full_name || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Email:</div>
              <div class="detail-value">${booking.user?.email || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">SĐT:</div>
              <div class="detail-value">${booking.user?.phone || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <div class="booking-details">
          <h3>Chi tiết đặt phòng</h3>
          <div class="detail-row">
            <div class="detail-label">Loại phòng:</div>
            <div class="detail-value">${booking.room?.room_type?.room_type_name || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Số phòng:</div>
            <div class="detail-value">${booking.room?.room_number || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Check-in:</div>
            <div class="detail-value">${checkInDate}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Check-out:</div>
            <div class="detail-value">${checkOutDate}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Số khách:</div>
            <div class="detail-value">${booking.num_person} người</div>
          </div>
        </div>
        
        <table class="services-table">
          <thead>
            <tr>
              <th>Dịch vụ</th>
              <th class="text-center">Số lượng</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${item.unitPrice.toLocaleString('vi-VN')} VNĐ</td>
                <td class="text-right">${item.total.toLocaleString('vi-VN')} VNĐ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-row">
            <div class="total-label">Tổng cộng:</div>
            <div class="total-amount">${invoiceData.total.toLocaleString('vi-VN')} VNĐ</div>
          </div>
          ${invoiceData.discount > 0 ? `
            <div class="total-row">
              <div class="total-label">Giảm giá:</div>
              <div class="total-amount">-${invoiceData.discount.toLocaleString('vi-VN')} VNĐ</div>
            </div>
          ` : ''}
          ${invoiceData.tax > 0 ? `
            <div class="total-row">
              <div class="total-label">Thuế (10%):</div>
              <div class="total-amount">${invoiceData.tax.toLocaleString('vi-VN')} VNĐ</div>
            </div>
          ` : ''}
          <div class="total-row" style="border-top: 2px solid #27ae60; padding-top: 10px; margin-top: 10px;">
            <div class="total-label">Thành tiền:</div>
            <div class="total-amount">${invoiceData.finalTotal.toLocaleString('vi-VN')} VNĐ</div>
          </div>
        </div>
        
        <div class="footer">
          <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</p>
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
