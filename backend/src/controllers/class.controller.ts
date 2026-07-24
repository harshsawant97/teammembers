import { Request, Response } from 'express';
import { db } from '../utils/firebase';

export const getClasses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const role = (req as any).user.role;

    const classesRef = db.collection('classes');
    let snapshot;
    
    if (role === 'ADMIN' || role === 'STUDENT') {
      snapshot = await classesRef.get();
    } else {
      snapshot = await classesRef.where('facultyId', '==', userId).get();
    }

    const classes = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Fetch latest session for this class
      const sessionsRef = db.collection('sessions');
      const latestSession = await sessionsRef
        .where('classId', '==', doc.id)
        .orderBy('startTime', 'desc')
        .limit(1)
        .get();
        
      const sessions = latestSession.empty ? [] : [{
        id: latestSession.docs[0].id,
        ...latestSession.docs[0].data()
      }];

      classes.push({
        id: doc.id,
        ...data,
        sessions
      });
    }

    // Fetch all students for the demo
    const studentsSnap = await db.collection('students').get();
    const allStudents = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const classesWithStudents = classes.map(c => ({
      ...c,
      students: allStudents
    }));

    res.json(classesWithStudents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClass = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, courseCode, semester } = req.body;
    
    if (!name || !courseCode || !semester) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newClassRef = db.collection('classes').doc();
    const classData = {
      name,
      courseCode,
      semester,
      facultyId: userId,
      createdAt: new Date().toISOString()
    };
    
    await newClassRef.set(classData);

    res.status(201).json({ id: newClassRef.id, ...classData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const classRef = db.collection('classes').doc(id);
    const classDoc = await classRef.get();
    
    if (!classDoc.exists) return res.status(404).json({ error: 'Class not found' });
    if (classDoc.data()?.facultyId !== userId) return res.status(403).json({ error: 'Forbidden' });

    // Clean up dependent sessions/attendance
    const sessions = await db.collection('sessions').where('classId', '==', id).get();
    
    const batch = db.batch();
    
    // Delete class
    batch.delete(classRef);
    
    // Delete sessions
    for (const session of sessions.docs) {
      batch.delete(session.ref);
      
      // Delete attendance for this session
      const attendances = await db.collection('attendances').where('sessionId', '==', session.id).get();
      attendances.docs.forEach(att => batch.delete(att.ref));
    }

    await batch.commit();

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
