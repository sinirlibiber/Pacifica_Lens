/* ══════════════════════════════════════════════
   INTEL PAGE — Economic Calendar + Market Stats
   (optimized: removed 3D globe, news feed, seedMockPrices bloat)
══════════════════════════════════════════════ */

let intelInitialized = false;
let intelCalFilter = 'all';

// ── UTC Clock ──────────────────────────────────
function startIntelClock(){
  const el = document.getElementById('intel-clock');
  if(!el) return;
  const tick = () => {
    const now = new Date();
    el.textContent = now.toUTCString().slice(17,25) + ' UTC';
  };
  tick();
  setInterval(tick, 1000);
}

// ── Fetch Market Intel Stats ──────────────────
async function fetchIntelStats(){
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/global');
    const d = await r.json();
    const g = d.data;
    const mcap = g.total_market_cap?.usd || 0;
    const vol  = g.total_volume?.usd || 0;
    const dom  = g.market_cap_percentage?.btc || 0;

    const fmt = v => {
      if(v >= 1e12) return '$' + (v/1e12).toFixed(2) + 'T';
      if(v >= 1e9)  return '$' + (v/1e9).toFixed(1) + 'B';
      return '$' + v.toFixed(0);
    };

    const el = id => document.getElementById(id);
    if(el('istat-mcap')) el('istat-mcap').textContent = fmt(mcap);
    if(el('istat-vol'))  el('istat-vol').textContent  = fmt(vol);
    if(el('istat-dom'))  el('istat-dom').textContent  = dom.toFixed(1) + '%';
  } catch(e){ console.warn('Intel stats:', e.message); }

  // Fear & Greed
  try {
    const r2 = await fetch('https://api.alternative.me/fng/?limit=1');
    const d2 = await r2.json();
    const fng = d2.data?.[0];
    if(fng){
      const score = parseInt(fng.value);
      const label = fng.value_classification;
      const color = score >= 60 ? 'var(--gn)' : score >= 40 ? '#e3b341' : 'var(--rd)';
      const el = document.getElementById('istat-fg');
      if(el) el.innerHTML = `<span style="color:${color}">${score} ${label}</span>`;
    }
  } catch(e){ console.warn('FnG:', e.message); }
}

