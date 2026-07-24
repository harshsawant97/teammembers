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

export const manualMark = async (req: Request, res: Response) => {
  try {
    const { sessionId, studentId, status } = req.body;
    if (!sessionId || !studentId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const studentData = studentDoc.data();

    const attId = `${sessionId}_${studentId}`;
    const attRef = db.collection('attendances').doc(attId);

    if (status === 'PRESENT') {
      const attData = {
        sessionId,
        studentId,
        confidenceScore: 1.0, // Manual override implies 100% confidence
        status: 'PRESENT',
        timestamp: new Date().toISOString(),
        isManualOverride: true
      };
      await attRef.set(attData);

      io.to(sessionId).emit('attendance_marked', {
        student: {
          id: studentDoc.id,
          firstName: studentData?.firstName,
          lastName: studentData?.lastName,
        },
        status: 'PRESENT',
        confidence: 1.0,
        isManualOverride: true
      });

      return res.status(200).json({ message: 'Marked present', attendance: { id: attId, ...attData } });
    } else if (status === 'ABSENT') {
      await attRef.delete();
      
      // For real-time sync, emit an 'attendance_removed' event so Faculty dashboard updates if open
      io.to(sessionId).emit('attendance_removed', { studentId });
      
      return res.status(200).json({ message: 'Marked absent (record removed)' });
    } else {
      return res.status(400).json({ error: 'Invalid status' });
    }
  } catch (error) {
    console.error('Error in manual attendance override:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
