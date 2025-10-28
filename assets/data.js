// 데이터/유틸 모듈: Firestore CRUD + 권한 실패 시 로컬스토리지 폴백
import {
  db
} from "./firebase.js";
import {
  serverTimestamp, collection, doc, addDoc, getDocs, query, orderBy, limit, where,
  updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const COL = {
  POSTS: "posts",
  NOTICES: "notices",
  LEARNING: "learning",
  ANACADEMY: "anacademy",
  IDP: "idp",
  MYLEARN: "my_learning"
};

/** 폴백 스토리지 키 */
const FBK = {
  [COL.POSTS]: "fbk_posts",
  [COL.LEARNING]: "fbk_learning",
  [COL.ANACADEMY]: "fbk_anacademy",
  [COL.NOTICES]: "fbk_notices",
  [COL.IDP]: "fbk_idp",
  [COL.MYLEARN]: "fbk_mylearn",
};

/** 초기가 비어있을 때 채워넣을 데모 데이터 */
const SEED = {
  [COL.POSTS]: [
    { title:"첫 글: 환영합니다", body:"학습하기(피드)에서 자유롭게 공유해요.", tags:["welcome","guide"], authorName:"데모", createdAt:new Date() },
  ],
  [COL.LEARNING]: [
    { title:"Vue 기초", desc:"컴포넌트/반응성/라우팅 기초", category:"FE", level:"입문", tags:["vue","fe"], createdAt:new Date() },
  ],
  [COL.ANACADEMY]: [
    { title:"10/28 스터디", note:"컴포넌트 구조 정리", tags:["study"], createdAt:new Date() },
  ],
  [COL.NOTICES]: [
    { title:"서비스 데모 공지", body:"내부 데모 환경입니다.", createdAt:new Date() },
  ],
  [COL.IDP]: [
    { title:"TypeScript 심화", level:"중급", recommend:"일반", desc:"제네릭/타입추론", createdAt:new Date() },
  ],
  [COL.MYLEARN]: [],
};

/* ---------- 로컬 폴백 헬퍼 ---------- */
function nowISO(){ return new Date().toISOString(); }

function readFallback(col){
  const raw = localStorage.getItem(FBK[col]);
  if(raw) return JSON.parse(raw);
  // seed 세팅
  const seeded = (SEED[col]||[]).map(x=>({
    id: crypto.randomUUID(),
    ...x,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }));
  localStorage.setItem(FBK[col], JSON.stringify(seeded));
  return seeded;
}
function writeFallback(col, rows){
  localStorage.setItem(FBK[col], JSON.stringify(rows));
}

/* ---------- 공통 CRUD ---------- */
export async function createDoc(col, payload){
  try{
    payload.createdAt = serverTimestamp();
    payload.updatedAt = serverTimestamp();
    const ref = collection(db, col);
    return await addDoc(ref, payload);
  }catch(e){
    // 권한/네트워크 실패 → 폴백
    const rows = readFallback(col);
    const row = { id: crypto.randomUUID(), ...payload, createdAt: nowISO(), updatedAt: nowISO() };
    rows.unshift(row);
    writeFallback(col, rows);
    return { id: row.id, local: true };
  }
}

export async function listDocs(col, opts={}){
  const { order="createdAt", dir="desc", lim=20, filters=[] } = opts;
  try{
    let q = query(collection(db, col), orderBy(order, dir), limit(lim));
    filters.forEach(f=> q = query(q, where(f[0], f[1], f[2])));
    const snap = await getDocs(q);
    return snap.docs.map(d=>({ id:d.id, ...d.data() }));
  }catch(e){
    // 권한/네트워크 실패 → 폴백
    const rows = readFallback(col);
    // 간단 정렬
    rows.sort((a,b)=> (b.createdAt||"") > (a.createdAt||"") ? 1 : -1);
    return rows.slice(0, lim);
  }
}

export async function updateField(col, id, patch){
  try{
    patch.updatedAt = serverTimestamp();
    await updateDoc(doc(db, col, id), patch);
  }catch(e){
    const rows = readFallback(col);
    const idx = rows.findIndex(r=>r.id===id);
    if(idx>=0){
      rows[idx] = { ...rows[idx], ...patch, updatedAt: nowISO() };
      writeFallback(col, rows);
    }
  }
}

export async function removeDoc(col, id){
  try{
    await deleteDoc(doc(db, col, id));
  }catch(e){
    const rows = readFallback(col).filter(r=>r.id!==id);
    writeFallback(col, rows);
  }
}

/* ---------- 유틸 ---------- */
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

// 데모 식별자(게스트 별칭)
export function currentIdentity(){
  let a = localStorage.getItem("aks_demo_alias");
  if(a) return a;
  const animals = ["고래","수달","매","사자","여우","매미","비둘기","부엉이","돌고래","치타"];
  a = `게스트-${animals[Math.floor(Math.random()*animals.length)]}-${Math.floor(Math.random()*1000)}`;
  localStorage.setItem("aks_demo_alias", a);
  return a;
}
