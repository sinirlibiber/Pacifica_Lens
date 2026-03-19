/* ══════════════════════════════════════════════
   ANALYTICS — 100% Real Pacifica Data
   Sources: prices[] (WS), frHistory[] (WS), lsVol[] (WS), tradeCount (WS)
   Zero mock data, zero Math.random()
══════════════════════════════════════════════ */
const AN_COLORS = ['#38bdf8','#22d3a5','#a78bfa','#f43f5e','#e3b341','#ffa657','#4ec9b0','#569cd6'];

function initOverviewCharts(){
  buildFRChart();
  buildOvFrHistChart();
  buildFrRankList();
  renderMarketGrid();
  if(Object.keys(frHistory).length > 0) {
    setTimeout(()=>{ if(window.Chart) updateOverviewFRChart(); }, 100);
  }
}

/* ── Overview FR History Chart (real frHistory data) ── */
function buildOvFrHistChart(){
  const canvas = $('ov-fr-chart');
  if(!canvas || !window.Chart) return;
  if(charts.ovFr) charts.ovFr.destroy();
  const syms = Object.keys(frHistory).filter(s=>frHistory[s].length>1)
    .sort((a,b)=>Math.abs(prices[b]?.funding||0)-Math.abs(prices[a]?.funding||0)).slice(0,5);
  if(!syms.length) return;
  const longest = syms.reduce((a,s)=>frHistory[s].length>frHistory[a].length?s:a, syms[0]);
  const labels = frHistory[longest].map(h=>new Date(h.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
  const datasets = syms.map((sym,i)=>({
    label:sym, data:frHistory[sym].map(h=>(h.rate*100).toFixed(4)),
    borderColor:AN_COLORS[i], backgroundColor:'transparent', borderWidth:1.5, pointRadius:0, tension:0.4
  }));
  charts.ovFr = new window.Chart(canvas.getContext('2d'),{
    type:'line', data:{labels,datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:8},boxWidth:10}}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0,maxTicksLimit:8},grid:{color:'rgba(48,54,61,.4)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v+'%'},grid:{color:'rgba(48,54,61,.4)'}},
      }}
  });
}

/* ── Overview FR Rank List (real prices data) ── */
function buildFrRankList(){
  const rank=$('fr-rank-list'); if(!rank) return;
  const sorted=Object.entries(prices).filter(([,p])=>p.funding!==undefined)
    .sort((a,b)=>Math.abs(b[1].funding)-Math.abs(a[1].funding)).slice(0,8);
  if(!sorted.length) return;
  rank.innerHTML='';
  sorted.forEach(([sym,p])=>{
    const fr=p.funding, apr=(fr*3*365*100);
    const bar=Math.min(Math.abs(fr)/0.001*100,100);
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;';
    row.innerHTML=`
      <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--tx);min-width:48px">${sym}</span>
      <div style="flex:1;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden">
        <div style="width:${bar}%;height:100%;background:${fr>=0?'var(--gn)':'var(--rd)'};border-radius:2px"></div>
      </div>
      <span style="font-family:var(--mono);font-size:9px;min-width:52px;text-align:right;color:${fr>=0?'var(--gn)':'var(--rd)'}">${apr.toFixed(1)}%</span>`;
    rank.appendChild(row);
  });
}

/* ══════════════════════════════════════════════
   MAIN ANALYTICS PAGE — All from real data
══════════════════════════════════════════════ */
function initCharts(){
  const syms = Object.keys(prices);
  if(!syms.length) return;
  updateKPIs();
  buildVolChart();
  buildOiChart();
  buildFRChart();
  buildLSChart();
  buildTopPairs();
  buildDomLists();
}

/* ── KPIs from real prices[] ── */
function updateKPIs(){
  const syms = Object.entries(prices);
  const totalVol = syms.reduce((s,[,p])=>s+(p.vol||0),0);
  const totalOI = syms.reduce((s,[,p])=>s+(p.oi||0),0);
  const el = id => document.getElementById(id);
  if(el('an-trade-vol')) el('an-trade-vol').textContent = '$'+fmt(totalVol);
  if(el('an-open-interest')) el('an-open-interest').textContent = '$'+fmt(totalOI);
  if(el('an-markets')) el('an-markets').textContent = syms.length;
  if(el('an-session-trades')) el('an-session-trades').textContent = tradeCount.toLocaleString();
}

