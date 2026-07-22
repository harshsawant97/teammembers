import { Router } from 'express';
import { handleWebhook } from '../controllers/attendance.controller';

const router = Router();

// Internal route called by AI Python Service
router.post('/webhook', handleWebhook);

export default router;
