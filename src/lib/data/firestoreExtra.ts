import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const deleteLearnerDoc = async (classCode: string, studentKey: string): Promise<void> => {
  await deleteDoc(doc(db, 'classrooms', classCode, 'learners', studentKey));
};

export const deleteClassOwnedDocs = async (classCode: string): Promise<void> => {
  for (const name of ['learners', 'curricula', 'assignments'] as const) {
    const snap = await getDocs(collection(db, 'classrooms', classCode, name));
    for (const item of snap.docs) {
      await deleteDoc(item.ref);
    }
  }
  await deleteDoc(doc(db, 'classrooms', classCode, 'meta', 'pilot'));
};
