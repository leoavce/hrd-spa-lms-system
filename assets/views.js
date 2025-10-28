// 화면/라우팅/이벤트 모듈
import { auth, onAuthStateChanged } from "./firebase.js";
import { COL, listDocs, createDoc, updateField, removeDoc, tokensFromText, escapeHtml, currentIdentity } from "./data.js";

/* ------------------------------
   전역 엘리먼트 참조
------------------------------ */
const viewContainer = document.getElementById("viewContainer");
const globalSearch = document.getElementById("globalSearch");
const searchBtn = document.getElementById("searchBtn");
const composerModal = document.getElementById("composerModal");
const composerForm = document.getElementById("composerForm");
const submitPostBtn = document.getElementById("submitPostBtn");
const openComposer = document.getElementById("openComposer");

const routes = ["#home", "#learning", "#anacademy", "#notices", "#idp"];

/* ------------------------------
   공통 UI
------------------------------ */
function showToast(msg, ms=1800){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), ms);
}
function setActiveNav(hash){
  document.querySelectorAll(".nav-item").forEach(a=>{
    const target = a.getAttribute("data-route");
    a.classList.toggle("active", target === hash);
  });
}
function fmt(ts){
  try{
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("ko-KR", { hour12:false });
  }catch{ return "-"; }
}

/* ------------------------------
   라우터
------------------------------ */
function ensureRoute(){
  if(!routes.includes(location.hash)) location.hash = "#home";
  setActiveNav(location.hash);
  render(location.hash);
}
window.addEventListener("hashchange", ensureRoute);
document.querySelectorAll(".nav-item").forEach(a=>{
  a.addEventListener("click", (e)=>{
    e.preventDefault();
    const route = a.getAttribute("data-route");
    if(route) location.hash = route;
  });
});

/* ------------------------------
   검색
------------------------------ */
async function globalSearchRun(keyword){
  const q = (keyword||"").trim().toLowerCase();
  if(!q) { showToast("검색어를 입력하세요"); return; }

  const size = 40;
  const [posts, learning, ana, notices, idp] = await Promise.all([
    listDocs(COL.POSTS, { lim:size }),
    listDocs(COL.LEARNING, { lim:size }),
    listDocs(COL.ANACADEMY, { lim:size }),
    listDocs(COL.NOTICES, { lim:size }),
    listDocs(COL.IDP, { lim:size }),
  ]);

  const hit = (x)=> {
    const fields = [
      x.title, x.body, x.content, x.note, x.desc, x.tags?.join(", "),
      (x.searchTokens||[]).join(" ")
    ].filter(Boolean).join(" ").toLowerCase();
    return fields.includes(q) || fields.split(/\s+/).some(tok=> tok.startsWith(q));
  };

  const results = [
    ...posts.filter(hit).map(r=>({...r, __col:COL.POSTS})),
    ...learning.filter(hit).map(r=>({...r, __col:COL.LEARNING})),
    ...ana.filter(hit).map(r=>({...r, __col:COL.ANACADEMY})),
    ...notices.filter(hit).map(r=>({...r, __col:COL.NOTICES})),
    ...idp.filter(hit).map(r=>({...r, __col:COL.IDP})),
  ].slice(0,80);

  renderSearchResults(keyword, results);
}
searchBtn.addEventListener("click", ()=> globalSearchRun(globalSearch.value));
globalSearch.addEventListener("keydown", (e)=>{ if(e.key==="Enter") globalSearchRun(globalSearch.value); });

/* ------------------------------
   뷰 렌더
------------------------------ */
export async function initApp(){
  // 단축키
  document.addEventListener("keydown",(e)=>{
    if(e.key==="/" && document.activeElement!==globalSearch){
      e.preventDefault(); globalSearch.focus();
    }
  });

  // 글작성 모달
  openComposer.addEventListener("click", ()=> composerModal.showModal());
  composerForm.addEventListener("submit", (e)=> e.preventDefault());
  submitPostBtn.addEventListener("click", onSubmitCompose);

  // 사용자 이메일 유지(내 학습 소유자 표시에 활용)
  onAuthStateChanged(auth, (user)=> { window.__AKS_USER_EMAIL = user?.email || ""; });

  // 최초 라우트
  ensureRoute();
}

