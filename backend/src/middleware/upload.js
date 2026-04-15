const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');

// Ensure upload directories exist
['photos', 'documents', 'payments', 'qr', 'logos', 'org'].forEach(dir => {
  const dirPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const fieldName = file.fieldname;
    let sub = 'documents';
    if (fieldName.includes('photo') || fieldName.includes('image')) sub = 'photos';
    if (fieldName.includes('payment') || fieldName.includes('screenshot')) sub = 'payments';
    if (fieldName.includes('qr')) sub = 'qr';
    if (fieldName.includes('logo')) sub = 'logos';
    cb(null, path.join(UPLOAD_DIR, sub));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error(`File type ${ext} not allowed`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_DIR };
