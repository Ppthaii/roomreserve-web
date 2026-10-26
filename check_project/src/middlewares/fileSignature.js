const fs = require('fs');
const { logAudit } = require('./auth');

async function verifyFileSignature(req, res, next) {

  if (!req.file || !req.file.path) {
    return next();
  }

  const filePath = req.file.path;
  const mimeType = req.file.mimetype;

  try {

    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    let isValid = false;

    if (mimeType === 'application/pdf') {
      isValid = buffer.length >= 4 &&
                buffer[0] === 0x25 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x44 &&
                buffer[3] === 0x46;
    }

    else if (mimeType === 'image/jpeg') {
      isValid = buffer.length >= 3 &&
                buffer[0] === 0xFF &&
                buffer[1] === 0xD8 &&
                buffer[2] === 0xFF;
    }

    else if (mimeType === 'image/png') {
      isValid = buffer.length >= 8 &&
                buffer[0] === 0x89 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x4E &&
                buffer[3] === 0x47 &&
                buffer[4] === 0x0D &&
                buffer[5] === 0x0A &&
                buffer[6] === 0x1A &&
                buffer[7] === 0x0A;
    }

    if (!isValid) {

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error('Failed to unlink rejected file:', unlinkErr.message);
        }
      }

      await logAudit({
        userId: req.session ? req.session.userId : null,
        username: req.session ? req.session.username : 'anonymous',
        roleName: req.session ? req.session.roleName : 'guest',
        action: 'FILE_REJECTED',
        resource: 'FILE_UPLOAD',
        resourceId: req.file.originalname,
        status: 'DENIED',
        details: `ปฏิเสธไฟล์ "${req.file.originalname}": เนื้อหาไบต์จริงไม่ตรงกับ MIME Type "${mimeType}" (ตรวจพบลายเซ็นไฟล์ปลอมแปลง)`,
        ip: req.ip,
        ua: req.get('user-agent')
      });

      const err = new Error('ไฟล์ไม่ถูกต้อง: โครงสร้างเนื้อหาไฟล์จริงไม่ตรงกับประเภทไฟล์ที่อนุญาต (ตรวจพบลายเซ็นไฟล์ไม่ถูกต้อง)');
      err.status = 400;
      return next(err);
    }

    next();
  } catch (err) {
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
    next(err);
  }
}

module.exports = verifyFileSignature;
