/* ══════════════════════════════════════════════
   DEMO MODE — IndexedDB RECORDING & REPLAY
══════════════════════════════════════════════ */
const DEMO_DB_NAME  = 'PacificaLensDemo';
const DEMO_DB_VER   = 1;
const DEMO_STORE    = 'frames';
const DEMO_DURATION = 120000; // 2 dakika ms
let demoDb          = null;
let demoRecTimer    = null;
let demoReplayTimer = null;
let demoRecStart    = 0;
let demoFrames      = [];     // replay için hafıza içi buffer
let demoReplayIdx   = 0;
let demoMode        = 'idle'; // 'idle' | 'recording' | 'replaying'

// IndexedDB aç
function demoOpenDB(){
  return new Promise((res,rej)=>{
    if(demoDb){ res(demoDb); return; }
    const req = indexedDB.open(DEMO_DB_NAME, DEMO_DB_VER);
    req.onupgradeneeded = e=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains(DEMO_STORE))
        db.createObjectStore(DEMO_STORE, {keyPath:'t'});
    };
    req.onsuccess = e=>{ demoDb=e.target.result; res(demoDb); };
    req.onerror   = e=>rej(e);
  });
}

async function demoClearDB(){
  const db = await demoOpenDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(DEMO_STORE,'readwrite');
    tx.objectStore(DEMO_STORE).clear();
    tx.oncomplete = res; tx.onerror = rej;
  });
}

async function demoWriteFrame(frame){
  const db = await demoOpenDB();
  const tx = db.transaction(DEMO_STORE,'readwrite');
  tx.objectStore(DEMO_STORE).put(frame);
}

async function demoReadAllFrames(){
  const db = await demoOpenDB();
  return new Promise((res,rej)=>{
    const req = db.transaction(DEMO_STORE,'readonly')
                  .objectStore(DEMO_STORE).getAll();
    req.onsuccess = e=>res(e.target.result||[]);
    req.onerror   = rej;
  });
}

function demoSetBtn(recEn,playEn,stopEn){
  const r=$('btn-demo-rec'), p=$('btn-demo-play'), s=$('btn-demo-stop');
  [r,p,s].forEach((b,i)=>{
    const en=[recEn,playEn,stopEn][i];
    if(b){ b.disabled=!en; b.style.opacity=en?'1':'.4'; b.style.cursor=en?'pointer':'not-allowed'; }
  });
}

async function demoStartRecording(){
  if(demoMode!=='idle') return;
  demoMode='recording';
  demoFrames=[];
  demoRecStart=Date.now();
  await demoClearDB();
  demoSetBtn(false,false,true);
  $('demo-status-badge').textContent='● REC';
  $('demo-status-badge').style.cssText='background:rgba(255,53,82,.15);color:var(--rd);border:1px solid rgba(255,53,82,.35)';

  // Her 3 saniyede bir frame kaydet
  demoRecTimer = setInterval(async ()=>{
    const elapsed=Date.now()-demoRecStart;
    const pct=Math.min(elapsed/DEMO_DURATION*100,100);
    $('demo-progress-bar').style.width=pct+'%';
    const rem=Math.ceil((DEMO_DURATION-elapsed)/1000);
    $('demo-rec-time').textContent=rem>0?rem+'s remaining':'Finalizing...';

    const frame={
      t: Date.now(),
      elapsed,
      prices: JSON.parse(JSON.stringify(prices)),
      whaleRows: whaleRows.slice(0,20),
      tradeCount,
      lsVol: JSON.parse(JSON.stringify(lsVol)),
    };
    demoFrames.push(frame);
    await demoWriteFrame(frame);

    if(elapsed>=DEMO_DURATION) demoStopRecording();
  }, 3000);

  showToast('⏺ Recording started — 2 minutes of live data');
}

function demoStopRecording(){
  clearInterval(demoRecTimer);
  demoMode='idle';
  demoSetBtn(true, demoFrames.length>0, false);
  $('demo-status-badge').textContent='● SAVED';
  $('demo-status-badge').style.cssText='background:rgba(0,229,153,.12);color:var(--gn);border:1px solid rgba(0,229,153,.3)';
  $('demo-rec-time').textContent='';
  $('demo-progress-bar').style.width='100%';
  $('demo-progress-lbl').textContent=demoFrames.length+' frames recorded · Press REPLAY to play back';
  showToast('✓ Recording saved — '+demoFrames.length+' frames ('+Math.round(demoFrames.length*3)+'s)');
}

async function demoStartReplay(){
  if(demoMode!=='idle') return;
  // DB'den yükle (sayfa yenileme sonrası da çalışır)
  if(!demoFrames.length){
    demoFrames = await demoReadAllFrames();
  }
  if(!demoFrames.length){ showToast('No recording found — record first'); return; }

  demoMode='replaying';
  demoReplayIdx=0;
  demoSetBtn(false,false,true);
  $('demo-status-badge').textContent='▶ REPLAY';
  $('demo-status-badge').style.cssText='background:rgba(0,207,255,.12);color:var(--ac);border:1px solid rgba(0,207,255,.3)';
  setWsStatus(false);
  $('ws-lbl').textContent='DEMO';

  showToast('▶ Replay started — '+demoFrames.length+' frames');

  function playNextFrame(){
    if(demoReplayIdx>=demoFrames.length){ demoStop(); return; }
    const frame=demoFrames[demoReplayIdx++];
    const pct=(demoReplayIdx/demoFrames.length*100);
    $('demo-progress-bar').style.width=pct+'%';
    $('demo-progress-lbl').textContent=`Replaying frame ${demoReplayIdx}/${demoFrames.length}`;
    $('demo-rec-time').textContent=Math.round(frame.elapsed/1000)+'s';

    // prices state'i override et
    Object.assign(prices, frame.prices);

    // UI'yı güncelle
    handlePrices(Object.entries(frame.prices).map(([symbol,p])=>({
      symbol, mark:p.mark, funding:p.funding, open_interest:p.oi/(p.mark||1),
      volume_24h:p.vol, yesterday_price:p.prev||p.mark
    })));
    updateOverviewFRChart();
    updateOverviewWhale();

    demoReplayTimer=setTimeout(playNextFrame, 1500);
  }
  playNextFrame();
}

