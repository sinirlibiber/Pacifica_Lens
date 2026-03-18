/* ══════════════════════════════════════════════
   ANALYTICS CHARTS  (enhanced)
══════════════════════════════════════════════ */
const AN_COLORS = ['#58a6ff','#3fb950','#e3b341','#bc8cff','#ffa657','#ff3552','#4ec9b0','#569cd6'];
const AN_COIN_COLORS = {BTC:'#f7931a',ETH:'#627eea',BNB:'#f0b90b',XRP:'#346aa9',SOL:'#9945ff',
  DOT:'#e6007a',ADA:'#0d1e2d',XAG:'#a0a0b0',XAU:'#e3b341',DEFAULT:'#7d8590'};

// State for time-period toggles (simulated rolling windows)
const anTimeState = {vol:'D',rev:'D',oi:'D',usr:'D',trd:'D'};

function setAnTime(chart, period, btn){
  anTimeState[chart]=period;
  // Update button active state
  if(btn){
    const parent=btn.parentElement;
    parent.querySelectorAll('.an-tbtn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
  }
  // Rebuild the relevant chart
  if(chart==='vol') buildVolChart();
  else if(chart==='rev') buildRevChart();
  else if(chart==='oi') buildOiChart();
  else if(chart==='usr') buildUsrChart();
  else if(chart==='trd') buildTrdChart();
}

function initOverviewCharts(){
  buildFRChart();
  buildOvFrHistChart();
  buildFrRankList();
  renderMarketGrid();
  // Also trigger the live update version if frHistory has data
  if(Object.keys(frHistory).length > 0) {
    setTimeout(()=>{ if(window.Chart) updateOverviewFRChart(); }, 100);
  }
}

function buildOvFrHistChart(){
  const canvas = $('ov-fr-chart');
  if(!canvas || !window.Chart) return;
  if(charts.ovFr){ charts.ovFr.destroy(); }
  const syms = Object.keys(frHistory).slice(0, 5);
  if(!syms.length){
    // Generate mock data for top 5 symbols
    const mockSyms = ['BTC','ETH','SOL','HYPE','PIPPIN'];
    const datasets = mockSyms.map((sym, idx) => {
      const colors = ['#38bdf8','#22d3a5','#a78bfa','#f43f5e','#e3b341'];
      const base = [0.01, 0.008, -0.012, 0.015, -0.022][idx];
      const pts = Array.from({length:24}, (_,i) => base + (Math.random()-0.5)*0.005);
      const labels = Array.from({length:24}, (_,i) => `${23-i}h`);
      return { label: sym, data: pts, borderColor: colors[idx], backgroundColor: 'transparent',
               borderWidth: 1.5, pointRadius: 0, tension: 0.4 };
    });
    const labels = Array.from({length:24}, (_,i) => `${23-i}h`);
    charts.ovFr = new window.Chart(canvas.getContext('2d'), {
      type:'line',
      data:{ labels, datasets },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#7d8590', font:{family:'monospace',size:8}, boxWidth:10 } } },
        scales:{
          x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0,maxTicksLimit:8},grid:{color:'rgba(48,54,61,.4)'}},
          y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v.toFixed(3)+'%'},grid:{color:'rgba(48,54,61,.4)'}},
        }
      }
    });
    return;
  }
  // Real data path
  const datasets = syms.map((sym, idx) => {
    const colors = ['#38bdf8','#22d3a5','#a78bfa','#f43f5e','#e3b341'];
    const hist = frHistory[sym] || [];
    return { label: sym, data: hist.map(h=>h.rate*100),
             borderColor: colors[idx%5], backgroundColor: 'transparent',
             borderWidth: 1.5, pointRadius: 0, tension: 0.4 };
  });
  const labels = (frHistory[syms[0]]||[]).map(h=>new Date(h.t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
  charts.ovFr = new window.Chart(canvas.getContext('2d'), {
    type:'line', data:{ labels, datasets },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#7d8590', font:{family:'monospace',size:8}, boxWidth:10 } } },
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0,maxTicksLimit:8},grid:{color:'rgba(48,54,61,.4)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v.toFixed(3)+'%'},grid:{color:'rgba(48,54,61,.4)'}},
      }
    }
  });
}

