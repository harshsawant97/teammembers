import { Router } from 'express';
import { getStudents, registerStudent, getEmbeddings, updateStudent, deleteStudent } from '../controllers/student.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', getStudents);
router.post('/', registerStudent);
router.get('/embeddings', getEmbeddings);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
