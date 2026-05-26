// ============================================================
// PHONETIC URDU KEYBOARD LAYOUT — Master Source of Truth
// ============================================================
const PHONETIC_BASE = {
  // NUMBER ROW — Urdu digits + diacritics
  '1':'۱','2':'۲','3':'۳','4':'۴','5':'۵',
  '6':'۶','7':'۷','8':'۸','9':'۹','0':'۰',
  '-':'ّ',   // ّ  Shadda
  '=':'ٓ',   // ٓ  Maddah Above
  // TOP ROW  — q=ق w=و e=ع r=ر t=ت y=ے u=ء i=ی o=ہ p=پ
  'q':'ق','w':'و','e':'ع','r':'ر','t':'ت','y':'ے','u':'ء','i':'ی','o':'ہ','p':'پ',
  '[':'«',   // «  Left Quotation
  ']':'»',   // »  Right Quotation
  '\\':'ۖ', // ۖ  Verse Sign
  // HOME ROW — a=ا s=س d=د f=ف g=گ h=ھ j=ج k=ک l=ل
  'a':'ا','s':'س','d':'د','f':'ف','g':'گ','h':'ھ','j':'ج','k':'ک','l':'ل',
  ';':'؛',         // Arabic Semicolon
  "'":'ـ',   // ـ  Tatweel (Kashish)
  // BOT ROW  — z=ز x=ش c=چ v=ط b=ب n=ن m=م
  'z':'ز','x':'ش','c':'چ','v':'ط','b':'ب','n':'ن','m':'م',
  ',':'،',         // Arabic Comma
  '.':'۔',         // Urdu Fullstop
  '/':'؟',         // Arabic Question Mark
  ' ':' '
};
const PHONETIC_SHIFT = {
  // NUMBER ROW SHIFT — diacritics, signs, punctuation
  '~':'ً',   // ً  Fathatan / Do Zabar
  '!':'!',         // Exclamation (English)
  '@':'،',         // Arabic Comma
  '#':'؁',   // ؁  Urdu Date / End of Ruku sign
  '$':'ء',         // Hamza Isolated
  '%':'ٔ',   // ٔ  Hamza Above / Yeh Nukta
  '^':'ﷺ',        // SAW ligature
  '&':'ٔ',   // ٔ  Hamza Above
  '*':'ٌ',   // ٌ  Dammatan
  '(':'(',         // Left Parenthesis
  ')':')',         // Right Parenthesis
  '_':'أ',         // Alef with Hamza Above (U+0623)
  '+':'ؤ',         // Waw with Hamza Above (U+0624)
  // TOP ROW SHIFT — R=ڑ T=ٹ Y=ۓ U=ٗ O=ۃ  (Q=ْ W=ﷺ E=ؑ I=ٰ P=ُ — diacritics/ligatures)
  'R':'ڑ','T':'ٹ','Y':'ۓ','U':'ٗ','O':'ۃ',
  'Q':'ْ',   // ْ  Sukun / Urdu Jazam
  'W':'ﷺ',        // SAW
  'E':'ؑ',   // ؑ  Alayhis Salam
  'I':'ٰ',   // ٰ  Alef Superscript / Alif Khada Zabar
  'P':'ُ',   // ُ  Damma / Pesh
  '{':'[',         // Left Square Bracket
  '}':']',         // Right Square Bracket
  '|':'۞',   // ۞  Takhalus / Rub el Hizb sign
  // HOME ROW SHIFT — A=آ S=ص D=ڈ G=غ H=ح J=ض K=خ  (F=ؚ L=ؒ — diacritics/signs)
  'A':'آ','S':'ص','D':'ڈ','G':'غ','H':'ح','J':'ض','K':'خ',
  'F':'ؚ',   // ؚ  Alif Khada Zer
  'L':'ؒ',   // ؒ  Rehmat Sign
  ':':':',         // Colon
  '"':'۔',   // ۔  Arabic Fullstop (same as Urdu fullstop)
  // BOT ROW SHIFT — Z=ذ X=ژ C=ث V=ظ N=ں  (B=ؓ M=ٔ — signs/diacritics)
  'Z':'ذ','X':'ژ','C':'ث','V':'ظ','N':'ں',
  'B':'ؓ',   // ؓ  Raziallah Sign
  'M':'ٔ',   // ٔ  Hamza Above
  '<':'َ',   // َ  Fatha / Zabar
  '>':'ِ',   // ِ  Kasra / Zer
  '?':'؟'          // Arabic Question Mark
};

