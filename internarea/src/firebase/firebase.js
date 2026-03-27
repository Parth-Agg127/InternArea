// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9oNISk7ASKvZ0qMLYgGoPNPrxHpIeCC4",
  authDomain: "intern-area-20ebd.firebaseapp.com",
  projectId: "intern-area-20ebd",
  storageBucket: "intern-area-20ebd.firebasestorage.app",
  messagingSenderId: "352476968734",
  appId: "1:352476968734:web:46e0c29421329b58043b0f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
