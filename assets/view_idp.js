import {
  COL, listDocs, createDoc, updateField, removeDoc,
  escapeHtml, tokensFromText, currentIdentity
} from "./data.js";

const viewContainer = document.getElementById("viewContainer");

export async function renderIDP(){
  // 데이터 로드
  const catalog = await listDocs(COL.IDP, { lim:50 });
  const my = await listDocs(COL.MYLEARN, { lim:100 }).catch(()=>[]);

  // 가공
  const myGoals = my.filter(function(x){ return x.type==="goal"; });
  const progressSrc = my.filter(function(x){ return typeof x.progress==="number"; });
  const avgProgress = progressSrc.length
    ? Math.round(progressSrc.reduce(function(a,b){ return a + (b.progress||0); }, 0) / progressSrc.length)
    : 0;

  // 나의 학습 현황 카드 HTML (템플릿 분리로 파싱 안정화)
  var myListHtml = "";
  if (my && my.length) {
    myListHtml = my.map(function(m){
      var title = escapeHtml((m.ref && m.ref.title) || m.title || "(제목없음)");
      var meta = (m.type || "");
      var when = new Date((m.createdAt && m.createdAt.toDate && m.createdAt.toDate()) || m.createdAt || Date.now())
                  .toLocaleString("ko-KR",{hour12:false});
      var progressBtn = (m.progress!=null)
        ? '<button class="btn-quiet" data-action="progress" data-id="'+m.id+'">+10%</button>'
        : "";
      var progressMeta = (m.progress!=null) ? (" · 진행률 "+m.progress+"%") : "";

      return (
        '<div class="card" id="mylearn-'+m.id+'" style="box-shadow:none; margin-top:8px">'+
          '<div class="row" style="justify-content:space-between">'+
            '<div>'+
              '<div class="card-title">'+ title +'</div>'+
              '<div class="card-meta">'+ escapeHtml(meta) + progressMeta + ' · '+ when +'</div>'+
            '</div>'+
            '<div class="row">'+
              progressBtn+
              '<button class="btn-quiet danger" data-action="remove" data-id="'+m.id+'">삭제</button>'+
            '</div>'+
          '</div>'+
        '</div>'
      );
    }).join("");
  } else {
    myListHtml = '<div class="empty">내 학습 항목이 없습니다.</div>';
  }

  // IDP 테이블 HTML
  var idpTableHtml = "";
  if (catalog && catalog.length) {
    idpTableHtml =
      '<table class="table">'+
        '<thead><tr><th>스킬/과정</th><th>레벨</th><th>추천</th><th></th></tr></thead>'+
        '<tbody>'+
          catalog.map(function(x){
            return (
              '<tr id="idp-'+x.id+'">'+
                '<td>'+ escapeHtml(x.title||"") +'</td>'+
                '<td>'+ escapeHtml(x.level||"N/A") +'</td>'+
                '<td>'+ escapeHtml(x.recommend||"일반") +'</td>'+
                '<td class="row" style="gap:6px; justify-content:flex-end">'+
                  '<button class="btn-quiet" data-action="enroll" data-id="'+x.id+'">내 학습에 담기</button>'+
                  '<button class="btn-quiet" data-action="edit" data-id="'+x.id+'">편집</button>'+
                  '<button class="btn-quiet danger" data-action="delete" data-id="'+x.id+'">삭제</button>'+
                '</td>'+
              '</tr>'
            );
          }).join("")+
        '</tbody>'+
      '</table>';
  } else {
    idpTableHtml = '<div class="empty">등록된 IDP 카탈로그가 없습니다.</div>';
  }

  // 목표 카드 HTML
  var goalsHtml = "";
  if (myGoals.length) {
    goalsHtml = myGoals.map(function(g){
      return (
        '<div class="card" id="goal-'+g.id+'" style="box-shadow:none; margin-top:8px">'+
          '<div class="row" style="justify-content:space-between">'+
            '<div class="card-title">'+ escapeHtml(g.title||"") +'</div>'+
            '<div class="row">'+
              '<button class="btn-quiet" data-action="edit" data-id="'+g.id+'">편집</button>'+
              '<button class="btn-quiet danger" data-action="remove" data-id="'+g.id+'">삭제</button>'+
            '</div>'+
          '</div>'+
          (g.note ? '<div style="white-space:pre-wrap">'+ escapeHtml(g.note) +'</div>' : '')+
        '</div>'
      );
    }).join("");
  } else {
    goalsHtml = '<div class="empty">아직 등록된 학습 목표가 없습니다.</div>';
  }

  // 렌더링
  viewContainer.innerHTML =
    '<section class="grid grid-2">'+
      '<article class="card">'+
        '<div class="row" style="justify-content:space-between">'+
          '<h3 class="card-title">🎯 나의 학습 목표</h3>'+
          '<button class="btn-quiet" id="btn-add-goal">목표 추가</button>'+
        '</div>'+
        goalsHtml+
      '</article>'+
      '<article class="card">'+
        '<div class="row" style="justify-content:space-between">'+
          '<h3 class="card-title">📈 나의 학습 현황</h3>'+
          '<span class="badge">평균 진행률 '+ (isFinite(avgProgress)?avgProgress:0) +'%</span>'+
        '</div>'+
        myListHtml+
      '</article>'+
    '</section>'+
    '<section class="card" style="margin-top:8px">'+
      '<div class="row" style="justify-content:space-between; align-items:center">'+
        '<h3 class="card-title">IDP 카탈로그</h3>'+
        '<button class="btn-quiet" id="btn-add-idp">IDP 항목 추가</button>'+
      '</div>'+
      idpTableHtml+
    '</section>';

  // 이벤트 바인딩

  // 목표 추가
  document.getElementById("btn-add-goal").addEventListener("click", async function(){
    var title = prompt("학습 목표");
    if(!title) return;
    var note = prompt("메모(선택)") || "";
    await createDoc(COL.MYLEARN, {
      owner: currentIdentity(), type:"goal", title: title, note: note,
      searchTokens: tokensFromText(title+" "+note)
    });
    renderIDP();
  });

  // 목표 편집/삭제
  myGoals.forEach(function(g){
    var root = document.getElementById("goal-"+g.id);
    if(!root) return;
    root.querySelectorAll("button[data-action]").forEach(function(btn){
      btn.addEventListener("click", async function(){
        var act = btn.getAttribute("data-action");
        if(act==="remove"){
          if(confirm("목표 삭제?")){ await removeDoc(COL.MYLEARN, g.id); renderIDP(); }
          return;
        }
        if(act==="edit"){
          var t = prompt("목표", g.title||"");
          if(!t) return;
          var n = prompt("메모", g.note||"") || "";
          await updateField(COL.MYLEARN, g.id, {
            title: t, note: n, searchTokens: tokensFromText(t+" "+n)
          });
          renderIDP();
        }
      });
    });
  });

  // 내 학습 항목(진행률/삭제)
  (my || []).forEach(function(m){
    var root = document.getElementById("mylearn-"+m.id);
    if(!root) return;
    root.querySelectorAll("button[data-action]").forEach(function(btn){
      btn.addEventListener("click", async function(){
        var act = btn.getAttribute("data-action");
        if(act==="remove"){
          if(confirm("내 학습에서 삭제?")){ await removeDoc(COL.MYLEARN, m.id); renderIDP(); }
          return;
        }
        if(act==="progress"){
          var next = Math.min(100, (m.progress||0) + 10);
          await updateField(COL.MYLEARN, m.id, { progress: next });
          renderIDP();
        }
      });
    });
  });

  // IDP 카탈로그 추가
  document.getElementById("btn-add-idp").addEventListener("click", async function(){
    var title = prompt("IDP 항목(스킬/과정)");
    if(!title) return;
    var level = prompt("레벨(입문/중급/고급)") || "입문";
    var recommend = prompt("추천(우선/일반)") || "일반";
    var desc = prompt("설명(선택)") || "";
    await createDoc(COL.IDP, {
      title: title, level: level, recommend: recommend, desc: desc,
      searchTokens: tokensFromText(title+" "+desc+" "+level+" "+recommend)
    });
    renderIDP();
  });

  // IDP 행의 액션(편집/삭제/담기)
  (catalog || []).forEach(function(x){
    var row = document.getElementById("idp-"+x.id);
    if(!row) return;
    row.querySelectorAll("button[data-action]").forEach(function(btn){
      btn.addEventListener("click", async function(){
        var act = btn.getAttribute("data-action");
        if(act==="delete"){
          if(confirm("IDP 항목 삭제?")){ await removeDoc(COL.IDP, x.id); renderIDP(); }
          return;
        }
        if(act==="edit"){
          var t = prompt("항목", x.title||""); if(!t) return;
          var l = prompt("레벨", x.level||"입문") || "입문";
          var r = prompt("추천", x.recommend||"일반") || "일반";
          var d = prompt("설명", x.desc||"") || "";
          await updateField(COL.IDP, x.id, {
            title: t, level: l, recommend: r, desc: d,
            searchTokens: tokensFromText(t+" "+d+" "+l+" "+r)
          });
          renderIDP();
          return;
        }
        if(act==="enroll"){
          await createDoc(COL.MYLEARN, {
            owner: currentIdentity(),
            type: "idp-add",
            ref: { col: COL.IDP, id: x.id, title: x.title },
            progress: 0,
            searchTokens: tokensFromText((x.title||"") + " " + (x.desc||""))
          });
          renderIDP();
        }
      });
    });
  });
}
