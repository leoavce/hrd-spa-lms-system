import {
  COL, listDocs, createDoc, updateField, removeDoc,
  escapeHtml, tokensFromText, currentIdentity,
  addComment, listComments, incPostCounter
} from "./data.js";

const viewContainer = document.getElementById("viewContainer");
const composerModal = document.getElementById("composerModal");
const composerForm = document.getElementById("composerForm");
const submitPostBtn = document.getElementById("submitPostBtn");
const openComposer = document.getElementById("openComposer");

let toast = (m)=>alert(m); // injected

export function registerHomeHooks(toastFn){
  toast = toastFn;
  openComposer.addEventListener("click", ()=> composerModal.showModal());
  composerForm.addEventListener("submit",(e)=> e.preventDefault());
  submitPostBtn.addEventListener("click", onSubmitCompose);
}

export async function renderHome(){
  const [notices, posts] = await Promise.all([
    listDocs(COL.NOTICES, { lim:3 }),
    listDocs(COL.POSTS, { lim:30 })
  ]);

  // ⬇ 공지 섹션: 상단 고정 + id="section-notices" (사이드바 앵커 스크롤용)
  const noticeHTML = notices.length? `
    <section class="card pinned" id="section-notices">
      <div class="row" style="justify-content:space-between; align-items:center">
        <h3 class="card-title">📢 공지사항</h3>
        <!-- 요청에 따라 IDP 이동 버튼 제거 -->
      </div>
      <div class="grid">
        ${notices.map(n=>`
          <article class="card" style="box-shadow:none">
            <div class="row" style="justify-content:space-between">
              <div class="card-title">${escapeHtml(n.title||"")}</div>
              <span class="card-meta">${new Date(n.createdAt?.toDate?.()||n.createdAt||Date.now()).toLocaleString("ko-KR",{hour12:false})}</span>
            </div>
            <div style="white-space:pre-wrap">${escapeHtml(n.body||"")}</div>
          </article>
        `).join("")}
      </div>
    </section>
  ` : "";

  const listHTML = posts.length? posts.map(postCard).join("") : `<div class="empty">아직 글이 없어요. 첫 글을 작성해보세요!</div>`;

  viewContainer.innerHTML = `
    ${noticeHTML}
    <div class="row" style="justify-content:space-between; align-items:center">
      <h2>학습하기(피드)</h2>
      <div class="row">
        <span class="badge green">누구나 작성 가능</span>
        <button class="btn btn-primary" id="composeBtnTop">새 글</button>
      </div>
    </div>
    ${listHTML}
  `;

  const composeTopBtn = document.getElementById("composeBtnTop");
  composeTopBtn?.addEventListener("click", ()=> composerModal.showModal());

  // bind each post
  posts.forEach(p=> bindPostHandlers(p));
}

function postCard(p){
  const like = Math.max(0, p.likes||0);
  const saves = Math.max(0, p.saves||0);
  return `
    <article class="card" id="post-${p.id}">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="card-title">${escapeHtml(p.title||"(제목없음)")}</div>
          <div class="card-meta">
            작성자: ${escapeHtml(p.authorName||"게스트")} ·
            ${new Date(p.createdAt?.toDate?.()||p.createdAt||Date.now()).toLocaleString("ko-KR",{hour12:false})}
            ${p.tags?.length? ` · ${p.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}`:""}
          </div>
        </div>
        <div class="card-toolbar">
          <button class="btn-quiet" data-action="edit" data-id="${p.id}">편집</button>
          <button class="btn-quiet danger" data-action="delete" data-id="${p.id}">삭제</button>
        </div>
      </div>

      <div style="margin-top:8px; white-space:pre-wrap; line-height:1.6">${escapeHtml(p.body||"")}</div>

      <div class="card-actions">
        <button class="toolbar-btn" data-action="like" data-id="${p.id}">❤️ 추천 <span class="toolbar-count">${like}</span></button>
        <button class="toolbar-btn" data-action="save" data-id="${p.id}">🔖 저장 <span class="toolbar-count">${saves}</span></button>
        <button class="toolbar-btn" data-action="share" data-id="${p.id}">🔗 공유</button>
        <button class="toolbar-btn" data-action="toggle-comments" data-id="${p.id}">💬 댓글</button>
      </div>

      <div class="comment-box hidden" id="comments-${p.id}">
        <div class="row">
          <input id="cmt-input-${p.id}" class="input flex-1" placeholder="댓글을 입력하세요 (Enter로 등록)" />
          <button class="btn-quiet" data-action="add-comment" data-id="${p.id}">등록</button>
        </div>
        <div id="cmt-list-${p.id}" style="margin-top:8px"></div>
      </div>
    </article>
  `;
}

