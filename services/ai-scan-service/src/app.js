const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const scanRoutes = require('./routes/scan');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireServiceKey(req, res, next) {
  if (!env.apiKey) {
    return next();
  }

  const providedKey = req.headers['x-ai-scan-key'];
  if (providedKey !== env.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'sitecrew-ai-scan-service',
    aiAnalysisEnabled: env.aiAnalysisEnabled && Boolean(env.openAiApiKey),
  });
});

app.use('/api/scan', requireServiceKey, scanRoutes);

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
