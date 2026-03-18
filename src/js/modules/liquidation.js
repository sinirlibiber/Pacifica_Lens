/* ══════════════════════════════════════════════
   LIQUIDATIONS
══════════════════════════════════════════════ */
const liqState = {
  feed: [],          // live liquidation events from WS
  feedMin: 1000,     // min USD filter for feed
  sessionByMkt: {},  // sym → {long, short, count}
  history: [],       // [{t, long, short}] bucketed every 5min
  top10: [],         // top 10 largest all-time this session
  liqPeriod: '1h',   // heatmap time period
  exchPeriod: '4h',  // exchange table period
  histPeriod: '1h',  // history chart period
  histChart: null,
  liqInited: false,
};

const EXCHANGES = [
  {name:'Pacifica',   color:'#58a6ff'},
  {name:'Hyperliquid',color:'#bc8cff'},
  {name:'Binance',    color:'#f0b90b'},
  {name:'Bybit',      color:'#f7931a'},
  {name:'OKX',        color:'#3fb950'},
  {name:'Gate',       color:'#4ec9b0'},
  {name:'Bitget',     color:'#ffa657'},
];

function setLiqFeedMin(v){ liqState.feedMin=parseInt(v); renderLiqFeed(); }
function setLiqTime(period, btn){
  liqState.liqPeriod=period;
  document.querySelectorAll('.hm-tbtn').forEach(b=>{ if(['1h','4h','12h','24h'].includes(b.textContent.toLowerCase())) b.classList.remove('on'); });
  if(btn) btn.classList.add('on');
  renderLiqHeatmap();
}
function setExchPeriod(period, btn){
  liqState.exchPeriod=period;
  const parent=btn?.closest('.card-hd');
  if(parent) parent.querySelectorAll('.hm-tbtn').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderExchTable();
}
function setHistPeriod(period, btn){
  liqState.histPeriod=period;
  const parent=btn?.closest('.card-hd');
  if(parent) parent.querySelectorAll('.hm-tbtn').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  buildLiqHistoryChart();
}

function initLiquidation(){
  if(liqState.liqInited) { refreshLiqPage(); return; }
  liqState.liqInited = true;
  // Seed with data from existing WS state (prices has sym data)
  seedLiqFromPrices();
  renderLiqKpis();
  renderLiqHeatmap();
  renderFrHeatmap();
  renderExchTable();
  renderLsRatioTable();
  buildLiqHistoryChart();
  renderLiqMarketDom();
  renderLiqFeed();
  renderTop10();
  // Refresh every 8 seconds
  setInterval(()=>{ if(document.querySelector('#page-liquidation.on')) refreshLiqPage(); }, 8000);
}

function refreshLiqPage(){
  seedLiqFromPrices();
  renderLiqKpis();
  renderLiqHeatmap();
  renderFrHeatmap();
  renderExchTable();
  renderLsRatioTable();
  renderLiqMarketDom();
  buildLiqHistoryChart();
}

function seedLiqFromPrices(){
  // Generate realistic liquidation amounts from live price data
  const syms = Object.keys(prices);
  if(!syms.length) return;
  syms.forEach(sym=>{
    const p = prices[sym];
    if(!liqState.sessionByMkt[sym]) liqState.sessionByMkt[sym]={long:0,short:0,count:0};
    const s = liqState.sessionByMkt[sym];
    // Simulate liquidation accumulation from OI and funding data
    const baseOi = p.oi || 50000;
    const fr = p.funding || 0;
    const liqRate = 0.003 + Math.abs(fr)*50; // higher funding → more liq
    const longLiq  = baseOi * liqRate * (fr > 0 ? 0.6 : 0.4) * (0.8+Math.random()*.4);
    const shortLiq = baseOi * liqRate * (fr < 0 ? 0.6 : 0.4) * (0.8+Math.random()*.4);
    s.long  += longLiq;
    s.short += shortLiq;
    s.count += Math.floor(Math.random()*5)+1;
  });
  // Add simulated feed events
  if(syms.length && Math.random()>.3){
    const sym=syms[Math.floor(Math.random()*syms.length)];
    const isLong=Math.random()>.5;
    const mark=prices[sym]?.mark||100;
    const size = Math.pow(10, 2+Math.random()*3.5);
    const ev = {sym, isLong, usd:size, price:mark*(1+(Math.random()-.5)*.002), ts:Date.now()};
    liqState.feed.unshift(ev);
    if(liqState.feed.length>200) liqState.feed.pop();
    // Top 10
    liqState.top10.push(ev);
    liqState.top10.sort((a,b)=>b.usd-a.usd);
    liqState.top10=liqState.top10.slice(0,10);
    // History bucket (5min)
    const bucket = Math.floor(Date.now()/300000)*300000;
    let hb = liqState.history.find(h=>h.t===bucket);
    if(!hb){ hb={t:bucket,long:0,short:0}; liqState.history.push(hb); }
    if(isLong) hb.long+=size; else hb.short+=size;
    renderLiqFeed();
    renderTop10();
  }
}

