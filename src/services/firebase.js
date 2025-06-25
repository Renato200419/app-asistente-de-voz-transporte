// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBx3UC6XA2AO8m2Zjy4breVaEjZQRTbVQo",
  authDomain: "asistente-voz-7e11a.firebaseapp.com",
  databaseURL: "https://asistente-voz-7e11a-default-rtdb.firebaseio.com/",
  projectId: "asistente-voz-7e11a",
  storageBucket: "asistente-voz-7e11a.firebasestorage.app",
  messagingSenderId: "257125479354",
  appId: "1:257125479354:web:4d0660ea92967ed10ae383",
  measurementId: "G-WD789YNV8M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

export { db, storage, rtdb };