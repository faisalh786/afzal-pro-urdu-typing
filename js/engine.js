// ============================================================
// LESSON MODE
// ============================================================
function initLesson(){
  const L=LESSONS[currentLesson];if(!L)return;
  let words=validateLessonContent(currentLesson,[...L.words]);
  if(!words.length)words=L.words;
  textArr=words[Math.floor(Math.random()*words.length)].split('');
  charIdx=0;wordIdx=0;totalTyped=0;wrongTyped=0;startTime=null;
  sessionCorrect=0;sessionTotal=0;
  resetTimerUI();
  document.getElementById('lesson-name').textContent=L.name;
  document.getElementById('lesson-desc').textContent=L.desc;
  document.getElementById('prog-text').textContent='0 / '+textArr.length;
  document.getElementById('prog-bar').style.width='0%';
  document.getElementById('result-overlay').classList.remove('show');
  setStatus('','','status-msg');
  renderText('urdu-display',textArr,0);
  // Ensure guidance ALWAYS shows on init
  if(textArr[0])highlightKey(textArr[0]);
  scheduleStatUpdate();
}
function restartLesson(){
  charIdx=0;totalTyped=0;wrongTyped=0;startTime=null;
  sessionCorrect=0;sessionTotal=0;resetTimerUI();
  document.getElementById('result-overlay').classList.remove('show');
  setStatus('','','status-msg');
  // Force full rebuild by resetting span cache
  spanCacheDisplay=null;spanCacheLen=0;spanCache=[];
  renderText('urdu-display',textArr,0);
  highlightKey(textArr[0]);
  scheduleStatUpdate();
  document.getElementById('capture').focus();
}
function nextWord(){
  const L=LESSONS[currentLesson];
  let words=validateLessonContent(currentLesson,[...L.words]);
  if(!words.length)words=L.words;
  wordIdx=(wordIdx+1)%words.length;
  textArr=words[wordIdx].split('');
  charIdx=0;
  document.getElementById('result-overlay').classList.remove('show');
  spanCacheDisplay=null;spanCacheLen=0;spanCache=[];
  renderText('urdu-display',textArr,0);
  highlightKey(textArr[0]);
  setStatus('','','status-msg');
}
function nextLesson(){
  if(currentLesson<LESSONS.length-1){
    currentLesson++;
    for(const [grp,cfg] of Object.entries(LESSON_GROUPS)){if(cfg.phases.find(p=>p.idx===currentLesson)){selectGroup(grp);break;}}
    initLesson();document.getElementById('result-overlay').classList.remove('show');
  } else showToast('تمام لیسن مکمل! 🎉','success');
}
function showLessonComplete(){
  const elapsed=(Date.now()-startTime)/60000||0.001;
  const wpm=Math.round((totalTyped/5)/elapsed);
  const acc=totalTyped>0?Math.round(((totalTyped-wrongTyped)/totalTyped)*100):100;
  const grade=calcGrade(wpm,acc);
  document.getElementById('r-wpm').textContent=wpm;
  document.getElementById('r-acc').textContent=acc+'%';
  document.getElementById('r-chars').textContent=totalTyped;
  document.getElementById('r-grade-letter').textContent=grade;
  document.getElementById('result-overlay').classList.add('show');
  saveSession('lesson',currentLesson,wpm,acc,totalTyped);
  lastCertData={wpm,acc,chars:totalTyped,lessonName:LESSONS[currentLesson]?.name||'—',type:'lesson'};
  renderPhaseButtons(activeGroup);
  showToast(`لیسن مکمل! ${grade} گریڈ — ${wpm} WPM`,'success');
}