function buildFrRankList(){
  const rank = $('fr-rank-list');
  if(!rank) return;
  const sorted = Object.entries(prices)
    .filter(([,p]) => p.funding !== undefined)
    .sort((a,b) => Math.abs(b[1].funding) - Math.abs(a[1].funding))
    .slice(0, 12);
  if(!sorted.length){
    // Mock data
    const mockData = [
      ['PIPPIN',-0.002292],['HYPE',0.001245],['SOL',-0.000815],
      ['BTC',0.000100],['ETH',-0.000082],['DOGE',0.000350],
      ['WIF',-0.001200],['FARTCOIN',0.000890],['PEPE',-0.000445],
      ['ARB',0.000320],['LINK',-0.000198],['UNI',0.000156],
    ];
    rank.innerHTML = mockData.map(([sym, fr]) => {
      const pct = (fr * 100).toFixed(4);
      const col = fr >= 0 ? '#22d3a5' : '#f43f5e';
      const apr = (fr * 3 * 365 * 100).toFixed(1);
      const icon = coinIconHTML(sym, 16, '50%');
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bg2)">
        ${icon}
        <span style="font-size:11px;font-weight:600;color:var(--tx);min-width:60px">${sym}</span>
        <span style="font-family:var(--mono);font-size:11px;color:${col};margin-left:auto">${pct}%</span>
        <span style="font-family:var(--mono);font-size:10px;color:var(--tx3);min-width:55px;text-align:right">${apr}% APR</span>
      </div>`;
    }).join('');
    return;
  }
  rank.innerHTML = sorted.map(([sym, p]) => {
    const fr = p.funding; const pct = (fr * 100).toFixed(4);
    const col = fr >= 0 ? '#22d3a5' : '#f43f5e';
    const apr = (fr * 3 * 365 * 100).toFixed(1);
    const icon = coinIconHTML(sym, 16, '50%');
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bg2)">
      ${icon}
      <span style="font-size:11px;font-weight:600;color:var(--tx);min-width:60px">${sym}</span>
      <span style="font-family:var(--mono);font-size:11px;color:${col};margin-left:auto">${pct}%</span>
      <span style="font-family:var(--mono);font-size:10px;color:var(--tx3);min-width:55px;text-align:right">${apr}% APR</span>
    </div>`;
  }).join('');
}

function initCharts(){
  buildFRChart();
  buildLSChart();
  buildDomLists();
  buildVolChart();
  buildRevChart();
  buildOiChart();
  buildUsrChart();
  buildTrdChart();
  buildTopPairs();
  updateAnKpis();
}

/* --- helpers to generate mock-realistic time series --- */
function genTimeSeries(days, baseVal, volatility, trend=1){
  const pts=[]; let v=baseVal;
  const now=Date.now();
  const step=86400000/Math.max(1,days<7?24:1);
  const count=days<7?days*24:days;
  for(let i=count;i>=0;i--){
    v=Math.max(0, v*(1+(Math.random()-.48)*volatility)*trend);
    pts.push({t: new Date(now - i*step), v});
  }
  return pts;
}
function getLabels(pts,period){
  return pts.map(p=>{
    const d=p.t;
    if(period==='D') return d.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString('en',{month:'short',day:'numeric'});
  });
}

function chartDefaults(){ return {
  responsive:true, maintainAspectRatio:false,
  plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9},boxWidth:10}}},
  scales:{
    x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0,maxTicksLimit:8},
       grid:{color:'rgba(48,54,61,.4)'}},
    y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>fmt(v)},
       grid:{color:'rgba(48,54,61,.4)'},position:'left'},
    y2:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>fmt(v)},
        grid:{display:false},position:'right',display:true}
  }
};}

