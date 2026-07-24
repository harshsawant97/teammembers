import { Request, Response } from 'express';
import { db } from '../utils/firebase';
import { createNotification } from './notification.controller';

export const createQuery = async (req: Request, res: Response) => {
  try {
    const { subject, message, semester, course } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const studentEmail = userDoc.data()?.email || 'Unknown';
    const studentId = userDoc.data()?.studentId || userId;

    const queryData = {
      studentId,
      studentEmail,
      subject,
      semester: semester || '',
      course: course || '',
      message,
      status: 'OPEN',
      remark: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('queries').add(queryData);
    
    let studentName = studentEmail;
    if (studentId) {
      const studentDoc = await db.collection('students').doc(studentId).get();
      if (studentDoc.exists) {
        const sd = studentDoc.data();
        studentName = `${sd?.firstName} ${sd?.lastName}`;
      }
    }

    // Notify all faculty
    await createNotification('FACULTY', 'New Student Query', `Query from ${studentName}: ${subject}`, 'QUERY');

    res.status(201).json({ id: docRef.id, ...queryData });
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQueries = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;
    
    if (!role || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    let snapshot;
    if (role === 'FACULTY' || role === 'admin') {
      snapshot = await db.collection('queries').orderBy('createdAt', 'desc').get();
    } else {
      const userDoc = await db.collection('users').doc(userId).get();
      const studentId = userDoc.data()?.studentId || userId;
      snapshot = await db.collection('queries').where('studentId', '==', studentId).get();
      // Workaround: firestore doesn't support orderby with inequality/equality without a composite index
      // We will sort in memory
    }
    
    let queries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (role !== 'FACULTY' && role !== 'admin') {
      queries.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addRemark = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    
    const docRef = db.collection('queries').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Query not found' });
    }
    
    const queryData = doc.data();
    
    await docRef.update({
      remark,
      status: 'RESOLVED',
      updatedAt: new Date().toISOString()
    });

    if (queryData?.userId || queryData?.studentId) {
      // The old queries used uid (which we stored in studentId), the new ones use studentId
      const targetId = queryData.userId || queryData.studentId;
      await createNotification(targetId, 'Query Responded', `A faculty member has added a remark to your query: ${queryData.subject}`, 'REMARK');
    }

    res.json({ message: 'Remark added successfully' });
  } catch (error) {
    console.error('Error adding remark:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
