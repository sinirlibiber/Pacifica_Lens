/* ══════════════════════════════════════════════
   INTEL PAGE — Economic Calendar + Map + News
══════════════════════════════════════════════ */

let intelInitialized = false;
let intelCalFilter = 'all';
let intelNewsFilter = 'all';
let intelNewsRefreshTimer = null;

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

// ── Trading Session Status ─────────────────────
function updateTradingSessions(){}

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
  // Format: {name, country, flag, date, time, forecast, previous, importance: 'high'|'medium'|'low', category}
  // We'll use Investing.com / Trading Economics style data
  // Static seeded data with upcoming events
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
  {name:'EU GDP Flash Estimate',        country:'EU',flag:'🇪🇺',daysOffset:20,time:'10:00',forecast:'0.4%', previous:'0.4%',importance:'medium',cat:'gdp'},
  {name:'US New Home Sales',            country:'US',flag:'🇺🇸',daysOffset:21,time:'15:00',forecast:'680K', previous:'676K',importance:'low',cat:'housing'},
  {name:'China Manufacturing PMI',      country:'CN',flag:'🇨🇳',daysOffset:22,time:'01:00',forecast:'50.2', previous:'50.5',importance:'medium',cat:'pmi'},
  {name:'US PCE Price Index m/m',       country:'US',flag:'🇺🇸',daysOffset:25,time:'13:30',forecast:'0.2%', previous:'0.3%',importance:'high',cat:'inflation'},
  {name:'Canada Interest Rate',         country:'CA',flag:'🇨🇦',daysOffset:28,time:'15:00',forecast:'2.75%',previous:'3.00%',importance:'high',cat:'central-bank'},
  {name:'US ISM Manufacturing PMI',     country:'US',flag:'🇺🇸',daysOffset:30,time:'15:00',forecast:'48.5', previous:'49.0',importance:'medium',cat:'pmi'},
  {name:'BoJ Meeting Minutes',          country:'JP',flag:'🇯🇵',daysOffset:32,time:'23:50',forecast:'-',    previous:'-',importance:'low',cat:'central-bank'},
  {name:'EU Inflation Rate Flash',     country:'EU',flag:'🇪🇺',daysOffset:35,time:'10:00',forecast:'2.2%', previous:'2.2%',importance:'high',cat:'inflation'},
  {name:'US ADP Employment Change',    country:'US',flag:'🇺🇸',daysOffset:37,time:'13:15',forecast:'120K', previous:'155K',importance:'medium',cat:'employment'},
  {name:'FOMC Rate Decision',          country:'US',flag:'🇺🇸',daysOffset:42,time:'19:00',forecast:'4.25%',previous:'4.50%',importance:'high',cat:'central-bank'},
  {name:'BoJ Rate Decision',           country:'JP',flag:'🇯🇵',daysOffset:43,time:'03:00',forecast:'0.50%',previous:'0.50%',importance:'high',cat:'central-bank'},
  {name:'ECB Rates Decision',          country:'EU',flag:'🇪🇺',daysOffset:44,time:'13:15',forecast:'2.40%',previous:'2.65%',importance:'high',cat:'central-bank'},
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

  const filtered = filter === 'all' ? events
    : events.filter(e => e.country === filter);

  if(!filtered.length){
    container.innerHTML = '<div class="cal-loading">No events for this filter.</div>';
    return;
  }

  // Group by day
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
    const imp = ev.importance;
    const hasActual = ev.daysOffset < 0;
    html += `
    <div class="cal-item ${imp}">
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
}

// ── World Map SVG ─────────────────────────────
function drawWorldMap(){
  const wrap = document.getElementById('globe-wrap');
  const canvas = document.getElementById('globe-canvas');
  if(!canvas || !wrap) return;

  // ── Three.js CDN loader ─────────────────────────────────────
  function loadScript(src, cb){
    if(document.querySelector('script[src="'+src+'"]')){cb();return;}
    const s = document.createElement('script');
    s.src = src; s.onload = cb; document.head.appendChild(s);
  }

  loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', () => {
    buildGlobe();
  });

  function buildGlobe(){
    const W = wrap.clientWidth  || 760;
    const H = wrap.clientHeight || 380;
    canvas.width  = W;
    canvas.height = H;

    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 1000);
    camera.position.z = 2.6;

    // ── Stars ──────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(3000);
    for(let i=0; i<3000; i++){
      starPos[i] = (Math.random()-0.5)*80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({color:0xffffff, size:0.05, opacity:0.7, transparent:true})));

    // ── Atmosphere glow ────────────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(1.025, 64, 64);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x1a6ea8,
      transparent: true,
      opacity: 0.12,
      side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // ── Earth sphere with canvas texture ──────────────────────
    const texCanvas = document.createElement('canvas');
    texCanvas.width  = 2048;
    texCanvas.height = 1024;
    const ctx = texCanvas.getContext('2d');

    // Ocean
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0,   '#05192d');
    oceanGrad.addColorStop(0.5, '#072a42');
    oceanGrad.addColorStop(1,   '#05192d');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Draw land masses with accurate Natural Earth outlines
    ctx.fillStyle    = '#1e3a4a';
    ctx.strokeStyle  = '#2d5a72';
    ctx.lineWidth    = 1.2;

    // Helper: lon/lat → pixel (equirectangular)
    const ll = (lon, lat) => [(lon + 180) / 360 * 2048, (90 - lat) / 180 * 1024];

    function drawLand(pts){
      ctx.beginPath();
      let first = true;
      for(const [lon, lat] of pts){
        const [x, y] = ll(lon, lat);
        first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        first = false;
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // ── North America ──
    drawLand([[-140,60],[-130,55],[-125,49],[-95,49],[-82,45],[-70,47],[-60,46],[-55,50],[-52,47],[-55,44],[-65,40],[-75,35],[-80,25],[-88,20],[-90,16],[-86,10],[-77,8],[-65,10],[-60,15],[-58,10],[-55,5],[-52,4],[-50,5],[-48,10],[-50,15],[-55,18],[-58,23],[-60,30],[-75,32],[-80,32],[-85,30],[-90,28],[-97,25],[-100,28],[-105,30],[-110,32],[-115,30],[-118,34],[-122,37],[-124,40],[-124,46],[-120,49],[-110,49],[-100,49],[-90,49],[-85,46],[-80,44],[-75,45],[-68,47],[-62,45],[-60,45],[-56,48],[-52,50],[-55,58],[-60,62],[-65,65],[-75,68],[-90,72],[-105,75],[-120,74],[-135,70],[-140,65],[-150,60],[-155,58],[-155,60],[-152,60],[-148,58],[-142,59],[-140,60]]);

    // ── Greenland ──
    drawLand([[-55,83],[-20,83],[-18,76],[-22,70],[-28,68],[-38,65],[-45,60],[-50,60],[-55,63],[-58,68],[-55,75],[-52,80],[-55,83]]);

    // ── South America ──
    drawLand([[-80,10],[-75,12],[-62,12],[-60,7],[-52,4],[-50,5],[-48,10],[-44,15],[-35,8],[-35,-10],[-38,-15],[-40,-22],[-43,-23],[-45,-24],[-48,-28],[-50,-32],[-52,-34],[-58,-34],[-60,-38],[-62,-42],[-65,-46],[-66,-50],[-68,-55],[-70,-55],[-72,-50],[-72,-42],[-70,-38],[-68,-32],[-70,-28],[-70,-22],[-68,-18],[-70,-14],[-75,-10],[-78,-5],[-80,0],[-80,10]]);

    // ── Europe ──
    drawLand([[0,51],[2,51],[5,53],[8,55],[10,58],[12,58],[14,56],[18,55],[20,54],[24,54],[26,60],[28,65],[25,68],[20,68],[18,65],[15,58],[12,56],[8,57],[2,54],[0,51]]);
    // Scandinavia
    drawLand([[5,57],[8,58],[10,62],[12,65],[14,68],[18,69],[25,68],[28,65],[26,60],[20,58],[18,55],[14,56],[10,57],[5,57]]);
    // Iberia
    drawLand([[-9,44],[-2,44],[3,42],[3,40],[1,38],[-2,36],[-5,36],[-9,37],[-10,38],[-9,44]]);
    // Italy
    drawLand([[12,44],[14,44],[16,40],[16,38],[15,37],[15,39],[13,42],[12,44]]);
    // UK
    drawLand([[-5,50],[0,51],[2,52],[0,54],[-3,56],[-5,57],[-3,54],[-2,52],[-5,50]]);

    // ── Africa ──
    drawLand([[-16,16],[-14,12],[-10,8],[-5,5],[0,5],[5,4],[10,4],[15,4],[20,4],[25,2],[32,0],[36,-1],[40,-5],[42,-10],[40,-18],[36,-24],[32,-28],[28,-32],[25,-34],[18,-35],[16,-30],[12,-22],[10,-16],[8,-8],[4,-4],[2,4],[5,8],[5,16],[10,18],[12,22],[10,22],[8,18],[4,20],[0,16],[-8,14],[-16,16]]);

    // ── Russia ──
    drawLand([[30,70],[40,70],[55,72],[65,73],[80,72],[100,70],[120,68],[130,65],[140,60],[145,48],[132,43],[125,42],[120,46],[110,52],[100,52],[90,52],[80,55],[70,55],[60,58],[50,62],[40,65],[30,70]]);
    // Siberia east
    drawLand([[140,60],[150,55],[160,60],[165,68],[160,72],[145,72],[135,68],[130,62],[135,58],[140,60]]);

    // ── Middle East ──
    drawLand([[28,38],[36,37],[38,34],[42,38],[48,30],[56,24],[58,22],[52,16],[44,12],[42,14],[38,16],[32,22],[28,30],[28,38]]);

    // ── Central Asia / Kazakhstan ──
    drawLand([[50,52],[60,55],[70,55],[80,50],[78,42],[72,42],[68,38],[62,38],[52,44],[50,52]]);

    // ── India ──
    drawLand([[68,24],[72,22],[78,8],[80,10],[82,16],[80,22],[76,28],[72,24],[68,24]]);
    drawLand([[72,22],[78,8],[80,10],[82,16],[80,22],[76,28],[72,24],[68,24]]);

    // ── China & East Asia ──
    drawLand([[74,38],[80,44],[90,50],[100,52],[110,52],[120,50],[125,50],[130,48],[132,44],[128,38],[122,32],[118,24],[110,18],[106,16],[100,18],[96,22],[88,28],[80,32],[74,38]]);

    // ── Southeast Asia ──
    drawLand([[100,18],[106,16],[108,12],[104,2],[100,0],[98,4],[96,8],[100,12],[100,18]]);

    // ── Japan ──
    drawLand([[130,31],[132,33],[135,35],[140,38],[142,38],[142,42],[140,44],[136,40],[132,33],[130,31]]);

    // ── Korean peninsula ──
    drawLand([[126,34],[128,38],[130,38],[130,34],[126,34]]);

    // ── Indonesia / Maritime SEA ──
    drawLand([[95,5],[100,0],[105,-2],[110,-6],[115,-8],[120,-10],[125,-8],[120,-6],[115,-4],[108,-2],[100,2],[95,5]]);
    drawLand([[125,-8],[130,-5],[135,-2],[138,-6],[132,-8],[125,-8]]);

    // ── Australia ──
    drawLand([[114,-22],[116,-34],[125,-34],[132,-34],[138,-36],[142,-38],[148,-38],[152,-30],[154,-26],[150,-22],[145,-18],[140,-18],[136,-14],[130,-12],[124,-14],[116,-22],[114,-22]]);

    // ── New Zealand ──
    drawLand([[172,-34],[174,-40],[172,-46],[170,-44],[172,-38],[172,-34]]);
    drawLand([[172,-34],[176,-36],[178,-38],[175,-41],[170,-44],[170,-40],[172,-34]]);

    // ── Canada Arctic islands ──
    drawLand([[-80,74],[-70,76],[-60,78],[-55,80],[-65,82],[-80,82],[-90,78],[-85,74],[-80,74]]);

    // ── Graticule grid lines ──
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.8;
    for(let lon=-180; lon<=180; lon+=30){
      ctx.beginPath();
      const x = (lon+180)/360*2048;
      ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for(let lat=-90; lat<=90; lat+=30){
      ctx.beginPath();
      const y = (90-lat)/180*1024;
      ctx.moveTo(0, y); ctx.lineTo(2048, y);
      ctx.stroke();
    }
    // Equator slightly brighter
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, 512); ctx.lineTo(2048, 512);
    ctx.stroke();

    // ── Event markers on texture ──────────────────────────────
    const events = [
      {lon:-77, lat:39,  label:'FOMC',  color:'#f85149', r:10, size:'H'},
      {lon:8,   lat:50,  label:'ECB',   color:'#f85149', r:9,  size:'H'},
      {lon:139, lat:36,  label:'BoJ',   color:'#f85149', r:9,  size:'H'},
      {lon:-0,  lat:51,  label:'BoE',   color:'#e3b341', r:7,  size:'M'},
      {lon:116, lat:40,  label:'PBOC',  color:'#e3b341', r:7,  size:'M'},
      {lon:-75, lat:45,  label:'BoC',   color:'#e3b341', r:6,  size:'M'},
      {lon:149, lat:-35, label:'RBA',   color:'#38bdf8', r:5,  size:'L'},
      {lon:72,  lat:19,  label:'RBI',   color:'#38bdf8', r:5,  size:'L'},
      {lon:-47, lat:-16, label:'BCB',   color:'#38bdf8', r:5,  size:'L'},
    ];

    for(const ev of events){
      const [x, y] = ll(ev.lon, ev.lat);
      // Outer pulse circle
      ctx.beginPath();
      ctx.arc(x, y, ev.r*2.5, 0, Math.PI*2);
      ctx.fillStyle = ev.color + '25';
      ctx.fill();
      // Inner dot
      ctx.beginPath();
      ctx.arc(x, y, ev.r, 0, Math.PI*2);
      ctx.fillStyle = ev.color;
      ctx.fill();
      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${ev.r*1.2}px monospace`;
      ctx.fillText(ev.label, x + ev.r + 2, y + 3);
    }

    const texture = new THREE.CanvasTexture(texCanvas);

    // ── Globe mesh ────────────────────────────────────────────
    const geoSphere = new THREE.SphereGeometry(1, 96, 96);
    const matSphere = new THREE.MeshPhongMaterial({
      map: texture,
      specular: new THREE.Color(0x111122),
      shininess: 12,
    });
    const globe = new THREE.Mesh(geoSphere, matSphere);
    scene.add(globe);

    // ── Lighting ──────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x334466, 0.8);
    scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);
    const backLight = new THREE.DirectionalLight(0x1a3a5c, 0.3);
    backLight.position.set(-5, -2, -3);
    scene.add(backLight);

    // ── Mouse drag to rotate ──────────────────────────────────
    let isDragging = false;
    let prevMouse  = {x:0, y:0};
    let autoRotate = true;
    let rotVel     = 0.003;

    canvas.addEventListener('mousedown', e => {
      isDragging = true; autoRotate = false;
      prevMouse = {x: e.clientX, y: e.clientY};
      canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      isDragging = false; canvas.style.cursor = 'grab';
      setTimeout(() => { autoRotate = true; }, 2000);
    });
    window.addEventListener('mousemove', e => {
      if(!isDragging) return;
      const dx = (e.clientX - prevMouse.x) * 0.005;
      const dy = (e.clientY - prevMouse.y) * 0.005;
      globe.rotation.y += dx;
      globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x + dy));
      prevMouse = {x: e.clientX, y: e.clientY};
    });

    // Touch support
    let lastTouch = null;
    canvas.addEventListener('touchstart', e => {
      lastTouch = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      autoRotate = false;
    });
    canvas.addEventListener('touchmove', e => {
      if(!lastTouch) return;
      e.preventDefault();
      const dx = (e.touches[0].clientX - lastTouch.x) * 0.005;
      const dy = (e.touches[0].clientY - lastTouch.y) * 0.005;
      globe.rotation.y += dx;
      globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x + dy));
      lastTouch = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }, {passive:false});
    canvas.addEventListener('touchend', () => {
      lastTouch = null;
      setTimeout(() => { autoRotate = true; }, 3000);
    });

    // Click on events ─────────────────────────────────────────
    const tooltip = document.getElementById('globe-tooltip');
    const raycaster = new THREE.Raycaster();
    const mouse2d   = new THREE.Vector2();
    const eventData = {
      'FOMC': {title:'🇺🇸 US Events', body:'FOMC Rate Decision\nNon-Farm Payrolls\nCPI / PCE Release\nNext: 1-3 days', color:'#f85149'},
      'ECB':  {title:'🇪🇺 EU Events', body:'ECB Rate Decision\nEU GDP Estimate\nEU Inflation Rate\nNext: 2-3 days', color:'#f85149'},
      'BoJ':  {title:'🇯🇵 Japan Events', body:'BoJ Rate Decision\nJapan CPI\nMeeting Minutes\nNext: 2-4 days', color:'#f85149'},
      'BoE':  {title:'🇬🇧 UK Events', body:'BoE Rate Decision\nUK Inflation\nUK GDP\nNext: 9-10 days', color:'#e3b341'},
      'PBOC': {title:'🇨🇳 China Events', body:'Manufacturing PMI\nChina CPI y/y\nTrade Balance\nNext: 11 days', color:'#e3b341'},
      'BoC':  {title:'🇨🇦 Canada Events', body:'BoC Rate Decision\nCanada CPI\nNext: 28 days', color:'#e3b341'},
      'RBA':  {title:'🇦🇺 Australia', body:'RBA Rate Decision\nAustralia CPI\nNext: 30+ days', color:'#38bdf8'},
      'RBI':  {title:'🇮🇳 India', body:'RBI Rate Decision\nIndia CPI\nNext: 30+ days', color:'#38bdf8'},
      'BCB':  {title:'🇧🇷 Brazil', body:'BCB Selic Rate\nNext: 30+ days', color:'#38bdf8'},
    };

    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      mouse2d.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
      mouse2d.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse2d, camera);
      const hits = raycaster.intersectObject(globe);
      if(hits.length > 0){
        const p = hits[0].point;
        // Convert hit point to lat/lon
        const theta = Math.atan2(p.z, p.x);
        const phi   = Math.asin(p.y);
        const lon = (theta - globe.rotation.y) * 180 / Math.PI;
        const lat = phi * 180 / Math.PI;

        // Find nearest event
        let closest = null; let minDist = Infinity;
        for(const ev of events){
          const dLon = (ev.lon - lon + 540) % 360 - 180;
          const dLat = ev.lat - lat;
          const d = Math.sqrt(dLon*dLon + dLat*dLat);
          if(d < minDist){ minDist = d; closest = ev; }
        }

        if(closest && minDist < 15 && tooltip){
          const ed = eventData[closest.label];
          tooltip.style.display = 'block';
          tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
          tooltip.style.top  = (e.clientY - rect.top  - 20) + 'px';
          tooltip.innerHTML  = `<strong style="color:${ed.color}">${ed.title}</strong>${ed.body}`;
          setTimeout(() => { if(tooltip) tooltip.style.display='none'; }, 3000);
        }
      }
    });

    // ── Resize handler ────────────────────────────────────────
    const resizeObs = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if(w>0 && h>0){
        canvas.width = w; canvas.height = h;
        renderer.setSize(w, h);
        camera.aspect = w/h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObs.observe(wrap);

    // ── Animation loop ────────────────────────────────────────
    let animId;
    function animate(){
      animId = requestAnimationFrame(animate);
      if(autoRotate) globe.rotation.y += 0.0015;
      atmGeo.rotateY(0.0008);
      renderer.render(scene, camera);
    }
    animate();

    // Stop animation when page hidden
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) cancelAnimationFrame(animId);
      else animate();
    });
  }

  // Update stats
  const evEl = document.getElementById('istat-events');
  if(evEl) evEl.textContent = '9';
}