function buildVolChart(){
  const canvas=$('vol-chart'); if(!canvas||!window.Chart) return;
  if(charts.vol){charts.vol.destroy();}
  const days = anTimeState.vol==='D'?1:anTimeState.vol==='W'?7:30;
  // Use real prices vol data if available, else generate
  const syms=Object.keys(prices);
  let pts, cumPts;
  if(syms.length){
    pts=genTimeSeries(days, Object.values(prices).reduce((s,p)=>s+p.vol,0)*0.05, 0.3);
  } else {
    pts=genTimeSeries(days, 2000000, 0.35);
  }
  let cum=0; cumPts=pts.map(p=>{cum+=p.v;return cum;});
  const labels=getLabels(pts, anTimeState.vol);
  charts.vol=new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[
      {label:'VOLUME', data:pts.map(p=>p.v), backgroundColor:'rgba(0,207,255,.25)',
       borderColor:'rgba(0,207,255,.5)', borderWidth:1, yAxisID:'y'},
      {label:'CUMULATIVE', data:cumPts, type:'line',
       borderColor:'#3fb950', backgroundColor:'transparent',
       tension:.4, borderWidth:1.5, pointRadius:0, yAxisID:'y2'}
    ]},
    options:chartDefaults()
  });
}

function buildRevChart(){
  const canvas=$('rev-chart'); if(!canvas||!window.Chart) return;
  if(charts.rev){charts.rev.destroy();}
  const days = anTimeState.rev==='D'?1:anTimeState.rev==='W'?7:30;
  const pts=genTimeSeries(days, 150, 0.5);
  let cum=0; const cumPts=pts.map(p=>{cum+=p.v;return cum;});
  const labels=getLabels(pts, anTimeState.rev);
  const cfg=chartDefaults();
  charts.rev=new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[
      {label:'REVENUE', data:pts.map(p=>p.v), backgroundColor:'rgba(255,208,96,.25)',
       borderColor:'rgba(255,208,96,.5)', borderWidth:1, yAxisID:'y'},
      {label:'CUMULATIVE', data:cumPts, type:'line',
       borderColor:'#3fb950', backgroundColor:'transparent',
       tension:.4, borderWidth:1.5, pointRadius:0, yAxisID:'y2'}
    ]},
    options:cfg
  });
}

function buildOiChart(){
  const canvas=$('oi-chart'); if(!canvas||!window.Chart) return;
  if(charts.oi){charts.oi.destroy();}
  const days = anTimeState.oi==='D'?1:anTimeState.oi==='W'?7:30;
  const baseOI = Object.values(prices).reduce((s,p)=>s+p.oi,0)||500000;
  const pts=genTimeSeries(days, baseOI*0.1, 0.25);
  const labels=getLabels(pts, anTimeState.oi);
  charts.oi=new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[
      {label:'OPEN INTEREST', data:pts.map(p=>p.v),
       backgroundColor:'rgba(188,140,255,.25)', borderColor:'rgba(188,140,255,.5)', borderWidth:1}
    ]},
    options:{...chartDefaults(), scales:{
      x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0,maxTicksLimit:8},
         grid:{color:'rgba(48,54,61,.4)'}},
      y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>fmt(v)},
         grid:{color:'rgba(48,54,61,.4)'}}
    }}
  });
}

function buildUsrChart(){
  const canvas=$('usr-chart'); if(!canvas||!window.Chart) return;
  if(charts.usr){charts.usr.destroy();}
  const days = anTimeState.usr==='D'?1:anTimeState.usr==='W'?7:30;
  const pts=genTimeSeries(days, 35, 0.4);
  const labels=getLabels(pts, anTimeState.usr);
  charts.usr=new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[
      {label:'ACTIVE USERS', data:pts.map(p=>Math.round(p.v)),
       backgroundColor:'rgba(0,229,153,.25)', borderColor:'rgba(0,229,153,.5)', borderWidth:1}
    ]},
    options:{...chartDefaults(), scales:{
      x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0,maxTicksLimit:8},
         grid:{color:'rgba(48,54,61,.4)'}},
      y:{ticks:{color:'#484f58',font:{family:'monospace',size:7}},
         grid:{color:'rgba(48,54,61,.4)'}}
    }}
  });
}

