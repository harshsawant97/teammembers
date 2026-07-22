import { Router } from 'express';
import { getSessions, createSession, startSession, endSession } from '../controllers/session.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', getSessions);
router.post('/', createSession);
router.post('/:id/start', startSession);
router.post('/:id/end', endSession);

export default router;
