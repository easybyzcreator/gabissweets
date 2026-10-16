import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBwtCluLn0xcvx5B2JvBNf_BFlmcsx4K9o",
  authDomain: "app-gabis-sweets.firebaseapp.com",
  projectId: "app-gabis-sweets",
  storageBucket: "app-gabis-sweets.firebasestorage.app",
  messagingSenderId: "328351229786",
  appId: "1:328351229786:web:b06ab057461b3952a13563",
  measurementId: "G-103CW9C4EJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Analytics not initialized:", e);
      }
    }
  }).catch(() => {});
}