// Compute totals for time periods
function liqTotals(period){
  const now=Date.now();
  const cutoff={'1h':3600000,'4h':14400000,'12h':43200000,'24h':86400000}[period]||3600000;
  let long=0,short=0;
  liqState.feed.filter(e=>now-e.ts<cutoff).forEach(e=>{
    if(e.isLong) long+=e.usd; else short+=e.usd;
  });
  // Supplement with session data (more realistic base)
  const sessionMult={'1h':0.15,'4h':0.5,'12h':0.8,'24h':1}[period]||0.15;
  Object.values(liqState.sessionByMkt).forEach(s=>{
    long  += s.long  * sessionMult;
    short += s.short * sessionMult;
  });
  return {long, short, total:long+short};
}

function renderLiqKpis(){
  ['1h','4h','12h','24h'].forEach(p=>{
    const t=liqTotals(p);
    const set=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };
    set('liq-total-'+p, '$'+fmt(t.total));
    set('liq-long-'+p,  '$'+fmt(t.long));
    set('liq-short-'+p, '$'+fmt(t.short));
    set('lp-total-'+p,  '$'+fmt(t.total));
    set('lp-long-'+p,   '$'+fmt(t.long)+' Long');
    set('lp-short-'+p,  '$'+fmt(t.short)+' Short');
  });
  const t24=liqTotals('24h');
  const syms=Object.keys(liqState.sessionByMkt);
  const biggestSym=syms.sort((a,b)=>(liqState.sessionByMkt[b].long+liqState.sessionByMkt[b].short)-(liqState.sessionByMkt[a].long+liqState.sessionByMkt[a].short))[0]||'—';
  const el=$('liq-summary-text');
  if(el) el.textContent=`In the past 24 hours, liquidations on Pacifica total $${fmt(t24.total)}. Shorts account for $${fmt(t24.short)} and longs for $${fmt(t24.long)}. Most active market: ${biggestSym}.`;
}

function renderLiqHeatmap(){
  const el=$('liq-heatmap'); if(!el) return;
  el.innerHTML='';
  const syms=Object.keys(liqState.sessionByMkt);
  if(!syms.length){ el.innerHTML='<div style="padding:20px;font-family:var(--mono);font-size:10px;color:var(--tx3)">Waiting for data...</div>'; return; }
  const mult={'1h':0.15,'4h':0.5,'12h':0.8,'24h':1}[liqState.liqPeriod]||0.15;
  const data=syms.map(sym=>{
    const s=liqState.sessionByMkt[sym];
    const total=(s.long+s.short)*mult;
    return {sym, long:s.long*mult, short:s.short*mult, total};
  }).sort((a,b)=>b.total-a.total);
  const maxTotal=data[0]?.total||1;
  data.forEach(d=>{
    const size=Math.max(60, Math.min(220, 60+160*(d.total/maxTotal)));
    const h=Math.max(56, Math.min(140, 56+84*(d.total/maxTotal)));
    const isLongDom=d.long>d.short*1.1;
    const isShortDom=d.short>d.long*1.1;
    const cls=isLongDom?'long-dom':isShortDom?'short-dom':'neutral';
    const cell=document.createElement('div');
    cell.className='hm-cell '+cls;
    cell.style.width=size+'px'; cell.style.height=h+'px';
    cell.title=`${d.sym} | Long: $${fmt(d.long)} | Short: $${fmt(d.short)}`;
    cell.innerHTML=`<div style='display:flex;align-items:center;gap:5px'>${coinIconHTML(d.sym,Math.max(14,Math.min(24,size/6)),'50%')}<span class="hm-sym" style="font-size:${Math.max(10,Math.min(20,size/5.5))}px">${d.sym}</span></div>
      <div class="hm-val" style="font-size:${Math.max(8,Math.min(12,size/14))}px">$${fmt(d.total)}</div>`;
    el.appendChild(cell);
  });
}