function buildTrdChart(){
  const canvas=$('trd-chart'); if(!canvas||!window.Chart) return;
  if(charts.trd){charts.trd.destroy();}
  const days = anTimeState.trd==='D'?1:anTimeState.trd==='W'?7:30;
  const pts=genTimeSeries(days, 400, 0.45);
  let cum=0; const cumPts=pts.map(p=>{cum+=Math.round(p.v);return cum;});
  const labels=getLabels(pts, anTimeState.trd);
  const cfg=chartDefaults();
  charts.trd=new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[
      {label:'TRADES', data:pts.map(p=>Math.round(p.v)),
       backgroundColor:'rgba(0,207,255,.2)', borderColor:'rgba(0,207,255,.4)', borderWidth:1, yAxisID:'y'},
      {label:'CUMULATIVE', data:cumPts, type:'line',
       borderColor:'#3fb950', backgroundColor:'transparent',
       tension:.4, borderWidth:1.5, pointRadius:0, yAxisID:'y2'}
    ]},
    options:cfg
  });
}

function buildTopPairs(){
  const tpList=$('tp-list'); if(!tpList) return;
  const entries=Object.entries(prices).sort((a,b)=>b[1].vol-a[1].vol).slice(0,9);
  if(!entries.length){ tpList.innerHTML='<div style="padding:16px;font-family:var(--mono);font-size:10px;color:var(--tx3)">Waiting for data...</div>'; return; }
  tpList.innerHTML='';
  entries.forEach(([sym,p],i)=>{
    const chgVal=(Math.random()-.42)*8; const isPos=chgVal>0;
    const color=AN_COIN_COLORS[sym]||AN_COIN_COLORS.DEFAULT;
    const el=document.createElement('div'); el.className='tp-item';
    el.innerHTML=`
      <div class="tp-coin-icon">${coinIconHTML(sym,30,'50%')}</div>
      <div class="tp-info">
        <div class="tp-price">${fmtP(p.mark)}</div>
        <div class="tp-name">${sym} · USDC</div>
      </div>
      <div class="tp-right">
        <div class="tp-vol">VOL $${fmt(p.vol)}</div>
        <div class="tp-chg ${isPos?'gn':'rd'}">CHG ${isPos?'+':''}${chgVal.toFixed(2)}%</div>
      </div>`;
    tpList.appendChild(el);
  });
}

function updateAnKpis(){
  const syms=Object.keys(prices);
  const totalVol=Object.values(prices).reduce((s,p)=>s+p.vol,0);
  const totalOI=Object.values(prices).reduce((s,p)=>s+p.oi,0);
  const el=id=>$(id);
  if(el('an-trade-vol')) el('an-trade-vol').textContent='$'+fmt(totalVol*30||2230000000);
  if(el('an-trade-vol-today')) el('an-trade-vol-today').textContent='Today: $'+fmt(totalVol||37900000);
  if(el('an-total-fees')) el('an-total-fees').textContent='$'+fmt(totalVol*.0003*30||8430000);
  if(el('an-open-interest')) el('an-open-interest').textContent='$'+fmt(totalOI||1290000);
  if(el('an-oi-today')) el('an-oi-today').textContent='Today: $'+fmt(totalOI*.08||1200000);
  if(el('an-markets')) el('an-markets').textContent=syms.length||6;
  if(el('an-markets-sub')) el('an-markets-sub').textContent=`${syms.length||6} perpetuals live`;
  if(el('an-vol-chg')){ el('an-vol-chg').textContent='▲ 3.12%'; el('an-vol-chg').className='an-kpi-chg pos'; }
  if(el('an-fee-chg')){ el('an-fee-chg').textContent='▲ 2.08%'; el('an-fee-chg').className='an-kpi-chg pos'; }
  if(el('an-oi-chg')){ const r=Math.random()>.5; el('an-oi-chg').textContent=(r?'▲ ':'▼ ')+(Math.random()*5+.5).toFixed(2)+'%'; el('an-oi-chg').className='an-kpi-chg '+(r?'pos':'neg'); }
  if(el('an-mkt-chg')){ el('an-mkt-chg').textContent='▲ 0'; el('an-mkt-chg').className='an-kpi-chg pos'; }
}

function buildFRChart(){
  const canvas=$('fr-chart');if(!canvas||!window.Chart)return;
  if(charts.fr){charts.fr.destroy();}
  const sym=Object.keys(frHistory)[0]||'BTC';
  $('an-sym-sel').textContent=sym;
  const hist=frHistory[sym]||[];
  const labels=hist.map(h=>new Date(h.t).toLocaleTimeString());
  const data=hist.map(h=>h.rate*100);
  charts.fr=new window.Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels,datasets:[{label:`${sym} Funding Rate %`,data,
      borderColor:'#58a6ff',backgroundColor:'rgba(0,207,255,.06)',
      fill:true,tension:.35,borderWidth:1.5,pointRadius:0}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0},grid:{color:'rgba(48,54,61,.5)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v.toFixed(4)+'%'},grid:{color:'rgba(48,54,61,.5)'}},
      }}
  });
}