// News country detection for globe - maps keywords to countries
function getNewsCountry(title){
  const t = title.toLowerCase();
  if(t.includes('fed')||t.includes('fomc')||t.includes('u.s.')||t.includes(' us ')||t.includes('american')||t.includes('nasdaq')||t.includes('s&p')||t.includes('dollar')) return 'US';
  if(t.includes('ecb')||t.includes('euro')||t.includes('germany')||t.includes('france')||t.includes('europe')) return 'EU';
  if(t.includes('japan')||t.includes('boj')||t.includes('yen')||t.includes('nikkei')) return 'JP';
  if(t.includes('china')||t.includes('pboc')||t.includes('yuan')||t.includes('beijing')) return 'CN';
  if(t.includes('uk ')||t.includes('boe')||t.includes('britain')||t.includes('pound')||t.includes('ftse')) return 'GB';
  if(t.includes('canada')||t.includes('boc ')||t.includes('loonie')) return 'CA';
  if(t.includes('bitcoin')||t.includes('crypto')||t.includes('blockchain')||t.includes('ethereum')) return 'CRYPTO';
  return 'WORLD';
}





// ── News Feed ─────────────────────────────────
let allNewsItems = [];

const NEWS_ICONS = {
  bitcoin:  {e:'₿',  c:'#f7931a'},
  btc:      {e:'₿',  c:'#f7931a'},
  ethereum: {e:'Ξ',  c:'#627eea'},
  eth:      {e:'Ξ',  c:'#627eea'},
  solana:   {e:'◎',  c:'#9945ff'},
  sol:      {e:'◎',  c:'#9945ff'},
  fed:      {e:'🏛️', c:'#58a6ff'},
  fomc:     {e:'🏛️', c:'#58a6ff'},
  'interest rate': {e:'📊', c:'#58a6ff'},
  inflation:{e:'📈', c:'#e3b341'},
  cpi:      {e:'📈', c:'#e3b341'},
  gold:     {e:'🥇', c:'#e3b341'},
  xau:      {e:'🥇', c:'#e3b341'},
  hack:     {e:'🚨', c:'#f85149'},
  exploit:  {e:'🚨', c:'#f85149'},
  etf:      {e:'📋', c:'#58a6ff'},
  sec:      {e:'⚖️', c:'#58a6ff'},
  defi:     {e:'🔮', c:'#bc8cff'},
  nft:      {e:'🖼️', c:'#e3b341'},
  market:   {e:'📊', c:'#38bdf8'},
  stock:    {e:'📈', c:'#22d3a5'},
  apple:    {e:'🍎', c:'#555'},
  nvidia:   {e:'💚', c:'#76b900'},
  trump:    {e:'🇺🇸', c:'#b22234'},
  china:    {e:'🇨🇳', c:'#de2910'},
  tariff:   {e:'🚢', c:'#e3b341'},
  crypto:   {e:'🔗', c:'#38bdf8'},
  xrp:      {e:'✕',  c:'#346aa9'},
  ripple:   {e:'✕',  c:'#346aa9'},
};

