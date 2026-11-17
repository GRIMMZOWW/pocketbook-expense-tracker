const multer = require('multer');
const HttpError = require('./HttpError');

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    const err = new HttpError(400, 'Attachment must be a JPG, PNG, GIF, WebP or PDF.');
    err.errors = { attachment: err.message };
    cb(err);
  },
});

// The browser-supplied mimetype can be faked, so check the first bytes of the file too.
function looksLikeType(buffer, mimetype) {
  const hex = buffer.subarray(0, 12).toString('hex');
  if (mimetype === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (mimetype === 'image/png') return hex.startsWith('89504e470d0a1a0a');
  if (mimetype === 'image/gif') return hex.startsWith('47494638');
  if (mimetype === 'image/webp') return hex.startsWith('52494646') && hex.slice(16, 24) === '57454250';
  if (mimetype === 'application/pdf') return hex.startsWith('25504446');
  return false;
}

module.exports = { upload: upload.single('attachment'), looksLikeType };
