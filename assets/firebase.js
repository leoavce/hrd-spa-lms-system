// Firebase 모듈형 CDN
// Analytics 제거(태그매니저 제외 -> CSP 충돌 방지)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// === 프로젝트 설정(제공값) ===
const firebaseConfig = {
  apiKey: "AIzaSyAgdVEUPnPdqkbXtLmJ8rIrWuGo8k8SdJU",
  authDomain: "idp-project-demo.firebaseapp.com",
  projectId: "idp-project-demo",
  storageBucket: "idp-project-demo.firebasestorage.app",
  messagingSenderId: "823461427683",
  appId: "1:823461427683:web:d41bb134701b8f856088d6",
  measurementId: "G-JXJVJYJX4N" // ← 미사용
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);
