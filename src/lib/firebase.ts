// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcYqD8JdyV_ygudbwxsPG5dx7w_D4rzGU",
  authDomain: "mathlift-63f6e.firebaseapp.com",
  projectId: "mathlift-63f6e",
  storageBucket: "mathlift-63f6e.firebasestorage.app",
  messagingSenderId: "966174585807",
  appId: "1:966174585807:web:a66c12e44df257e322d8ba",
  measurementId: "G-T6RHG8WB1Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