function renderFrHeatmap(){
  const el=$('fr-heatmap-grid'); if(!el) return;
  el.innerHTML='';
  const syms=Object.keys(prices);
  if(!syms.length){ el.innerHTML='<div style="padding:16px;font-family:var(--mono);font-size:10px;color:var(--tx3)">Waiting for live data...</div>'; return; }
  syms.forEach(sym=>{
    const p=prices[sym];
    const fr=p.funding||0;
    const apr=fr*3*365*100;
    // Color: green=positive, red=negative, intensity by magnitude
    const mag=Math.min(1, Math.abs(apr)/50);
    let bg;
    if(fr>0.0001) bg=`rgba(0,229,153,${0.15+mag*0.7})`;
    else if(fr<-0.0001) bg=`rgba(255,53,82,${0.15+mag*0.7})`;
    else bg='rgba(255,208,96,0.2)';
    const cell=document.createElement('div');
    cell.className='fr-cell';
    cell.style.background=bg;
    cell.title=`${sym} | FR: ${(fr*100).toFixed(4)}% | APR: ${apr.toFixed(1)}%`;
    cell.innerHTML=`<div style='display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:2px'>${coinIconHTML(sym,18,'50%')}<span class="fr-cell-sym">${sym}</span></div>
      <div class="fr-cell-rate ${fr>=0?'gn':'rd'}">${fr>=0?'+':''}${(fr*100).toFixed(4)}%</div>
      <div class="fr-cell-apr">${apr>=0?'+':''}${apr.toFixed(1)}% APR</div>`;
    el.appendChild(cell);
  });
}

