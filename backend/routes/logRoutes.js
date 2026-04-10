import express from 'express';
import {
  collectLogs,
  getBugLogs,
  getLogSummary,
  deleteOldLogs,
} from '../controllers/logController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/collect', collectLogs);
router.get('/:bugId', restrictTo('developer'), getBugLogs);
router.get('/:bugId/summary', getBugLogs);
router.delete('/cleanup/old', restrictTo('admin'), deleteOldLogs);

export default router;
