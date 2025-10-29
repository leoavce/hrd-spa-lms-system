import {
  COL, listDocs, createDoc, updateField, removeDoc,
  escapeHtml, tokensFromText, currentIdentity
} from "./data.js";

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
        <button class="btn-quiet" id="btn-new-log">새 로그</button>
      </div>
      ${latest? `
        <article class="card" style="box-shadow:none">
          <div class="row" style="justify-content:space-between">
            <div class="card-title">${escapeHtml(latest.title||"")}</div>
            <span class="card-meta">${new Date((latest.createdAt && latest.createdAt.toDate && latest.createdAt.toDate()) || latest.createdAt || Date.now()).toLocaleString("ko-KR",{hour12:false})}</span>
          </div>
          <div style="white-space:pre-wrap">${escapeHtml(latest.note||"")}</div>
          ${latest.tags?.length? `<div class="card-actions" style="margin-top:6px">${latest.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>`:""}
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
        </div>
        <!-- 조직 생성 버튼: 아웃라인 스타일 + 아이콘 -->
        <button class="btn btn-outline" id="btn-new-group" title="학습조직 만들기">➕ 조직 생성</button>
      </div>

      <!-- 블로그형: 제목 클릭 -> 본문 펼침 -->
      <div id="log-list" class="grid" style="margin-top:8px"></div>
    </section>
  `;

  // 동적 모달 생성 (인덱스 수정 없이)
  function openGroupModal(){
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.innerHTML = `
      <form method="dialog" class="modal-card" id="groupForm">
        <h3 class="modal-title">새 학습조직 만들기</h3>
        <label class="field">
          <span>조직 이름</span>
          <input class="input" id="gName" placeholder="예) FE 스터디" required maxlength="50">
        </label>
        <label class="field">
          <span>설명(선택)</span>
          <textarea class="textarea" id="gDesc" rows="3" maxlength="300" placeholder="조직 목적/운영 방침 등"></textarea>
        </label>
        <label class="field">
          <span>테마</span>
          <select class="input" id="gTheme">
            <option value="card">카드형(기본)</option>
            <option value="minimal">미니멀(여백 중심)</option>
          </select>
        </label>
        <div class="modal-actions">
          <button class="btn" value="cancel">취소</button>
          <button class="btn btn-primary" id="gSubmit" value="default">생성</button>
        </div>
      </form>
    `;
    document.body.appendChild(dlg);
    dlg.showModal();

    dlg.querySelector("#gSubmit").addEventListener("click", async (e)=>{
      e.preventDefault();
      const name = dlg.querySelector("#gName").value.trim();
      if(!name){ return; }
      const desc = dlg.querySelector("#gDesc").value.trim();
      const theme = dlg.querySelector("#gTheme").value;
      const id = `g-${Math.random().toString(36).slice(2,8)}`;
      await createDoc(COL.GROUPS, { id, name, desc, theme });
      dlg.close(); document.body.removeChild(dlg);
      renderAnacademy();
    });
  }

  const sel = document.getElementById("sel-group");
  const listEl = document.getElementById("log-list");

  function renderList(groupId){
    const filtered = groupId? logs.filter(l=> l.groupId===groupId) : logs;
    listEl.innerHTML = filtered.length? filtered.map(l=>{
      const created = new Date((l.createdAt && l.createdAt.toDate && l.createdAt.toDate()) || l.createdAt || Date.now()).toLocaleString("ko-KR",{hour12:false});
      const excerpt = (l.note||"").slice(0,140);
      const layoutClass = "card"; // 향후 group.theme에 따라 선택 가능
      return `
        <article class="${layoutClass}" id="log-${l.id}">
          <div class="row" style="justify-content:space-between; align-items:center">
            <button class="btn-quiet" data-action="toggle" data-id="${l.id}" style="font-weight:700; padding:0; border:none">${escapeHtml(l.title||"(제목없음)")}</button>
            <div class="row">
              <span class="card-meta">${created} · ${escapeHtml(l.authorName||"게스트")}</span>
              <button class="btn-quiet" data-action="edit" data-id="${l.id}">편집</button>
              <button class="btn-quiet danger" data-action="delete" data-id="${l.id}">삭제</button>
            </div>
          </div>
          <div class="muted" style="margin-top:6px">${escapeHtml(excerpt)}${(l.note||"").length>140?"…":""}</div>
          ${l.tags?.length? `<div class="card-actions" style="margin-top:6px">${l.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>`:""}
          <div class="hidden" id="log-body-${l.id}" style="white-space:pre-wrap; margin-top:8px">${escapeHtml(l.note||"")}</div>
        </article>
      `;
    }).join("") : `<div class="empty">선택한 조직에 로그가 없습니다.</div>`;

    filtered.forEach(l=> bindLogHandlers(l));
  }

  function bindLogHandlers(l){
    const root = document.getElementById(`log-${l.id}`); if(!root) return;
    root.querySelectorAll("button[data-action]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const act = btn.getAttribute("data-action");
        if(act==="toggle"){
          const body = document.getElementById(`log-body-${l.id}`);
          body.classList.toggle("hidden");
        }else if(act==="delete"){
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

  document.getElementById("btn-new-group").addEventListener("click", openGroupModal);
}