async function render(hash){
  switch(hash){
    case "#home": await renderHome(); break;
    case "#learning": await renderLearning(); break;
    case "#anacademy": await renderAnacademy(); break;
    case "#notices": await renderNotices(); break;
    case "#idp": await renderIDP(); break;
    default: await renderHome();
  }
}

/* ===== 학습하기(피드) ===== */
async function renderHome(){
  const posts = await listDocs(COL.POSTS, { lim:30 });
  const html = /*html*/`
    <div class="row" style="justify-content:space-between; align-items:center">
      <h2>학습하기(피드)</h2>
      <div class="row">
        <span class="badge green">누구나 작성 가능</span>
        <button class="btn btn-primary" id="composeBtnTop">새 글</button>
      </div>
    </div>
    ${posts.length? posts.map(postCard).join("") : `<div class="empty">아직 글이 없어요. 첫 글을 작성해보세요!</div>`}
  `;
  viewContainer.innerHTML = html;
  document.getElementById("composeBtnTop").addEventListener("click", ()=> composerModal.showModal());
  posts.forEach(p=> bindPostCardHandlers(p));
}
function postCard(p){
  return /*html*/`
    <article class="card" id="post-${p.id}">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="card-title">${escapeHtml(p.title||"(제목없음)")}</div>
          <div class="card-meta">
            작성자: ${escapeHtml(p.authorName||p.authorEmail||"알수없음")} · ${fmt(p.createdAt)}
            ${p.tags?.length? ` · 태그: ${p.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}`:""}
          </div>
        </div>
        <div class="row">
          <button class="btn" data-action="edit" data-id="${p.id}">편집</button>
          <button class="btn danger" data-action="delete" data-id="${p.id}">삭제</button>
        </div>
      </div>
      <div style="margin-top:10px; white-space:pre-wrap; line-height:1.6">${escapeHtml(p.body||p.content||"")}</div>
      <div class="card-actions">
        <button class="btn" data-action="save" data-id="${p.id}">저장</button>
        <button class="btn" data-action="share" data-id="${p.id}">공유</button>
      </div>
    </article>
  `;
}
function bindPostCardHandlers(p){
  const root = document.getElementById(`post-${p.id}`);
  if(!root) return;
  root.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-action");
      if(act==="delete"){
        if(confirm("이 글을 삭제할까요?")){ await removeDoc(COL.POSTS, p.id); showToast("삭제됨"); render("#home"); }
      }else if(act==="edit"){
        await openEditPost(p);
      }else if(act==="save"){
        try {
          await createDoc(COL.MYLEARN, {
            owner: currentIdentity(), type:"bookmark", ref: { col: COL.POSTS, id: p.id, title:p.title },
            note:"", searchTokens: tokensFromText(p.title+" "+p.body)
          });
          showToast("내 학습에 저장됨");
        } catch(e){ showToast("저장 실패"); }
      }else if(act==="share"){
        const url = location.origin + location.pathname + "#home";
        await navigator.clipboard.writeText(`${url} (제목: ${p.title||""})`);
        showToast("링크 복사됨");
      }
    });
  });
}

async function onSubmitCompose(e){
  e.preventDefault();
  const title = document.getElementById("postTitle").value.trim();
  const body = document.getElementById("postBody").value.trim();
  const tags = document.getElementById("postTags").value.split(",").map(s=>s.trim()).filter(Boolean);
  const toLearning = document.getElementById("postToLearning").checked;
  if(!title || !body){ showToast("제목/본문을 입력하세요"); return; }

  const authorName = currentIdentity();
  const base = {
    title, body, tags, authorName, authorEmail: window.__AKS_USER_EMAIL || null,
    searchTokens: Array.from(new Set([...tokensFromText(title), ...tokensFromText(body), ...tags.map(t=>t.toLowerCase())]))
  };

  await createDoc(COL.POSTS, base);
  if(toLearning){
    await createDoc(COL.LEARNING, {
      title, desc: body, tags, category:"공유글", level:"N/A",
      authorName, searchTokens: base.searchTokens
    });
  }

  composerModal.close();
  composerForm.reset();
  showToast("게시 완료");
  render("#home");
}

