require('dotenv').config();

// Server configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const CLIENT_URL = process.env.CLIENT_URL || FRONTEND_URL; // Alias for FRONTEND_URL

module.exports = {
  SERVER_URL,
  PORT,
  FRONTEND_URL,
  CLIENT_URL
};

