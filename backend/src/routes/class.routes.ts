import { Router } from 'express';
import { getClasses, createClass, deleteClass } from '../controllers/class.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', getClasses);
router.post('/', createClass);
router.delete('/:id', deleteClass);

export default router;