async function openEditPost(p){
  document.getElementById("postTitle").value = p.title||"";
  document.getElementById("postBody").value = p.body||"";
  document.getElementById("postTags").value = (p.tags||[]).join(", ");
  document.getElementById("postToLearning").checked = false;

  composerModal.showModal();

  const handler = async (e)=>{
    e.preventDefault();
    const title = document.getElementById("postTitle").value.trim();
    const body = document.getElementById("postBody").value.trim();
    const tags = document.getElementById("postTags").value.split(",").map(s=>s.trim()).filter(Boolean);
    const patch = {
      title, body, tags,
      searchTokens: Array.from(new Set([...tokensFromText(title), ...tokensFromText(body), ...tags.map(t=>t.toLowerCase())]))
    };
    await updateField(COL.POSTS, p.id, patch);
    submitPostBtn.removeEventListener("click", handler);
    composerForm.reset();
    composerModal.close();
    showToast("수정 완료");
    render("#home");
  };
  submitPostBtn.addEventListener("click", handler);
}

/* ===== 러닝 ===== */
async function renderLearning(){
  const items = await listDocs(COL.LEARNING, { lim:30 });
  const html = /*html*/`
    <div class="row" style="justify-content:space-between; align-items:center">
      <h2>러닝(스킬/코스/자료)</h2>
      <div class="row">
        <span class="badge yellow">IDP 연동 개념</span>
        <button class="btn btn-primary" id="addLearningBtn">러닝 항목 추가</button>
      </div>
    </div>
    ${items.length? items.map(learningCard).join("") : `<div class="empty">러닝 항목이 없습니다. 우측 상단에서 추가해보세요.</div>`}
  `;
  viewContainer.innerHTML = html;
  document.getElementById("addLearningBtn").addEventListener("click", ()=> openLearningCreate());
  items.forEach(i=> bindLearningCardHandlers(i));
}
function learningCard(x){
  return /*html*/`
    <article class="card" id="learning-${x.id}">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="card-title">${escapeHtml(x.title||"(제목없음)")}</div>
          <div class="card-meta">분류: ${escapeHtml(x.category||"기타")} · 난이도: ${escapeHtml(x.level||"N/A")} · ${fmt(x.createdAt)}</div>
        </div>
        <div class="row">
          <button class="btn" data-action="start" data-id="${x.id}">수강 시작</button>
          <button class="btn" data-action="edit" data-id="${x.id}">편집</button>
          <button class="btn danger" data-action="delete" data-id="${x.id}">삭제</button>
        </div>
      </div>
      <div style="margin-top:10px; white-space:pre-wrap;">${escapeHtml(x.desc||"")}</div>
      ${x.tags?.length? `<div class="card-actions">${x.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>`:""}
    </article>
  `;
}
function bindLearningCardHandlers(x){
  const root = document.getElementById(`learning-${x.id}`); if(!root) return;
  root.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-action");
      if(act==="delete"){
        if(confirm("이 러닝 항목을 삭제할까요?")){ await removeDoc(COL.LEARNING, x.id); showToast("삭제됨"); render("#learning"); }
      }else if(act==="edit"){
        await openLearningEdit(x);
      }else if(act==="start"){
        await createDoc(COL.MYLEARN, {
          owner: currentIdentity(), type:"enroll", ref:{col:COL.LEARNING, id:x.id, title:x.title}, progress:0,
          searchTokens: tokensFromText(x.title+" "+x.desc)
        });
        showToast("내 학습에 등록됨");
      }
    });
  });
}
async function openLearningCreate(){
  const title = prompt("러닝 제목"); if(!title) return;
  const desc = prompt("설명(선택)")||"";
  const category = prompt("분류(e.g. FE, BE, HRD)")||"기타";
  const level = prompt("난이도(e.g. 입문/중급/고급)")||"입문";
  const tags = prompt("태그(쉼표로 구분)")||"";
  await createDoc(COL.LEARNING, {
    title, desc, category, level, tags: tags.split(",").map(t=>t.trim()).filter(Boolean),
    authorName: currentIdentity(),
    searchTokens: tokensFromText(title+" "+desc+" "+tags)
  });
  showToast("등록 완료");
  render("#learning");
}
async function openLearningEdit(x){
  const title = prompt("제목", x.title||""); if(!title) return;
  const desc = prompt("설명", x.desc||"")||"";
  const category = prompt("분류", x.category||"")||"";
  const level = prompt("난이도", x.level||"")||"";
  const tags = prompt("태그(쉼표)", (x.tags||[]).join(", "))||"";
  await updateField(COL.LEARNING, x.id, {
    title, desc, category, level, tags:tags.split(",").map(t=>t.trim()).filter(Boolean),
    searchTokens: tokensFromText(title+" "+desc+" "+tags)
  });
  showToast("수정 완료");
  render("#learning");
}

