// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAG3Uqyv1Isfh_8Aq83rP18SGa7t81qv58",
  authDomain: "finance-tracker-bae20.firebaseapp.com",
  projectId: "finance-tracker-bae20",
  storageBucket: "finance-tracker-bae20.firebasestorage.app",
  messagingSenderId: "1034435232632",
  appId: "1:1034435232632:web:0461ffe1ec5027e6edfe8d",
  measurementId: "G-5BN448F8LJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const firebaseAuth = initializeAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// For compatibility with existing code
export const auth = firebaseAuth;
export const firestore = db;

export default {
  db,
  auth: firebaseAuth,
};