// ============================================================
// PRACTICE MODE
// ============================================================
function initPractice(){
  const pool=PRACTICE_SETS[practiceMode]||PRACTICE_SETS.easy;
  const shuffled=[...pool].sort(()=>Math.random()-0.5);
  const text=shuffled.slice(0,6).join(' ');
  textArr=text.split('');charIdx=0;totalTyped=0;wrongTyped=0;startTime=null;
  sessionCorrect=0;sessionTotal=0;resetTimerUI();
  document.getElementById('prac-desc').textContent=`${practiceMode.toUpperCase()} مشق`;
  setStatus('','','prac-status');
  spanCacheDisplay=null;spanCacheLen=0;spanCache=[];
  renderText('prac-display',textArr,0);
  highlightKey(textArr[0]);
  scheduleStatUpdate();
}
function setPracDiff(d){
  practiceMode=d;
  ['easy','medium','hard','ppsc'].forEach(x=>document.getElementById('diff-'+x)?.classList.toggle('active',x===d));
  initPractice();
}

// ============================================================
// TEST MODE
// ============================================================
function initTest(){
  const all=[...PRACTICE_SETS.hard,...PRACTICE_SETS.ppsc].sort(()=>Math.random()-0.5);
  const text=all.slice(0,10).join(' ');
  textArr=text.split('');charIdx=0;totalTyped=0;wrongTyped=0;startTime=null;
  testTimeLeft=testDuration;sessionCorrect=0;sessionTotal=0;resetTimerUI();
  const fill=document.getElementById('test-timer-fill');if(fill)fill.style.width='100%';
  document.getElementById('test-result-overlay').classList.remove('show');
  setStatus('پہلا حرف ٹائپ کریں — ٹائمر شروع ہوگا','','test-status');
  spanCacheDisplay=null;spanCacheLen=0;spanCache=[];
  renderText('test-display',textArr,0);
  highlightKey(textArr[0]);
  scheduleStatUpdate();
}
function resetTest(){clearInterval(timerInterval);timerInterval=null;initTest();}
function setTestTime(s){
  testDuration=s;testTimeLeft=s;
  ['60','120','300'].forEach(x=>document.getElementById('tb-'+x)?.classList.toggle('active',x===String(s)));
  initTest();
}
function finishTest(){
  clearInterval(timerInterval);timerInterval=null;
  const elapsed=(Date.now()-startTime)/60000||0.001;
  const wpm=Math.round((totalTyped/5)/elapsed);
  const acc=totalTyped>0?Math.round(((totalTyped-wrongTyped)/totalTyped)*100):100;
  const grade=calcGrade(wpm,acc);
  document.getElementById('tr-wpm').textContent=wpm;
  document.getElementById('tr-acc').textContent=acc+'%';
  document.getElementById('tr-chars').textContent=totalTyped;
  document.getElementById('tr-grade').textContent=grade;
  document.getElementById('test-result-overlay').classList.add('show');
  saveSession('test',undefined,wpm,acc,totalTyped);
  lastCertData={wpm,acc,chars:totalTyped,lessonName:'وقتی ٹیسٹ',type:'test'};
  showToast(`ٹیسٹ مکمل! ${grade} — ${wpm} WPM`,'success');
}

// ============================================================
// STAT DISPLAY
// ============================================================
function updateStatDisplay(){
  const elapsed=startTime?(Date.now()-startTime)/60000:0.001;
  const wpm=startTime?Math.round((totalTyped/5)/elapsed):0;
  const acc=totalTyped>0?Math.round(((totalTyped-wrongTyped)/totalTyped)*100):100;
  document.getElementById('wpm-val').textContent=wpm;
  document.getElementById('acc-val').textContent=acc+'%';
  document.getElementById('chars-val').textContent=totalTyped;
}