// ── Economic Calendar Data ─────────────────────
const CALENDAR_EVENTS = [
  {name:'US FOMC Interest Rate Decision',country:'US',flag:'🇺🇸',daysOffset:1, time:'19:00',forecast:'4.50%',previous:'4.50%',importance:'high',cat:'central-bank'},
  {name:'BoJ Interest Rate Decision',     country:'JP',flag:'🇯🇵',daysOffset:2, time:'03:00',forecast:'0.50%',previous:'0.50%',importance:'high',cat:'central-bank'},
  {name:'ECB Rate Decision',              country:'EU',flag:'🇪🇺',daysOffset:2, time:'13:15',forecast:'2.65%',previous:'2.65%',importance:'high',cat:'central-bank'},
  {name:'US CPI m/m',                    country:'US',flag:'🇺🇸',daysOffset:4, time:'13:30',forecast:'0.2%', previous:'0.2%',importance:'high',cat:'inflation'},
  {name:'US Non-Farm Payrolls',           country:'US',flag:'🇺🇸',daysOffset:5, time:'13:30',forecast:'185K',previous:'228K',importance:'high',cat:'employment'},
  {name:'Germany GDP q/q',               country:'EU',flag:'🇩🇪',daysOffset:6, time:'09:00',forecast:'-0.2%',previous:'-0.2%',importance:'medium',cat:'gdp'},
  {name:'US Jobless Claims',              country:'US',flag:'🇺🇸',daysOffset:7, time:'13:30',forecast:'225K',previous:'219K',importance:'medium',cat:'employment'},
  {name:'US PPI m/m',                    country:'US',flag:'🇺🇸',daysOffset:8, time:'13:30',forecast:'0.2%', previous:'0.0%',importance:'medium',cat:'inflation'},
  {name:'UK Inflation Rate',             country:'GB',flag:'🇬🇧',daysOffset:9, time:'07:00',forecast:'2.8%', previous:'2.8%',importance:'high',cat:'inflation'},
  {name:'BoE Rate Decision',             country:'GB',flag:'🇬🇧',daysOffset:10,time:'12:00',forecast:'4.25%',previous:'4.50%',importance:'high',cat:'central-bank'},
  {name:'China CPI y/y',                 country:'CN',flag:'🇨🇳',daysOffset:11,time:'01:30',forecast:'0.1%', previous:'-0.1%',importance:'medium',cat:'inflation'},
  {name:'US Retail Sales m/m',           country:'US',flag:'🇺🇸',daysOffset:12,time:'13:30',forecast:'0.3%', previous:'-0.9%',importance:'medium',cat:'consumer'},
  {name:'ECB Meeting Minutes',           country:'EU',flag:'🇪🇺',daysOffset:14,time:'12:30',forecast:'-',    previous:'-',importance:'low',cat:'central-bank'},
  {name:'Japan Inflation Rate',          country:'JP',flag:'🇯🇵',daysOffset:15,time:'23:30',forecast:'3.5%', previous:'3.7%',importance:'medium',cat:'inflation'},
  {name:'US FOMC Meeting Minutes',       country:'US',flag:'🇺🇸',daysOffset:17,time:'19:00',forecast:'-',    previous:'-',importance:'medium',cat:'central-bank'},
  {name:'US PCE Price Index m/m',       country:'US',flag:'🇺🇸',daysOffset:25,time:'13:30',forecast:'0.2%', previous:'0.3%',importance:'high',cat:'inflation'},
  {name:'FOMC Rate Decision',          country:'US',flag:'🇺🇸',daysOffset:42,time:'19:00',forecast:'4.25%',previous:'4.50%',importance:'high',cat:'central-bank'},
];

function buildCalendarEvents(){
  const now = new Date();
  return CALENDAR_EVENTS.map(ev => {
    const d = new Date(now);
    d.setDate(d.getDate() + ev.daysOffset);
    const [h, m] = ev.time.split(':').map(Number);
    d.setUTCHours(h, m, 0, 0);
    return { ...ev, eventDate: d, ts: d.getTime() };
  }).sort((a,b) => a.ts - b.ts);
}

function getCountdown(ts){
  const diff = ts - Date.now();
  if(diff < 0){
    const ago = Math.abs(diff);
    if(ago < 3600000) return {text: Math.floor(ago/60000)+'m ago', live:false};
    if(ago < 86400000) return {text: Math.floor(ago/3600000)+'h ago', live:false};
    return {text: Math.floor(ago/86400000)+'d ago', live:false};
  }
  const days = Math.floor(diff/86400000);
  const hrs  = Math.floor((diff%86400000)/3600000);
  const mins = Math.floor((diff%3600000)/60000);
  if(days > 0) return {text: days+'d '+hrs+'h', live:false};
  if(hrs  > 0) return {text: hrs+'h '+mins+'m', live:false};
  if(mins > 0) return {text: mins+'m', live: mins <= 15};
  return {text:'LIVE', live:true};
}