function getNewsIcon(title){
  const low = title.toLowerCase();
  for(const [key, val] of Object.entries(NEWS_ICONS)){
    if(low.includes(key)) return val;
  }
  return {e:'📰', c:'#484f58'};
}

function getNewsCategory(title){
  const low = title.toLowerCase();
  if(low.includes('bitcoin')||low.includes('btc')||low.includes('ethereum')||
     low.includes('crypto')||low.includes('blockchain')||low.includes('defi')||
     low.includes('solana')||low.includes('xrp')||low.includes('nft')||
     low.includes('coin')||low.includes('token')) return 'crypto';
  if(low.includes('fed')||low.includes('fomc')||low.includes('ecb')||
     low.includes('inflation')||low.includes('cpi')||low.includes('gdp')||
     low.includes('rate')||low.includes('recession')||low.includes('tariff')) return 'macro';
  if(low.includes('stock')||low.includes('nasdaq')||low.includes('s&p')||
     low.includes('market')||low.includes('shares')||low.includes('equity')||
     low.includes('earnings')||low.includes('ipo')) return 'equities';
  return 'all';
}

function renderNewsItems(items){
  const container = document.getElementById('news-feed-list');
  if(!container) return;

  const filter = intelNewsFilter;
  const filtered = filter === 'all' ? items
    : items.filter(n => getNewsCategory(n.title) === filter);

  if(!filtered.length){
    container.innerHTML = '<div class="news-loading">No news for this category.</div>';
    return;
  }

  container.innerHTML = filtered.map(n => {
    const cat = getNewsCategory(n.title);
    const catLabels = {crypto:'Crypto', macro:'Macro', equities:'Equities', all:''};
    const badge = cat !== 'all' ? `<span class="news-badge">${catLabels[cat]}</span>` : '';

    // Use real image if available, otherwise source favicon
    let imgHtml = '';
    if(n.imageurl && n.imageurl.startsWith('http')){
      imgHtml = `<img class="news-thumb" src="${n.imageurl}" alt="" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="news-thumb-fallback" style="display:none">${getSourceInitial(n.src)}</div>`;
    } else {
      // Favicon from source domain
      const domain = n.url ? (() => { try{ return new URL(n.url).hostname; }catch(e){ return ''; } })() : '';
      if(domain){
        imgHtml = `<img class="news-thumb" src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="" loading="lazy"
          onerror="this.parentElement.querySelector('.news-thumb-fallback').style.display='flex';this.style.display='none'">
          <div class="news-thumb-fallback" style="display:none">${getSourceInitial(n.src)}</div>`;
      } else {
        imgHtml = `<div class="news-thumb-fallback">${getSourceInitial(n.src)}</div>`;
      }
    }

    return `
    <a class="news-item" href="${n.url||'#'}" target="_blank" rel="noopener noreferrer">
      <div class="news-thumb-wrap">
        ${imgHtml}
      </div>
      <div class="news-body">
        <div class="news-headline">${n.title}</div>
        <div class="news-meta">
          <span class="news-source">${n.src||'News'}</span>
          <span class="news-age">${n.time||''}</span>
          ${badge}
        </div>
      </div>
    </a>`;
  }).join('');
}

