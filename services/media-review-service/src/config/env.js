const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = {
  port: Number(process.env.PORT || 4002),
  databaseUrl: process.env.DATABASE_URL || 'postgres://romandemian@localhost:5432/sitecrew_backend',
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(__dirname, '../../../../backend/uploads'),
  publicUploadBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL || 'http://localhost:4000',
  apiKey: process.env.MEDIA_REVIEW_API_KEY || '',
};

module.exports = env;
