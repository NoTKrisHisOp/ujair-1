// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Replace these values with your Firebase config (make sure storageBucket ends with .appspot.com)
const firebaseConfig = {
  apiKey: "AIzaSyC9prDN8y2i3Oicz22wLkym6pMv4Ru30jk",
  authDomain: "kidzone-26832.firebaseapp.com",
  projectId: "kidzone-26832",
  storageBucket: "kidzone-26832.appspot.com",
  messagingSenderId: "160767525004",
  appId: "1:160767525004:web:9abf2ae9fc2f9b8bd1fba9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