function getSourceInitial(src){
  const s = (src||'N').trim();
  return `<span style="font-size:14px;font-weight:700;color:var(--ac);font-family:var(--mono)">${s.charAt(0).toUpperCase()}</span>`;
}


async function fetchIntelNews(){
  const container = document.getElementById('news-feed-list');
  if(container) container.innerHTML = '<div class="news-loading">Fetching news...</div>';

  // ── Try CryptoCompare (crypto news) ─────────
  try {
    const r = await fetch(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=30',
      {headers:{Accept:'application/json'}, signal: AbortSignal.timeout(6000)}
    );
    if(!r.ok) throw new Error('cc '+r.status);
    const d = await r.json();
    const items = (d.Data||[]).filter(x=>x.url).map(x => ({
      title: x.title,
      url: x.url,
      src: x.source_info?.name || x.source || '',
      time: timeAgo(x.published_on),
      ts: x.published_on,
      imageurl: x.imageurl || x.source_info?.img || '',
    }));
    if(items.length > 0){
      allNewsItems = items;
      renderNewsItems(allNewsItems);
      updateGlobeNewsMarkers(allNewsItems);
      const tsEl = document.getElementById('news-last-update');
      if(tsEl) tsEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();
      return;
    }
  } catch(e){ console.warn('CC News:', e.message); }

  // ── Fallback: CoinDesk RSS ───────────────────
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')}`;
    const r = await fetch(proxy, {signal: AbortSignal.timeout(5000)});
    const d = await r.json();
    const xml = new DOMParser().parseFromString(d.contents,'text/xml');
    const items = [...xml.querySelectorAll('item')].slice(0,25).map(el => {
      const title = el.querySelector('title')?.textContent || '';
      const url   = el.querySelector('link')?.textContent || el.querySelector('guid')?.textContent || 'https://coindesk.com';
      const pub   = el.querySelector('pubDate')?.textContent || '';
      const ts    = pub ? Math.floor(new Date(pub).getTime()/1000) : 0;
      const encl  = el.querySelector('enclosure');
      const media = el.getElementsByTagName('media:content')[0] || el.getElementsByTagName('media:thumbnail')[0];
      const imageurl = encl?.getAttribute('url') || media?.getAttribute('url') || '';
      return {title, url, src:'CoinDesk', time: ts ? timeAgo(ts) : '', ts, imageurl};
    }).filter(x=>x.title);
    if(items.length){
      allNewsItems = items;
      renderNewsItems(allNewsItems);
      updateGlobeNewsMarkers(allNewsItems);
      const tsEl = document.getElementById('news-last-update');
      if(tsEl) tsEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();
      return;
    }
  } catch(e){ console.warn('RSS:', e.message); }

  // ── Static fallback ──────────────────────────
  allNewsItems = [
    {title:'Bitcoin holds $95K support as ETF inflows surge to record $1.3B weekly',url:'https://www.coindesk.com/markets/bitcoin/',src:'CoinDesk',time:'1h ago',ts:0},
    {title:'Federal Reserve signals rate hold in May — inflation still above target',url:'https://www.reuters.com/business/finance/',src:'Reuters',time:'2h ago',ts:0},
    {title:'Ethereum Pectra upgrade live — EIP-7251 raises staking limits to 2048 ETH',url:'https://www.theblock.co/latest',src:'The Block',time:'3h ago',ts:0},
    {title:'NVIDIA beats earnings — AI data center revenue hits $22.6B quarterly',url:'https://www.bloomberg.com/technology',src:'Bloomberg',time:'4h ago',ts:0},
    {title:'Solana DEX volume tops $50B in March — Raydium and Jupiter lead growth',url:'https://decrypt.co/crypto-news/solana',src:'Decrypt',time:'5h ago',ts:0},
    {title:'ECB cut rates by 25bps to 2.65% — Lagarde hints at more cuts ahead',url:'https://www.ft.com/economics',src:'Financial Times',time:'6h ago',ts:0},
    {title:'Hyperliquid surpasses $10B open interest — DeFi perps reach new milestone',url:'https://www.coindesk.com/markets/',src:'CoinDesk',time:'8h ago',ts:0},
    {title:'US CPI comes in at 2.4% y/y — core inflation falls for 3rd consecutive month',url:'https://www.wsj.com/economy/inflation',src:'WSJ',time:'10h ago',ts:0},
    {title:'XRP gains 12% after Ripple wins partial SEC victory in appeals court',url:'https://cointelegraph.com/tags/xrp',src:'CoinTelegraph',time:'12h ago',ts:0},
    {title:'China stimulus package expands to $500B — markets rally on liquidity hopes',url:'https://www.bloomberg.com/markets/',src:'Bloomberg',time:'14h ago',ts:0},
    {title:'MicroStrategy adds 5,000 BTC to treasury — total holdings reach 214,400 BTC',url:'https://www.coindesk.com/markets/bitcoin/',src:'CoinDesk',time:'16h ago',ts:0},
    {title:'Bank of Japan holds rates — yen weakens 0.8% against dollar on decision',url:'https://www.reuters.com/markets/rates-bonds/',src:'Reuters',time:'18h ago',ts:0},
    {title:'Pendle TVL crosses $5B as tokenized yield strategies gain institutional traction',url:'https://www.theblock.co/defi',src:'The Block',time:'20h ago',ts:0},
    {title:'Apple reports $94B revenue in Q1 — iPhone sales up 3% year-over-year',url:'https://www.cnbc.com/technology/',src:'CNBC',time:'22h ago',ts:0},
    {title:'Gold hits $3,100/oz all-time high amid global uncertainty and dollar weakness',url:'https://www.reuters.com/markets/commodities/',src:'Reuters',time:'1d ago',ts:0},
  ];
  renderNewsItems(allNewsItems);
  updateGlobeNewsMarkers(allNewsItems);
  const tsEl = document.getElementById('news-last-update');
  if(tsEl) tsEl.textContent = 'Fallback data';
}

