// Firestore + LocalStorage 폴백
import { db } from "./firebase.js";
import {
  serverTimestamp, collection, doc, addDoc, getDocs, query, orderBy, limit, where,
  updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/**
 * 컬렉션 상수
 * - 기존 COL 구성은 그대로 유지
 * - 데모용 교육 신청 기능을 위해 TRAININGS / TRAIN_APPS 추가
 */
export const COL = {
  POSTS: "posts",
  COMMENTS: "comments",
  NOTICES: "notices",
  LEARNING: "learning",
  ANACADEMY: "anacademy",
  GROUPS: "groups",
  IDP: "idp",
  MYLEARN: "my_learning",
  // 데모: 공지 페이지 내 교육 신청
  TRAININGS: "trainings",
  TRAIN_APPS: "training_apps",
};

// 폴백 키
const FBK = Object.fromEntries(Object.values(COL).map(c=>[c, `fbk_${c}`]));

/**
 * 초기 Seed 데이터
 * - 제공해주신 기본 Seed는 보존
 * - TRAININGS / TRAIN_APPS 추가(교육 더미)
 */
const SEED = {
  [COL.NOTICES]: [
    { title:"데모 환경 공지", body:"이 환경의 데이터는 테스트용입니다.", authorName:"시스템", createdAt:new Date() },
    { title:"새 기능 안내", body:"댓글/추천/저장, 조직·강의 UI 추가", authorName:"시스템", createdAt:new Date() },
  ],
  [COL.POSTS]: [
    { title:"환영합니다!", body:"학습하기 탭은 트위터처럼 자유롭게 대화하는 공간입니다.", tags:["welcome"], authorName:"데모", likes:3, saves:1, createdAt:new Date() },
  ],
  [COL.LEARNING]: [
    { title:"Vue 기초", desc:"컴포넌트/반응성/라우팅 입문", category:"FE", level:"입문", tags:["vue","fe"], createdAt:new Date() },
  ],
  [COL.ANACADEMY]: [
    { title:"10/28 스터디", note:"러닝 로그 예시입니다.", tags:["study"], groupId:"default", authorName:"홍길동", createdAt:new Date() },
  ],
  [COL.GROUPS]: [
    { id:"default", name:"기본 학습조직", desc:"샘플 그룹", createdAt:new Date() },
  ],
  [COL.IDP]: [
    { title:"TypeScript 심화", level:"중급", recommend:"일반", desc:"제네릭/타입 추론", createdAt:new Date() },
  ],
  [COL.COMMENTS]: [],
  [COL.MYLEARN]: [],

  // 데모 교육 카탈로그/신청
  [COL.TRAININGS]: [
    { title:"보안 코딩 실무", provider:"사내 HRD", schedule:"2025-11-10 14:00", capacity:30, tags:["보안","개발"], url:"#", createdAt:new Date() },
    { title:"Vue 3 심화 워크숍", provider:"사내 HRD", schedule:"2025-11-17 10:00", capacity:25, tags:["FE","Vue"], url:"#", createdAt:new Date() },
  ],
  [COL.TRAIN_APPS]: [],
};

// 외부 강의 카탈로그(러닝 탭 직무→스킬셋) - 데모 상수
export const EXT_CATALOG = {
  "프론트엔드": {
    "Vue": [
      { title:"Vue 3 완전 정복", provider:"인프런", url:"#", level:"입문~중급", time:"12h" },
      { title:"컴포지션 API 실전", provider:"인프런", url:"#", level:"중급", time:"6h" }
    ],
    "CSS": [
      { title:"모던 CSS 설계", provider:"인프런", url:"#", level:"입문", time:"4h" }
    ]
  },
  "백엔드": {
    "NestJS": [
      { title:"NestJS로 만드는 API 서버", provider:"인프런", url:"#", level:"입문~중급", time:"10h" }
    ],
    "DB(PostgreSQL)": [
      { title:"PostgreSQL 마스터", provider:"인프런", url:"#", level:"중급", time:"8h" }
    ]
  },
  "HR/기획": {
    "HRD": [
      { title:"조직 학습 설계", provider:"인프런", url:"#", level:"입문", time:"5h" }
    ],
    "데이터분석": [
      { title:"비개발자를 위한 데이터 분석", provider:"인프런", url:"#", level:"입문", time:"7h" }
    ]
  }
};

/* ================== 폴백 스토리지 공통 유틸 ================== */

function nowISO(){ return new Date().toISOString(); }

function readFallback(col){
  const raw = localStorage.getItem(FBK[col]);
  if(raw) return JSON.parse(raw);
  // seed
  const seeded = (SEED[col]||[]).map(x=>({
    id: x.id || (crypto?.randomUUID ? crypto.randomUUID() : `${col}-${Math.random().toString(36).slice(2,10)}`),
    ...x,
    createdAt: nowISO(),
    updatedAt: nowISO()
  }));
  localStorage.setItem(FBK[col], JSON.stringify(seeded));
  return seeded;
}
function writeFallback(col, rows){ localStorage.setItem(FBK[col], JSON.stringify(rows)); }

/* ================== 기본 CRUD (권한 실패 시 폴백) ================== */

/**
 * 생성
 * - Firestore 우선, 실패시 LocalStorage 폴백
 */
export async function createDoc(col, payload){
  try{
    payload.createdAt = serverTimestamp();
    payload.updatedAt = serverTimestamp();
    const ref = collection(db, col);
    return await addDoc(ref, payload);
  }catch(e){
    const rows = readFallback(col);
    const row = { id: (crypto?.randomUUID ? crypto.randomUUID() : `${col}-${Math.random().toString(36).slice(2,10)}`), ...payload, createdAt: nowISO(), updatedAt: nowISO() };
    rows.unshift(row);
    writeFallback(col, rows);
    return { id: row.id, local: true };
  }
}

/**
 * 조회
 * - opts: { order="createdAt", dir="desc", lim=20, filters=[] }
 * - filters: [[field, op, value], ...]
 */
export async function listDocs(col, opts={}){
  const { order="createdAt", dir="desc", lim=20, filters=[] } = opts;
  try{
    let qRef = query(collection(db, col), orderBy(order, dir), limit(lim));
    filters.forEach(f=> qRef = query(qRef, where(f[0], f[1], f[2])));
    const snap = await getDocs(qRef);
    return snap.docs.map(d=>({ id:d.id, ...d.data() }));
  }catch{
    const rows = readFallback(col);
    // 정렬 키 동적 지원
    const key = order;
    const sgn = (dir?.toLowerCase?.() === "asc") ? 1 : -1;
    rows.sort((a,b)=>{
      const av = a?.[key] ?? "";
      const bv = b?.[key] ?? "";
      return (av > bv ? 1 : av < bv ? -1 : 0) * sgn;
    });
    return rows.slice(0, lim);
  }
}

/**
 * 부분 업데이트
 */
export async function updateField(col, id, patch){
  try{
    patch.updatedAt = serverTimestamp();
    await updateDoc(doc(db, col, id), patch);
  }catch{
    const rows = readFallback(col);
    const i = rows.findIndex(r=>r.id===id);
    if(i>=0){ rows[i] = { ...rows[i], ...patch, updatedAt: nowISO() }; writeFallback(col, rows); }
  }
}

/**
 * 삭제
 */
export async function removeDoc(col, id){
  try{ await deleteDoc(doc(db, col, id)); }
  catch{
    const rows = readFallback(col).filter(r=>r.id!==id);
    writeFallback(col, rows);
  }
}

/* ================== 유틸 ================== */

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

export function currentIdentity(){
  let a = localStorage.getItem("aks_demo_alias");
  if(a) return a;
  const animals = ["고래","수달","매","사자","여우","매미","비둘기","부엉이","돌고래","치타"];
  a = `게스트-${animals[Math.floor(Math.random()*animals.length)]}-${Math.floor(Math.random()*1000)}`;
  localStorage.setItem("aks_demo_alias", a);
  return a;
}

/* ================== 댓글/추천 헬퍼(폴백 우선) ================== */

export async function addComment(postId, content, parentId=null){
  return createDoc(COL.COMMENTS, {
    postId, content, parentId, authorName: currentIdentity(),
    searchTokens: tokensFromText(content)
  });
}

export async function listComments(postId){
  const all = await listDocs(COL.COMMENTS, { lim:200 });
  return all.filter(c=> c.postId===postId);
}

export async function incPostCounter(postId, key){
  // posts.likes / posts.saves 증가
  const list = await listDocs(COL.POSTS, { lim:100 });
  const it = list.find(x=>x.id===postId);
  if(!it){
    // 폴백에서만 안전하게 처리
    const rows = readFallback(COL.POSTS);
    const idx = rows.findIndex(r=>r.id===postId);
    if(idx>=0){
      rows[idx][key] = Math.max(0, (rows[idx][key]||0) + 1);
      writeFallback(COL.POSTS, rows);
    }
    return;
  }
  const val = Math.max(0, (it[key]||0)+1);
  await updateField(COL.POSTS, postId, { [key]: val });
}

/* ================== 공지 페이지: 교육 신청 데모 ================== */

/**
 * 교육 신청 (단순 insert)
 * - 현재 사용자 별 신청 레코드 남김
 */
export async function applyTraining(trainingId){
  const user = currentIdentity();
  return createDoc(COL.TRAIN_APPS, {
    trainingId, applicant: user
  });
}
