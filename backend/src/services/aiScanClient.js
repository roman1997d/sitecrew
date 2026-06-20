const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const AI_SCAN_SERVICE_URL = process.env.AI_SCAN_SERVICE_URL || 'http://localhost:4001';
const AI_SCAN_API_KEY = process.env.AI_SCAN_API_KEY || '';

async function scanContent(payload) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (AI_SCAN_API_KEY) {
    headers['X-AI-Scan-Key'] = AI_SCAN_API_KEY;
  }

  const response = await fetch(`${AI_SCAN_SERVICE_URL}/api/scan`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.error || `AI Scan Service failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

module.exports = {
  scanContent,
};