// ── Init Intel Page ───────────────────────────
function initIntelPage(){
  if(intelInitialized) return;
  intelInitialized = true;

  // Start UTC clock
  startIntelClock();

  // Draw world map
  drawWorldMap();

  // Update session indicators every minute
  updateTradingSessions();
  setInterval(updateTradingSessions, 60000);

  // Fetch stats
  fetchIntelStats();
  setInterval(fetchIntelStats, 60000);

  // Render calendar
  renderCalendar();
  // Update countdowns every 30s
  setInterval(renderCalendar, 30000);

  // Fetch news
  fetchIntelNews();
  // Auto-refresh news every 3 minutes
  intelNewsRefreshTimer = setInterval(fetchIntelNews, 3 * 60 * 1000);

  // Calendar filter pills
  document.querySelectorAll('.ical-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ical-pill').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      intelCalFilter = btn.dataset.country;
      renderCalendar();
    });
  });

  // News category filter pills
  document.querySelectorAll('.news-cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.news-cat-pill').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      intelNewsFilter = btn.dataset.cat;
      renderNewsItems(allNewsItems);
    });
  });

  // Map region pills
  document.querySelectorAll('.map-rpill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-rpill').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      // Highlight regions on map
    });
  });
}


// ── Update globe texture with live news markers ─────────────
function updateGlobeNewsMarkers(items){
  // We'll overlay news dots on the globe using a 2D canvas overlay
  const wrap = document.getElementById('globe-wrap');
  if(!wrap) return;

  // Remove old news overlay
  let overlay = document.getElementById('globe-news-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'globe-news-overlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5';
    wrap.appendChild(overlay);
  }

  // Count news by country/region
  const counts = {};
  for(const item of items){
    const country = getNewsCountry(item.title);
    counts[country] = (counts[country]||0) + 1;
  }

  // Country positions as % of container (approximate screen positions)
  const countryPos = {
    US:     {x:'20%', y:'38%', color:'#f85149', label:'US'},
    EU:     {x:'51%', y:'28%', color:'#a78bfa', label:'EU'},
    JP:     {x:'83%', y:'35%', color:'#f85149', label:'JP'},
    CN:     {x:'76%', y:'35%', color:'#e3b341', label:'CN'},
    GB:     {x:'48%', y:'26%', color:'#38bdf8', label:'UK'},
    CA:     {x:'18%', y:'26%', color:'#38bdf8', label:'CA'},
    CRYPTO: {x:'50%', y:'50%', color:'#22d3a5', label:'⛓'},
    WORLD:  {x:'50%', y:'20%', color:'#94a3b8', label:'🌐'},
  };

  let html = '';
  for(const [country, count] of Object.entries(counts)){
    const pos = countryPos[country];
    if(!pos || count === 0) continue;
    const size = Math.min(8 + count * 1.5, 20);
    const recentItems = items.filter(n => getNewsCountry(n.title) === country).slice(0,3);
    const tooltip = recentItems.map(n => '• ' + n.title.slice(0,50) + (n.title.length>50?'…':'')).join('\n');
    html += `
    <div class="globe-news-dot" 
      style="left:${pos.x};top:${pos.y};width:${size}px;height:${size}px;background:${pos.color};border-color:${pos.color}40"
      title="${tooltip}"
      data-count="${count}"
      data-country="${pos.label}">
      <span class="globe-dot-count">${count}</span>
    </div>`;
  }
  overlay.innerHTML = html;
}

