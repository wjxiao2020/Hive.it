// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import {getFirestore} from 'firebase/firestore'
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAV8hdOig3TnsE5DrmHDiNO7nrZNjPw6Go",
  authDomain: "inventory-management-c41a9.firebaseapp.com",
  projectId: "inventory-management-c41a9",
  storageBucket: "inventory-management-c41a9.appspot.com",
  messagingSenderId: "582130329339",
  appId: "1:582130329339:web:e4dd9cd468976afd26725e",
  measurementId: "G-NMXN2QKE7V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const firestore = getFirestore(app);
const firebase_storage = getStorage(app);

export {firestore, firebase_storage}