/* ── Volume Bar Chart — real per-market volume ── */
function buildVolChart(){
  const canvas=$('vol-chart'); if(!canvas||!window.Chart) return;
  if(charts.vol) charts.vol.destroy();
  const sorted = Object.entries(prices).filter(([,p])=>p.vol>0)
    .sort((a,b)=>b[1].vol-a[1].vol).slice(0,15);
  if(!sorted.length) return;
  const labels = sorted.map(([s])=>s);
  const data = sorted.map(([,p])=>p.vol);
  const colors = sorted.map((_,i)=>AN_COLORS[i%AN_COLORS.length]+'90');
  const borders = sorted.map((_,i)=>AN_COLORS[i%AN_COLORS.length]);
  charts.vol = new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[{label:'24h Volume ($)',data,backgroundColor:colors,borderColor:borders,borderWidth:1}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:8},callback:v=>'$'+fmt(v)},grid:{color:'rgba(48,54,61,.3)'}},
        y:{ticks:{color:'#94a3b8',font:{family:'monospace',size:9,weight:'bold'}},grid:{display:false}},
      }}
  });
}

/* ── OI Chart — real per-market open interest ── */
function buildOiChart(){
  const canvas=$('oi-chart'); if(!canvas||!window.Chart) return;
  if(charts.oi) charts.oi.destroy();
  const sorted = Object.entries(prices).filter(([,p])=>p.oi>0)
    .sort((a,b)=>b[1].oi-a[1].oi).slice(0,12);
  if(!sorted.length) return;
  charts.oi = new window.Chart(canvas.getContext('2d'),{
    type:'doughnut',
    data:{labels:sorted.map(([s])=>s), datasets:[{
      data:sorted.map(([,p])=>p.oi),
      backgroundColor:sorted.map((_,i)=>AN_COLORS[i%AN_COLORS.length]+'cc'),
      borderColor:'var(--bg1)', borderWidth:2,
    }]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'right',labels:{color:'#94a3b8',font:{family:'monospace',size:9},boxWidth:12,padding:6}}}}
  });
}

/* ── FR Chart — real funding rate history ── */
function buildFRChart(){
  const canvas=$('fr-chart'); if(!canvas||!window.Chart) return;
  if(charts.fr) charts.fr.destroy();
  const sym = Object.keys(frHistory).sort((a,b)=>
    (frHistory[b]?.length||0)-(frHistory[a]?.length||0))[0] || 'BTC';
  const hist = frHistory[sym];
  if(!hist||hist.length<2) return;
  const el=$('an-sym-sel'); if(el) el.textContent=sym;
  charts.fr = new window.Chart(canvas.getContext('2d'),{
    type:'line',
    data:{
      labels:hist.map(h=>new Date(h.t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})),
      datasets:[{label:sym+' FR%', data:hist.map(h=>(h.rate*100).toFixed(4)),
        borderColor:'#a78bfa', backgroundColor:'rgba(167,139,250,.08)', fill:true,
        tension:.3, borderWidth:1.5, pointRadius:0}]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxTicksLimit:8,maxRotation:0},grid:{color:'rgba(48,54,61,.4)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v+'%'},grid:{color:'rgba(48,54,61,.4)'}},
      }}
  });
}

/* ── LS Ratio Chart — real from WS trade accumulation ── */
function buildLSChart(){
  const canvas=$('ls-chart'); if(!canvas||!window.Chart) return;
  if(charts.ls) charts.ls.destroy();
  const sorted = Object.entries(lsVol).filter(([,v])=>v.l+v.s>0)
    .sort((a,b)=>(b[1].l+b[1].s)-(a[1].l+a[1].s)).slice(0,10);
  if(!sorted.length) return;
  charts.ls = new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:sorted.map(([s])=>s), datasets:[
      {label:'Long',data:sorted.map(([,v])=>v.l),backgroundColor:'rgba(0,229,153,.5)',borderColor:'#00e599',borderWidth:1},
      {label:'Short',data:sorted.map(([,v])=>v.s),backgroundColor:'rgba(255,53,82,.5)',borderColor:'#ff3552',borderWidth:1},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{stacked:true,ticks:{color:'#94a3b8',font:{family:'monospace',size:8}},grid:{display:false}},
        y:{stacked:true,ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>'$'+fmt(v)},grid:{color:'rgba(48,54,61,.3)'}},
      }}
  });
}

