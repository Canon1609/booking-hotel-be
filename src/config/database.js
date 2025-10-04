require('dotenv').config(); // Đảm bảo dotenv được tải

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    timezone: '+07:00', 
    dialectOptions: {
      timezone: 'local'
    }
  }
);

module.exports = sequelize;
