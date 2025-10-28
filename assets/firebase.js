// Firebase 모듈형 CDN (GitHub Pages에서 동작)
// ✅ Analytics 제거: CSP 차단/태그매니저 호출 방지
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, serverTimestamp, collection, doc, setDoc, addDoc, getDoc, getDocs,
  query, orderBy, limit, startAfter, where, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// === 프로젝트 설정(제공값) ===
const firebaseConfig = {
  apiKey: "AIzaSyAgdVEUPnPdqkbXtLmJ8rIrWuGo8k8SdJU",
  authDomain: "idp-project-demo.firebaseapp.com",
  projectId: "idp-project-demo",
  storageBucket: "idp-project-demo.firebasestorage.app",
  messagingSenderId: "823461427683",
  appId: "1:823461427683:web:d41bb134701b8f856088d6",
  measurementId: "G-JXJVJYJX4N" // ← 사용하지 않음(Analytics 미초기화)
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// ===== Auth helpers (데모: 선택 로그인) =====
export const auth = getAuth(app);
export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
};

// ===== Firestore helpers =====
export const db = getFirestore(app);
export {
  serverTimestamp, collection, doc, setDoc, addDoc, getDoc, getDocs,
  query, orderBy, limit, startAfter, where, updateDoc, deleteDoc
};

// ===== 앱 초기화: 로그인/로그아웃 버튼 바인딩 =====
export function initFirebaseAuth(){
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const identityText = document.getElementById("identityText");

  const signinBtn = document.getElementById("signinBtn");
  const signupBtn = document.getElementById("signupBtn");
  const loginModal = document.getElementById("loginModal");

  // 게스트 별칭
  const demoAlias = getOrSetAlias();

  // 버튼 바인딩
  loginBtn.addEventListener("click", ()=> loginModal.showModal());
  logoutBtn.addEventListener("click", async ()=> { await signOut(auth); });

  // 이메일/패스워드
  signinBtn.addEventListener("click", async ()=>{
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    if(!email || !password){ toast("이메일/비밀번호를 입력하세요"); return; }
    try{ await signInWithEmailAndPassword(auth, email, password); loginModal.close(); toast("로그인 완료"); }
    catch(e){ toast("로그인 실패: " + e.code); }
  });
  signupBtn.addEventListener("click", async ()=>{
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    if(!email || !password){ toast("이메일/비밀번호를 입력하세요"); return; }
    try{ await createUserWithEmailAndPassword(auth, email, password); loginModal.close(); toast("회원가입 완료"); }
    catch(e){ toast("회원가입 실패: " + e.code); }
  });

  onAuthStateChanged(auth, (user)=>{
    identityText.textContent = user ? (user.email || "(알수없음)") : `${demoAlias} (게스트)`;
    loginBtn.classList.toggle("hidden", !!user);
    logoutBtn.classList.toggle("hidden", !user);
  });
}

// ===== 공통 토스트 =====
function toast(msg, ms=1800){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), ms);
}

// 게스트 별칭
function getOrSetAlias(){
  let a = localStorage.getItem("aks_demo_alias");
  if(a) return a;
  const animals = ["고래","수달","매","사자","여우","매미","비둘기","부엉이","돌고래","치타"];
  a = `게스트-${animals[Math.floor(Math.random()*animals.length)]}-${Math.floor(Math.random()*1000)}`;
  localStorage.setItem("aks_demo_alias", a);
  return a;
}