// ============================================================
// KEYDOWN HANDLER — optimized, O(1) per keypress
// ============================================================
document.getElementById('capture').addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(mode==='lesson')restartLesson();return;}
  if(e.key==='Tab'){e.preventDefault();if(mode==='lesson')nextWord();return;}

  const activePanel=['lesson','practice','test'].includes(mode);
  if(!activePanel)return;

  const displayId=mode==='lesson'?'urdu-display':mode==='practice'?'prac-display':'test-display';
  const statusId=mode==='lesson'?'status-msg':mode==='practice'?'prac-status':'test-status';

  if(charIdx>=textArr.length)return;

  let typed='';
  const _k=e.key;
  if(_k.length===1){
    const _cp=_k.codePointAt(0);
    // Urdu Phonetic mode OR key is already a Urdu char (U+0600–U+06FF)
    const _isUrdu=(_cp>=0x0600&&_cp<=0x06FF)||(_cp>=0x064B&&_cp<=0x065F)||
                  _cp===0x200C||_cp===0x200D||_cp===0x06D6||_cp===0x06DE||
                  _cp===0x00AB||_cp===0x00BB; // also « »
    if(window._kbMode==='phonetic'||_isUrdu){
      // Accept any Urdu/Arabic char directly; space always allowed
      typed=_isUrdu?_k:(_cp===0x20?' ':'');
      if(!typed)return;
    } else {
      // QWERTY mode: map via PHONETIC tables (handles letters + symbol keys)
      if(e.shiftKey){
        // For shift: try exact key (symbols like ! @ # already come as shifted char)
        typed=PHONETIC_SHIFT[_k]||PHONETIC_BASE[_k]||'';
      } else {
        typed=PHONETIC_BASE[_k]||'';
      }
      if(!typed)return;
    }
  } else return;

  if(!typed)return;
  if(!startTime){startTime=Date.now();startTimerInterval();}
  e.preventDefault();

  const expected=textArr[charIdx];
  const isCorrect=typed===expected;
  totalTyped++;sessionTotal++;
  if(!isCorrect)wrongTyped++;else sessionCorrect++;

  if(mode==='lesson'){
    const pct=Math.round((charIdx/textArr.length)*100);
    document.getElementById('prog-bar').style.width=pct+'%';
    document.getElementById('prog-text').textContent=charIdx+' / '+textArr.length;
  }

  flashKey(expected,isCorrect);
  updateKbAccuracy();

  if(isCorrect){
    charIdx++;
    renderText(displayId,textArr,charIdx); // O(1) incremental update
    scheduleStatUpdate(); // throttled via rAF

    if(charIdx>=textArr.length){
      if(mode==='lesson'){
        if(wordIdx>=LESSONS[currentLesson].words.length-1){
          showLessonComplete();
        } else {
          setStatus('✓ صحیح! اگلا لفظ...','ok',statusId);
          setTimeout(()=>nextWord(),500);
        }
      } else if(mode==='practice'){
        setStatus('✓ مکمل! نئی مشق...','ok',statusId);
        saveSession('practice',undefined,Math.round((totalTyped/5)/((Date.now()-startTime)/60000||0.001)),totalTyped>0?Math.round(((totalTyped-wrongTyped)/totalTyped)*100):100,totalTyped);
        setTimeout(()=>initPractice(),600);
      } else if(mode==='test'){
        const extra=[...PRACTICE_SETS.hard,...PRACTICE_SETS.ppsc].sort(()=>Math.random()-0.5).slice(0,5).join(' ');
        textArr=[...textArr,...extra.split('')];
        spanCacheLen=0; // force rebuild for extended text
        renderText(displayId,textArr,charIdx);
        if(textArr[charIdx])highlightKey(textArr[charIdx]);
      }
    } else {
      setStatus('','',statusId);
      // Guidance: always show next key after correct press
      if(textArr[charIdx])highlightKey(textArr[charIdx]);
    }
  } else {
    setStatus('✗ غلط — '+expected+' کلید استعمال کریں','err',statusId);
    // Flash wrong on current span
    const sp=spanCache[charIdx];
    if(sp){
      sp.classList.add('incorrect');
      setTimeout(()=>{
        if(sp){sp.className='urdu-char'+(textArr[charIdx]===' '?' space':'')+' current';}
      },300);
    }
    scheduleStatUpdate();
  }
});

// ============================================================
