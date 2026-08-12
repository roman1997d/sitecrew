const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const env = require('./config/env');

const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const workerRoutes = require('./modules/workers/routes');
const companyRoutes = require('./modules/companies/routes');
const jobRoutes = require('./modules/jobs/routes');
const applicationRoutes = require('./modules/applications/routes');
const feedRoutes = require('./modules/feed/routes');
const storyRoutes = require('./modules/stories/routes');
const followRoutes = require('./modules/follows/routes');
const messageRoutes = require('./modules/messages/routes');
const notificationRoutes = require('./modules/notifications/routes');
const marketRoutes = require('./modules/market/routes');
const marketplaceRoutes = require('./modules/marketplace/routes');
const contactRoutes = require('./modules/contact/routes');
const apiLogger = require('./middleware/apiLogger');
const requireAuth = require('./middleware/auth');
const requireRole = require('./middleware/requireRole');
const emailControl = require('./modules/admin/emailControl');
const adminRoutes = require('./modules/admin/routes');
const { isEmailConfigured } = require('./utils/email');
const { isRecaptchaConfigured, getRecaptchaPublicConfig } = require('./utils/recaptcha');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.frontendOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(apiLogger);
app.use('/uploads', express.static(path.join(__dirname, '..', env.uploadDir)));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'sitecrew-backend',
    emailConfigured: isEmailConfigured(),
    emailControl: true,
    recaptcha: getRecaptchaPublicConfig(),
    publicUrl: env.publicUrl,
  });
});

// Public probe so deploys can verify Email Control routes without admin auth
app.get('/api/health/email-control', (req, res) => {
  res.json({
    ok: true,
    mounted: true,
    routes: [
      'GET /api/admin/email-control/overview',
      'GET /api/admin/email-control/test-mode',
      'POST /api/admin/email-control/test-mode',
      'PUT /api/admin/email-control/test-mode',
      'GET /api/admin/email-control/modes/:mode/recipients',
      'PUT /api/admin/email-control/modes/:mode/auto',
      'POST /api/admin/email-control/modes/:mode/send',
    ],
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/conversations', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/contact', contactRoutes);

// Mount Email Control directly (auth here) so it cannot be missed by nested admin router order
app.use(
  '/api/admin/email-control',
  requireAuth,
  requireRole('admin', 'superadmin'),
  emailControl.router
);

app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || error.statusCode || 500;
  const message = error.type === 'entity.too.large'
    ? 'Upload too large. Use smaller product images (max 3 per ad).'
    : (error.message || 'Internal server error');
  res.status(status).json({ error: message });
});

module.exports = app;
