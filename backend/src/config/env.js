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
  publicUrl: (process.env.PUBLIC_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')[0]
    .trim(),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || '',
  emailFromName: process.env.EMAIL_FROM_NAME || 'SiteCrew',
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60),
  contactEmail: process.env.CONTACT_EMAIL || 'info@sitecrew.uk',
  recaptchaSiteKey: (process.env.RECAPTCHA_SITE_KEY || '').trim(),
  recaptchaProjectId: (process.env.RECAPTCHA_PROJECT_ID || '').trim(),
  recaptchaSecretKey: (process.env.RECAPTCHA_SECRET_KEY || '').trim(),
  recaptchaMinScore: Number(process.env.RECAPTCHA_MIN_SCORE || 0.5),
};

module.exports = env;
