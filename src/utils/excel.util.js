const ExcelJS = require('exceljs');
const moment = require('moment-timezone');

class ExcelService {
  constructor() {
    this.workbook = null;
  }

  // Tạo workbook mới
  createWorkbook() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Bean Hotel';
    this.workbook.created = new Date();
    return this.workbook;
  }

  // Tạo worksheet mới
  createWorksheet(name) {
    if (!this.workbook) {
      this.createWorkbook();
    }
    return this.workbook.addWorksheet(name);
  }

  // Format header row
  formatHeaderRow(worksheet, row) {
    row.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2c3e50' }
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // Format number cell
  formatNumberCell(cell, format = '#,##0') {
    cell.numFmt = format;
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  // Format currency cell (VND)
  formatCurrencyCell(cell) {
    cell.numFmt = '#,##0';
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  // Xuất workbook ra buffer
  async writeToBuffer() {
    if (!this.workbook) {
      throw new Error('Workbook chưa được tạo');
    }
    return await this.workbook.xlsx.writeBuffer();
  }
}

// Singleton instance
const excelService = new ExcelService();

module.exports = excelService;