function bindPostHandlers(p){
  const root = document.getElementById(`post-${p.id}`);
  if(!root) return;

  root.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-action");
      if(act==="delete"){
        if(confirm("이 글을 삭제할까요?")){ await removeDoc(COL.POSTS, p.id); toast("삭제됨"); renderHome(); }
      }else if(act==="edit"){
        await openEditPost(p);
      }else if(act==="like"){
        await incPostCounter(p.id, "likes");
        toast("추천했습니다");
        renderHome();
      }else if(act==="save"){
        await incPostCounter(p.id, "saves");
        toast("저장했습니다");
        renderHome();
      }else if(act==="share"){
        const url = location.origin + location.pathname + "#home";
        await navigator.clipboard.writeText(`${url} (제목: ${p.title||""})`);
        toast("링크 복사됨");
      }else if(act==="toggle-comments"){
        const box = document.getElementById(`comments-${p.id}`);
        box.classList.toggle("hidden");
        if(!box.classList.contains("hidden")) refreshComments(p.id);
      }else if(act==="add-comment"){
        const input = document.getElementById(`cmt-input-${p.id}`);
        const content = input.value.trim(); if(!content) return;
        await addComment(p.id, content, null);
        input.value="";
        refreshComments(p.id);
      }
    });
  });

  // Enter로 댓글 입력
  const input = document.getElementById(`cmt-input-${p.id}`);
  input?.addEventListener("keydown", async (e)=>{
    if(e.key==="Enter"){
      const content = input.value.trim(); if(!content) return;
      await addComment(p.id, content, null);
      input.value=""; refreshComments(p.id);
    }
  });
}

async function refreshComments(postId){
  const list = await listComments(postId);
  const roots = list.filter(c=>!c.parentId);
  const repliesMap = {};
  list.filter(c=>c.parentId).forEach(r=>{
    (repliesMap[r.parentId]??=[]).push(r);
  });

  const html = roots.map(c=> commentItem(c, repliesMap[c.id]||[])).join("");
  document.getElementById(`cmt-list-${postId}`).innerHTML = html;

  // bind reply buttons
  roots.forEach(c=>{
    const btn = document.getElementById(`reply-btn-${c.id}`);
    const input = document.getElementById(`reply-input-${c.id}`);
    btn?.addEventListener("click", async ()=>{
      const v = input.value.trim(); if(!v) return;
      await addComment(postId, v, c.id);
      input.value=""; refreshComments(postId);
    });
    input?.addEventListener("keydown", async (e)=>{
      if(e.key==="Enter"){
        const v = input.value.trim(); if(!v) return;
        await addComment(postId, v, c.id);
        input.value=""; refreshComments(postId);
      }
    });
  });
}

function commentItem(c, replies){
  const when = new Date(c.createdAt?.toDate?.()||c.createdAt||Date.now()).toLocaleString("ko-KR",{hour12:false});
  return `
    <div class="comment">
      <div class="card-meta">${escapeHtml(c.authorName||"게스트")} · ${when}</div>
      <div style="white-space:pre-wrap">${escapeHtml(c.content||"")}</div>
      <div class="row" style="margin-top:6px">
        <input id="reply-input-${c.id}" class="input flex-1" placeholder="응답 달기 (Enter로 등록)" />
        <button id="reply-btn-${c.id}" class="btn-quiet">응답</button>
      </div>
      ${replies?.length? replies.map(r=>{
        const w = new Date(r.createdAt?.toDate?.()||r.createdAt||Date.now()).toLocaleString("ko-KR",{hour12:false});
        return `
          <div class="comment reply">
            <div class="card-meta">${escapeHtml(r.authorName||"게스트")} · ${w}</div>
            <div style="white-space:pre-wrap">${escapeHtml(r.content||"")}</div>
          </div>
        `;
      }).join(""):""}
    </div>
  `;
}

async function onSubmitCompose(e){
  e.preventDefault();
  const title = document.getElementById("postTitle").value.trim();
  const body = document.getElementById("postBody").value.trim();
  const tags = document.getElementById("postTags").value.split(",").map(s=>s.trim()).filter(Boolean);
  const toLearning = document.getElementById("postToLearning").checked;
  if(!title || !body){ toast("제목/본문을 입력하세요"); return; }

  const authorName = currentIdentity();
  const base = {
    title, body, tags, authorName, likes:0, saves:0,
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
  toast("게시 완료");
  renderHome();
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
    toast("수정 완료");
    renderHome();
  };
  submitPostBtn.addEventListener("click", handler);
}
