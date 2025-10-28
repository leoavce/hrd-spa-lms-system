// Firebase 모듈형 CDN 임포트 (GitHub Pages에서 동작)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, serverTimestamp, collection, doc, setDoc, addDoc, getDoc, getDocs, query, orderBy, limit, startAfter, where, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
// Storage 사용 시 필요
// import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// === 프로젝트 제공 설정 ===
const firebaseConfig = {
  apiKey: "AIzaSyAgdVEUPnPdqkbXtLmJ8rIrWuGo8k8SdJU",
  authDomain: "idp-project-demo.firebaseapp.com",
  projectId: "idp-project-demo",
  storageBucket: "idp-project-demo.firebasestorage.app",
  messagingSenderId: "823461427683",
  appId: "1:823461427683:web:d41bb134701b8f856088d6",
  measurementId: "G-JXJVJYJX4N"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app);

export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  serverTimestamp, collection, doc, setDoc, addDoc, getDoc, getDocs, query, orderBy, limit, startAfter, where, updateDoc, deleteDoc
};
