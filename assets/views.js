import { COL, listDocs, tokensFromText, escapeHtml } from "./data.js";
import { renderHome, registerHomeHooks } from "./view_home.js";
import { renderLearning } from "./view_learning.js";
import { renderAnacademy } from "./view_anacademy.js";
import { renderIDP } from "./view_idp.js";

const viewContainer = document.getElementById("viewContainer");
const globalSearch = document.getElementById("globalSearch");
const searchBtn = document.getElementById("searchBtn");

const routes = ["#home", "#learning", "#anacademy", "#idp"];
function setActiveNav(hash){
  document.querySelectorAll(".nav-item").forEach(a=>{
    a.classList.toggle("active", a.getAttribute("data-route")===hash);
  });
}

export async function ensureRoute(){
  if(!routes.includes(location.hash)) location.hash = "#home";
  setActiveNav(location.hash);
  try {
    await render(location.hash);
  } catch (e) {
    console.error("Render error:", e);
    viewContainer.innerHTML =
      '<div class="empty">화면을 불러오는 중 문제가 발생했습니다.<br>잠시 후 다시 시도해 주세요.</div>';
  }

  const anchor = sessionStorage.getItem("aks_anchor_once");
  if(anchor && location.hash==="#home"){
    const el = document.getElementById(anchor);
    if(el){ el.scrollIntoView({behavior:"smooth", block:"start"}); }
    sessionStorage.removeItem("aks_anchor_once");
  }
}
window.addEventListener("hashchange", ensureRoute);

document.querySelectorAll(".nav-item").forEach(a=>{
  a.addEventListener("click",(e)=>{
    e.preventDefault();
    const route = a.getAttribute("data-route");
    const anchor = a.getAttribute("data-anchor");
    if(anchor){ sessionStorage.setItem("aks_anchor_once", anchor); }
    location.hash = route;
  });
});

async function globalSearchRun(keyword){
  const q = (keyword||"").trim().toLowerCase();
  if(!q){ toast("검색어를 입력하세요"); return; }

  const size = 120;
  const [posts, learning, ana, notices, idp] = await Promise.all([
    listDocs(COL.POSTS,{lim:size}), listDocs(COL.LEARNING,{lim:size}),
    listDocs(COL.ANACADEMY,{lim:size}), listDocs(COL.NOTICES,{lim:size}),
    listDocs(COL.IDP,{lim:size}),
  ]);

  const hit = (x)=> {
    const fields = [
      x.title, x.body, x.content, x.note, x.desc, x.tags?.join(", "),
      (x.searchTokens||[]).join(" ")
    ].filter(Boolean).join(" ").toLowerCase();
    return fields.includes(q) || tokensFromText(fields).some(tok=> tok.startsWith(q));
  };
  const list = [
    ...posts.filter(hit).map(r=>({...r,__col:"학습하기"})),
    ...learning.filter(hit).map(r=>({...r,__col:"러닝"})),
    ...ana.filter(hit).map(r=>({...r,__col:"안카데미"})),
    ...notices.filter(hit).map(r=>({...r,__col:"공지"})),
    ...idp.filter(hit).map(r=>({...r,__col:"IDP"})),
  ].slice(0,120);

  viewContainer.innerHTML = `
    <h2>검색 결과: "${escapeHtml(keyword)}"</h2>
    ${list.length? list.map(r=>`
      <article class="card">
        <div class="row" style="justify-content:space-between">
          <div class="card-title">${escapeHtml(r.title || r.ref?.title || "(제목 없음)")}</div>
          <span class="badge">${escapeHtml(r.__col)}</span>
        </div>
        ${(r.body||r.content||r.note||r.desc)? `<div style="white-space:pre-wrap; margin-top:6px">${escapeHtml((r.body||r.content||r.note||r.desc).slice(0,260))}${(r.body||r.content||r.note||r.desc).length>260?"…":""}</div>`:""}
        ${r.tags?.length? `<div class="card-actions" style="margin-top:8px">${r.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>`:""}
      </article>
    `).join(""):`<div class="empty">검색 결과가 없습니다.</div>`}
  `;
}

export function toast(msg, ms=1800){
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  setTimeout(()=> el.classList.remove("show"), ms);
}
searchBtn.addEventListener("click", ()=> globalSearchRun(globalSearch.value));
globalSearch.addEventListener("keydown",(e)=>{ if(e.key==="Enter") globalSearchRun(globalSearch.value); });

async function render(hash){
  if(hash==="#home") return renderHome();
  if(hash==="#learning") return renderLearning();
  if(hash==="#anacademy") return renderAnacademy();
  if(hash==="#idp") return renderIDP();
}
registerHomeHooks(toast);
