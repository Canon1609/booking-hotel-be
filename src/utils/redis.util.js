const redis = require('redis');
const moment = require('moment-timezone');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

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
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
