import { EXT_CATALOG, escapeHtml, createDoc, COL, tokensFromText, currentIdentity } from "./data.js";

const viewContainer = document.getElementById("viewContainer");

export async function renderLearning(){
  const jobs = Object.keys(EXT_CATALOG);
  const firstJob = jobs[0];
  const skills = Object.keys(EXT_CATALOG[firstJob]||{});
  const firstSkill = skills[0];

  viewContainer.innerHTML = `
    <div class="row" style="justify-content:space-between; align-items:center">
      <h2>러닝(직무·스킬 기반 외부 강의)</h2>
      <span class="badge yellow">인프런 등 외부 강의 연동 UI (데모)</span>
    </div>

    <section class="card">
      <div class="row">
        <label class="field" style="min-width:220px">
          <span>직무 선택</span>
          <select class="input" id="sel-job">${jobs.map(j=>`<option value="${escapeHtml(j)}">${escapeHtml(j)}</option>`).join("")}</select>
        </label>
        <label class="field" style="min-width:220px">
          <span>스킬셋 선택</span>
          <select class="input" id="sel-skill"></select>
        </label>
      </div>
      <div id="course-list" class="grid" style="margin-top:12px"></div>
    </section>
  `;

  const selJob = document.getElementById("sel-job");
  const selSkill = document.getElementById("sel-skill");
  const courseList = document.getElementById("course-list");

  function renderSkills(job){
    const skills = Object.keys(EXT_CATALOG[job]||{});
    selSkill.innerHTML = skills.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  }
  function renderCourses(job, skill){
    const items = EXT_CATALOG[job]?.[skill] || [];
    courseList.innerHTML = items.length? items.map(c=>`
      <article class="card">
        <div class="row" style="justify-content:space-between">
          <div class="card-title">${escapeHtml(c.title)}</div>
          <span class="badge">${escapeHtml(c.provider)}</span>
        </div>
        <div class="card-meta">${escapeHtml(c.level)} · ${escapeHtml(c.time)}</div>
        <div class="card-actions">
          <a class="btn" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">강의 보기</a>
          <button class="btn btn-primary" data-title="${escapeHtml(c.title)}">내 러닝에 담기</button>
        </div>
      </article>
    `).join("") : `<div class="empty">해당 스킬의 강의가 없습니다.</div>`;

    courseList.querySelectorAll("button.btn-primary").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const t = b.getAttribute("data-title");
        await createDoc(COL.MYLEARN, {
          owner: currentIdentity(), type:"external-course", title:t, progress:0,
          note:"외부 강의(데모)", searchTokens: tokensFromText(t)
        });
        // 토스트는 공통에서, 여기선 alert 대체 없이 UX 최소화
        b.textContent = "담김 ✓";
        b.disabled = true;
      });
    });
  }

  renderSkills(firstJob); selJob.value = firstJob;
  renderCourses(firstJob, firstSkill);

  selJob.addEventListener("change", ()=>{
    renderSkills(selJob.value);
    renderCourses(selJob.value, selSkill.value);
  });
  selSkill.addEventListener("change", ()=>{
    renderCourses(selJob.value, selSkill.value);
  });
}
