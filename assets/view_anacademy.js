import { COL, listDocs, createDoc, updateField, removeDoc, escapeHtml, tokensFromText, currentIdentity } from "./data.js";

const viewContainer = document.getElementById("viewContainer");

export async function renderAnacademy(){
  const [groups, logs] = await Promise.all([
    listDocs(COL.GROUPS, { lim:100 }),
    listDocs(COL.ANACADEMY, { lim:80 })
  ]);

  const latest = logs[0];

  viewContainer.innerHTML = `
    <section class="card pinned">
      <div class="row" style="justify-content:space-between; align-items:center">
        <h3 class="card-title">🆕 최신 러닝 로그</h3>
        <button class="btn btn-primary" id="btn-new-log">새 로그</button>
      </div>
      ${latest? `
        <article class="card" style="box-shadow:none">
          <div class="row" style="justify-content:space-between">
            <div class="card-title">${escapeHtml(latest.title||"")}</div>
            <span class="card-meta">${new Date(latest.createdAt?.toDate?.()||latest.createdAt||Date.now()).toLocaleString("ko-KR",{hour12:false})}</span>
          </div>
          <div style="white-space:pre-wrap">${escapeHtml(latest.note||"")}</div>
        </article>
      `: `<div class="empty">아직 로그가 없습니다. 지금 첫 로그를 작성해보세요.</div>`}
    </section>

    <section class="card">
      <div class="row" style="justify-content:space-between; align-items:center">
        <div class="row">
          <label class="field" style="min-width:240px">
            <span>학습조직</span>
            <select class="input" id="sel-group">
              <option value="">전체</option>
              ${groups.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.name||"(이름없음)")}</option>`).join("")}
            </select>
          </label>
          <button class="btn" id="btn-new-group">조직 생성</button>
        </div>
        <span class="badge">블로그형 목록</span>
      </div>
      <div id="log-list" class="grid" style="margin-top:10px"></div>
    </section>
  `;

  const sel = document.getElementById("sel-group");
  const listEl = document.getElementById("log-list");

  function renderList(groupId){
    const filtered = groupId? logs.filter(l=> l.groupId===groupId) : logs;
    listEl.innerHTML = filtered.length? filtered.map(l=>`
      <article class="card" id="log-${l.id}">
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="card-title">${escapeHtml(l.title||"")}</div>
            <div class="card-meta">${new Date(l.createdAt?.toDate?.()||l.createdAt||Date.now()).toLocaleString("ko-KR",{hour12:false})}
              · 작성자: ${escapeHtml(l.authorName||"게스트")}
              ${l.tags?.length? ` · ${l.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}`:""}
            </div>
          </div>
          <div class="row">
            <button class="btn" data-action="edit" data-id="${l.id}">편집</button>
            <button class="btn danger" data-action="delete" data-id="${l.id}">삭제</button>
          </div>
        </div>
        <div style="white-space:pre-wrap; margin-top:8px">${escapeHtml(l.note||"")}</div>
      </article>
    `).join("") : `<div class="empty">선택한 조직에 로그가 없습니다.</div>`;

    filtered.forEach(l=> bindLogHandlers(l));
  }

  function bindLogHandlers(l){
    const root = document.getElementById(`log-${l.id}`); if(!root) return;
    root.querySelectorAll("button[data-action]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const act = btn.getAttribute("data-action");
        if(act==="delete"){
          if(confirm("로그 삭제?")){ await removeDoc(COL.ANACADEMY, l.id); renderAnacademy(); }
        }else if(act==="edit"){
          const t = prompt("제목", l.title||""); if(!t) return;
          const n = prompt("내용", l.note||"")||"";
          const tags = prompt("태그(쉼표)", (l.tags||[]).join(", "))||"";
          await updateField(COL.ANACADEMY, l.id, {
            title:t, note:n, tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
            searchTokens: tokensFromText(t+" "+n)
          });
          renderAnacademy();
        }
      });
    });
  }

  sel.addEventListener("change", ()=> renderList(sel.value));
  renderList("");

  document.getElementById("btn-new-log").addEventListener("click", async ()=>{
    const title = prompt("로그 제목"); if(!title) return;
    const note = prompt("내용")||"";
    const gid = sel.value || "";
    const tags = prompt("태그(쉼표)")||"";
    await createDoc(COL.ANACADEMY, {
      title, note, groupId: gid||"default", tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
      authorName: currentIdentity(), searchTokens: tokensFromText(title+" "+note)
    });
    renderAnacademy();
  });

  document.getElementById("btn-new-group").addEventListener("click", async ()=>{
    const name = prompt("조직 이름"); if(!name) return;
    const desc = prompt("설명(선택)")||"";
    const id = `g-${Math.random().toString(36).slice(2,8)}`;
    await createDoc(COL.GROUPS, { id, name, desc });
    alert("조직이 생성되었습니다");
    renderAnacademy();
  });
}
