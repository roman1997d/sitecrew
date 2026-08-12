const express = require('express');
const { z } = require('zod');
const validate = require('../../../middleware/validate');
const asyncHandler = require('../../../utils/asyncHandler');
const logAudit = require('../../../utils/audit');
const { EMAIL_CONTROL_MODE_MAP } = require('./modes');
const {
  getOverview,
  getRecipientEstimate,
  setAutoMode,
  setAutoModes,
  sendModeCampaign,
} = require('./service');

const router = express.Router();

const modeParamSchema = z.object({
  params: z.object({
    mode: z.string().min(1).refine((value) => Boolean(EMAIL_CONTROL_MODE_MAP[value]), {
      message: 'Unknown email control mode.',
    }),
  }),
});

const autoModeSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
  }),
  params: z.object({
    mode: z.string().min(1).refine((value) => Boolean(EMAIL_CONTROL_MODE_MAP[value]), {
      message: 'Unknown email control mode.',
    }),
  }),
});

const autoModesBulkSchema = z.object({
  body: z.object({
    autoModes: z.record(z.string(), z.boolean()),
  }),
});

const sendSchema = z.object({
  params: z.object({
    mode: z.string().min(1).refine((value) => Boolean(EMAIL_CONTROL_MODE_MAP[value]), {
      message: 'Unknown email control mode.',
    }),
  }),
  body: z.object({
    confirm: z.literal(true),
    dryRun: z.boolean().optional(),
  }),
});

router.get('/overview', asyncHandler(async (req, res) => {
  const data = await getOverview();
  res.json(data);
}));

router.get(
  '/modes/:mode/recipients',
  validate(modeParamSchema),
  asyncHandler(async (req, res) => {
    const data = await getRecipientEstimate(req.validated.params.mode);
    res.json({ ok: true, ...data });
  })
);

router.put(
  '/modes/:mode/auto',
  validate(autoModeSchema),
  asyncHandler(async (req, res) => {
    const { mode } = req.validated.params;
    const { enabled } = req.validated.body;
    const autoModes = await setAutoMode(mode, enabled, req.user.id);

    await logAudit({
      actorId: req.user.id,
      action: 'email_control.auto_mode_updated',
      entityType: 'email_control',
      entityId: null,
      metadata: { mode, enabled },
    });

    res.json({ ok: true, mode, enabled, autoModes });
  })
);

router.put(
  '/auto-modes',
  validate(autoModesBulkSchema),
  asyncHandler(async (req, res) => {
    const autoModes = await setAutoModes(req.validated.body.autoModes, req.user.id);

    await logAudit({
      actorId: req.user.id,
      action: 'email_control.auto_modes_updated',
      entityType: 'email_control',
      entityId: null,
      metadata: { autoModes: req.validated.body.autoModes },
    });

    res.json({ ok: true, autoModes });
  })
);

router.post(
  '/modes/:mode/send',
  validate(sendSchema),
  asyncHandler(async (req, res) => {
    const { mode } = req.validated.params;
    const { dryRun = false } = req.validated.body;
    const result = await sendModeCampaign(mode, {
      actorId: req.user.id,
      dryRun,
    });

    await logAudit({
      actorId: req.user.id,
      action: dryRun ? 'email_control.send_dry_run' : 'email_control.send_requested',
      entityType: 'email_control',
      entityId: null,
      metadata: {
        mode,
        status: result.status,
        recipientCount: result.recipientCount,
        sentCount: result.sentCount,
      },
    });

    res.json(result);
  })
);

module.exports = router;
