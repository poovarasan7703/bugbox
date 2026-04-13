import express from 'express';
import {
  reportBug,
  getBugs,
  getBugById,
  updateStatus,
  addComment,
  generateBugDescription,
} from '../controllers/bugController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.post('/report-bug', restrictTo('tester'), upload.single('video'), reportBug);
router.post('/generate-description', restrictTo('tester'), generateBugDescription);
router.get('/', getBugs);
router.get('/:id', getBugById);
router.put('/:id/status', restrictTo('developer'), updateStatus);
router.post('/:id/comment', restrictTo('developer'), addComment);

export default router;
