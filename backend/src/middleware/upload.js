const path = require('path');
const multer = require('multer');
const env = require('../config/env');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../..', env.uploadDir),
  filename: (req, file, callback) => {
    const safeName = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
