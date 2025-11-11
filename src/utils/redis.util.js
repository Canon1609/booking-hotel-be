const redis = require('redis');
const moment = require('moment-timezone');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = process.env.REDIS_PORT || 6379;
      const password = process.env.REDIS_PASSWORD || undefined;

      const url = `redis://${host}:${port}`;
      this.client = redis.createClient({
        url,
        password,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
        }
      });
      console.log(`Connecting to Redis at ${url} ...`);

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis ready to receive commands');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis connection failed:', error.message);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Tạo key cho booking tạm thời
  generateTempBookingKey(userId, roomId, checkIn, checkOut) {
    const timestamp = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
    return `temp_booking:${userId}:${roomId}:${checkIn}:${checkOut}:${timestamp}`;
  }

  // Lưu booking tạm thời vào Redis (TTL: 30 phút)
  async saveTempBooking(key, bookingData) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      const data = {
        ...bookingData,
        created_at: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
        expires_at: moment().tz('Asia/Ho_Chi_Minh').add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss')
      };

      await this.client.setEx(key, 1800, JSON.stringify(data)); // 30 phút = 1800 giây
      return true;
    } catch (error) {
      console.error('Error saving temp booking to Redis:', error);
      throw error;
    }
  }

  // Lấy booking tạm thời từ Redis
  async getTempBooking(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting temp booking from Redis:', error);
      throw error;
    }
  }

  // Xóa booking tạm thời khỏi Redis
  async deleteTempBooking(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting temp booking from Redis:', error);
      throw error;
    }
  }

  // Kiểm tra booking tạm thời có tồn tại không
  async existsTempBooking(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking temp booking existence:', error);
      return false;
    }
  }

  // Gia hạn TTL cho booking tạm thời (thêm 30 phút)
  async extendTempBookingTTL(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      await this.client.expire(key, 1800); // 30 phút
      return true;
    } catch (error) {
      console.error('Error extending temp booking TTL:', error);
      throw error;
    }
  }

  // Lấy tất cả keys booking tạm thời của user
  async getUserTempBookings(userId) {
    try {
      if (!this.isConnected) {
        return [];
      }

      const pattern = `temp_booking:${userId}:*`;
      const keys = await this.client.keys(pattern);
      
      const bookings = [];
      for (const key of keys) {
        const data = await this.getTempBooking(key);
        if (data) {
          bookings.push({ key, ...data });
        }
      }
      
      return bookings;
    } catch (error) {
      console.error('Error getting user temp bookings:', error);
      return [];
    }
  }

  // Xóa tất cả booking tạm thời của user
  async clearUserTempBookings(userId) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const pattern = `temp_booking:${userId}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing user temp bookings:', error);
      return false;
    }
  }

  // Lấy tất cả booking tạm thời (để tìm theo orderCode)
  async getAllTempBookings() {
    try {
      if (!this.isConnected) {
        return {};
      }

      const pattern = `temp_booking:*`;
      const keys = await this.client.keys(pattern);
      
      const bookings = {};
      for (const key of keys) {
        const data = await this.getTempBooking(key);
        if (data) {
          bookings[key] = data;
        }
      }
      
      return bookings;
    } catch (error) {
      console.error('Error getting all temp bookings:', error);
      return {};
    }
  }

  // Lưu ánh xạ orderCode -> temp_booking_key (TTL 30 phút)
  async mapOrderCodeToTempKey(orderCode, tempKey) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const key = `payos_order:${orderCode}`;
      await this.client.setEx(key, 1800, tempKey); // 30 phút
      console.log(`[REDIS] mapOrderCodeToTempKey saved: ${key} -> ${tempKey}`);
      return true;
    } catch (error) {
      console.error('Error mapping orderCode to tempKey:', error);
      return false;
    }
  }

  // Lấy temp_booking_key theo orderCode
  async getTempKeyByOrderCode(orderCode) {
    try {
      if (!this.isConnected) {
        return null;
      }
      const key = `payos_order:${orderCode}`;
      const tempKey = await this.client.get(key);
      console.log(`[REDIS] getTempKeyByOrderCode: ${key} -> ${tempKey || 'null'}`);
      return tempKey || null;
    } catch (error) {
      console.error('Error getting tempKey by orderCode:', error);
      return null;
    }
  }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
