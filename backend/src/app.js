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
const apiLogger = require('./middleware/apiLogger');
const adminRoutes = require('./modules/admin/routes');

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
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLogger);
app.use('/uploads', express.static(path.join(__dirname, '..', env.uploadDir)));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'sitecrew-backend' });
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
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
  });
});

module.exports = app;
