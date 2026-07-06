const express = require('express');
const { z } = require('zod');
const validate = require('../../../middleware/validate');
const asyncHandler = require('../../../utils/asyncHandler');
const logAudit = require('../../../utils/audit');
const {
  generateFakeWorkers,
  generateFakeCompanies,
  getSimulatorStats,
  purgeFakeAccounts,
} = require('./generator');

const router = express.Router();

const countSchema = z.object({
  body: z.object({
    count: z.number().int().min(1).max(50),
  }),
});

const workerCountSchema = z.object({
  body: z.object({
    count: z.number().int().min(1).max(100),
  }),
});

const purgeSchema = z.object({
  body: z.object({
    confirm: z.literal('DELETE-FPD-ACCOUNTS'),
  }),
});

router.get('/status', asyncHandler(async (req, res) => {
  const stats = await getSimulatorStats();
  res.json({ ok: true, stats });
}));

router.post('/workers', validate(workerCountSchema), asyncHandler(async (req, res) => {
  const { count } = req.validated.body;
  const result = await generateFakeWorkers(count);

  await logAudit({
    actorId: req.user.id,
    action: 'fake_simulator.workers_created',
    entityType: 'fake_simulator',
    entityId: null,
    metadata: { count: result.count },
  });

  res.status(201).json({ ok: true, ...result });
}));

router.post('/companies', validate(countSchema), asyncHandler(async (req, res) => {
  const { count } = req.validated.body;
  const result = await generateFakeCompanies(count);

  await logAudit({
    actorId: req.user.id,
    action: 'fake_simulator.companies_created',
    entityType: 'fake_simulator',
    entityId: null,
    metadata: { count: result.count, jobsCreated: result.jobsCreated },
  });

  res.status(201).json({ ok: true, ...result });
}));

router.post('/purge', validate(purgeSchema), asyncHandler(async (req, res) => {
  const result = await purgeFakeAccounts();

  await logAudit({
    actorId: req.user.id,
    action: 'fake_simulator.purged',
    entityType: 'fake_simulator',
    entityId: null,
    metadata: { deleted: result.deleted },
  });

  res.json({ ok: true, ...result });
}));

module.exports = router;
