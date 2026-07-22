import { Request, Response } from 'express';
import { generateTokens } from '../utils/jwt';
import { auth as firebaseAdminAuth, db } from '../utils/firebase';

export const firebaseLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, role } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Firebase token is required' });
      return;
    }
    const requestedRole = role || 'FACULTY';

    // Verify token with Firebase Admin
    const decodedToken = await firebaseAdminAuth.verifyIdToken(token);
    const email = decodedToken.email;
    const emailVerified = decodedToken.email_verified;

    if (!email) {
      res.status(400).json({ message: 'Token does not contain an email address' });
      return;
    }

    if (!emailVerified) {
      res.status(401).json({ message: 'Email not verified. Please check your inbox and verify your email.' });
      return;
    }

    // Role Enforcement
    let studentId = null;
    
    if (requestedRole === 'STUDENT') {
      const studentsRef = db.collection('students');
      const studentSnap = await studentsRef.where('email', '==', email.toLowerCase()).limit(1).get();
      
      if (studentSnap.empty) {
        res.status(401).json({ message: 'Your email is not registered as a student. Contact your administrator.' });
        return;
      }
      studentId = studentSnap.docs[0].id;
    }

    // Find or create user in Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
    
    let user;
    if (snapshot.empty) {
      const newUserRef = usersRef.doc();
      user = {
        id: newUserRef.id,
        email: email.toLowerCase(),
        role: requestedRole,
        studentId, // Will be null for FACULTY
        createdAt: new Date().toISOString()
      };
      await newUserRef.set(user);
    } else {
      const doc = snapshot.docs[0];
      user = { id: doc.id, ...doc.data() };
      
      // Update role/studentId if they changed
      if (user.role !== requestedRole || user.studentId !== studentId) {
        user.role = requestedRole;
        user.studentId = studentId;
        await doc.ref.update({ role: requestedRole, studentId });
      }
    }

    // Generate custom local JWT for compatibility with existing routes
    const tokens = generateTokens({ userId: user.id, role: user.role });
    res.json({ ...tokens, user: { id: user.id, email: user.email, role: user.role, studentId: user.studentId } });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(401).json({ message: 'Invalid or expired Firebase token' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const user = { id: userDoc.id, ...userDoc.data() };
    res.json({ id: user.id, email: user.email, role: user.role, studentId: user.studentId });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
