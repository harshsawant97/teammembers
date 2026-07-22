import { Request, Response } from 'express';
import { db } from '../utils/firebase';

export const registerStudent = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, enrollmentNo, email, departmentName, descriptor } = req.body;

    if (!firstName || !lastName || !enrollmentNo || !email || !descriptor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deptName = departmentName ? departmentName.trim() : 'Computer Science';
    
    // Check if student exists (by enrollment or email)
    const studentsRef = db.collection('students');
    const existing = await studentsRef.where('enrollmentNo', '==', enrollmentNo).limit(1).get();
    const existingEmail = await studentsRef.where('email', '==', email.toLowerCase()).limit(1).get();
    
    if (!existing.empty) {
      return res.status(400).json({ error: 'Student with this enrollment number already exists.' });
    }
    if (!existingEmail.empty) {
      return res.status(400).json({ error: 'Student with this email already exists.' });
    }

    // Determine department
    const deptsRef = db.collection('departments');
    const existingDept = await deptsRef.where('name', '==', deptName).limit(1).get();
    
    let deptId = '';
    if (existingDept.empty) {
      const newDept = deptsRef.doc();
      await newDept.set({ name: deptName });
      deptId = newDept.id;
    } else {
      deptId = existingDept.docs[0].id;
    }

    // Create student
    const newStudentRef = studentsRef.doc();
    const studentData = {
      firstName,
      lastName,
      enrollmentNo,
      email: email.toLowerCase(),
      departmentId: deptId,
      departmentName: deptName, // Denormalize for easy querying
      createdAt: new Date().toISOString(),
      descriptors: [JSON.stringify(descriptor)]
    };
    
    await newStudentRef.set(studentData);

    res.status(201).json({ message: 'Student registered successfully', student: { id: newStudentRef.id, ...studentData } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudents = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('students').get();
    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      department: {
        id: doc.data().departmentId,
        name: doc.data().departmentName
      }
    }));
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmbeddings = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('students').get();
    
    const formatted = snapshot.docs.map(doc => {
      const data = doc.data();
      const descriptors = (data.descriptors || []).map((d: string) => JSON.parse(d));
      
      return {
        studentId: doc.id,
        label: `${data.firstName} ${data.lastName} (${data.enrollmentNo})`,
        descriptors
      };
    }).filter(s => s.descriptors.length > 0);

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, enrollmentNo, email } = req.body;

    await db.collection('students').doc(id).update({
      firstName, lastName, enrollmentNo, email: email?.toLowerCase()
    });

    res.json({ message: 'Student updated successfully', student: { id, firstName, lastName, enrollmentNo } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete student
    await db.collection('students').doc(id).delete();
    
    // Also delete attendances
    const attendances = await db.collection('attendances').where('studentId', '==', id).get();
    const batch = db.batch();
    attendances.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
