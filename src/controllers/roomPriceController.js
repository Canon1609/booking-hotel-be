const RoomPrice = require('../models/roomPrice.model');

exports.createRoomPrice = async (req, res) => {
  try {
    const { room_type_id, start_date, end_date, price_per_night } = req.body;
    const price = await RoomPrice.create({ room_type_id, start_date, end_date, price_per_night });
    return res.status(201).json({ message: 'Tạo giá phòng thành công', price });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.updateRoomPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_type_id, start_date, end_date, price_per_night } = req.body;
    const price = await RoomPrice.findOne({ where: { price_id: id } });
    if (!price) return res.status(404).json({ message: 'Không tìm thấy giá phòng' });
    if (room_type_id !== undefined) price.room_type_id = room_type_id;
    if (start_date !== undefined) price.start_date = start_date;
    if (end_date !== undefined) price.end_date = end_date;
    if (price_per_night !== undefined) price.price_per_night = price_per_night;
    await price.save();
    return res.status(200).json({ message: 'Cập nhật giá phòng thành công', price });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.deleteRoomPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const price = await RoomPrice.findOne({ where: { price_id: id } });
    if (!price) return res.status(404).json({ message: 'Không tìm thấy giá phòng' });
    await price.destroy();
    return res.status(200).json({ message: 'Xóa giá phòng thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};

exports.getRoomPrices = async (req, res) => {
  try {
    const { room_type_id } = req.query;
    const where = {};
    if (room_type_id) where.room_type_id = room_type_id;
    const prices = await RoomPrice.findAll({ where, order: [['start_date', 'ASC']] });
    return res.status(200).json({ prices });
  } catch (error) {
    return res.status(500).json({ message: 'Có lỗi xảy ra!', error: error.message });
  }
};


