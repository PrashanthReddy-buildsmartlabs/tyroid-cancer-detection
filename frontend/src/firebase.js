import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
    apiKey: "AIzaSyCG1vuoMzOXNu3pHg54EzK2LL45OY7JB6E",
    authDomain: "aura-b9ff6.firebaseapp.com",
    projectId: "aura-b9ff6",
    storageBucket: "aura-b9ff6.firebasestorage.app",
    messagingSenderId: "6662965748",
    appId: "1:6662965748:web:879d187eef59b456f2d1a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