/* ── Top Trading Pairs — sorted by real volume ── */
function buildTopPairs(){
  const list=$('tp-list'); if(!list) return;
  const sorted=Object.entries(prices).filter(([,p])=>p.vol>0)
    .sort((a,b)=>b[1].vol-a[1].vol).slice(0,8);
  if(!sorted.length){list.innerHTML='<div style="padding:12px;font-family:var(--mono);font-size:10px;color:var(--tx3)">Loading...</div>';return;}
  const maxVol=sorted[0][1].vol;
  list.innerHTML='';
  sorted.forEach(([sym,p],i)=>{
    const pct=(p.vol/maxVol*100);
    const chg=p.change||0;
    const color=AN_COLORS[i%AN_COLORS.length];
    const row=document.createElement('div');
    row.className='tp-row';
    row.innerHTML=`<div class="tp-row-hd">
      <span class="tp-sym" style="display:flex;align-items:center;gap:6px">${coinIconHTML(sym,18,'50%')}<span>${sym}</span><span class="${chg>=0?'gn':'rd'}" style="font-size:9px">${chg>=0?'+':''}${chg.toFixed(2)}%</span></span>
      <span class="dom-pct">$${fmt(p.vol)}</span></div>
      <div class="dom-bg"><div class="dom-fill" style="width:${pct}%;background:${color}"></div></div>`;
    list.appendChild(row);
  });
}

/* ── Dominance Lists — real OI and Volume distribution ── */
function buildDomLists(){
  const oiList=$('oi-list'), volList=$('vol-list');
  const sorted=Object.entries(prices).filter(([,p])=>p.oi>0||p.vol>0)
    .sort((a,b)=>(b[1].oi||0)-(a[1].oi||0));
  const totalOI=sorted.reduce((s,[,p])=>s+(p.oi||0),0)||1;
  const totalVol=sorted.reduce((s,[,p])=>s+(p.vol||0),0)||1;

  if(oiList){
    oiList.innerHTML='';
    sorted.slice(0,8).forEach(([sym,p],i)=>{
      const pct=(p.oi/totalOI*100);
      const color=AN_COLORS[i%AN_COLORS.length];
      const row=document.createElement('div');
      row.innerHTML=`<div class="dom-row-hd">
        <span class="dom-sym" style="display:flex;align-items:center;gap:6px">${coinIconHTML(sym,18,'50%')}<span>${sym}</span></span>
        <span class="dom-pct">${pct.toFixed(1)}% · $${fmt(p.oi)}</span></div>
        <div class="dom-bg"><div class="dom-fill" style="width:${pct}%;background:${color}"></div></div>`;
      oiList.appendChild(row);
    });
  }

  if(volList){
    const volSorted=[...sorted].sort((a,b)=>(b[1].vol||0)-(a[1].vol||0));
    volList.innerHTML='';
    volSorted.slice(0,8).forEach(([sym,p],i)=>{
      const pct=(p.vol/totalVol*100);
      const color=AN_COLORS[i%AN_COLORS.length];
      const row=document.createElement('div');
      row.innerHTML=`<div class="dom-row-hd">
        <span class="dom-sym" style="display:flex;align-items:center;gap:6px">${coinIconHTML(sym,18,'50%')}<span>${sym}</span></span>
        <span class="dom-pct">${pct.toFixed(1)}% · $${fmt(p.vol)}</span></div>
        <div class="dom-bg"><div class="dom-fill" style="width:${pct}%;background:${color}"></div></div>`;
      volList.appendChild(row);
    });
  }
}

// renderBotCode removed — bot source in bot/funding_arb_bot.py
function renderBotCode(){}

// setAnTime stub for any remaining HTML references
function setAnTime(){}
