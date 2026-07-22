import { Request, Response } from 'express';
import { db } from '../utils/firebase';
import { io } from '../server';

export const createSession = async (req: Request, res: Response) => {
  try {
    const { classId } = req.body;
    
    const newSessionRef = db.collection('sessions').doc();
    const sessionData = {
      classId,
      status: 'SCHEDULED',
      startTime: new Date().toISOString()
    };
    
    await newSessionRef.set(sessionData);

    res.status(201).json({ id: newSessionRef.id, ...sessionData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('sessions').orderBy('startTime', 'desc').get();
    
    const sessions = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get class info
      const classDoc = await db.collection('classes').doc(data.classId).get();
      const classData = classDoc.exists ? { id: classDoc.id, ...classDoc.data() } : null;

      // Get attendance
      const attendanceSnap = await db.collection('attendances').where('sessionId', '==', doc.id).get();
      const attendance = [];
      
      for (const attDoc of attendanceSnap.docs) {
        const attData = attDoc.data();
        const studentDoc = await db.collection('students').doc(attData.studentId).get();
        attendance.push({
          id: attDoc.id,
          ...attData,
          student: studentDoc.exists ? { id: studentDoc.id, ...studentDoc.data() } : null
        });
      }

      sessions.push({
        id: doc.id,
        ...data,
        class: classData,
        attendance
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const startSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionRef = db.collection('sessions').doc(id);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

    await sessionRef.update({ status: 'ACTIVE' });
    io.to(id).emit('session_status_changed', { status: 'ACTIVE' });
    
    res.json({ message: 'Session started successfully', session: { id, ...sessionDoc.data(), status: 'ACTIVE' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const endSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionRef = db.collection('sessions').doc(id);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

    const endTime = new Date().toISOString();
    await sessionRef.update({ status: 'COMPLETED', endTime });
    
    io.to(id).emit('session_status_changed', { status: 'COMPLETED' });
    
    res.json({ message: 'Session ended', session: { id, ...sessionDoc.data(), status: 'COMPLETED', endTime } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
