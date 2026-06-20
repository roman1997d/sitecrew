const env = require('../config/env');

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function buildPrompt(input, scanText) {
  return [
    'Analyze this SiteCrew platform content for moderation risk.',
    'Return ONLY valid JSON with keys: spam, scam, abuse, quality.',
    'Each value must be an integer from 0 to 100.',
    'Do not approve, reject, or recommend actions.',
    `contentType: ${input.contentType}`,
    input.title ? `title: ${input.title}` : null,
    `text: ${scanText}`,
  ].filter(Boolean).join('\n');
}

async function runAiAnalysis(input, scanText) {
  if (!env.aiAnalysisEnabled || !env.openAiApiKey) {
    return {
      applied: false,
      scores: null,
      error: null,
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.openAiModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a content risk scoring assistant for a construction jobs platform. Respond with JSON only.',
          },
          {
            role: 'user',
            content: buildPrompt(input, scanText),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        applied: false,
        scores: null,
        error: `OpenAI request failed: ${response.status} ${errorText.slice(0, 200)}`,
      };
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      applied: true,
      scores: {
        spam: clampScore(parsed.spam),
        scam: clampScore(parsed.scam),
        abuse: clampScore(parsed.abuse),
        quality: clampScore(parsed.quality),
      },
      error: null,
    };
  } catch (error) {
    return {
      applied: false,
      scores: null,
      error: error.message,
    };
  }
}

module.exports = { runAiAnalysis };
