import { Request, Response } from 'express';
import { db } from '../utils/firebase';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Fetch notifications where userId is either the specific user or their role
    // For students, the target ID could be their user.id or user.studentId.
    // Let's get the user doc to know the studentId
    const userDoc = await db.collection('users').doc(userId).get();
    const studentId = userDoc.data()?.studentId;

    const targets = [userId, role.toUpperCase(), role.toLowerCase()];
    if (studentId) targets.push(studentId);

    // Fetch all notifications to guarantee we don't miss anything due to index/query bugs
    const snapshot = await db.collection('notifications').get();
      
    const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter in memory to ensure 100% accuracy (hardcoded filter)
    const notifications = allDocs.filter((n: any) => {
      // Check if the notification belongs to this user
      if (targets.includes(n.userId)) return true;
      if (n.userId === 'FACULTY' && role.toUpperCase() === 'FACULTY') return true;
      if (n.userId === 'STUDENT' && role.toUpperCase() === 'STUDENT') return true;
      return false;
    });
    // Sort in memory to avoid missing composite index error
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('notifications').doc(id).update({ read: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    const studentId = userDoc.data()?.studentId;

    const targets = [userId, role.toUpperCase(), role.toLowerCase()];
    if (studentId) targets.push(studentId);

    const snapshot = await db.collection('notifications').get();
      
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const isTarget = targets.includes(data.userId) || 
                       (data.userId === 'FACULTY' && role.toUpperCase() === 'FACULTY') ||
                       (data.userId === 'STUDENT' && role.toUpperCase() === 'STUDENT');
                       
      if (isTarget && data.read === false) {
        batch.update(doc.ref, { read: true });
      }
    });
    
    await batch.commit();
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNotification = async (userId: string, title: string, message: string, type: string) => {
  try {
    await db.collection('notifications').add({
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
