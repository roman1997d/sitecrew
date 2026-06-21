const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://romandemian@localhost:5432/sitecrew_backend',
  jwtSecret: process.env.JWT_SECRET || 'sitecrew-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  aiScanServiceUrl: process.env.AI_SCAN_SERVICE_URL || 'http://localhost:4001',
  aiScanApiKey: process.env.AI_SCAN_API_KEY || '',
  aiScanEnabled: process.env.AI_SCAN_ENABLED !== 'false',
  mediaReviewServiceUrl: process.env.MEDIA_REVIEW_SERVICE_URL || 'http://localhost:4002',
  mediaReviewApiKey: process.env.MEDIA_REVIEW_API_KEY || '',
};

module.exports = env;
