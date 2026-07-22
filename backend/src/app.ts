import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import attendanceRoutes from './routes/attendance.routes';
import classRoutes from './routes/class.routes';
import studentRoutes from './routes/student.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/students', studentRoutes);

export default app;
