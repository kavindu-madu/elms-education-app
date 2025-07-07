import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyB3xibgHexn2VjcWwvYjt7FJXvGq3fUP78",
  authDomain: "notes-al.firebaseapp.com",
  projectId: "notes-al",
  storageBucket: "notes-al.firebasestorage.app",
  messagingSenderId: "983793402003",
  appId: "1:983793402003:web:8ac0e5646fc064980f4d66",
  measurementId: "G-TG6P75699M",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
