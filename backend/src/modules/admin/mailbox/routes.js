const express = require('express');
const { z } = require('zod');
const validate = require('../../../middleware/validate');
const asyncHandler = require('../../../utils/asyncHandler');
const logAudit = require('../../../utils/audit');
const {
  listMessages,
  getMessage,
  searchRecipients,
  sendMessage,
} = require('./service');

const router = express.Router();

const listSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),
});

const idSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const recipientsSchema = z.object({
  query: z.object({
    q: z.string().max(200).optional(),
  }),
});

const sendSchema = z.object({
  body: z.object({
    toEmail: z.string().email().optional().nullable(),
    toUserId: z.coerce.number().int().positive().optional().nullable(),
    toName: z.string().max(200).optional().nullable(),
    subject: z.string().min(1).max(300),
    bodyText: z.string().min(1).max(20000),
  }).superRefine((value, ctx) => {
    if (!value.toEmail && !value.toUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide toEmail or toUserId.',
        path: ['toEmail'],
      });
    }
  }),
});

router.get(
  '/',
  validate(listSchema),
  asyncHandler(async (req, res) => {
    const data = await listMessages(req.validated.query);
    res.json(data);
  })
);

router.get(
  '/recipients',
  validate(recipientsSchema),
  asyncHandler(async (req, res) => {
    const data = await searchRecipients(req.validated.query.q || '');
    res.json(data);
  })
);

router.get(
  '/:id',
  validate(idSchema),
  asyncHandler(async (req, res) => {
    const message = await getMessage(req.validated.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    return res.json({ message });
  })
);

router.post(
  '/send',
  validate(sendSchema),
  asyncHandler(async (req, res) => {
    try {
      const result = await sendMessage({
        actorId: req.user.id,
        ...req.validated.body,
      });

      await logAudit({
        actorId: req.user.id,
        action: 'admin_mailbox.send',
        entityType: 'admin_mailbox_message',
        entityId: result.message.id,
        metadata: {
          toEmail: result.message.toEmail,
          toUserId: result.message.toUserId,
          subject: result.message.subject,
          testMode: result.testMode,
        },
      });

      return res.status(201).json({
        ok: true,
        message: result.message,
        testMode: result.testMode,
      });
    } catch (error) {
      if (error.messageRecord) {
        await logAudit({
          actorId: req.user.id,
          action: 'admin_mailbox.send_failed',
          entityType: 'admin_mailbox_message',
          entityId: error.messageRecord.id,
          metadata: {
            toEmail: error.messageRecord.toEmail,
            subject: error.messageRecord.subject,
            error: error.message,
          },
        });
        return res.status(error.status || 502).json({
          error: error.message,
          message: error.messageRecord,
        });
      }
      throw error;
    }
  })
);

module.exports = router;
