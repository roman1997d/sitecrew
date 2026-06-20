const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MEDIA_REVIEW_SERVICE_URL = process.env.MEDIA_REVIEW_SERVICE_URL || 'http://localhost:4002';
const MEDIA_REVIEW_API_KEY = process.env.MEDIA_REVIEW_API_KEY || '';

function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (MEDIA_REVIEW_API_KEY) {
    headers['X-Media-Review-Key'] = MEDIA_REVIEW_API_KEY;
  }

  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${MEDIA_REVIEW_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Media Review Service failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function getStats() {
  return request('/api/queue/stats');
}

async function getNext() {
  return request('/api/queue/next');
}

async function approve(id) {
  return request(`/api/queue/${id}/approve`, { method: 'POST' });
}

async function reject(id) {
  return request(`/api/queue/${id}/reject`, { method: 'POST' });
}

module.exports = {
  getStats,
  getNext,
  approve,
  reject,
};
