import {
  COL, listDocs, createDoc, updateField, removeDoc,
  escapeHtml, tokensFromText, currentIdentity
} from "./data.js";

const viewContainer = document.getElementById("viewContainer");

export async function renderNotices(){
  // 공지 50개, 교육 50개
  const [notices, trainings] = await Promise.all([
    listDocs(COL.NOTICES, { lim:50 }),
    listDocs(COL.TRAININGS, { lim:50 })
  ]);

  viewContainer.innerHTML = `
    <section class="grid grid-2">
      <!-- 공지 관리/확인 -->
      <article class="card">
        <div class="row" style="justify-content:space-between; align-items:center">
          <h3 class="card-title">📢 공지사항</h3>
          <div class="row">
            <button class="btn-quiet" id="btn-new-notice">새 공지</button>
          </div>
        </div>
        <div id="notice-list" class="grid" style="margin-top:8px"></div>
      </article>

      <!-- 교육 신청 -->
      <article class="card">
        <div class="row" style="justify-content:space-between; align-items:center">
          <h3 class="card-title">🧾 교육 신청</h3>
          <span class="badge">신청자: ${escapeHtml(currentIdentity())}</span>
        </div>
        <div id="training-list" class="grid" style="margin-top:8px"></div>
      </article>
    </section>
  `;

  // 공지 목록 렌더
  const nList = document.getElementById("notice-list");
  nList.innerHTML = notices.length ? notices.map(n=>{
    const when = new Date((n.createdAt && n.createdAt.toDate && n.createdAt.toDate()) || n.createdAt || Date.now())
      .toLocaleString("ko-KR",{hour12:false});
    return `
      <article class="card" id="notice-${n.id}">
        <div class="row" style="justify-content:space-between">
          <div class="card-title">${escapeHtml(n.title||"(제목없음)")}</div>
          <div class="row">
            <span class="card-meta">${when}</span>
            <button class="btn-quiet" data-action="edit" data-id="${n.id}">편집</button>
            <button class="btn-quiet danger" data-action="delete" data-id="${n.id}">삭제</button>
          </div>
        </div>
        ${n.tags?.length? `<div class="card-actions" style="margin-top:6px">${n.tags.map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>`:""}
        <div style="white-space:pre-wrap; margin-top:6px">${escapeHtml(n.body||"")}</div>
      </article>
    `;
  }).join("") : `<div class="empty">등록된 공지가 없습니다.</div>`;

  // 교육 목록 렌더
  const tList = document.getElementById("training-list");
  tList.innerHTML = trainings.length ? trainings.map(t=>{
    const when = escapeHtml(t.schedule || "일정 미정");
    const provider = escapeHtml(t.provider || "사내 HRD");
    const cap = t.capacity!=null ? `정원 ${t.capacity}명` : "정원 정보 없음";
    return `
      <article class="card" id="training-${t.id}">
        <div class="row" style="justify-content:space-between">
          <div class="card-title">${escapeHtml(t.title||"(과정명)")}</div>
          <div class="row">
            ${t.url? `<a class="btn-quiet" href="${escapeHtml(t.url)}" target="_blank" rel="noopener">자세히</a>`:""}
            <button class="btn btn-primary" data-action="apply" data-id="${t.id}">신청</button>
          </div>
        </div>
        <div class="card-meta">${provider} · ${when} · ${cap}</div>
        ${t.tags?.length? `<div class="card-actions" style="margin-top:6px">${t.tags.map(x=>`<span class="badge">${escapeHtml(x)}</span>`).join(" ")}</div>`:""}
      </article>
    `;
  }).join("") : `<div class="empty">등록된 교육이 없습니다. 우측 상단 “새 공지” 옆 버튼을 추가해도 됩니다.</div>`;

  // 공지 생성
  document.getElementById("btn-new-notice").addEventListener("click", async ()=>{
    const title = prompt("공지 제목"); if(!title) return;
    const body = prompt("공지 내용(긴 내용 가능)")||"";
    const tags = prompt("태그(쉼표)")||"";
    await createDoc(COL.NOTICES, {
      title, body, tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
      searchTokens: tokensFromText(title+" "+body)
    });
    renderNotices();
  });

  // 공지 편집/삭제
  (notices||[]).forEach(n=>{
    const root = document.getElementById(`notice-${n.id}`); if(!root) return;
    root.querySelectorAll("button[data-action]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const act = btn.getAttribute("data-action");
        if(act==="delete"){
          if(confirm("공지 삭제?")){ await removeDoc(COL.NOTICES, n.id); renderNotices(); }
          return;
        }
        if(act==="edit"){
          const t = prompt("제목", n.title||""); if(!t) return;
          const b = prompt("내용", n.body||"") || "";
          const tags = prompt("태그(쉼표)", (n.tags||[]).join(", "))||"";
          await updateField(COL.NOTICES, n.id, {
            title: t, body: b, tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
            searchTokens: tokensFromText(t+" "+b)
          });
          renderNotices();
        }
      });
    });
  });

  // 교육 신청 (applyTraining import 없이 직접 작성)
  (trainings||[]).forEach(t=>{
    const root = document.getElementById(`training-${t.id}`); if(!root) return;
    root.querySelectorAll("button[data-action='apply']").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        await createDoc(COL.TRAIN_APPS, {
          trainingId: t.id,
          applicant: currentIdentity()
        });
        alert("신청이 접수되었습니다 (데모)");
      });
    });
  });
}
