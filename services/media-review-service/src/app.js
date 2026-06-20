const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const env = require('./config/env');
const queueRoutes = require('./routes/queue');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireServiceKey(req, res, next) {
  if (!env.apiKey) {
    return next();
  }

  const providedKey = req.headers['x-media-review-key'];
  if (providedKey !== env.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'sitecrew-media-review-service' });
});

app.use('/api/queue', requireServiceKey, queueRoutes);
app.use('/review', express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.redirect('/review/');
});

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
