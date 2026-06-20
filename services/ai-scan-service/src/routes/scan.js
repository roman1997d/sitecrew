const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { scanContent } = require('../engine/scanService');

const router = express.Router();

const CONTENT_TYPES = [
  'feed_post',
  'job_post',
  'comment',
  'message',
  'worker_review',
  'company_review',
  'worker_profile',
  'company_profile',
];

const scanSchema = z.object({
  body: z.object({
    contentType: z.enum(CONTENT_TYPES),
    text: z.string().min(1).max(10000),
    title: z.string().max(500).optional(),
    recentTexts: z.array(z.string().max(10000)).max(100).optional(),
    notAllowedTerms: z.array(z.object({
      term: z.string().min(1).max(200),
      category: z.string().max(40).optional(),
      risk_score: z.number().int().min(1).max(100).optional(),
    })).max(500).optional(),
  }),
});

router.post('/', validate(scanSchema), async (req, res, next) => {
  try {
    const result = await scanContent(req.validated.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
