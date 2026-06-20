const express = require('express');
const {
  getQueueStats,
  getNextQueueItem,
  approveQueueItem,
  rejectQueueItem,
} = require('../services/queueService');

const router = express.Router();

router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/next', async (req, res, next) => {
  try {
    const data = await getNextQueueItem();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve', async (req, res, next) => {
  try {
    const data = await approveQueueItem(Number(req.params.id));
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reject', async (req, res, next) => {
  try {
    const data = await rejectQueueItem(Number(req.params.id));
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
