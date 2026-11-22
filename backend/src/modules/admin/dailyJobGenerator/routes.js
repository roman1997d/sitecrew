const express = require('express');
const { z } = require('zod');
const validate = require('../../../middleware/validate');
const asyncHandler = require('../../../utils/asyncHandler');
const logAudit = require('../../../utils/audit');
const {
  getStatus,
  setEnabled,
  runDailyJobGenerator,
} = require('./service');

const router = express.Router();

const enabledSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
  }),
});

const runSchema = z.object({
  body: z.object({
    force: z.boolean().optional(),
  }).optional(),
});

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const status = await getStatus();
    res.json({ ok: true, status });
  })
);

router.put(
  '/enabled',
  validate(enabledSchema),
  asyncHandler(async (req, res) => {
    const status = await setEnabled(req.validated.body.enabled);

    await logAudit({
      actorId: req.user.id,
      action: req.validated.body.enabled
        ? 'daily_job_generator.enabled'
        : 'daily_job_generator.disabled',
      entityType: 'daily_job_generator',
      entityId: null,
      metadata: { enabled: status.enabled },
    });

    res.json({ ok: true, status });
  })
);

router.post(
  '/run',
  validate(runSchema),
  asyncHandler(async (req, res) => {
    const force = Boolean(req.validated.body?.force);
    const result = await runDailyJobGenerator({
      force,
      ignoreEnabled: true,
    });

    await logAudit({
      actorId: req.user.id,
      action: 'daily_job_generator.run',
      entityType: 'daily_job_generator',
      entityId: null,
      metadata: {
        force,
        skipped: Boolean(result.skipped),
        reason: result.reason || null,
        createdJobs: result.createdJobs || 0,
        deletedJobs: result.deletedJobs || 0,
      },
    });

    res.json({ ok: true, ...result });
  })
);

module.exports = router;
