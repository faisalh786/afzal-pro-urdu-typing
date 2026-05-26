// TAB / MODE SWITCHING
// ============================================================
function switchTab(tab){
  mode=tab;
  document.querySelectorAll('.tab').forEach((t,i)=>{const tabs=['lesson','practice','test','history','ref'];t.classList.toggle('active',tabs[i]===tab);});
  document.querySelectorAll('.mode-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+tab)?.classList.add('active');
  spanCacheDisplay=null;spanCacheLen=0;spanCache=[];
  clearGuidance();clearFlash();
  if(tab==='lesson')initLesson();
  else if(tab==='practice')initPractice();
  else if(tab==='test')initTest();
  else if(tab==='history')renderHistory();
  else if(tab==='ref')buildRef();
  document.getElementById('capture').focus();
}

// ============================================================
// LESSON NAVIGATOR
// ============================================================
function selectGroup(groupKey){
  activeGroup=groupKey;
  document.querySelectorAll('.lesson-group-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('lg-'+groupKey)?.classList.add('active');
  renderPhaseButtons(groupKey);
}
function renderPhaseButtons(groupKey){
  const container=document.getElementById('lesson-phases');if(!container)return;
  const group=LESSON_GROUPS[groupKey];const d=loadData();container.innerHTML='';
  group.phases.forEach(phase=>{
    const btn=document.createElement('button');const done=!!d.completedLessons[phase.idx];
    btn.className='lesson-phase-btn'+(currentLesson===phase.idx?' active':'')+(done?' completed':'');
    btn.setAttribute('data-type',phase.type);btn.textContent=phase.label;
    btn.onclick=()=>selectLesson(phase.idx);container.appendChild(btn);
  });
}
function selectLesson(idx){currentLesson=idx;renderPhaseButtons(activeGroup);initLesson();}

// ============================================================
// HISTORY
// ============================================================
function renderHistory(){
  const d=loadData();
  const avgWPM=d.sessions.length?Math.round(d.sessions.reduce((a,s)=>a+s.wpm,0)/d.sessions.length):0;
  const avgAcc=d.sessions.length?Math.round(d.sessions.reduce((a,s)=>a+parseInt(s.acc),0)/d.sessions.length):100;
  document.getElementById('hist-summary').innerHTML=`<div class="hist-stat"><div class="hist-stat-val">${d.bestWPM||0}</div><div class="hist-stat-lbl">Best WPM</div></div><div class="hist-stat"><div class="hist-stat-val">${avgWPM}</div><div class="hist-stat-lbl">Avg WPM</div></div><div class="hist-stat"><div class="hist-stat-val">${avgAcc}%</div><div class="hist-stat-lbl">Avg Accuracy</div></div><div class="hist-stat"><div class="hist-stat-val">${d.totalSessions||0}</div><div class="hist-stat-lbl">Sessions</div></div>`;
  const recent=d.sessions.slice(-15);const chartEl=document.getElementById('perf-chart');
  if(!recent.length){chartEl.innerHTML='<span style="color:var(--muted);font-size:0.72rem;margin:auto;">ابھی تک کوئی سیشن نہیں</span>';}
  else{const maxWPM=Math.max(...recent.map(s=>s.wpm),1);chartEl.innerHTML=recent.map(s=>{const wh=Math.max(5,Math.round((s.wpm/maxWPM)*55));const ah=Math.max(2,Math.round((parseInt(s.acc)/100)*55));return`<div style="flex:1;display:flex;gap:1px;align-items:flex-end;"><div class="chart-bar wpm-bar" style="height:${wh}px" title="WPM: ${s.wpm}"></div><div class="chart-bar acc-bar" style="height:${ah}px" title="Acc: ${s.acc}"></div></div>`;}).join('');}
  const lgEl=document.getElementById('lesson-progress-grid');
  lgEl.innerHTML=LESSONS.map(l=>{const lc=d.completedLessons[l.id];const cls=lc?(lc.grade==='A'?'done':'partial'):'';return`<div class="lp-badge ${cls}"><div class="lp-star">${lc?(lc.grade==='A'?'⭐':'✓'):'○'}</div><div class="lp-badge-label">${l.name.split('—')[0].trim()}</div>${lc?`<div style="font-size:0.5rem">${lc.wpm} WPM</div>`:''}</div>`;}).join('');
  const tw=document.getElementById('hist-table-wrap');
  if(!d.sessions.length){tw.innerHTML='<div class="no-history">ابھی تک کوئی سیشن ریکارڈ نہیں ہوا<br><span style="font-size:0.7rem">مشق شروع کریں!</span></div>';return;}
  const rows=d.sessions.slice().reverse().slice(0,50).map(s=>{const g=s.grade||'C';return`<tr><td>${s.date}</td><td>${s.type}</td><td style="font-family:'Noto Nastaliq Urdu';direction:rtl;font-size:0.9rem">${s.lessonId!==undefined?LESSONS[s.lessonId]?.name||s.type:s.type}</td><td style="color:var(--gold);font-weight:600">${s.wpm}</td><td style="color:var(--green)">${s.acc}%</td><td style="color:var(--purple)">${s.chars}</td><td><span class="hist-grade ${g}">${g}</span></td></tr>`;}).join('');
  tw.innerHTML=`<table class="history-table"><thead><tr><th>تاریخ</th><th>قسم</th><th>لیسن</th><th>WPM</th><th>درستگی</th><th>حروف</th><th>گریڈ</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function clearHistory(){if(confirm('یقیناً تمام ریکارڈ مٹائیں؟')){localStorage.removeItem(STORAGE_KEY);renderHistory();showToast('تاریخ مٹا دی گئی','info');}}
function exportHistoryCSV(){
  const d=loadData();if(!d.sessions.length){showToast('کوئی ریکارڈ نہیں','error');return;}
  const header='Date,Type,Lesson,WPM,Accuracy,Characters,Grade\n';
  const rows=d.sessions.map(s=>`"${s.date}","${s.type}","${s.lessonId||''}","${s.wpm}","${s.acc}%","${s.chars}","${s.grade}"`).join('\n');
  const blob=new Blob(['\uFEFF'+header+rows],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='afzal-pro-history.csv';a.click();
  showToast('CSV ڈاؤنلوڈ ہو رہا ہے','success');
}

// ============================================================
// REFERENCE
// ============================================================
function buildRef(){
  const rg=document.getElementById('ref-grid');const rsg=document.getElementById('ref-shift-grid');
  if(!rg||!rsg||rg.children.length)return;
  const baseKeys='qwertyuiopasdfghjklzxcvbnm';
  [...baseKeys].forEach(k=>{if(!PHONETIC_BASE[k])return;const d=document.createElement('div');d.className='ref-item';d.innerHTML=`<span class="ref-key">${k}</span><span class="ref-arrow">→</span><span class="ref-urdu">${PHONETIC_BASE[k]}</span>`;rg.appendChild(d);});
  [...baseKeys].forEach(k=>{const K=k.toUpperCase();if(!PHONETIC_SHIFT[K])return;const d=document.createElement('div');d.className='ref-item';d.innerHTML=`<span class="ref-key">⇧+${k}</span><span class="ref-arrow">→</span><span class="ref-urdu">${PHONETIC_SHIFT[K]}</span>`;rsg.appendChild(d);});
}

// ============================================================
// CERTIFICATE
// ============================================================
function openCertModal(wpm,acc,chars,lessonName,type){
  lastCertData={wpm,acc,chars,lessonName,type};
  const candidateName=getCandidateName();
  const grade=calcGrade(wpm,parseInt(acc));
  const date=new Date().toLocaleDateString('en-PK',{year:'numeric',month:'long',day:'numeric'});
  document.getElementById('cert-name').textContent=candidateName;
  document.getElementById('cert-wpm').textContent=wpm;
  document.getElementById('cert-acc').textContent=acc+'%';
  document.getElementById('cert-chars').textContent=chars;
  document.getElementById('cert-grade-letter').textContent=grade;
  document.getElementById('cert-date').textContent=date;
  const typeLabel=type==='test'?'وقتی ٹیسٹ':type==='practice'?'مشق':'لیسن';
  document.getElementById('cert-body').textContent=`یہ تصدیق کی جاتی ہے کہ ${candidateName} نے AFZAL PRO اردو ٹائپنگ ماسٹر کے ${typeLabel} "${lessonName}" میں ${wpm} WPM کی رفتار اور ${acc}% درستگی کے ساتھ کامیابی حاصل کی۔`;
  document.getElementById('cert-modal').classList.add('show');
}
function closeCertModal(){document.getElementById('cert-modal').classList.remove('show');}
function showCertFromResult(){const wpm=document.getElementById('r-wpm').textContent;const acc=document.getElementById('r-acc').textContent.replace('%','');const chars=document.getElementById('r-chars').textContent;openCertModal(wpm,acc,chars,LESSONS[currentLesson]?.name||'لیسن','lesson');}
function showCertFromTest(){const wpm=document.getElementById('tr-wpm').textContent;const acc=document.getElementById('tr-acc').textContent.replace('%','');const chars=document.getElementById('tr-chars').textContent;openCertModal(wpm,acc,chars,'وقتی ٹیسٹ','test');}
function showCertFromPrac(){const elapsed=startTime?(Date.now()-startTime)/60000:0.001;const wpm=Math.round((totalTyped/5)/elapsed)||0;const acc=totalTyped>0?Math.round(((totalTyped-wrongTyped)/totalTyped)*100):100;openCertModal(wpm,acc,totalTyped,'مشق','practice');}
function printCertificate(){
  const cert=document.getElementById('certificate');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Cinzel:wght@600;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}@media print{body{background:#fff}}</style></head><body>${cert.outerHTML}</body></html>`);
  w.document.close();setTimeout(()=>{w.focus();w.print();},800);
}

// ── Clean Professional Print Report ──
function printReport(){
  const cand=getCandidateName();
  const d=lastCertData;const grade=calcGrade(d.wpm,parseInt(d.acc));
  const now=new Date().toLocaleDateString('en-PK',{year:'numeric',month:'long',day:'numeric'});
  const typeLabel=d.type==='test'?'Timed Test':d.type==='practice'?'Free Practice':'Lesson';
  const summaryMap={A:'Excellent performance. The candidate has demonstrated outstanding typing speed and accuracy, well above the PPSC qualifying standard.',B:'Good performance. The candidate meets the standard requirements and shows proficiency in Urdu keyboard typing.',C:'Satisfactory performance. The candidate demonstrates basic typing capability with room for improvement.',D:'Below standard. The candidate needs additional practice to meet PPSC minimum requirements.'};
  document.getElementById('pr-name').textContent=cand;
  document.getElementById('pr-type').textContent=typeLabel;
  document.getElementById('pr-lesson').textContent=d.lessonName||'—';
  document.getElementById('pr-date').textContent=now;
  document.getElementById('pr-wpm').textContent=d.wpm;
  document.getElementById('pr-acc').textContent=d.acc+'%';
  document.getElementById('pr-chars').textContent=d.chars;
  document.getElementById('pr-grade-box').textContent=grade;
  document.getElementById('pr-summary-text').textContent=summaryMap[grade]||summaryMap['D'];
  document.getElementById('pr-footer-date').textContent='Generated: '+now;
  window.print();
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg,type='info'){
  const icons={success:'✅',error:'❌',info:'ℹ️'};
  const tc=document.getElementById('toast-container');
  const t=document.createElement('div');t.className=`toast ${type}`;
  t.innerHTML=`<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
  tc.appendChild(t);setTimeout(()=>t.remove(),3100);
}

// ============================================================
// THEME
// ============================================================
const THEME_KEY='urdu-tm-theme';
let systemQuery=window.matchMedia('(prefers-color-scheme: dark)');
let currentThemePref=localStorage.getItem(THEME_KEY)||'system';
function applyTheme(r){document.documentElement.setAttribute('data-theme',r);}
function resolveTheme(p){return p==='system'?(systemQuery.matches?'dark':'light'):p;}
function setTheme(p){currentThemePref=p;localStorage.setItem(THEME_KEY,p);applyTheme(resolveTheme(p));updateThemePills(p);}
function updateThemePills(p){['light','dark','system'].forEach(x=>document.getElementById('pill-'+x)?.classList.toggle('active',x===p));}
systemQuery.addEventListener('change',()=>{if(currentThemePref==='system')applyTheme(resolveTheme('system'));});
applyTheme(resolveTheme(currentThemePref));updateThemePills(currentThemePref);



// ============================================================