// ── Seed prices from Pacifica REST API when WS not yet connected ────────────────
async function seedMockPrices(){
  if(Object.keys(prices).length > 5) return; // WS already provided real data
  try {
    let d = null;
    // Try via proxy first (avoids CORS)
    try {
      const r1 = await fetch('/api/pacifica?path=info/prices');
      if(r1.ok) d = await r1.json();
    } catch(e){}
    // Fallback: direct API
    if(!d || !d.success){
      try {
        const r2 = await fetch('https://api.pacifica.fi/api/v1/info/prices');
        if(r2.ok) d = await r2.json();
      } catch(e){}
    }
    if(!d || !d.success || !Array.isArray(d.data)) return;
    d.data.forEach(p => {
      const sym = p.symbol;
      const mark = parseFloat(p.mark||0);
      const prev = parseFloat(p.yesterday_price||p.mark||0);
      prices[sym] = {
        mark, price: mark,
        mid: parseFloat(p.mid||0),
        funding: parseFloat(p.funding||0),
        next_funding: parseFloat(p.next_funding||0),
        oi: parseFloat(p.open_interest||0) * mark,
        vol: parseFloat(p.volume_24h||0),
        prev, change: prev > 0 ? ((mark - prev) / prev * 100) : 0,
        ts: p.timestamp,
      };
    });
    // Update overview stats
    const syms = Object.entries(prices);
    const totalVol = syms.reduce((s,[,p])=>s+p.vol,0);
    const totalOI = syms.reduce((s,[,p])=>s+p.oi,0);
    const avgFR = syms.reduce((s,[,p])=>s+p.funding,0) / (syms.length||1);
    const el = id => document.getElementById(id);
    if(el('st-markets')) el('st-markets').textContent = syms.length;
    if(el('st-oi'))      el('st-oi').textContent = '$' + fmt(totalOI);
    if(el('st-vol'))     el('st-vol').textContent = '$' + fmt(totalVol);
    if(el('st-fr')) {
      const apr = (avgFR*3*365*100).toFixed(1)+'%';
      el('st-fr').textContent = apr;
      el('st-fr').className = 's-val ' + (avgFR>=0?'gn':'rd');
    }
    renderMarketGrid();
    renderHeatmap();
    renderFundingTable();
    renderTicker();
    renderAlerts();
    renderArbBestOpportunity();
  } catch(e) {
    console.warn('REST seed failed:', e.message);
  }
}
