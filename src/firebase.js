import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";    

const firebaseConfig = {
    apiKey: "AIzaSyCFC76Vel-mfZxfvRAr6tMjjRcCY0MRwWw",
    authDomain: "thesis-ca7a5.firebaseapp.com",
    databaseURL: "https://thesis-ca7a5-default-rtdb.firebaseio.com",
    projectId: "thesis-ca7a5",
    storageBucket: "thesis-ca7a5.appspot.com",
    messagingSenderId: "94356301896",
    appId: "1:94356301896:web:3eb5575b45afec8308d07d",
    measurementId: "G-C3338FHWP2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Set Firebase Auth persistence to local (persists across page reloads)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase Auth persistence set to local");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });


