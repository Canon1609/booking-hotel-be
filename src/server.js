const app = require('./app');  // Import app từ app.js
const sequelize = require('./config/database');  // Cấu hình kết nối DB

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.sync({ alter: true });  // Đồng bộ hóa cơ sở dữ liệu
    console.log('Database synchronized!');
  } catch (err) {
    console.error('Unable to sync the database:', err);
  }
});
