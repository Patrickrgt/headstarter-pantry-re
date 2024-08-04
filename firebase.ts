// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN4g9HLamgc-tVb6ssAkckC037bfTKo6U",
  authDomain: "headstarter-pantry-45387.firebaseapp.com",
  projectId: "headstarter-pantry-45387",
  storageBucket: "headstarter-pantry-45387.appspot.com",
  messagingSenderId: "558135808068",
  appId: "1:558135808068:web:48826c1eb27e5c6352ec11",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth();

export const db = getFirestore(app);
export { auth };
