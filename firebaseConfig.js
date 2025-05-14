// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

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

// Initialize Firebase Auth with proper initialization based on platform
let auth;

// Safer initialization pattern for React Native
const initAuth = () => {
  if (auth) return auth;
  
  try {
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      // On native platforms
      try {
        auth = getAuth(app);
        
        // If we need persistence, initialize it separately after the app has loaded
        // This is safer than initializing with persistence right away
        setTimeout(() => {
          try {
            initializeAuth(app, {
              persistence: getReactNativePersistence(AsyncStorage)
            });
          } catch (e) {
            console.log("Persistence already initialized");
          }
        }, 500);
      } catch (error) {
        console.log("Auth initialization error:", error);
        // Fallback to simple auth without persistence
        auth = getAuth(app);
      }
    }
  } catch (error) {
    console.log("Firebase auth error:", error);
    // Final fallback
    try {
      auth = getAuth();
    } catch (e) {
      console.log("Complete auth failure:", e);
    }
  }
  
  return auth;
};

// Initialize auth
auth = initAuth();

// We're removing Firebase Analytics initialization as it can cause issues
// with the native bridge in SDK 53

export { app, auth };
export default firebaseConfig;