function demoStop(){
  clearInterval(demoRecTimer);
  clearTimeout(demoReplayTimer);
  const wasReplaying = demoMode==='replaying';
  const wasRecording = demoMode==='recording';
  demoMode='idle';
  demoSetBtn(true, demoFrames.length>0, false);
  $('demo-status-badge').textContent=demoFrames.length?'● SAVED':'IDLE';
  $('demo-status-badge').style.cssText=demoFrames.length
    ?'background:rgba(0,229,153,.12);color:var(--gn);border:1px solid rgba(0,229,153,.3)'
    :'background:rgba(100,136,168,.1);color:var(--tx3);border:1px solid var(--bd)';
  $('demo-rec-time').textContent='';
  if(wasReplaying){
    // Gerçek WS'e geri dön
    setWsStatus(wsConnected);
    showToast('⏹ Replay stopped — reconnecting to live feed');
    if(!wsConnected) connectWS();
  }
  if(wasRecording) showToast('⏹ Recording stopped');
}

// IndexedDB'den daha önce kaydedilmiş veri var mı kontrol et (sayfa açılışında)
async function demoCheckSavedData(){
  try{
    const frames = await demoReadAllFrames();
    if(frames.length){
      demoFrames=frames;
      demoSetBtn(true,true,false);
      $('demo-status-badge').textContent='● SAVED';
      $('demo-status-badge').style.cssText='background:rgba(0,229,153,.12);color:var(--gn);border:1px solid rgba(0,229,153,.3)';
      $('demo-progress-bar').style.width='100%';
      $('demo-progress-lbl').textContent=frames.length+' frames in storage · Press REPLAY anytime';
    }
  }catch(e){/* IndexedDB yok - sessiz geç */}
}
demoCheckSavedData();

// Overview FR chart + Whale panelini her price update'inde güncelle
const _origHandlePrices_ov = handlePrices;
// handlePrices zaten çağrılıyor, sadece sonunda ek fonksiyon çağır
// (override yapmak yerine handlePrices içine injection yapıyoruz)
// Bunu updateWalletPnL gibi renderAlerts sonrasına ekleyeceğiz


// ── Copy Trade Modal ─────────────────────────────────────────────
let _ctSym = '', _ctSide = '', _ctPrice = 0;

function openCopyTradeModal(sym, side, whaleUsd, price){
  _ctSym = sym;
  _ctSide = side;
  _ctPrice = price;
  
  const isLong = side.includes('long') || side === 'bid';
  const curPrice = price || prices[sym]?.mark || 0;
  const fr = prices[sym]?.funding || 0;
  const frPct = (fr * 100).toFixed(4);
  const frApr = (fr * 3 * 365 * 100).toFixed(1);
  
  // Suggested size: 1% of whale size, min $50, max $500
  const suggested = Math.min(500, Math.max(50, whaleUsd * 0.01));

  // Update modal content
  const overlay = document.getElementById('ct-modal-overlay');
  const sigBox  = document.getElementById('ct-signal-box');
  const sigDir  = document.getElementById('ct-signal-dir');
  const sigSym  = document.getElementById('ct-signal-sym');
  const openBtn = document.getElementById('ct-open-btn');

  document.getElementById('ct-modal-title').textContent = `Copy Trade — ${sym}`;
  document.getElementById('ct-whale-size').textContent   = '$' + fmt(whaleUsd);
  document.getElementById('ct-entry-price').textContent  = curPrice ? '$' + fmtPrice(curPrice) : 'Market';
  document.getElementById('ct-suggested-size').textContent = '$' + suggested.toFixed(0);
  document.getElementById('ct-funding-rate').textContent  = `${frPct}%/8h (${frApr}% APR)`;

  sigBox.className = 'ct-signal-box ' + (isLong ? 'ct-signal-long' : 'ct-signal-short');
  sigDir.className = 'ct-signal-dir ' + (isLong ? 'long' : 'short');
  sigDir.textContent = isLong ? '▲ LONG' : '▼ SHORT';
  sigSym.textContent = sym + '-PERP';
  openBtn.className = 'ct-btn-primary ' + (isLong ? 'ct-btn-long' : 'ct-btn-short');
  openBtn.textContent = (isLong ? '▲ Long ' : '▼ Short ') + sym + ' on Pacifica ↗';

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCopyTradeModal(){
  const overlay = document.getElementById('ct-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function openOnPacifica(){
  const url = `https://app.pacifica.fi/trade/${_ctSym}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  closeCopyTradeModal();
  showToast(`Opening ${_ctSym} on Pacifica...`);
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeCopyTradeModal();
});
