import { Router } from 'express';
import { handleWebhook, manualMark } from '../controllers/attendance.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Internal route called by AI Python Service
router.post('/webhook', handleWebhook);

// Faculty manual attendance override
router.post('/manual', requireAuth, requireRole(['FACULTY', 'ADMIN']), manualMark);

export default router;