function buildLSChart(){
  const canvas=$('ls-chart');if(!canvas||!window.Chart)return;
  if(charts.ls){charts.ls.destroy();}
  const syms=Object.keys(lsVol).slice(0,6);
  if(!syms.length)return;
  const longData=syms.map(s=>lsVol[s].l);
  const shortData=syms.map(s=>lsVol[s].s);
  charts.ls=new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:syms,datasets:[
      {label:'Long Vol',data:longData,backgroundColor:'rgba(63,185,80,.3)',borderColor:'#3fb950',borderWidth:1},
      {label:'Short Vol',data:shortData,backgroundColor:'rgba(248,81,73,.3)',borderColor:'#ff3552',borderWidth:1},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:8}},grid:{color:'rgba(48,54,61,.5)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>fmt(v)},grid:{color:'rgba(48,54,61,.5)'}},
      }}
  });
}

function buildDomLists(){
  const oiList=$('oi-list'),volList=$('vol-list');
  if(!oiList||!volList)return;
  const entries=Object.entries(prices).sort((a,b)=>b[1].oi-a[1].oi);
  const totalOI=entries.reduce((s,[,p])=>s+p.oi,0)||1;
  const totalVol=entries.reduce((s,[,p])=>s+p.vol,0)||1;
  oiList.innerHTML='';volList.innerHTML='';
  entries.slice(0,8).forEach(([sym,p],i)=>{
    const oiPct=(p.oi/totalOI*100),volPct=(p.vol/totalVol*100);
    const color=AN_COLORS[i%AN_COLORS.length];
    const chgOi=(Math.random()-.45)*6; const chgVol=(Math.random()-.45)*8;
    const oiRow=document.createElement('div');
    oiRow.innerHTML=`<div class="dom-row-hd">
      <span class="dom-sym">${coinIconHTML(sym,20,'50%')}<span style="font-weight:600">${sym}</span></span>
      <span class="dom-pct">${oiPct.toFixed(1)}% · $${fmt(p.oi)} <span class="${chgOi>0?'dom-chg-pos':'dom-chg-neg'}">${chgOi>0?'+':''}${chgOi.toFixed(2)}%</span></span></div>
      <div class="dom-bg"><div class="dom-fill" style="width:${oiPct}%;background:${color}"></div></div>`;
    oiList.appendChild(oiRow);
    const vRow=document.createElement('div');
    vRow.innerHTML=`<div class="dom-row-hd">
      <span class="dom-sym">${coinIconHTML(sym,20,'50%')}<span style="font-weight:600">${sym}</span></span>
      <span class="dom-pct">${volPct.toFixed(1)}% · $${fmt(p.vol)} <span class="${chgVol>0?'dom-chg-pos':'dom-chg-neg'}">${chgVol>0?'+':''}${chgVol.toFixed(2)}%</span></span></div>
      <div class="dom-bg"><div class="dom-fill" style="width:${volPct}%;background:${color}"></div></div>`;
    volList.appendChild(vRow);
  });
}

