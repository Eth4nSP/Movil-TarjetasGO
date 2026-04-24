/*// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDN159KcHijoCcOyRGAOXMQnf1YR7mIjJ8",
    authDomain: "tarjetasgo-f4bc0.firebaseapp.com",
    projectId: "tarjetasgo-f4bc0",
    storageBucket: "tarjetasgo-f4bc0.firebasestorage.app",
    messagingSenderId: "349941816382",
    appId: "1:349941816382:web:754ed219259d55b059856f",
    measurementId: "G-DRCEMZ9SD1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app);
export { auth };*/



import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from "firebase/firestore"; // <--- 1. Importar Firestore
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";

const firebaseConfig = {
    apiKey: "AIzaSyDN159KcHijoCcOyRGAOXMQnf1YR7mIjJ8",
    authDomain: "tarjetasgo-f4bc0.firebaseapp.com",
    projectId: "tarjetasgo-f4bc0",
    storageBucket: "tarjetasgo-f4bc0.firebasestorage.app",
    messagingSenderId: "349941816382",
    appId: "1:349941816382:web:754ed219259d55b059856f",
    measurementId: "G-DRCEMZ9SD1"
};

const app = initializeApp(firebaseConfig);

const persistence = Platform.OS === 'web' ?
    browserLocalPersistence :
    getReactNativePersistence(ReactNativeAsyncStorage);

const auth = initializeAuth(app, { persistence });

const db = getFirestore(app); // <--- 2. Inicializar DB

export { auth, db }; // <--- 3. Exportar db