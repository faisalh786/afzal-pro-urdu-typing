// FOCUS CAPTURE
// ============================================================
document.addEventListener('click',e=>{
  if(!e.target.closest('.theme-pills')&&!e.target.closest('.cert-modal')&&
     !e.target.closest('.lesson-phase-btn')&&!e.target.closest('.lesson-group-btn')&&
     !e.target.closest('.diff-btn')&&!e.target.closest('.time-btn')&&
     !e.target.closest('.btn')&&!e.target.closest('.candidate-input-wrap'))
    document.getElementById('capture').focus();
});

// ============================================================
// KEYBOARD MODE — QWERTY vs Urdu Phonetic
// ============================================================
const KB_MODE_KEY='urdu-tm-kb-mode';
window._kbMode=localStorage.getItem(KB_MODE_KEY)||'qwerty';
function setKbMode(mode){
  window._kbMode=mode;
  localStorage.setItem(KB_MODE_KEY,mode);
  document.getElementById('kb-mode-qwerty').classList.toggle('active',mode==='qwerty');
  document.getElementById('kb-mode-phonetic').classList.toggle('active',mode==='phonetic');
  const badge=document.getElementById('header-badge-mode');
  if(badge){badge.textContent=mode==='phonetic'?'PHONETIC':'QWERTY';}
  const bar=document.getElementById('kb-hint-bar');
  const txt=document.getElementById('kb-hint-text');
  if(bar&&txt){
    if(mode==='phonetic'){
      bar.classList.add('phonetic-mode');
      txt.innerHTML='<span class="kb-hint-strong">Urdu Phonetic Mode:</span> Switch your Windows keyboard to <span class="kb-hint-strong">Urdu Phonetic</span>. Keys are accepted as typed by your system keyboard.';
    } else {
      bar.classList.remove('phonetic-mode');
      txt.innerHTML='<span class="kb-hint-strong">Recommended:</span> Keep Windows keyboard set to <span class="kb-hint-strong">English (QWERTY)</span>. This app maps keys to Urdu Phonetic internally.';
    }
  }
  const info=mode==='phonetic'
    ?'Urdu Phonetic Mode active — use your Urdu system keyboard'
    :'QWERTY Mode active — keep Windows keyboard in English';
  showToast('⌨ '+info,'info');
  document.getElementById('capture').focus();
}
// Apply saved mode on load
(function(){
  const m=window._kbMode;
  if(m==='phonetic'){
    document.getElementById('kb-mode-qwerty')?.classList.remove('active');
    document.getElementById('kb-mode-phonetic')?.classList.add('active');
    const b=document.getElementById('header-badge-mode');if(b)b.textContent='PHONETIC';
    // Set hint bar for phonetic mode
    const bar=document.getElementById('kb-hint-bar');
    const txt=document.getElementById('kb-hint-text');
    if(bar&&txt){
      bar.classList.add('phonetic-mode');
      txt.innerHTML='<span class="kb-hint-strong">Urdu Phonetic Mode:</span> Switch your Windows keyboard to <span class="kb-hint-strong">Urdu Phonetic</span>. Keys are accepted as typed by your system keyboard.';
    }
  }
})();

// ============================================================
// INIT
// ============================================================
buildKeyboard(); // builds keyboard + populates keyElCache + shiftKeyEls
selectGroup('hr');
initLesson();
buildRef();
const initData=loadData();
document.getElementById('streak-val').textContent=initData.streak||0;
// Restore candidate name
const savedCand=localStorage.getItem(CAND_KEY)||'';
const nameInput=document.getElementById('candidate-name-input');
if(nameInput&&savedCand)nameInput.value=savedCand;
document.getElementById('capture').focus();

// ── Always keep capture focused (handles tab-switch, reopen, alt-tab) ──
const _refocus=()=>{
  const _cap=document.getElementById('capture');
  if(_cap&&document.activeElement!==_cap)_cap.focus();
};
window.addEventListener('focus',_refocus);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(_refocus,120);});
// Also refocus initLesson, nextWord, initPractice on each call
const _origInitLesson=initLesson;