// Reverse maps for guidance engine
const URDU_TO_KEY = {};       // base layer: urdu char → key letter
const URDU_TO_SHIFT_KEY = {}; // shift layer: urdu char → key letter (lowercase)
for(const [k,v] of Object.entries(PHONETIC_BASE)) { if(k.length===1 && k!==' ') URDU_TO_KEY[v]=k; }
for(const [K,v] of Object.entries(PHONETIC_SHIFT)) { URDU_TO_SHIFT_KEY[v]=K.toLowerCase(); }

// ============================================================
// DOM CACHE — populated after buildKeyboard()
// ============================================================
const keyElCache = {}; // key letter / '_space' → DOM element
let shiftKeyEls  = []; // both physical Shift key elements

// ============================================================
// SPAN CACHE — optimized renderText
// ============================================================
let spanCache        = [];   // current text's span elements
let spanCacheDisplay = null; // last display id
let spanCacheLen     = 0;    // last text length

// ============================================================
// STAT UPDATE THROTTLE
// ============================================================
let statPending = false;
function scheduleStatUpdate() {
  if(statPending) return;
  statPending = true;
  requestAnimationFrame(() => { updateStatDisplay(); statPending = false; });
}

// KEYBOARD BUILD + KEY CACHE
// ============================================================
const KB_ROWS=[
  // Number row
  [{k:'`'},{k:'1'},{k:'2'},{k:'3'},{k:'4'},{k:'5'},{k:'6'},{k:'7'},{k:'8'},{k:'9'},{k:'0'},{k:'-'},{k:'='}],
  // QWERTY row
  [{k:'q'},{k:'w'},{k:'e'},{k:'r'},{k:'t'},{k:'y'},{k:'u'},{k:'i'},{k:'o'},{k:'p'},{k:'['},{k:']'},{k:'\\'}],
  // Home row
  [{k:'a',home:true},{k:'s',home:true},{k:'d',home:true},{k:'f',home:true},{k:'g',home:true},{k:'h',home:true},{k:'j',home:true},{k:'k',home:true},{k:'l',home:true},{k:';'},{k:"'"}],
  // Bottom row
  [{k:'z'},{k:'x'},{k:'c'},{k:'v'},{k:'b'},{k:'n'},{k:'m'},{k:','},{k:'.'},{k:'/'}]
];
// Shift-key lookup: symbol keys need special mapping
const SHIFT_MAP={'`':'~','1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')','- ':'_','=':'+','[':'{',']':'}','\\':'|',';':':',"'":'"',',':'<','.':'>','/':'?'};
function buildKeyboard(){
  const kb=document.getElementById('keyboard');
  // Row prefix keys: number row has Back, then Tab/Caps/Shift for letter rows
  const prefixLabels=['Back','Tab','Caps','Shift'];
  const prefixClass=['key wide','key wider','key wider','key wide'];
  KB_ROWS.forEach((row,ri)=>{
    const rowEl=document.createElement('div');rowEl.className='kb-row';
    const pfx=document.createElement('div');pfx.className=prefixClass[ri];pfx.innerHTML=`<span class="en">${prefixLabels[ri]}</span>`;rowEl.appendChild(pfx);
    row.forEach(({k,home})=>{
      const el=document.createElement('div');
      el.className='key'+(home?' home-row':'');el.setAttribute('data-key',k);
      const urChar=PHONETIC_BASE[k]||'';
      // For letter keys use uppercase; for symbol keys use SHIFT_MAP
      const shiftKey=k.length===1&&k>='a'&&k<='z'?k.toUpperCase():SHIFT_MAP[k]||k.toUpperCase();
      const urShift=PHONETIC_SHIFT[shiftKey]||'';
      // en label: show both normal+shift for symbol keys
      const enLabel=SHIFT_MAP[k]?`${k}<small>${SHIFT_MAP[k]}</small>`:k;
      el.innerHTML=`<span class="en">${enLabel}</span>${urShift?`<span class="ur-shift">${urShift}</span>`:''}<span class="ur">${urChar}</span>`;
      rowEl.appendChild(el);
    });
    if(ri===3){const bk=document.createElement('div');bk.className='key wide';bk.innerHTML='<span class="en">Shift</span>';rowEl.appendChild(bk);}
    kb.appendChild(rowEl);
  });
  const spRow=document.createElement('div');spRow.className='kb-row';
  const spKey=document.createElement('div');spKey.className='key space-key';spKey.setAttribute('data-key',' ');spKey.innerHTML='<span class="en">Space</span>';
  spRow.appendChild(spKey);kb.appendChild(spRow);

  // ── CACHE all key elements for O(1) guidance ──
  document.querySelectorAll('.key[data-key]').forEach(el=>{
    const k=el.getAttribute('data-key');
    if(k===' ')keyElCache._space=el;
    else if(k)keyElCache[k]=el;
  });
  shiftKeyEls=Array.from(document.querySelectorAll('.key')).filter(el=>{
    const en=el.querySelector('.en');return en&&en.textContent.trim().toLowerCase()==='shift';
  });
}