/* ===== 안카데미 ===== */
async function renderAnacademy(){
  const logs = await listDocs(COL.ANACADEMY, { lim:30 });
  const html = /*html*/`
    <div class="row" style="justify-content:space-between; align-items:center">
      <h2>안카데미(러닝 로그)</h2>
      <button class="btn btn-primary" id="addLogBtn">러닝 로그 작성</button>
    </div>
    ${logs.length? logs.map(logCard).join("") : `<div class="empty">등록된 러닝 로그가 없습니다.</div>`}
  `;
  viewContainer.innerHTML = html;
  document.getElementById("addLogBtn").addEventListener("click", ()=> openLogCreate());
  logs.forEach(l=> bindLogCardHandlers(l));
}
function logCard(l){
  return /*html*/`
    <article class="card" id="log-${l.id}">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="card-title">${escapeHtml(l.title||"학습 메모")}</div>
          <div class="card-meta">${fmt(l.createdAt)} · 작성자: ${escapeHtml(l.authorName||l.authorEmail||"게스트")}</div>
        </div>
        <div class="row">
          <button class="btn" data-action="edit" data-id="${l.id}">편집</button>
          <button class="btn danger" data-action="delete" data-id="${l.id}">삭제</button>
        </div>
      </div>
      <div style="margin-top:10px; white-space:pre-wrap;">${escapeHtml(l.note||"")}</div>
      ${l.tags?.length? `<div class="card-actions">${l.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>`:""}
    </article>
  `;
}
function bindLogCardHandlers(l){
  const root = document.getElementById(`log-${l.id}`); if(!root) return;
  root.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-action");
      if(act==="delete"){
        if(confirm("이 로그를 삭제할까요?")){ await removeDoc(COL.ANACADEMY, l.id); showToast("삭제됨"); render("#anacademy"); }
      }else if(act==="edit"){
        await openLogEdit(l);
      }
    });
  });
}
async function openLogCreate(){
  const title = prompt("로그 제목"); if(!title) return;
  const note = prompt("학습 내용/메모")||"";
  const tags = prompt("태그(쉼표)")||"";
  await createDoc(COL.ANACADEMY, {
    title, note, tags: tags.split(",").map(t=>t.trim()).filter(Boolean),
    authorName: currentIdentity(),
    searchTokens: tokensFromText(title+" "+note+" "+tags)
  });
  showToast("작성됨");
  render("#anacademy");
}
async function openLogEdit(l){
  const title = prompt("로그 제목", l.title||""); if(!title) return;
  const note = prompt("학습 내용/메모", l.note||"")||"";
  const tags = prompt("태그(쉼표)", (l.tags||[]).join(", "))||"";
  await updateField(COL.ANACADEMY, l.id, {
    title, note, tags: tags.split(",").map(t=>t.trim()).filter(Boolean),
    searchTokens: tokensFromText(title+" "+note+" "+tags)
  });
  showToast("수정됨");
  render("#anacademy");
}

