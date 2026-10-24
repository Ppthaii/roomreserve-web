const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ตรวจสอบและสร้างโฟลเดอร์สำหรับเก็บไฟล์ที่ปลอดภัย
const agendasDir = path.join(__dirname, '../../uploads/agendas');
const inspectionsDir = path.join(__dirname, '../../uploads/inspections');
if (!fs.existsSync(agendasDir)) fs.mkdirSync(agendasDir, { recursive: true });
if (!fs.existsSync(inspectionsDir)) fs.mkdirSync(inspectionsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'inspection_file') {
      cb(null, inspectionsDir);
    } else {
      cb(null, agendasDir);
    }
  },
  filename: (req, file, cb) => {
    // สุ่มชื่อไฟล์ด้วย UUID / Random Bytes ป้องกัน Path Traversal และชื่อชนกัน
    const randomName = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  }
});

// ตรวจสอบความถูกต้องของประเภทไฟล์ฝั่ง Server (Server-Side Validation)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('อนุญาตเฉพาะไฟล์ PDF, JPG และ PNG เท่านั้น');
    err.status = 400;
    cb(err, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // จำกัดขนาดไม่เกิน 5 MB
  },
  fileFilter
});

module.exports = upload;