// ============================================================
// GUIDANCE ENGINE — fully reliable, handles space + shift
// ============================================================
function clearGuidance(){
  for(const k in keyElCache){const el=keyElCache[k];if(el)el.classList.remove('highlight','hl-shift');}
  for(const el of shiftKeyEls)el.classList.remove('highlight','hl-shift');
}
function clearFlash(){
  for(const k in keyElCache){const el=keyElCache[k];if(el)el.classList.remove('correct-flash','wrong-flash');}
}

function highlightKey(ch){
  clearGuidance();
  if(!ch)return;

  // ── SPACEBAR ──
  if(ch===' '){
    if(keyElCache._space)keyElCache._space.classList.add('highlight');
    return;
  }

  // ── BASE LAYER ──
  if(URDU_TO_KEY[ch]){
    const el=keyElCache[URDU_TO_KEY[ch]];
    if(el)el.classList.add('highlight');
    return;
  }

  // ── SHIFT LAYER ──
  if(URDU_TO_SHIFT_KEY[ch]){
    const k=URDU_TO_SHIFT_KEY[ch];
    const el=keyElCache[k];
    if(el)el.classList.add('hl-shift');
    // Highlight BOTH physical Shift keys simultaneously
    for(const sEl of shiftKeyEls)sEl.classList.add('hl-shift');
    return;
  }

  // ── Multi-char / diacritics: try char-by-char ──
  for(const c of ch){
    if(c===' ')continue;
    if(URDU_TO_KEY[c]){
      const el=keyElCache[URDU_TO_KEY[c]];
      if(el){el.classList.add('highlight');break;}
    } else if(URDU_TO_SHIFT_KEY[c]){
      const k=URDU_TO_SHIFT_KEY[c];
      const el=keyElCache[k];
      if(el)el.classList.add('hl-shift');
      for(const sEl of shiftKeyEls)sEl.classList.add('hl-shift');
      break;
    }
  }
}

function flashKey(ch,correct){
  clearGuidance();clearFlash();
  let el=null;
  if(ch===' '){el=keyElCache._space;}
  else if(URDU_TO_KEY[ch]){el=keyElCache[URDU_TO_KEY[ch]];}
  else if(URDU_TO_SHIFT_KEY[ch]){el=keyElCache[URDU_TO_SHIFT_KEY[ch]];}
  else{for(const c of ch){if(URDU_TO_KEY[c]){el=keyElCache[URDU_TO_KEY[c]];break;}else if(URDU_TO_SHIFT_KEY[c]){el=keyElCache[URDU_TO_SHIFT_KEY[c]];break;}}}
  if(el)el.classList.add(correct?'correct-flash':'wrong-flash');
  if(hlTimeout)clearTimeout(hlTimeout);
  hlTimeout=setTimeout(()=>{
    clearFlash();
    // Always restore guidance for next char
    if(charIdx<textArr.length)highlightKey(textArr[charIdx]);
  },220);
}

// ============================================================
// KB ACCURACY METER
// ============================================================
function updateKbAccuracy(){
  const acc=sessionTotal>0?Math.round((sessionCorrect/sessionTotal)*100):100;
  const fill=document.getElementById('kb-acc-fill');
  const val=document.getElementById('kb-acc-value');
  if(fill){fill.style.width=acc+'%';fill.style.backgroundPosition=`${100-acc}% 50%`;}
  if(val)val.textContent=acc+'%';
}

// ============================================================
// TIMER
// ============================================================
function startTimerInterval(){
  if(timerInterval)return;
  timerInterval=setInterval(()=>{
    if(!startTime)return;
    const elapsed=Math.floor((Date.now()-startTime)/1000);
    const m=Math.floor(elapsed/60),s=elapsed%60;
    document.getElementById('time-val').textContent=m+':'+(s<10?'0':'')+s;
    if(mode==='test'){
      testTimeLeft=Math.max(0,testDuration-elapsed);
      const pct=(testTimeLeft/testDuration)*100;
      const fill=document.getElementById('test-timer-fill');
      if(fill)fill.style.width=pct+'%';
      if(testTimeLeft<=0)finishTest();
    }
  },500);
}
function resetTimerUI(){clearInterval(timerInterval);timerInterval=null;document.getElementById('time-val').textContent='0:00';}
function setStatus(msg,type,id){
  const el=document.getElementById(id||'status-msg');if(!el)return;
  el.textContent=msg;el.className='status-msg'+(type?' '+type:'');
}
