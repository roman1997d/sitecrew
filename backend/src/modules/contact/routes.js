const express = require('express');
const { z } = require('zod');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../utils/asyncHandler');
const { isEmailConfigured, sendContactFormEmail } = require('../../utils/email');
const { verifyRecaptchaToken } = require('../../utils/recaptcha');
const env = require('../../config/env');

const router = express.Router();

const contactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Please enter your name.'),
    email: z.string().email('Please enter a valid email address.'),
    subject: z.string().trim().min(3, 'Please enter a subject.').max(120),
    message: z.string().trim().min(10, 'Please enter a message with at least 10 characters.').max(5000),
    recaptchaToken: z.string().min(1, 'Security verification failed. Please refresh the page and try again.'),
  }),
});

router.post('/', validate(contactSchema), asyncHandler(async (req, res) => {
  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'Contact form email is not configured yet. Please try again later.' });
  }

  const { name, email, subject, message, recaptchaToken } = req.validated.body;
  const remoteIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const recaptcha = await verifyRecaptchaToken(recaptchaToken, remoteIp, 'contact');

  if (!recaptcha.success) {
    return res.status(400).json({ error: recaptcha.error });
  }

  await sendContactFormEmail({
    name,
    email,
    subject,
    message,
    to: env.contactEmail,
  });

  res.json({
    message: 'Thanks for contacting SiteCrew. We will get back to you within 2 business days.',
  });
}));

module.exports = router;
