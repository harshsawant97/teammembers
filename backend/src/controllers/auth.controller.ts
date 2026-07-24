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
    const uid = decodedToken.uid;
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
      
      // 1. Try to find by UID first (if they already linked their account)
      let studentSnap = await studentsRef.where('uid', '==', uid).limit(1).get();
      
      // 2. Fallback to Email (for first time login, or if UID wasn't linked yet)
      if (studentSnap.empty) {
        studentSnap = await studentsRef.where('email', '==', email.toLowerCase()).limit(1).get();
      }
      
      if (studentSnap.empty) {
        res.status(401).json({ message: 'Your email is not registered as a student. Contact your administrator.' });
        return;
      }
      
      studentId = studentSnap.docs[0].id;
      const studentData = studentSnap.docs[0].data();
      
      const updates: any = {};
      
      // Link the UID if it's missing
      if (studentData.uid !== uid) {
        updates.uid = uid;
      }
      
      // Auto-sync the email if the Firebase Auth email changed (after verification)
      if (studentData.email !== email.toLowerCase()) {
        updates.email = email.toLowerCase();
      }
      
      if (Object.keys(updates).length > 0) {
        await studentsRef.doc(studentId).update(updates);
      }
    }

    // Find or create user in Firestore
    const usersRef = db.collection('users');
    let snapshot = await usersRef.where('uid', '==', uid).limit(1).get();
    
    // Fallback to email for legacy users
    if (snapshot.empty) {
      snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
    }
    
    let user;
    if (snapshot.empty) {
      // Prevent automatic registration of faculty accounts if it's supposed to be restricted,
      // but for now we'll just respect the creation but ensure we don't allow role hopping later.
      const newUserRef = usersRef.doc();
      user = {
        id: newUserRef.id,
        uid: uid,
        email: email.toLowerCase(),
        role: requestedRole,
        studentId, // Will be null for FACULTY
        createdAt: new Date().toISOString()
      };
      await newUserRef.set(user);
    } else {
      const doc = snapshot.docs[0];
      user = { id: doc.id, ...doc.data() };
      
      // CRITICAL SECURITY FIX: Prevent cross-role login
      if (user.role && user.role !== requestedRole) {
        res.status(403).json({ 
          message: `Access denied. You are trying to log in as ${requestedRole === 'FACULTY' ? 'Admin/Faculty' : 'Student'}, but your account is registered as ${user.role === 'FACULTY' ? 'Admin/Faculty' : 'Student'}. Please use the correct login portal.` 
        });
        return;
      }
      
      const userUpdates: any = {};
      
      if (user.uid !== uid) userUpdates.uid = uid;
      if (user.email !== email.toLowerCase()) userUpdates.email = email.toLowerCase();
      // if (user.role !== requestedRole) userUpdates.role = requestedRole; // REMOVED to prevent privilege escalation
      if (user.studentId !== studentId) userUpdates.studentId = studentId;

      if (Object.keys(userUpdates).length > 0) {
        Object.assign(user, userUpdates);
        await doc.ref.update(userUpdates);
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
