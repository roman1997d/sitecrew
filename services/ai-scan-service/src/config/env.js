const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = {
  port: Number(process.env.PORT || 4001),
  apiKey: process.env.AI_SCAN_API_KEY || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  aiAnalysisEnabled: process.env.AI_ANALYSIS_ENABLED === 'true',
};

module.exports = env;
