import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from '../../serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as any),
  projectId: "smart-attendance-c5e40"
});

export const auth = getAuth();
export const db = getFirestore();
