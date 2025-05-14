// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCc2oyzodIgDkwDmSg-FQMKh0BOEjt-WYw",
  authDomain: "signlanguageapp-26fc1.firebaseapp.com",
  projectId: "signlanguageapp-26fc1",
  storageBucket: "signlanguageapp-26fc1.firebasestorage.app",
  messagingSenderId: "260710283824",
  appId: "1:260710283824:web:25350d734eefa41c07cbf5",
  measurementId: "G-PD40SXMW76"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

export { app, auth };
export default firebaseConfig;