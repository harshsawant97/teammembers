import { Request, Response } from 'express';
import { db } from '../utils/firebase';
import { io } from '../server';

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { sessionId, studentId, confidenceScore } = req.body;

    if (!sessionId || !studentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch student details to emit to frontend
    const studentDoc = await db.collection('students').doc(studentId).get();

    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const studentData = studentDoc.data();

    // Deduplication check using deterministic ID and Transaction to prevent race conditions
    const attId = `${sessionId}_${studentId}`;
    const attRef = db.collection('attendances').doc(attId);
    
    let isNew = false;
    let attData: any = null;

    await db.runTransaction(async (t) => {
      const doc = await t.get(attRef);
      if (!doc.exists) {
        isNew = true;
        attData = {
          sessionId,
          studentId,
          confidenceScore: confidenceScore || 0.95,
          status: 'PRESENT',
          timestamp: new Date().toISOString()
        };
        t.set(attRef, attData);
      }
    });

    if (!isNew) {
      return res.status(200).json({ message: 'Attendance already recorded for this student in this session.' });
    }

    // Emit live update to Dashboard via WebSocket
    io.to(sessionId).emit('attendance_marked', {
      student: {
        id: studentDoc.id,
        firstName: studentData?.firstName,
        lastName: studentData?.lastName,
      },
      status: 'PRESENT',
      confidence: attData.confidenceScore
    });

    res.status(201).json({ message: 'Attendance recorded', attendance: { id: attId, ...attData } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
