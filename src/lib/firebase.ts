import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBGhm5J90b4fVlhmyP7bhVPliQZmQUSmmo",
    authDomain: "financeiro-609e1.firebaseapp.com",
    databaseURL: "https://financeiro-609e1-default-rtdb.firebaseio.com",
    projectId: "financeiro-609e1",
    storageBucket: "financeiro-609e1.firebasestorage.app",
    messagingSenderId: "412536649666",
    appId: "1:412536649666:web:f630c5be490c5539f1485b",
    measurementId: "G-QSH7W2GYXD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