function renderCalendar(){
  const container = document.getElementById('cal-list');
  if(!container) return;

  const events = buildCalendarEvents();
  const filter = intelCalFilter;
  const filtered = filter === 'all' ? events : events.filter(e => e.country === filter);

  if(!filtered.length){
    container.innerHTML = '<div class="cal-loading">No events for this filter.</div>';
    return;
  }

  let html = '';
  let lastDay = '';
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  filtered.forEach(ev => {
    const d = ev.eventDate;
    const dayKey = d.toDateString();
    if(dayKey !== lastDay){
      lastDay = dayKey;
      const today = new Date().toDateString();
      const tom = new Date(); tom.setDate(tom.getDate()+1);
      let dayLabel = `${dayNames[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
      if(dayKey === today) dayLabel = 'Today — ' + dayLabel;
      else if(dayKey === tom.toDateString()) dayLabel = 'Tomorrow — ' + dayLabel;
      html += `<div class="cal-section-head">${dayLabel}</div>`;
    }
    const {text, live} = getCountdown(ev.ts);
    html += `
    <div class="cal-item ${ev.importance}">
      <div class="cal-dot"></div>
      <div class="cal-countdown${live?' live':''}">${text}</div>
      <div class="cal-body">
        <div class="cal-event-name">${ev.name}</div>
        <div class="cal-meta">
          <span class="cal-flag">${ev.flag}</span>
          <span style="font-family:var(--mono);font-size:9px;color:var(--ac)">${ev.time} UTC</span>
          ${ev.forecast!=='-'?`<span class="cal-forecast">F: ${ev.forecast}</span>`:''}
          ${ev.previous!=='-'?`<span class="cal-prev">P: ${ev.previous}</span>`:''}
        </div>
      </div>
    </div>`;
  });

  container.innerHTML = html;

  const evEl = document.getElementById('istat-events');
  if(evEl) evEl.textContent = filtered.length;
}

// ── Intel FR Heatmap (replaces removed 3D globe) ──
function renderIntelFRHeatmap(){
  const el = document.getElementById('intel-fr-heatmap');
  if(!el) return;
  const syms = Object.entries(prices);
  if(!syms.length){ el.innerHTML = '<div style="font-family:var(--mono);font-size:10px;color:var(--tx3)">Waiting for live data...</div>'; return; }
  el.innerHTML = '';
  syms.sort((a,b) => Math.abs(b[1].funding) - Math.abs(a[1].funding)).slice(0,30).forEach(([sym,p]) => {
    const fr = p.funding||0;
    const apr = (fr*3*365*100).toFixed(1);
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    cell.style.background = rateColor(fr);
    cell.style.cursor = 'pointer';
    cell.title = `${sym}: ${(fr*100).toFixed(4)}%/8h · ${apr}% APR`;
    cell.innerHTML = `<div class="hm-sym">${sym}</div><div class="hm-r">${(fr*100).toFixed(4)}%</div><div class="hm-a">${apr}% APR</div>`;
    cell.onclick = () => { if(typeof openCoinChart==='function') openCoinChart(sym); };
    el.appendChild(cell);
  });
}

// ── Init Intel Page ───────────────────────────
function initIntelPage(){
  if(intelInitialized) return;
  intelInitialized = true;

  startIntelClock();
  fetchIntelStats();
  setInterval(fetchIntelStats, 120000);

  renderCalendar();
  setInterval(renderCalendar, 30000);
  renderIntelFRHeatmap();

  document.querySelectorAll('.ical-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ical-pill').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      intelCalFilter = btn.dataset.country;
      renderCalendar();
    });
  });
}

// ── seedMockPrices — Minimal fallback when WS not connected ──
function seedMockPrices(){
  if(Object.keys(prices).length > 5) return;
  const MOCKS = [
    ['BTC',95420,0.0001,2800000000],['ETH',3280,0.00008,980000000],
    ['SOL',178,-0.0003,480000000],['HYPE',28.4,0.00125,185000000],
    ['DOGE',0.185,0.00035,320000000],['XRP',2.14,0.0001,410000000],
  ];
  const now = Date.now();
  MOCKS.forEach(([sym, price, funding, vol]) => {
    prices[sym] = {
      mark: price, mid: price*0.9999, funding, next_funding: funding,
      oi: vol*0.08, vol, prev: price*(1+(Math.random()-0.5)*0.04),
      change: (Math.random()-0.45)*8, ts: now,
    };
    lsVol[sym] = { l: 0.5+Math.random()*0.2, s: 0.3+Math.random()*0.2 };
  });
}
