const redis = require('redis');
const moment = require('moment-timezone');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect(maxRetries = 5, retryDelay = 2000) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Support full Redis URL or separate host/port
        let redisUrl = process.env.REDIS_URL;
        
        if (!redisUrl) {
          const host = process.env.REDIS_HOST || 'localhost';
          const port = process.env.REDIS_PORT || 6379;
          const password = process.env.REDIS_PASSWORD;
          
          // Build URL with password if provided
          if (password) {
            redisUrl = `redis://:${password}@${host}:${port}`;
          } else {
            redisUrl = `redis://${host}:${port}`;
          }
        }

        // If using managed Redis with separate read/write endpoints, prefer write endpoint
        const writeUrl = process.env.REDIS_WRITE_URL || redisUrl;
        
        // Close existing client if any
        if (this.client) {
          try {
            await this.client.quit();
          } catch (e) {
            // Ignore errors when closing
          }
        }
        
        this.client = redis.createClient({
          url: writeUrl,
          socket: {
            reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
            connectTimeout: 10000
          }
        });
        
        // Mask password in logs
        const logUrl = writeUrl.replace(/:[^:@]+@/, ':****@');
        console.log(`[Redis] Attempt ${attempt}/${maxRetries}: Connecting to Redis at ${logUrl} ...`);

        this.client.on('error', (err) => {
          console.error('Redis Client Error:', err);
          if (err.message && err.message.includes('READONLY')) {
            console.error('ERROR: Connected to a read-only Redis replica. Please check your REDIS_HOST/REDIS_URL points to the master/primary instance.');
            console.error('If using a managed Redis service, ensure you are using the primary/write endpoint, not the read replica endpoint.');
          }
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('[Redis] Connected successfully');
          this.isConnected = true;
        });

        this.client.on('ready', () => {
          console.log('[Redis] Ready to receive commands');
          this.isConnected = true;
        });

        await this.client.connect();
        
        // Test write capability by attempting a ping with a test key
        try {
          await this.client.set('__redis_write_test__', '1', { EX: 1 });
          await this.client.del('__redis_write_test__');
          console.log('[Redis] Write test successful - connected to writable instance');
          this.isConnected = true;
          return; // Success, exit retry loop
        } catch (testError) {
          if (testError.message && testError.message.includes('READONLY')) {
            throw new Error('Redis instance is read-only. Please connect to the master/primary Redis instance, not a replica.');
          }
          throw testError;
        }
      } catch (error) {
        lastError = error;
        this.isConnected = false;
        
        if (error.message && error.message.includes('READONLY')) {
          console.error('\n=== REDIS CONFIGURATION ERROR ===');
          console.error('You are connected to a read-only Redis replica.');
          console.error('Solutions:');
          console.error('1. Check your REDIS_HOST/REDIS_URL environment variable');
          console.error('2. If using managed Redis (AWS ElastiCache, Redis Cloud, etc.), use the PRIMARY/WRITE endpoint');
          console.error('3. If using Redis replication, connect to the MASTER node, not the REPLICA');
          console.error('4. Set REDIS_WRITE_URL if you have separate read/write endpoints');
          console.error('===================================\n');
          throw error; // Don't retry for READONLY errors
        }
        
        if (attempt < maxRetries) {
          console.warn(`[Redis] Connection attempt ${attempt} failed: ${error.message}`);
          console.log(`[Redis] Retrying in ${retryDelay}ms... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay = Math.min(retryDelay * 1.5, 10000); // Exponential backoff, max 10s
        } else {
          console.error(`[Redis] Connection failed after ${maxRetries} attempts:`, error.message);
        }
      }
    }
    
    // If we get here, all retries failed
    this.isConnected = false;
    throw lastError || new Error('Redis connection failed after all retries');
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Đảm bảo Redis đã kết nối, tự động reconnect nếu cần
  async ensureConnected() {
    if (this.isConnected && this.client) {
      // Test connection với ping
      try {
        await this.client.ping();
        return true;
      } catch (error) {
        // Connection lost, reset flag
        this.isConnected = false;
      }
    }

    // Nếu chưa connected, thử connect lại
    if (!this.isConnected) {
      try {
        console.log('[Redis] Attempting to reconnect...');
        await this.connect(3, 1000); // 3 retries, 1s delay
        return true;
      } catch (error) {
        console.error('[Redis] Reconnection failed:', error.message);
        throw new Error('Redis connection unavailable. Please check Redis service.');
      }
    }

    return true;
  }

  // Tạo key cho booking tạm thời
  generateTempBookingKey(userId, roomId, checkIn, checkOut) {
    const timestamp = moment().tz('Asia/Ho_Chi_Minh').format('YYYYMMDDHHmmss');
    return `temp_booking:${userId}:${roomId}:${checkIn}:${checkOut}:${timestamp}`;
  }

  // Lưu booking tạm thời vào Redis (TTL: 30 phút)
  async saveTempBooking(key, bookingData) {
    try {
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();

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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();
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
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();
      const key = `payos_order:${orderCode}`;
      const tempKey = await this.client.get(key);
      console.log(`[REDIS] getTempKeyByOrderCode: ${key} -> ${tempKey || 'null'}`);
      return tempKey || null;
    } catch (error) {
      console.error('Error getting tempKey by orderCode:', error);
      return null;
    }
  }

  // Xóa ánh xạ orderCode -> temp_booking_key (sau khi đã insert DB)
  async deleteOrderCodeMap(orderCode) {
    try {
      // Đảm bảo Redis đã kết nối
      await this.ensureConnected();
      const key = `payos_order:${orderCode}`;
      await this.client.del(key);
      console.log(`[REDIS] deleteOrderCodeMap: deleted ${key}`);
      return true;
    } catch (error) {
      console.error('Error deleting orderCode map:', error);
      return false;
    }
  }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
