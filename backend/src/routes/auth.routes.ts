import { Router } from 'express';
import { getMe, firebaseLogin } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/firebase', firebaseLogin);
router.get('/me', requireAuth, getMe);

export default router;
