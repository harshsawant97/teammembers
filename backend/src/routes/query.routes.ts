import { Router } from 'express';
import { createQuery, getQueries, addRemark } from '../controllers/query.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', getQueries);
router.post('/', createQuery);
router.patch('/:id/remark', requireRole(['FACULTY', 'ADMIN', 'faculty', 'admin']), addRemark);

export default router;
