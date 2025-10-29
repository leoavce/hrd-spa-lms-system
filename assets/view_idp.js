import { COL, listDocs, createDoc, updateField, removeDoc, escapeHtml, tokensFromText, currentIdentity } from "./data.js";

const viewContainer = document.getElementById("viewContainer");

export async function renderIDP(){
  const [catalog, my] = await Promise.all([
    listDocs(COL.IDP, { lim:50 }),
    listDocs(COL.MYLEARN, { lim:100 }).catch(()=>[])
  ]);

  const myGoals = my.filter(x=> x.type==="goal");
  const progress = Math.round(
    (my.filter(x=> typeof x.progress==="number").reduce((a,b)=> a+(b.progress||0),0) / Math.max(1, my.filter(x=> typeof x.progress==="number").length))
  );

  viewContainer.innerHTML = `
    <section class="grid grid-2">
      <article class="card">
        <div class="row" style="justify-content:space-between">
          <h3 class="card-title">🎯 나의 학습 목표</h3>
          <!-- 버튼 시각 강도 낮춤 -->
          <button class="btn-quiet" id="btn-add-goal">목표 추가</button>
        </div>
        ${myGoals.length? myGoals.map(g=>`
          <div class="card" id="goal-${g.id}" style="box-shadow:none; margin-top:8px">
            <div class="row" style="justify-content:space-between">
              <div class="card-title">${escapeHtml(g.title||"")}</div>
              <div class="row">
                <button class="btn-quiet" data-action="edit" data-id="${g.id}">편집</button>
                <button class="btn-quiet danger" data-action="remove" data-id="${g.id}">삭제</button>
              </div>
            </div>
            ${g.note? `<div style="white-space:pre-wrap">${escapeHtml(g.note)}</div>`:""}
          </div>
        `).join("") : `<div class="empty">아직 등록된 학습 목표가 없습니다.</div>`}
      </article>

      <article class="card">
        <div class="row" style="justify-content:space-between">
          <h3 class="card-title">📈 나의 학습 현황</h3>
          <span class="badge">평균 진행률 ${isFinite(progress)?progress:0}%</span>
        </div>
        ${my?.length? my.map(m=>`
          <div class="card" id="mylearn-${m.id}" style="box-shadow:none; margin-top:8px">
            <div class="row" style="justify-content:space-between">
              <div>
                <div class="card-title">${escapeHtml(m.ref?.title||m.title||"(제목없음)")}</div>
                <div class="card-meta">${escapeHtml(m.type||"")} ${m.progress!=null? `· 진행률 ${m.progress}%`:""} · ${new Date(m.createdAt?.toDate?.()||m.createdAt||Date.now()).toLocaleString("ko-KR",{hour12:false})}</div>
              </div>
              <div class="row">
                ${m.progress!=null? `<button class="btn-quiet" data-action="progress" data-id="${m.id}">+10%</button>`:""}
                <button class="btn-quiet danger" data-action="remove" data-id="${m.id}">삭제</button>
              </div>
            </div>
          </div>
        `).join("") : `<div class="empty">내 학습 항목이 없습니다.</div>`}
      </article>
    </section>

    <section class="card" style="margin-top:8px">
      <div class="row" style="justify-content:space-between; align-items:center">
        <h3 class="card-title">IDP 카탈로그</h3>
        <!-- 버튼 시각 강도 낮춤 -->
        <button class="btn-quiet" id="btn-add-idp">IDP 항목 추가</button>
      </div>
      ${catalog.length? `
        <table class="table">
          <thead><tr><th>스킬/과정</th><th>레벨</th><th>추천</th><th></th></tr></thead>
          <tbody>
            ${catalog.map(x=>`
              <tr id="idp-${x.id}">
                <td>${escapeHtml(x.title||"")}</td>
                <td>${escapeHtml(x.level||"N/A")}</td>
                <td>${escapeHtml(x.recommend||"일반")}</td>
                <td class="row" style="gap:6px; justify-content:flex-end">
                  <button class="btn-quiet" data-action="enroll" data-id="${x.id}">내 학습에 담기</button>
                  <button class="btn-quiet" data-action="edit" data-id="${x.id}">편집</button>
                  <button class="btn-quiet danger" data-action="delete" data-id="${x.id}">삭제</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<div class="empty">등록된 IDP 카탈로그가 없습니다.</div>`}
    </section>
  `;

  // Buttons
  document.getElementById("btn-add-goal").addEventListener("click", async ()=>{
    const title = prompt("학습 목표"); if(!title) return;
    const note = prompt("메모(선택)")||"";
    await createDoc(COL.MYLEARN, { owner: currentIdentity(), type:"goal", title, note, searchTokens: tokensFromText(title+" "+note) });
    renderIDP();
  });

  myGoals.forEach(g=>{
    const root = document.getElementById(`goal-${g.id}`); if(!root) return;
    root.querySelectorAll("button[data-action]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const act = btn.getAttribute("data-action");
        if(act==="remove"){ if(confirm("목표 삭제?")){ await removeDoc(COL.MYLEARN, g.id); renderIDP(); } }
        if(act==="edit"){
          const t = prompt("목표", g.title||""); if(!t) return;
          const n = prompt("메모", g.note||"")||"";
          await updateField(COL.MYLEARN, g.id, { title:t, note:n, searchTokens: tokensFromText(t+" "+n) });
          renderIDP();
        }
      });
    });
  });

  my?.forEach(m=>{
    const root = document.getElementById(`mylearn-${m.id}`); if(!root) return;
    root.querySelectorAll("button[data-action"]).forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const act = btn.getAttribute("data-action");
        if(act==="remove"){ if(confirm("내 학습에서 삭제?")){ await removeDoc(COL.MYLEARN, m.id); renderIDP(); } }
        if(act==="progress"){ const val = Math.min(100,(m.progress||0)+10); await updateField(COL.MYLEARN, m.id, { progress: val }); renderIDP(); }
      });
    });
  });

  document.getElementById("btn-add-idp").addEventListener("click", async ()=>{
    const title = prompt("IDP 항목(스킬/과정)"); if(!title) return;
    const level = prompt("레벨(입문/중급/고급)")||"입문";
    const recommend = prompt("추천(우선/일반)")||"일반";
    const desc = prompt("설명(선택)")||"";
    await createDoc(COL.IDP, { title, level, recommend, desc, searchTokens: tokensFromText(title+" "+desc+" "+level+" "+recommend) });
    renderIDP();
  });

  catalog.forEach(x=>{
    const row = document.getElementById(`idp-${x.id}`); if(!row) return;
    row.querySelectorAll("button[data-action]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const act = btn.getAttribute("data-action");
        if(act==="delete"){ if(confirm("IDP 항목 삭제?")){ await removeDoc(COL.IDP, x.id); renderIDP(); } }
        if(act==="edit"){
          const t = prompt("항목", x.title||""); if(!t) return;
          const l = prompt("레벨", x.level||"입문")||"입문";
          const r = prompt("추천", x.recommend||"일반")||"일반";
          const d = prompt("설명", x.desc||"")||"";
          await updateField(COL.IDP, x.id, { title:t, level:l, recommend:r, desc:d, searchTokens: tokensFromText(t+" "+d+" "+l+" "+r) });
          renderIDP();
        }
        if(act==="enroll"){
          await createDoc(COL.MYLEARN, { owner: currentIdentity(), type:"idp-add", ref:{col:COL.IDP, id:x.id, title:x.title}, progress:0, searchTokens: tokensFromText(x.title+" "+(x.desc||"")) });
          renderIDP();
        }
      });
    });
  });
}