/* ===== 공지사항 ===== */
async function renderNotices(){
  const notices = await listDocs(COL.NOTICES, { lim:30 });
  const html = /*html*/`
    <div class="row" style="justify-content:space-between; align-items:center">
      <h2>공지사항</h2>
      <button class="btn btn-primary" id="addNoticeBtn">공지 등록</button>
    </div>
    ${notices.length? notices.map(n=>/*html*/`
      <article class="card" id="notice-${n.id}">
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="card-title">${escapeHtml(n.title||"(제목없음)")}</div>
            <div class="card-meta">${fmt(n.createdAt)} · 등록자: ${escapeHtml(n.authorName||n.authorEmail||"")}</div>
          </div>
          <div class="row">
            <button class="btn" data-action="edit" data-id="${n.id}">편집</button>
            <button class="btn danger" data-action="delete" data-id="${n.id}">삭제</button>
          </div>
        </div>
        <div style="margin-top:10px; white-space:pre-wrap;">${escapeHtml(n.body||"")}</div>
      </article>
    `).join("") : `<div class="empty">공지사항이 없습니다.</div>`}
  `;
  viewContainer.innerHTML = html;
  document.getElementById("addNoticeBtn").addEventListener("click", ()=> openNoticeCreate());
  notices.forEach(n=> bindNoticeCardHandlers(n));
}
function bindNoticeCardHandlers(n){
  const root = document.getElementById(`notice-${n.id}`); if(!root) return;
  root.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-action");
      if(act==="delete"){
        if(confirm("이 공지를 삭제할까요?")){ await removeDoc(COL.NOTICES, n.id); showToast("삭제됨"); render("#notices"); }
      }else if(act==="edit"){
        await openNoticeEdit(n);
      }
    });
  });
}
async function openNoticeCreate(){
  const title = prompt("공지 제목"); if(!title) return;
  const body = prompt("공지 내용")||"";
  await createDoc(COL.NOTICES, {
    title, body, authorName: currentIdentity(),
    searchTokens: tokensFromText(title+" "+body)
  });
  showToast("공지 등록");
  render("#notices");
}
async function openNoticeEdit(n){
  const title = prompt("공지 제목", n.title||""); if(!title) return;
  const body = prompt("공지 내용", n.body||"")||"";
  await updateField(COL.NOTICES, n.id, {
    title, body, searchTokens: tokensFromText(title+" "+body)
  });
  showToast("수정 완료");
  render("#notices");
}

