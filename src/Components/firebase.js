// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAdFTrZ49LTwv0hHFeJpEwDj4IX2GzHEec",
  authDomain: "fir-29bf6.firebaseapp.com",
  databaseURL: "https://fir-29bf6-default-rtdb.firebaseio.com",
  projectId: "fir-29bf6",
  storageBucket: "fir-29bf6.firebasestorage.app",
  messagingSenderId: "614883899259",
  appId: "1:614883899259:web:1bf358f5227aa86150efde",
  measurementId: "G-QKH5W9FM0S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth=getAuth(app)
export const database=getDatabase(app);