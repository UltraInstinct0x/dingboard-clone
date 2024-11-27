import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Hardcoded Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyDW3THy2csIy-o-HDzbhPjNuZthBQyvjLg",
  authDomain: "canvas-87387.firebaseapp.com",
  projectId: "canvas-87387",
  storageBucket: "canvas-87387.firebasestorage.app",
  messagingSenderId: "195988724283",
  appId: "1:195988724283:web:84d8fb237eec6596961a1e",
  measurementId: "G-BLPRHFYXMW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;
export { analytics };
