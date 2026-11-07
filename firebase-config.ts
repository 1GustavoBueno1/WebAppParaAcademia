// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBvfrZZ8LkqwTqytkzlEGE0RrndJtuu7LU",
  authDomain: "academiawebapp-6b551.firebaseapp.com",
  projectId: "academiawebapp-6b551",
  storageBucket: "academiawebapp-6b551.firebasestorage.app",
  messagingSenderId: "804255004641",
  appId: "1:804255004641:web:71f4a3a5d7fcae19b6c4a0",
  measurementId: "G-NB2LNLGYRD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);