/* ===== IDP / 내 학습 ===== */
async function renderIDP(){
  // 데모 권한: 전체 공개 규칙 사용 권장. (README 참조)
  const [catalog, my] = await Promise.all([
    listDocs(COL.IDP, { lim:30 }),
    listDocs(COL.MYLEARN, { lim:50 /*rules 전면허용이면 필터 없이*/ }).catch(()=>[])
  ]);
  const html = /*html*/`
    <div class="grid grid-2">
      <section class="card">
        <div class="row" style="justify-content:space-between; align-items:center">
          <h3 class="card-title">IDP 카탈로그</h3>
          <button class="btn btn-primary" id="addIDPBtn">IDP 항목 추가</button>
        </div>
        ${catalog.length? `
          <table class="table">
            <thead><tr><th>스킬/과정</th><th>레벨</th><th>추천</th><th></th></tr></thead>
            <tbody>
              ${catalog.map(x=>/*html*/`
                <tr id="idp-${x.id}">
                  <td>${escapeHtml(x.title||"")}</td>
                  <td>${escapeHtml(x.level||"N/A")}</td>
                  <td>${escapeHtml(x.recommend||"일반")}</td>
                  <td class="row" style="gap:6px; justify-content:flex-end">
                    <button class="btn" data-action="enroll" data-id="${x.id}">내 학습에 담기</button>
                    <button class="btn" data-action="edit" data-id="${x.id}">편집</button>
                    <button class="btn danger" data-action="delete" data-id="${x.id}">삭제</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="empty">등록된 IDP 카탈로그가 없습니다.</div>`}
      </section>

      <section class="card">
        <div class="row" style="justify-content:space-between; align-items:center">
          <h3 class="card-title">내 학습</h3>
          <span class="badge">소유자: ${escapeHtml(currentIdentity())}</span>
        </div>
        ${my?.length? my.map(m=>/*html*/`
          <article class="card" id="mylearn-${m.id}">
            <div class="row" style="justify-content:space-between">
              <div>
                <div class="card-title">${escapeHtml(m.ref?.title||m.title||"(제목없음)")}</div>
                <div class="card-meta">${escapeHtml(m.type||"")}${m.progress!=null? ` · 진행률 ${m.progress}%`:""} · ${fmt(m.createdAt)}</div>
              </div>
              <div class="row">
                ${m.progress!=null? `<button class="btn" data-action="progress" data-id="${m.id}">진행률 +10%</button>`:""}
                <button class="btn danger" data-action="remove" data-id="${m.id}">삭제</button>
              </div>
            </div>
            ${m.note? `<div style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(m.note)}</div>`:""}
          </article>
        `).join("") : `<div class="empty">아직 내 학습에 담긴 항목이 없습니다.</div>`}
      </section>
    </div>
  `;
  viewContainer.innerHTML = html;

  document.getElementById("addIDPBtn").addEventListener("click", ()=> openIDPCreate());
  catalog.forEach(x=> bindIDPRowHandlers(x));
  my?.forEach(m=> bindMyLearnHandlers(m));
}
function bindIDPRowHandlers(x){
  const row = document.getElementById(`idp-${x.id}`); if(!row) return;
  row.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-action");
      if(act==="delete"){
        if(confirm("IDP 항목 삭제?")){ await removeDoc(COL.IDP, x.id); showToast("삭제됨"); render("#idp"); }
      }else if(act==="edit"){
        await openIDPEdit(x);
      }else if(act==="enroll"){
        await createDoc(COL.MYLEARN, {
          owner: currentIdentity(), type:"idp-add", ref:{col:COL.IDP, id:x.id, title:x.title}, progress:0,
          searchTokens: tokensFromText(x.title+" "+(x.desc||""))
        });
        showToast("내 학습에 담겼습니다");
      }
    });
  });
}
function bindMyLearnHandlers(m){
  const card = document.getElementById(`mylearn-${m.id}`); if(!card) return;
  card.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-action");
      if(act==="remove"){
        if(confirm("내 학습에서 제거?")){ await removeDoc(COL.MYLEARN, m.id); showToast("제거됨"); render("#idp"); }
      }else if(act==="progress"){
        const newVal = Math.min(100, (m.progress||0)+10);
        await updateField(COL.MYLEARN, m.id, { progress: newVal });
        showToast("업데이트");
        render("#idp");
      }
    });
  });
}
async function openIDPCreate(){
  const title = prompt("IDP 항목(스킬/과정)"); if(!title) return;
  const level = prompt("레벨(입문/중급/고급)")||"입문";
  const recommend = prompt("추천(우선/일반)")||"일반";
  const desc = prompt("설명(선택)")||"";
  await createDoc(COL.IDP, {
    title, level, recommend, desc,
    searchTokens: tokensFromText(title+" "+desc+" "+level+" "+recommend)
  });
  showToast("IDP 카탈로그 추가");
  render("#idp");
}
async function openIDPEdit(x){
  const title = prompt("IDP 항목", x.title||""); if(!title) return;
  const level = prompt("레벨", x.level||"입문")||"입문";
  const recommend = prompt("추천", x.recommend||"일반")||"일반";
  const desc = prompt("설명", x.desc||"")||"";
  await updateField(COL.IDP, x.id, {
    title, level, recommend, desc,
    searchTokens: tokensFromText(title+" "+desc+" "+level+" "+recommend)
  });
  showToast("IDP 수정");
  render("#idp");
}

/* ===== 검색 결과 ===== */
function renderSearchResults(keyword, list){
  const html = /*html*/`
    <h2>검색 결과: "${escapeHtml(keyword)}"</h2>
    ${list.length? list.map(r=>/*html*/`
      <article class="card">
        <div class="row" style="justify-content:space-between">
          <div class="card-title">${escapeHtml(r.title || r.ref?.title || "(제목 없음)")}</div>
          <span class="badge">${escapeHtml(r.__col)}</span>
        </div>
        ${r.body||r.content||r.note||r.desc? `<div style="white-space:pre-wrap; margin-top:6px">${escapeHtml((r.body||r.content||r.note||r.desc).slice(0,240))}${(r.body||r.content||r.note||r.desc).length>240?"…":""}</div>`:""}
        ${r.tags?.length? `<div class="card-actions" style="margin-top:8px">${r.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>`:""}
      </article>
    `).join("") : `<div class="empty">검색 결과가 없습니다.</div>`}
  `;
  viewContainer.innerHTML = html;
}

export { ensureRoute }; // 필요 시 외부에서 호출할 수 있도록