/* ══════════════════════════════════════════════
   BOT CODE
══════════════════════════════════════════════ */
function renderBotCode(){
  const el=$('bot-code');if(!el)return;
  // Bot kodunu textContent ile render et - template literal çakışması yok
  const BOT_PY=[
'#!/usr/bin/env python3',
'# Pacifica Lens — Funding Rate Arbitrage Bot v2',
'# Telegram + Discord alerts · Performance metrics · Auto-reconnect',
'# pip install websocket-client requests',
'#',
'# TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy \\',
'# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... \\',
'# ALERT_APR=30 COOLDOWN_MIN=30 python bot/funding_arb_bot.py',
'',
'import websocket, json, time, threading, os, requests',
'from datetime import datetime',
'',
'# ── Config ──────────────────────────────────────────',
'WS_URL          = "wss://ws.pacifica.fi/ws"',
'ALERT_APR       = float(os.getenv("ALERT_APR", "30.0"))',
'MIN_SPREAD      = float(os.getenv("MIN_SPREAD", "0.0003"))',
'COOLDOWN_MIN    = float(os.getenv("COOLDOWN_MIN", "60"))',
'TELEGRAM_TOKEN  = os.getenv("TELEGRAM_BOT_TOKEN", "")',
'TELEGRAM_CHAT   = os.getenv("TELEGRAM_CHAT_ID", "")',
'DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL", "")',
'COOLDOWN_SEC    = COOLDOWN_MIN * 60',
'',
'# ── State ───────────────────────────────────────────',
'prices = {}; last_alerts = {}',
'perf = {"total_opps":0,"total_alerts":0,"best_apr":0.0,"apr_history":[],"start_time":time.time()}',
'',
'def log(msg, level="INFO"):',
'    icons={"INFO":"i ","ALERT":"FIRE","WARN":"WARN","OK":"OK","PERF":"PERF"}',
'    print(f"[{datetime.now().strftime(\'%H:%M:%S\')}] {icons.get(level,\'\')} {msg}")',
'',
'# ── Telegram ────────────────────────────────────────',
'def send_telegram(msg: str):',
'    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT: return',
'    try:',
'        r = requests.post(f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",',
'            json={"chat_id": TELEGRAM_CHAT, "text": msg, "parse_mode": "HTML"}, timeout=8)',
'        if r.ok: log("Telegram sent", "OK")',
'        else: log(f"Telegram error: {r.text[:80]}", "WARN")',
'    except Exception as e: log(f"Telegram failed: {e}", "WARN")',
'',
'# ── Discord ─────────────────────────────────────────',
'def send_discord(opp: dict):',
'    if not DISCORD_WEBHOOK: return',
'    apr = opp["apr"]; monthly = apr / 12',
'    try:',
'        payload = {"embeds": [{"title": f"Arb Alert: {opp[\'long\']} / {opp[\'short\']}",',
'            "color": 0xffd060,',
'            "fields": [',
'                {"name":"APR",    "value":f"{apr:.1f}%",      "inline":True},',
'                {"name":"Monthly","value":f"{monthly:.2f}%",  "inline":True},',
'                {"name":"Long",   "value":opp["long"],        "inline":True},',
'                {"name":"Short",  "value":opp["short"],       "inline":True},',
'            ],',
'            "footer": {"text": f"Pacifica Lens · {datetime.now().strftime(\'%H:%M:%S\')}"}',
'        }]}',
'        r = requests.post(DISCORD_WEBHOOK, json=payload, timeout=8)',
'        if r.status_code == 204: log("Discord sent", "OK")',
'        else: log(f"Discord error: {r.status_code}", "WARN")',
'    except Exception as e: log(f"Discord failed: {e}", "WARN")',
'',
'# ── Scanner ──────────────────────────────────────────',
'def scan_opportunities():',
'    syms = list(prices.keys()); opps = []',
'    for i in range(len(syms)):',
'        for j in range(i+1, len(syms)):',
'            ra,rb = prices[syms[i]]["funding"], prices[syms[j]]["funding"]',
'            spread = abs(ra - rb)',
'            if spread < MIN_SPREAD: continue',
'            apr = spread * 3 * 365 * 100',
'            opps.append({"long": syms[i] if ra<=rb else syms[j],',
'                         "short": syms[j] if ra<=rb else syms[i],',
'                         "long_fr": min(ra,rb), "short_fr": max(ra,rb),',
'                         "spread": spread, "apr": apr,',
'                         "pair_key": f"{syms[i]}_{syms[j]}"})',
'    opps.sort(key=lambda x: x["apr"], reverse=True)',
'    return opps',
'',
'# ── Performance ──────────────────────────────────────',
'def print_perf():',
'    elapsed = (time.time() - perf["start_time"]) / 60',
'    hist = perf["apr_history"]',
'    avg = sum(h[1] for h in hist) / len(hist) if hist else 0',
'    sim = (perf["best_apr"] / 100 / 12) * 10000',
'    log(f"Session {elapsed:.0f}m | Opps {perf[\'total_opps\']} | Alerts {perf[\'total_alerts\']}", "PERF")',
'    log(f"Best APR {perf[\'best_apr\']:.1f}% | Avg {avg:.1f}% | Sim 30d@10K: ${sim:.2f}", "PERF")',
'',
'# ── Alert ─────────────────────────────────────────────',
'def maybe_alert(opp: dict):',
'    now = time.time()',
'    if now - last_alerts.get(opp["pair_key"], 0) < COOLDOWN_SEC: return',
'    last_alerts[opp["pair_key"]] = now; perf["total_alerts"] += 1',
'    apr = opp["apr"]; monthly = apr / 12',
'    log(f"ALERT {opp[\'long\']}/{opp[\'short\']} APR={apr:.1f}% Monthly={monthly:.2f}%", "ALERT")',
'    send_telegram(',
'        f"🔥 <b>Pacifica Arb Alert</b>\\n"',
'        f"Pair: <b>{opp[\'long\']} / {opp[\'short\']}</b>\\n"',
'        f"APR: <b>{apr:.1f}%</b>  |  Monthly: <b>{monthly:.2f}%</b>\\n"',
'        f"Long {opp[\'long\']} ({opp[\'long_fr\']*100:.4f}%/8h)\\n"',
'        f"Short {opp[\'short\']} ({opp[\'short_fr\']*100:.4f}%/8h)")',
'    send_discord(opp)',
'',
'# ── Periodic scan ─────────────────────────────────────',
'_cnt = 0',
'def periodic_scan():',
'    global _cnt',
'    while True:',
'        time.sleep(10)',
'        if not prices: continue',
'        opps = scan_opportunities(); _cnt += 1',
'        perf["total_opps"] += len(opps)',
'        if opps:',
'            perf["best_apr"] = max(perf["best_apr"], opps[0]["apr"])',
'            perf["apr_history"].append((time.time(), opps[0]["apr"]))',
'            log(f"Top {min(3,len(opps))} of {len(opps)} pairs:")',
'            for o in opps[:3]:',
'                flag = "FIRE" if o["apr"] > ALERT_APR else "..."',
'                log(f"  {flag} {o[\'long\']:6}/{o[\'short\']:6} APR {o[\'apr\']:.1f}%")',
'            if opps[0]["apr"] >= ALERT_APR: maybe_alert(opps[0])',
'        if _cnt % 10 == 0: print_perf()',
'',
'# ── WebSocket ─────────────────────────────────────────',
'def on_message(ws_app, raw):',
'    try: msg = json.loads(raw)',
'    except: return',
'    if msg.get("channel") != "prices": return',
'    for p in msg.get("data", []):',
'        sym = p.get("symbol")',
'        if sym: prices[sym] = {',
'            "mark": float(p.get("mark",0)),',
'            "funding": float(p.get("funding",0)),',
'            "oi": float(p.get("open_interest",0))*float(p.get("mark",1)),',
'            "vol": float(p.get("volume_24h",0))}',
'',
'def on_open(ws_app):',
'    log("Connected", "OK")',
'    ws_app.send(json.dumps({"method":"subscribe","params":{"source":"prices"}}))',
'    threading.Thread(target=lambda:[time.sleep(30) or',
'        ws_app.send(json.dumps({"method":"ping"})) for _ in iter(int,1)],',
'        daemon=True).start()',
'',
'def on_error(ws_app, err): log(f"WS error: {err}", "WARN")',
'def on_close(ws_app, code, msg):',
'    log(f"Disconnected ({code}). Reconnecting in 5s...", "WARN")',
'    time.sleep(5); run()',
'',
'def run():',
'    log(f"Bot v2 | APR>={ALERT_APR}% | TG:{\'on\' if TELEGRAM_TOKEN else \'off\'} | DC:{\'on\' if DISCORD_WEBHOOK else \'off\'}")',
'    threading.Thread(target=periodic_scan, daemon=True).start()',
'    websocket.WebSocketApp(WS_URL, on_open=on_open, on_message=on_message,',
'        on_error=on_error, on_close=on_close).run_forever(ping_interval=30)',
'',
'if __name__ == "__main__": run()',
  ];
  el.textContent = BOT_PY.join('\n');
}

