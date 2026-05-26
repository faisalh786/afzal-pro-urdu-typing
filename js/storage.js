// OPTIMIZED renderText — span caching, O(1) per keypress
// ============================================================
function renderText(displayId,arr,idx){
  const el=document.getElementById(displayId);if(!el)return;
  const needsRebuild=(idx===0)||displayId!==spanCacheDisplay||arr.length!==spanCacheLen;
  if(needsRebuild){
    const frag=document.createDocumentFragment();
    spanCache=[];
    for(let i=0;i<arr.length;i++){
      const sp=document.createElement('span');
      const ch=arr[i];
      let cls='urdu-char';if(ch===' ')cls+=' space';
      cls+=i<idx?' done':i===idx?' current':' pending';
      sp.className=cls;sp.textContent=ch;
      frag.appendChild(sp);spanCache.push(sp);
    }
    el.innerHTML='';el.appendChild(frag);
    spanCacheDisplay=displayId;spanCacheLen=arr.length;
  } else {
    // Incremental: only update previous char (done) and current char
    const prev=idx-1;
    if(prev>=0&&spanCache[prev]){
      spanCache[prev].className='urdu-char'+(arr[prev]===' '?' space':'')+' done';
    }
    if(idx<spanCache.length&&spanCache[idx]){
      spanCache[idx].className='urdu-char'+(arr[idx]===' '?' space':'')+' current';
    }
  }
  if(idx<spanCache.length&&spanCache[idx]){
    spanCache[idx].scrollIntoView({block:'nearest',behavior:'smooth'});
  }
}

// ============================================================
