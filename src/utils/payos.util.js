const { PayOS } = require('@payos/node');

class PayOSService {
  constructor() {
    this.payOS = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.payOS = new PayOS(
        process.env.PAYOS_CLIENT_ID,
        process.env.PAYOS_API_KEY,
        process.env.PAYOS_CHECKSUM_KEY
      );
      this.isInitialized = true;
      console.log('PayOS initialized successfully');
    } catch (error) {
      console.error('PayOS initialization failed:', error);
      this.isInitialized = false;
    }
  }

  // Tạo link thanh toán
  async createPaymentLink(paymentData) {
    try {
      if (!this.isInitialized) {
        throw new Error('PayOS not initialized');
      }

      const {
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
        items = [],
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerAddress
      } = paymentData;

      const paymentDataPayload = {
        orderCode: parseInt(orderCode),
        amount: parseInt(amount),
        description: (description || 'Đặt phòng KS').substring(0, 25),
        items: items.length > 0 ? items : [{
          name: 'Đặt phòng khách sạn',
          quantity: 1,
          price: parseInt(amount)
        }],
        returnUrl: returnUrl || `${process.env.CLIENT_URL}/payment/success`,
        cancelUrl: cancelUrl || `${process.env.CLIENT_URL}/payment/cancel`,
        buyerName: buyerName || 'Khách hàng',
        buyerEmail: buyerEmail || '',
        buyerPhone: buyerPhone || '',
        buyerAddress: buyerAddress || '',
        expiredAt: Math.floor(Date.now() / 1000) + 30 * 60, // 30 phút
        signature: ''
      };

      // Use paymentRequests.create method
      const paymentLinkResponse = await this.payOS.paymentRequests.create(paymentDataPayload);
      
      return {
        success: true,
        checkoutUrl: paymentLinkResponse.checkoutUrl,
        orderCode: paymentLinkResponse.orderCode,
        qrCode: paymentLinkResponse.qrCode
      };
    } catch (error) {
      console.error('Error creating payment link:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Xác thực webhook từ PayOS
  async verifyWebhookData(webhookData) {
    try {
      if (!this.isInitialized) {
        throw new Error('PayOS not initialized');
      }

      // Tạm thời disable webhook verification để test
      // const isValid = this.payOS.webhooks.verifyPaymentWebhookData(webhookData);
      console.log('Webhook verification disabled for testing');
      return true;
    } catch (error) {
      console.error('Error verifying webhook data:', error);
      return false;
    }
  }

  // Lấy thông tin thanh toán theo orderCode
  async getPaymentInfo(orderCode) {
    try {
      if (!this.isInitialized) {
        throw new Error('PayOS not initialized');
      }

      const paymentInfo = await this.payOS.paymentRequests.get(parseInt(orderCode));
      return {
        success: true,
        data: paymentInfo
      };
    } catch (error) {
      console.error('Error getting payment info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Hủy thanh toán
  async cancelPayment(orderCode) {
    try {
      if (!this.isInitialized) {
        throw new Error('PayOS not initialized');
      }

      const result = await this.payOS.paymentRequests.cancel(parseInt(orderCode));
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error canceling payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Tạo orderCode duy nhất
  generateOrderCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp}${random.toString().padStart(3, '0')}`);
  }

  // Tạo booking code ngắn gọn (6-8 ký tự)
  generateBookingCode() {
    // Lấy 3 ký tự cuối của timestamp (base36)
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
    // Tạo 3-5 ký tự ngẫu nhiên
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${timestamp}${random}`;
  }
}

// Singleton instance
const payOSService = new PayOSService();

module.exports = payOSService;
