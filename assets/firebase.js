import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgdVEUPnPdqkbXtLmJ8rIrWuGo8k8SdJU",
  authDomain: "idp-project-demo.firebaseapp.com",
  projectId: "idp-project-demo",
  storageBucket: "idp-project-demo.firebasestorage.app",
  messagingSenderId: "823461427683",
  appId: "1:823461427683:web:d41bb134701b8f856088d6",
  measurementId: "G-JXJVJYJX4N"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
