import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBcYqD8JdyV_ygudbwxsPG5dx7w_D4rzGU',
  authDomain: 'mathlift-63f6e.firebaseapp.com',
  projectId: 'mathlift-63f6e',
  storageBucket: 'mathlift-63f6e.firebasestorage.app',
  messagingSenderId: '966174585807',
  appId: '1:966174585807:web:a66c12e44df257e322d8ba',
};

const app = initializeApp(firebaseConfig);

/** Firestore is the only Google service MathLift uses. No Analytics, Ads, or Crashlytics. */
export const db = getFirestore(app);
