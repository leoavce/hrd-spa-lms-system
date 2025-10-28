// 데이터/유틸 모듈: Firestore CRUD & 공통 함수
import {
  db, serverTimestamp, collection, doc, addDoc, getDocs, query, orderBy, limit, where,
  updateDoc, deleteDoc
} from "./firebase.js";

export const COL = {
  POSTS: "posts",
  NOTICES: "notices",
  LEARNING: "learning",
  ANACADEMY: "anacademy",
  IDP: "idp",
  MYLEARN: "my_learning"
};

// ===== 공통 CRUD =====
export async function createDoc(col, payload){
  payload.createdAt = serverTimestamp();
  payload.updatedAt = serverTimestamp();
  const ref = collection(db, col);
  return await addDoc(ref, payload);
}

export async function listDocs(col, opts={}){
  const { order="createdAt", dir="desc", lim=20, filters=[] } = opts;
  let q = query(collection(db, col), orderBy(order, dir), limit(lim));
  // where 결합 시 일부는 복합 인덱스 필요
  filters.forEach(f=> q = query(q, where(f[0], f[1], f[2])));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

export async function updateField(col, id, patch){
  patch.updatedAt = serverTimestamp();
  await updateDoc(doc(db, col, id), patch);
}
export async function removeDoc(col, id){
  await deleteDoc(doc(db, col, id));
}

// ===== 유틸 =====
export function tokensFromText(str=""){
  return Array.from(new Set(
    (str || "").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu," ")
      .split(/\s+/)
      .filter(s=>s.length>=2)
  ));
}
export function escapeHtml(s){
  return (s??"").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

// 현재 식별(로그인 이메일 또는 게스트 별칭)
export function currentIdentity(){
  const email = (window.__AKS_USER_EMAIL || "");
  if(email) return email;
  const alias = localStorage.getItem("aks_demo_alias") || "게스트";
  return alias;
}