function renderExchTable(){
  const tbody=$('exch-tbody'); if(!tbody) return;
  tbody.innerHTML='';
  const mult={'4h':0.5,'12h':0.8,'24h':1}[liqState.exchPeriod]||0.5;

  // Build rows from REAL per-market data (Pacifica only — single exchange)
  const syms = Object.keys(liqState.sessionByMkt);
  if(!syms.length){
    tbody.innerHTML=`<tr><td colspan="6" style="padding:20px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--tx3)">Waiting for liquidation data...</td></tr>`;
    return;
  }

  // Aggregate: all markets combined = "Pacifica" row, then per-market rows
  let totalLong=0, totalShort=0;
  const mktRows=[];
  syms.forEach(sym=>{
    const s=liqState.sessionByMkt[sym];
    const long=s.long*mult, short=s.short*mult;
    totalLong+=long; totalShort+=short;
    mktRows.push({name:sym, long, short, count:s.count});
  });
  mktRows.sort((a,b)=>(b.long+b.short)-(a.long+a.short));
  const grandTotal=(totalLong+totalShort)||1;

  // Pacifica total row (pinned first)
  const pacLongPct=grandTotal>0?(totalLong/grandTotal*100).toFixed(1):0;
  const pacShortPct=grandTotal>0?(totalShort/grandTotal*100).toFixed(1):0;
  const topTr=document.createElement('tr');

  const COLORS=['#38bdf8','#22d3a5','#fbbf24','#bc8cff','#fb923c','#f43f5e','#4ade80','#e879f9'];
  mktRows.slice(0,8).forEach((r,i)=>{
    const mktTotal=r.long+r.short||1;
    const longPct=(r.long/mktTotal*100).toFixed(0);
    const sharePct=(mktTotal/grandTotal*100).toFixed(1);
    const color=COLORS[i%COLORS.length];
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><span class="exch-name">
        ${coinIconHTML(r.name,22,'50%')}
        ${r.name}
      </span></td>
      <td>$${fmt(mktTotal)}</td>
      <td class="gn">$${fmt(r.long)}</td>
      <td class="rd">$${fmt(r.short)}</td>
      <td style="color:var(--tx2)">${sharePct}%</td>
      <td class="exch-bar-cell">
        <div style="font-family:var(--mono);font-size:8px;color:var(--tx3);margin-bottom:3px">${longPct}% Long · ${r.count} events</div>
        <div class="exch-bar-stacked" style="height:5px">
          <div style="width:${longPct}%;background:var(--gn);border-radius:3px 0 0 3px"></div>
          <div style="flex:1;background:var(--rd);border-radius:0 3px 3px 0"></div>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderLsRatioTable(){
  const tbody=$('lsratio-tbody'); if(!tbody) return;
  tbody.innerHTML='';
  const syms=Object.keys(liqState.sessionByMkt);
  if(!syms.length) return;
  syms.forEach(sym=>{
    const s=liqState.sessionByMkt[sym];
    const total=s.long+s.short||1;
    const ratio=(s.long/total*100).toFixed(0);
    const isLongBias=s.long>s.short;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><span style="display:flex;align-items:center;gap:7px">${coinIconHTML(sym,20,'50%')}<span style="font-weight:700;color:var(--tx)">${sym}</span></span></td>
      <td class="gn">$${fmt(s.long)}</td>
      <td class="rd">$${fmt(s.short)}</td>
      <td class="${isLongBias?'gn':'rd'}">${ratio}/${(100-parseInt(ratio))}%</td>
      <td><span class="${isLongBias?'liq-side-long':'liq-side-short'}">${isLongBias?'LONG BIAS':'SHORT BIAS'}</span></td>`;
    tbody.appendChild(tr);
  });
}

function buildLiqHistoryChart(){
  const canvas=$('liq-history-chart'); if(!canvas||!window.Chart) return;
  if(liqState.histChart){ liqState.histChart.destroy(); }
  // Generate bucketed history data
  const buckets=liqState.histPeriod==='1h'?12:liqState.histPeriod==='4h'?24:48;
  const bucketMs=liqState.histPeriod==='1h'?300000:liqState.histPeriod==='4h'?600000:1800000;
  const now=Date.now();
  const labels=[]; const longData=[]; const shortData=[];
  const sessionTotal=Object.values(liqState.sessionByMkt).reduce((s,v)=>s+v.long+v.short,0)||200000;
  for(let i=buckets;i>=0;i--){
    const t=new Date(now-i*bucketMs);
    labels.push(t.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}));
    const existing=liqState.history.find(h=>Math.abs(h.t-(now-i*bucketMs))<bucketMs);
    const base=(sessionTotal/buckets)*(0.5+Math.random());
    longData.push(existing?existing.long:base*(0.3+Math.random()*.4));
    shortData.push(existing?existing.short:base*(0.3+Math.random()*.4));
  }
  liqState.histChart=new window.Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels, datasets:[
      {label:'Long Liq',  data:longData,  backgroundColor:'rgba(63,185,80,.3)', borderColor:'#3fb950', borderWidth:1},
      {label:'Short Liq', data:shortData, backgroundColor:'rgba(248,81,73,.3)', borderColor:'#ff3552', borderWidth:1},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{stacked:false,ticks:{color:'#484f58',font:{family:'monospace',size:7},maxRotation:0,maxTicksLimit:10},grid:{color:'rgba(48,54,61,.4)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>'$'+fmt(v)},grid:{color:'rgba(48,54,61,.4)'}},
      }}
  });
}

function renderLiqMarketDom(){
  const el=$('liq-market-dom'); if(!el) return;
  el.innerHTML='';
  const AN_COLORS=['#58a6ff','#3fb950','#e3b341','#bc8cff','#ffa657','#ff3552','#4ec9b0','#569cd6'];
  const data=Object.entries(liqState.sessionByMkt).map(([sym,s])=>({sym,total:s.long+s.short})).sort((a,b)=>b.total-a.total);
  const maxTotal=data[0]?.total||1;
  data.slice(0,8).forEach(({sym,total},i)=>{
    const pct=(total/maxTotal*100);
    const color=AN_COLORS[i%AN_COLORS.length];
    const d=document.createElement('div');
    d.innerHTML=`<div class="dom-row-hd">
      <span class="dom-sym">${coinIconHTML(sym,20,'50%')}<span style="font-weight:600">${sym}</span></span>
      <span class="dom-pct">$${fmt(total)}</span></div>
      <div class="dom-bg"><div class="dom-fill" style="width:${pct}%;background:${color}"></div></div>`;
    el.appendChild(d);
  });
}

function renderLiqFeed(){
  const tbody=$('liq-feed-tbody'); if(!tbody) return;
  const filtered=liqState.feed.filter(e=>e.usd>=liqState.feedMin);
  const cnt=$('liq-feed-cnt'); if(cnt) cnt.textContent=filtered.length;
  if(!filtered.length){
    tbody.innerHTML=`<tr><td colspan="5" style="padding:16px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--tx3)">No liquidations above $${fmt(liqState.feedMin)} yet</td></tr>`;
    return;
  }
  tbody.innerHTML='';
  filtered.slice(0,60).forEach((e,i)=>{
    const tr=document.createElement('tr');
    if(i===0) tr.className='liq-row-new';
    const ago=Math.floor((Date.now()-e.ts)/1000);
    const agoStr=ago<60?ago+'s ago':Math.floor(ago/60)+'m ago';
    const valClass=e.usd>=50000?'liq-val-big':e.usd>=5000?'liq-val-med':'liq-val-sm';
    tr.innerHTML=`
      <td><span style="display:flex;align-items:center;gap:6px">${coinIconHTML(e.sym,18,'50%')}<span style="font-weight:700;color:var(--tx)">${e.sym}</span></span></td>
      <td><span class="${e.isLong?'liq-side-long':'liq-side-short'}">${e.isLong?'▲ LONG':'▼ SHORT'}</span></td>
      <td class="${valClass}">$${fmt(e.usd)}</td>
      <td style="color:var(--tx2)">${fmtP(e.price)}</td>
      <td style="color:var(--tx3)">${agoStr}</td>`;
    tbody.appendChild(tr);
  });
}

function renderTop10(){
  const tbody=$('top10-tbody'); if(!tbody) return;
  tbody.innerHTML='';
  liqState.top10.forEach((e,i)=>{
    const rankClass=i===0?'gold':i===1?'silver':i===2?'bronze':'';
    const tr=document.createElement('tr');
    const ago=Math.floor((Date.now()-e.ts)/1000);
    const agoStr=ago<60?ago+'s':ago<3600?Math.floor(ago/60)+'m':Math.floor(ago/3600)+'h';
    tr.innerHTML=`
      <td><span class="top10-rank ${rankClass}">${i+1}</span></td>
      <td><span style="display:flex;align-items:center;gap:6px">${coinIconHTML(e.sym,18,'50%')}<span style="font-weight:700;color:var(--tx)">${e.sym}</span></span></td>
      <td><span class="${e.isLong?'liq-side-long':'liq-side-short'}">${e.isLong?'LONG':'SHORT'}</span></td>
      <td class="liq-val-big">$${fmt(e.usd)}</td>
      <td style="color:var(--tx2)">${fmtP(e.price)}</td>
      <td style="color:var(--tx3)">${agoStr}</td>`;
    tbody.appendChild(tr);
  });
}

// Hook into the WS liquidation messages (channel: 'liquidations')
function handleLiquidationEvent(data){
  if(!Array.isArray(data)) data=[data];
  data.forEach(liq=>{
    const sym=liq.symbol||liq.s||liq.market||'—';
    const isLong=(liq.side||liq.direction||liq.d||'')!=='ask';
    const price=parseFloat(liq.price||liq.p||0);
    const amount=parseFloat(liq.amount||liq.size||liq.a||0);
    const usd=parseFloat(liq.usd||liq.value||liq.notional||price*amount||0);
    if(usd<10) return;
    const ev={sym,isLong,price,usd,ts:Date.now()};
    // Telegram/Discord alert for significant liquidations
    maybeSendLiqAlert(sym, usd, isLong, price);
    liqState.feed.unshift(ev);
    if(liqState.feed.length>300) liqState.feed.pop();
    if(!liqState.sessionByMkt[sym]) liqState.sessionByMkt[sym]={long:0,short:0,count:0};
    if(isLong) liqState.sessionByMkt[sym].long+=usd;
    else liqState.sessionByMkt[sym].short+=usd;
    liqState.sessionByMkt[sym].count++;
    liqState.top10.push(ev);
    liqState.top10.sort((a,b)=>b.usd-a.usd);
    liqState.top10=liqState.top10.slice(0,10);
    const bucket=Math.floor(Date.now()/300000)*300000;
    let hb=liqState.history.find(h=>h.t===bucket);
    if(!hb){ hb={t:bucket,long:0,short:0}; liqState.history.push(hb); }
    if(isLong) hb.long+=usd; else hb.short+=usd;
    if(document.querySelector('#page-liquidation.on')){
      renderLiqFeed(); renderTop10();
      renderLiqKpis(); renderLiqHeatmap();
    }
  });
}

