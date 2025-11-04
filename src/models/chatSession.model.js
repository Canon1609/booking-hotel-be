const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const ChatSession = sequelize.define('ChatSession', {
  session_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'user_id' },
    comment: 'null nếu là user chưa đăng nhập'
  },
  chat_history: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Lưu toàn bộ conversation dạng [{role: "user"|"ai", text: "..."}, ...]'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: () => moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    allowNull: false
  }
}, {
  timestamps: false,
  tableName: 'chat_sessions',
  hooks: {
    beforeUpdate: (session) => {
      session.updated_at = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    }
  }
});

module.exports = ChatSession;

