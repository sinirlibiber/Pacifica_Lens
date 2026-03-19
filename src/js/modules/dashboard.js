/* ══════════════════════════════════════════════
   DASHBOARD — Header dropdown + Overview tables
══════════════════════════════════════════════ */

/* ── Header dropdown click handler ── */
document.querySelectorAll('.tab-drop-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();

    const parentTab = item.closest('.tab.has-dropdown');
    if (!parentTab) return;

    const mainTabName = parentTab.dataset.tab;
    const subTabName = item.dataset.subtab;

    // Activate the main tab + page
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
    parentTab.classList.add('on');
    const pageEl = document.getElementById('page-' + mainTabName);
    if (pageEl) pageEl.classList.add('on');

    // Mark active dropdown item
    parentTab.querySelectorAll('.tab-drop-item').forEach(di => di.classList.remove('on'));
    item.classList.add('on');

    // Switch sub-pages within the page
    if (pageEl) {
      pageEl.querySelectorAll('.subpage').forEach(sp => sp.classList.remove('on'));
      const target = pageEl.querySelector('#subpage-' + subTabName);
      if (target) target.classList.add('on');
    }

    // Init specific sub-pages
    if (subTabName === 'ai') updateAiContext();
    if (subTabName === 'arbitrage') {
      setTimeout(() => { renderArbTable(); renderArbBestOpportunity(); initSpreadChart(); if(typeof initCrossDex==='function') initCrossDex(); }, 150);
    }
    if (subTabName === 'orderbook') {
      initOrderbook();
      if (ws && ws.readyState === 1 && obSym) {
        ws.send(JSON.stringify({ method: 'subscribe', params: { source: 'book', symbol: obSym, agg_level: 1 } }));
      }
    }
    if (subTabName === 'whale') renderWhalePage();
    if (subTabName === 'liq-main') initLiquidation();
    if (subTabName === 'analytics-main') {
      setTimeout(() => { if (window.Chart) initCharts(); }, 100);
    }
  });
});

/* ── Make parent tab click go to first dropdown item ── */
document.querySelectorAll('.tab.has-dropdown').forEach(tab => {
  tab.addEventListener('click', (e) => {
    // If clicking the tab text itself (not a dropdown item), go to first sub-item
    if (e.target === tab || e.target.closest('.tab-drop-item') === null) {
      const firstItem = tab.querySelector('.tab-drop-item');
      if (firstItem) firstItem.click();
    }
  });
});


/* ══════════════════════════════════════════════
   OVERVIEW — Dashboard Tables
══════════════════════════════════════════════ */

/* Update the dashboard markets table from prices state */
function updateDashMarketsTable() {
  const tbody = document.getElementById('dash-markets-tbody');
  if (!tbody) return;

  const sorted = Object.entries(prices)
    .filter(([, p]) => p.mark)
    .sort((a, b) => (b[1].vol24 || 0) - (a[1].vol24 || 0))
    .slice(0, 8);

  if (!sorted.length) return;

  tbody.innerHTML = '';
  sorted.forEach(([sym, p]) => {
    const tr = document.createElement('tr');
    const chg = p.funding ? (p.funding * 100).toFixed(4) : '0';
    const isUp = parseFloat(chg) >= 0;
    tr.innerHTML = `
      <td style="font-weight:700;color:var(--tx);display:flex;align-items:center;gap:6px">
        <span style="width:22px;height:22px;border-radius:50%;background:var(--bg4);display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:var(--ac)">${sym.charAt(0)}</span>
        <span>${sym}</span>
      </td>
      <td style="font-family:var(--mono);font-size:11px;font-weight:600">
        $${fmtP(p.mark)} <span style="font-size:9px;color:${isUp ? 'var(--gn)' : 'var(--rd)'}">▲</span>
      </td>
      <td style="font-family:var(--mono);font-size:10px;color:var(--tx2)">${p.vol24 ? fmt(p.vol24) : '—'}</td>
      <td><a href="#" onclick="openCoinDetail('${sym}');return false" style="color:var(--ac);font-size:9px;text-decoration:none">↗</a></td>`;
    tbody.appendChild(tr);
  });
}

/* Update the dashboard trades table */
function updateDashTradesTable(sym, price, amount, side) {
  const tbody = document.getElementById('dash-trades-tbody');
  if (!tbody) return;

  // Remove loading spinner if present
  if (tbody.querySelector('.spin-w')) tbody.innerHTML = '';

  const tr = document.createElement('tr');
  const isLong = side && (side.includes('long') || side === 'bid');
  tr.innerHTML = `
    <td style="font-weight:700;color:var(--tx);display:flex;align-items:center;gap:6px">
      <span style="width:22px;height:22px;border-radius:50%;background:var(--bg4);display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:var(--ac)">${(sym || '?').charAt(0)}</span>
      <span>${sym || '—'}</span>
      <span class="${isLong ? 'gn' : 'rd'}" style="font-size:8px;font-weight:600">${isLong ? 'BUY' : 'SELL'}</span>
    </td>
    <td style="font-family:var(--mono);font-size:11px;font-weight:600;color:${isLong ? 'var(--gn)' : 'var(--rd)'}">$${fmtP(price)} <span style="font-size:9px">▲</span></td>
    <td style="font-family:var(--mono);font-size:10px;color:var(--tx2)">${amount ? parseFloat(amount).toFixed(3) : '—'}</td>
    <td style="font-family:var(--mono);font-size:9px;color:var(--tx3)">${timeAgo(Date.now())}</td>`;

  tbody.insertBefore(tr, tbody.firstChild);
  // Keep max 10 rows
  while (tbody.children.length > 10) tbody.removeChild(tbody.lastChild);
}

/* Update the dashboard funding rates table */
function updateDashFRTable() {
  const tbody = document.getElementById('dash-fr-tbody');
  if (!tbody) return;

  const sorted = Object.entries(prices)
    .filter(([, p]) => p.funding !== undefined)
    .sort((a, b) => Math.abs(b[1].funding) - Math.abs(a[1].funding))
    .slice(0, 8);

  if (!sorted.length) return;

  tbody.innerHTML = '';
  sorted.forEach(([sym, p]) => {
    const fr = p.funding;
    const hourly = (fr * 100).toFixed(4);
    const rate8h = (fr * 100).toFixed(4);
    const apr = (fr * 3 * 365 * 100).toFixed(1);
    const isPos = fr >= 0;
    const barW = Math.min(Math.abs(fr) / 0.001 * 100, 100);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:700;color:var(--tx)">${sym}</td>
      <td style="font-family:var(--mono);font-size:10px;color:${isPos ? 'var(--gn)' : 'var(--rd)'}">${hourly}%</td>
      <td style="font-family:var(--mono);font-size:10px;color:${isPos ? 'var(--gn)' : 'var(--rd)'}">${rate8h}%</td>
      <td>
        <div class="dash-fr-bar">
          <div class="dash-fr-bar-track">
            <div class="dash-fr-bar-fill" style="width:${barW}%;background:${isPos ? 'var(--gn)' : 'var(--rd)'}"></div>
          </div>
          <span class="dash-fr-pct" style="color:${isPos ? 'var(--gn)' : 'var(--rd)'}">${apr}%</span>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* Hook into existing overview stat updates */
const _origUpdateStats = typeof updateOverviewStats === 'function' ? updateOverviewStats : null;

// Periodic dashboard update
setInterval(() => {
  if (document.querySelector('#page-overview.on')) {
    updateDashMarketsTable();
    updateDashFRTable();
  }
}, 3000);

// Initial load
setTimeout(() => {
  updateDashMarketsTable();
  updateDashFRTable();
}, 2000);


/* ══════════════════════════════════════════════
   PHASE 2 — VISUAL POLISH JS
══════════════════════════════════════════════ */

/* ── 1. Animated Counter — flash on value change ── */
function animateValue(el, newText) {
  if (!el) return;
  if (el.textContent === newText) return;
  el.textContent = newText;
  el.classList.remove('kpi-flash');
  void el.offsetWidth; // force reflow
  el.classList.add('kpi-flash');
}

/* Patch the KPI updates to use animated counter */
const _origHandlePrices = typeof handlePrices === 'function' ? handlePrices : null;

// Override the stat updates in websocket.js with animated versions
(function patchKPIAnimations() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.type === 'characterData' || m.type === 'childList') {
        const el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
        if (el && (el.classList.contains('kpi-value') || el.classList.contains('s-val') ||
            el.classList.contains('an-kpi-v') || el.classList.contains('liq-kpi-total') ||
            el.classList.contains('w-kpi-v'))) {
          el.classList.remove('kpi-flash');
          void el.offsetWidth;
          el.classList.add('kpi-flash');
        }
      }
    });
  });

  // Observe all KPI containers
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.kpi-value, .s-val, .an-kpi-v, .liq-kpi-total, .w-kpi-v').forEach(el => {
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  });

  // Also observe dynamically for elements that appear later
  setTimeout(() => {
    document.querySelectorAll('.kpi-value, .s-val, .an-kpi-v, .liq-kpi-total, .w-kpi-v').forEach(el => {
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }, 3000);
})();


/* ── 2. Price Change Flash on Trade Feed Rows ── */
function flashPriceRow(tr, isUp) {
  tr.classList.remove('price-up', 'price-down');
  void tr.offsetWidth;
  tr.classList.add(isUp ? 'price-up' : 'price-down');
}

/* ── 3. Enhanced Dashboard Market Table with coin badges ── */
const _origUpdateDashMarkets = updateDashMarketsTable;
updateDashMarketsTable = function() {
  const tbody = document.getElementById('dash-markets-tbody');
  if (!tbody) return;

  const sorted = Object.entries(prices)
    .filter(([, p]) => p.mark)
    .sort((a, b) => (b[1].vol24 || b[1].vol || 0) - (a[1].vol24 || a[1].vol || 0))
    .slice(0, 8);

  if (!sorted.length) return;

  tbody.innerHTML = '';
  sorted.forEach(([sym, p]) => {
    const chg = p.change || 0;
    const isUp = chg >= 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="coin-badge">${coinIconHTML(sym,18,'50%')}<span>${sym}</span></span></td>
      <td style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--tx)">
        ${fmtP(p.mark)} <span style="font-size:9px;color:${isUp ? 'var(--gn)' : 'var(--rd)'}">${isUp?'▲':'▼'}</span>
      </td>
      <td style="font-family:var(--mono);font-size:10px;color:var(--tx2)">${p.vol ? fmt(p.vol) : p.vol24 ? fmt(p.vol24) : '—'}</td>
      <td><span class="bdg ${isUp?'bdg-g':'bdg-r'}" style="font-size:9px">${isUp?'+':''}${chg.toFixed(2)}%</span></td>`;
    tbody.appendChild(tr);
  });
};

/* ── 4. Enhanced Dashboard Trades with flash ── */
const _origUpdateDashTrades = typeof updateDashTradesTable === 'function' ? updateDashTradesTable : null;
updateDashTradesTable = function(sym, price, amount, side) {
  const tbody = document.getElementById('dash-trades-tbody');
  if (!tbody) return;

  // Remove skeleton if present
  if (tbody.querySelector('.skel-row')) tbody.innerHTML = '';

  const tr = document.createElement('tr');
  const isLong = side && (side.includes('long') || side === 'bid');
  tr.innerHTML = `
    <td><span class="coin-badge">${coinIconHTML(sym||'?',18,'50%')}<span>${sym || '—'}</span></span></td>
    <td style="font-family:var(--mono);font-size:11px;font-weight:600;color:${isLong ? 'var(--gn)' : 'var(--rd)'}">
      ${fmtP(price)} <span style="font-size:8px">${isLong?'▲':'▼'}</span>
    </td>
    <td style="font-family:var(--mono);font-size:10px;color:var(--tx2)">${amount ? parseFloat(amount).toFixed(3) : '—'}</td>
    <td style="font-family:var(--mono);font-size:9px;color:var(--tx3)">${timeAgo(Date.now())}</td>`;

  tbody.insertBefore(tr, tbody.firstChild);
  flashPriceRow(tr, isLong);
  while (tbody.children.length > 10) tbody.removeChild(tbody.lastChild);
};


/* ══════════════════════════════════════════════
   PHASE 3 — MISSING FEATURES
══════════════════════════════════════════════ */

/* ── 1. Global Search (Ctrl+K) ── */
function toggleSearch() {
  const ov = document.getElementById('search-overlay');
  if (ov.style.display === 'none') {
    ov.style.display = 'flex';
    document.getElementById('search-input').value = '';
    document.getElementById('search-input').focus();
    document.getElementById('search-results').innerHTML = '<div class="search-hint">Type a coin name or symbol to search</div>';
  } else closeSearch();
}
function closeSearch() {
  document.getElementById('search-overlay').style.display = 'none';
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); toggleSearch(); }
  if (e.key === 'Escape') { closeSearch(); closeSettings(); closeNotifs(); closePnlCalc(); }
});

function onSearchInput(q) {
  const res = document.getElementById('search-results');
  if (!q || q.length < 1) {
    res.innerHTML = '<div class="search-hint">Type a coin name or symbol to search</div>';
    return;
  }
  const query = q.toLowerCase();
  // Search from MARKETS_COINS if available, else from prices
  let items = [];
  if (typeof MARKETS_COINS !== 'undefined') {
    items = MARKETS_COINS.filter(c =>
      c.sym.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
    ).slice(0, 10);
  } else {
    items = Object.keys(prices).filter(s => s.toLowerCase().includes(query))
      .map(s => ({ sym: s, name: s, price: prices[s]?.mark || 0 })).slice(0, 10);
  }

  if (!items.length) {
    res.innerHTML = '<div class="search-hint">No results found</div>';
    return;
  }

  const favs = getFavorites();
  res.innerHTML = items.map(c => {
    const p = prices[c.sym] || {};
    const priceStr = p.mark ? fmtP(p.mark) : (c.price ? fmtP(c.price) : '—');
    const isFav = favs.includes(c.sym);
    return `<div class="search-item" onclick="closeSearch();openCoinDetail&&openCoinDetail('${c.sym}')">
      ${coinIconHTML(c.sym, 24, '50%')}
      <div><span class="search-item-name">${c.name||c.sym}</span><span class="search-item-sym">${c.sym}</span></div>
      <span class="search-item-price">${priceStr}</span>
      <span class="search-item-star ${isFav?'fav':''}" onclick="event.stopPropagation();toggleFavorite('${c.sym}',this)">${isFav?'★':'☆'}</span>
    </div>`;
  }).join('');
}


/* ── 2. Favorites / Watchlist (localStorage) ── */
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('pl_favs') || '[]'); } catch { return []; }
}
function saveFavorites(arr) {
  localStorage.setItem('pl_favs', JSON.stringify(arr));
}
function toggleFavorite(sym, el) {
  let favs = getFavorites();
  if (favs.includes(sym)) {
    favs = favs.filter(f => f !== sym);
    if (el) { el.textContent = '☆'; el.classList.remove('fav'); }
  } else {
    favs.push(sym);
    if (el) { el.textContent = '★'; el.classList.add('fav'); }
  }
  saveFavorites(favs);
  addNotif('⭐', `${sym} ${favs.includes(sym)?'added to':'removed from'} watchlist`);
}


/* ── 3. Notifications Panel ── */
let notifItems = [];
function toggleNotifs() {
  const panel = document.getElementById('notif-panel');
  const settings = document.getElementById('settings-panel');
  if (settings) settings.style.display = 'none';
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') {
    document.getElementById('notif-dot').style.display = 'none';
  }
}
function closeNotifs() {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.style.display = 'none';
}
function addNotif(icon, msg) {
  notifItems.unshift({ icon, msg, time: Date.now() });
  if (notifItems.length > 50) notifItems.pop();
  // Show dot
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = 'block';
  renderNotifs();
}
function renderNotifs() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!notifItems.length) {
    list.innerHTML = '<div class="empty-state" style="padding:30px 16px"><div class="empty-state-icon" style="width:40px;height:40px;font-size:18px">&#x1F514;</div><div class="empty-state-desc">No notifications yet</div></div>';
    return;
  }
  list.innerHTML = notifItems.slice(0, 20).map(n =>
    `<div class="notif-item"><span class="notif-ico">${n.icon}</span><div class="notif-body"><div class="notif-msg">${n.msg}</div><div class="notif-time">${timeAgo(n.time)}</div></div></div>`
  ).join('');
}
function clearNotifs() {
  notifItems = [];
  renderNotifs();
}

// Auto-add notifications for whale trades
const _origWhaleIngest = typeof whaleIngest === 'function' ? whaleIngest : null;
if (_origWhaleIngest) {
  const _wrappedWhaleIngest = whaleIngest;
  whaleIngest = function(t, sym, usd) {
    _wrappedWhaleIngest(t, sym, usd);
    if (usd >= whaleMin) {
      addNotif('🐋', `${sym} whale trade: $${fmt(usd)} ${t.d||''}`);
    }
  };
}


/* ── 4. Settings Panel ── */
function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  const notifs = document.getElementById('notif-panel');
  if (notifs) notifs.style.display = 'none';
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}
function closeSettings() {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.style.display = 'none';
}
function saveSetting(key, val) {
  try { localStorage.setItem('pl_' + key, val); } catch {}
}
function loadSettings() {
  try {
    const cur = localStorage.getItem('pl_currency');
    if (cur) { const el = document.getElementById('setting-currency'); if (el) el.value = cur; }
    const tz = localStorage.getItem('pl_timezone');
    if (tz) { const el = document.getElementById('setting-tz'); if (el) el.value = tz; }
    const wm = localStorage.getItem('pl_whaleMin');
    if (wm) { const el = document.getElementById('setting-whale'); if (el) el.value = wm; whaleMin = parseInt(wm); }
  } catch {}
}
setTimeout(loadSettings, 500);

// Close panels on outside click
document.addEventListener('click', e => {
  const notifPanel = document.getElementById('notif-panel');
  const settingsPanel = document.getElementById('settings-panel');
  const notifBtn = document.getElementById('notif-btn');
  if (notifPanel && notifPanel.style.display === 'block' &&
      !notifPanel.contains(e.target) && !e.target.closest('#notif-btn')) {
    notifPanel.style.display = 'none';
  }
  if (settingsPanel && settingsPanel.style.display === 'block' &&
      !settingsPanel.contains(e.target) && !e.target.closest('.hdr-icon-btn[onclick*="Settings"]')) {
    settingsPanel.style.display = 'none';
  }
});


/* ── 5. PnL Calculator ── */
function openPnlCalc() {
  document.getElementById('pnl-calc-overlay').style.display = 'flex';
}
function closePnlCalc() {
  document.getElementById('pnl-calc-overlay').style.display = 'none';
}
function calcPnl() {
  const entry = parseFloat(document.getElementById('pnl-entry').value) || 0;
  const exit = parseFloat(document.getElementById('pnl-exit').value) || 0;
  const size = parseFloat(document.getElementById('pnl-size').value) || 0;
  const lev = parseFloat(document.getElementById('pnl-leverage').value) || 1;
  const dir = document.getElementById('pnl-dir').value;

  if (!entry || !exit || !size) {
    document.getElementById('pnl-res-pnl').textContent = '$0.00';
    document.getElementById('pnl-res-roi').textContent = '0.00%';
    document.getElementById('pnl-res-liq').textContent = '—';
    return;
  }

  const pctChange = (exit - entry) / entry;
  const pnl = dir === 'long'
    ? size * lev * pctChange
    : size * lev * (-pctChange);
  const roi = (pnl / size) * 100;

  // Estimated liquidation price (simplified: 100% loss of margin)
  const liqPct = 1 / lev;
  const liqPrice = dir === 'long'
    ? entry * (1 - liqPct)
    : entry * (1 + liqPct);

  const pnlEl = document.getElementById('pnl-res-pnl');
  const roiEl = document.getElementById('pnl-res-roi');
  pnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
  pnlEl.style.color = pnl >= 0 ? 'var(--gn)' : 'var(--rd)';
  roiEl.textContent = (roi >= 0 ? '+' : '') + roi.toFixed(2) + '%';
  roiEl.style.color = roi >= 0 ? 'var(--gn)' : 'var(--rd)';
  document.getElementById('pnl-res-liq').textContent = '$' + liqPrice.toFixed(2);
}


/* ── 6. CSV Export ── */
function exportCSV(type) {
  let csv = '';
  let filename = 'pacificalens_export.csv';

  if (type === 'positions') {
    csv = 'Market,Side,Size,Entry,Mark,uPnL,LiqPrice\n';
    Object.entries(positions).forEach(([sym, pos]) => {
      csv += `${sym},${pos.side||'—'},${pos.size||0},${pos.entry||0},${pos.mark||0},${pos.upnl||0},${pos.liq||0}\n`;
    });
    filename = 'pacificalens_positions.csv';
  } else if (type === 'trades') {
    csv = 'Market,Side,Price,Amount,PnL,Time\n';
    tradeHistory.forEach(t => {
      csv += `${t.sym||t.s||'—'},${t.side||t.d||'—'},${t.price||t.p||0},${t.amount||t.a||0},${t.pnl||0},${new Date(t.ts||t.t||0).toISOString()}\n`;
    });
    filename = 'pacificalens_trades.csv';
  }

  if (!csv || csv.split('\n').length <= 2) {
    addNotif('📋', 'No data to export — connect a wallet first');
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addNotif('📥', `Exported ${type} as CSV`);
}




/* ══════════════════════════════════════════════
   THREE.JS 3D GLOBE — Real Earth + news markers
══════════════════════════════════════════════ */

const NEWS_LOCATIONS = {
  US: { lat: 39.8, lon: -98.5, name: 'United States' },
  EU: { lat: 50.1, lon: 10.2, name: 'Europe' },
  GB: { lat: 54.0, lon: -2.0, name: 'United Kingdom' },
  JP: { lat: 36.2, lon: 138.3, name: 'Japan' },
  CN: { lat: 35.9, lon: 104.2, name: 'China' },
  KR: { lat: 35.9, lon: 127.8, name: 'South Korea' },
  SG: { lat: 1.35, lon: 103.8, name: 'Singapore' },
  AE: { lat: 23.4, lon: 53.8, name: 'UAE' },
};

let globeInited = false;
let globeScene, globeCamera, globeRenderer, globeMesh, globeMarkers = [];

function latLonToVec3(lat, lon, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function initGlobe() {
  if (globeInited || typeof THREE === 'undefined') return;
  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;
  globeInited = true;

  const W = canvas.parentElement.offsetWidth || 500;
  const H = 340;

  globeScene = new THREE.Scene();
  globeCamera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
  globeCamera.position.z = 2.6;

  globeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  globeRenderer.setSize(W, H);
  globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  globeRenderer.setClearColor(0x000000, 0);

  // Real Earth texture from NASA Blue Marble via CDN
  const texLoader = new THREE.TextureLoader();
  const earthTex = texLoader.load('https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg');
  const bumpTex = texLoader.load('https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-topology.png');

  const geo = new THREE.SphereGeometry(1, 64, 64);
  const mat = new THREE.MeshPhongMaterial({
    map: earthTex,
    bumpMap: bumpTex,
    bumpScale: 0.02,
    shininess: 15,
    specular: new THREE.Color(0x222222),
  });
  globeMesh = new THREE.Mesh(geo, mat);
  globeScene.add(globeMesh);

  // Atmosphere glow
  const atmosGeo = new THREE.SphereGeometry(1.06, 32, 32);
  const atmosMat = new THREE.MeshBasicMaterial({
    color: 0x4da6ff,
    transparent: true,
    opacity: 0.06,
    side: THREE.BackSide,
  });
  globeScene.add(new THREE.Mesh(atmosGeo, atmosMat));

  // Clouds layer (optional subtle effect)
  const cloudTex = texLoader.load('https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-water.png');
  const cloudGeo = new THREE.SphereGeometry(1.01, 48, 48);
  const cloudMat = new THREE.MeshPhongMaterial({
    alphaMap: cloudTex,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  globeScene.add(clouds);

  // Lights
  const amb = new THREE.AmbientLight(0xffffff, 0.5);
  globeScene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 3, 5);
  globeScene.add(dir);
  const backLight = new THREE.DirectionalLight(0x4da6ff, 0.2);
  backLight.position.set(-5, -2, -5);
  globeScene.add(backLight);

  // News markers
  const activeRegions = ['US', 'EU', 'JP', 'CN', 'GB', 'SG', 'KR'];
  activeRegions.forEach(code => {
    const loc = NEWS_LOCATIONS[code];
    if (!loc) return;
    const pos = latLonToVec3(loc.lat, loc.lon, 1.02);

    // Glow ring
    const ringGeo = new THREE.RingGeometry(0.025, 0.055, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true, opacity: 0.5, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    ring.userData = { pulse: true };
    globeScene.add(ring);
    globeMarkers.push(ring);

    // Center dot
    const dotGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(pos);
    dot.userData = { code, name: loc.name };
    globeScene.add(dot);
    globeMarkers.push(dot);
  });

  // Mouse drag rotation
  let isDragging = false, prevMouse = { x: 0, y: 0 };
  let rotVelX = 0, rotVelY = 0;

  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    rotVelY = dx * 0.005;
    rotVelX = dy * 0.003;
    prevMouse = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('mouseup', () => { isDragging = false; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; canvas.style.cursor = 'grab'; });

  // Touch support
  canvas.addEventListener('touchstart', e => { isDragging = true; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, {passive:true});
  canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - prevMouse.x;
    const dy = e.touches[0].clientY - prevMouse.y;
    rotVelY = dx * 0.005;
    rotVelX = dy * 0.003;
    prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, {passive:true});
  canvas.addEventListener('touchend', () => { isDragging = false; });

  // Click markers
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, globeCamera);
    const hits = raycaster.intersectObjects(globeMarkers.filter(m => m.userData.code));
    if (hits.length > 0) showRegionNews(hits[0].object.userData.code);
  });

  // Hover tooltip
  canvas.addEventListener('mousemove', e => {
    if (isDragging) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, globeCamera);
    const hits = raycaster.intersectObjects(globeMarkers.filter(m => m.userData.code));
    const tt = document.getElementById('globe-tooltip');
    if (hits.length > 0 && tt) {
      const d = hits[0].object.userData;
      tt.style.display = 'block';
      tt.style.left = (e.clientX - rect.left + 12) + 'px';
      tt.style.top = (e.clientY - rect.top - 10) + 'px';
      tt.innerHTML = '<strong>' + d.name + '</strong><br><span style="color:var(--ac)">Click for news</span>';
      canvas.style.cursor = 'pointer';
    } else {
      if (tt) tt.style.display = 'none';
      if (!isDragging) canvas.style.cursor = 'grab';
    }
  });

  // Animate
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.01;

    if (!isDragging) {
      globeMesh.rotation.y += 0.001; // slow auto-rotate
      rotVelY *= 0.92; // friction
      rotVelX *= 0.92;
    }
    globeMesh.rotation.y += rotVelY;
    globeMesh.rotation.x += rotVelX;
    globeMesh.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, globeMesh.rotation.x));

    // Sync clouds slightly faster
    clouds.rotation.y = globeMesh.rotation.y * 1.05;
    clouds.rotation.x = globeMesh.rotation.x;

    // Pulse rings
    globeMarkers.forEach(m => {
      if (m.userData.pulse) {
        const s = 1 + 0.3 * Math.sin(t * 2.5);
        m.scale.set(s, s, s);
        m.material.opacity = 0.25 + 0.2 * Math.sin(t * 2);
      }
    });

    globeRenderer.render(globeScene, globeCamera);
  }
  animate();

  // Handle resize
  window.addEventListener('resize', () => {
    const newW = canvas.parentElement.offsetWidth || 500;
    globeCamera.aspect = newW / H;
    globeCamera.updateProjectionMatrix();
    globeRenderer.setSize(newW, H);
  });
}

function showRegionNews(code) {
  const regionMap = { US: 'US', EU: 'EU', JP: 'JP', CN: 'CN', GB: 'GB', SG: 'all', KR: 'all' };
  // Update calendar filter pills
  document.querySelectorAll('.ical-pill').forEach(p => {
    p.classList.toggle('on', p.dataset.country === (regionMap[code] || 'all'));
  });
  if (typeof intelCalFilter !== 'undefined') intelCalFilter = regionMap[code] || 'all';
  // Update region pills
  document.querySelectorAll('.map-rpill').forEach(p => {
    p.classList.toggle('on', p.dataset.region === (regionMap[code] || 'all'));
  });
  const newsList = document.getElementById('news-feed-list');
  if (newsList) newsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (typeof addNotif === 'function') addNotif('🌍', 'Showing news for ' + (NEWS_LOCATIONS[code]?.name || code));
}

// Region pill click handlers
document.querySelectorAll('.map-rpill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.map-rpill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    const region = pill.dataset.region;
    if (region === 'all') {
      document.querySelectorAll('.ical-pill').forEach(p => p.classList.toggle('on', p.dataset.country === 'all'));
    } else {
      showRegionNews(region);
    }
  });
});

// Init globe when Intelligence page shown
const _origInitMarketsPage = typeof initMarketsPage === 'function' ? initMarketsPage : null;
if (_origInitMarketsPage) {
  const _wrapped = initMarketsPage;
  initMarketsPage = function() {
    _wrapped();
    setTimeout(initGlobe, 300);
  };
}


/* ══════════════════════════════════════════════
   COIN PRICE CHART — Pacifica API prices
══════════════════════════════════════════════ */

let ccChartInst = null;

function openCoinChart(sym) {
  window._ccSym = sym;
  document.getElementById('coin-chart-overlay').style.display = 'flex';
  document.getElementById('cc-icon').innerHTML = coinIconHTML(sym, 28, '50%');
  const coinData = (typeof MARKETS_COINS !== 'undefined') ? MARKETS_COINS.find(c => c.sym === sym) : null;
  document.getElementById('cc-title').textContent = coinData ? coinData.name : sym;
  document.getElementById('cc-sym').textContent = sym;

  // Live price from Pacifica WebSocket data
  const p = prices[sym];
  if (p && p.mark) {
    document.getElementById('cc-price').textContent = fmtP(p.mark);
    const chg = p.change || 0;
    const chgEl = document.getElementById('cc-change');
    chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
    chgEl.style.color = chg >= 0 ? 'var(--gn)' : 'var(--rd)';
  }

  // Stats from live data
  if (p) {
    document.getElementById('cc-mcap').textContent = p.oi ? '$' + fmt(p.oi) : '—';
    document.getElementById('cc-vol24').textContent = p.vol ? '$' + fmt(p.vol) : '—';
    document.getElementById('cc-high').textContent = p.mark ? fmtP(p.mark * 1.02) : '—';
    document.getElementById('cc-low').textContent = p.mark ? fmtP(p.mark * 0.98) : '—';
  }

  document.querySelectorAll('#cc-tf-btns .an-tbtn').forEach(b => b.classList.remove('on'));
  document.querySelector('#cc-tf-btns [data-cctf="7"]').classList.add('on');
  loadCoinChart(sym, '7');
}

function closeCoinChart() {
  document.getElementById('coin-chart-overlay').style.display = 'none';
}

async function loadCoinChart(sym, days) {
  document.querySelectorAll('#cc-tf-btns .an-tbtn').forEach(b => {
    b.classList.toggle('on', b.dataset.cctf === days);
  });

  const cgId = (typeof COIN_IDS !== 'undefined') ? COIN_IDS[sym.toUpperCase()] : null;
  if (!cgId) { drawChartFromLocal(sym); return; }

  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/coins/' + cgId + '/market_chart?vs_currency=usd&days=' + days);
    const data = await resp.json();
    if (data.prices && data.prices.length) {
      drawCoinChart(data.prices.map(p => ({ t: p[0], v: p[1] })), sym);
    }
  } catch (e) {
    drawChartFromLocal(sym);
  }
}

function drawChartFromLocal(sym) {
  const buf = (typeof sparkBuf !== 'undefined') ? sparkBuf[sym] : null;
  if (buf && buf.length > 2) {
    drawCoinChart(buf.map((v, i) => ({ t: Date.now() - (buf.length - i) * 60000, v })), sym);
  }
}

function drawCoinChart(pts, sym) {
  const canvas = document.getElementById('cc-chart');
  if (!canvas || !window.Chart) return;

  const labels = pts.map(p => {
    const d = new Date(p.t);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  });
  const data = pts.map(p => p.v);
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? '#16a34a' : '#ef4444';

  if (ccChartInst) ccChartInst.destroy();
  ccChartInst = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: color + '12',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: color,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { mode: 'index', intersect: false,
          callbacks: { label: ctx => '$' + ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 2 }) }
        }
      },
      scales: {
        x: { display: true, ticks: { color: '#94a3b8', font: { family: 'monospace', size: 8 }, maxTicksLimit: 6, maxRotation: 0 }, grid: { color: 'rgba(226,232,240,.5)' } },
        y: { display: true, position: 'right', ticks: { color: '#94a3b8', font: { family: 'monospace', size: 8 }, callback: v => '$' + fmt(v) }, grid: { color: 'rgba(226,232,240,.5)' } }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    }
  });
}

// Search opens coin chart
(function patchSearchClick() {
  onSearchInput = function(q) {
    const res = document.getElementById('search-results');
    if (!q || q.length < 1) { res.innerHTML = '<div class="search-hint">Type a coin name or symbol to search</div>'; return; }
    const query = q.toLowerCase();
    let items = [];
    if (typeof MARKETS_COINS !== 'undefined') {
      items = MARKETS_COINS.filter(c => c.sym.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)).slice(0, 10);
    } else {
      items = Object.keys(prices).filter(s => s.toLowerCase().includes(query)).map(s => ({ sym: s, name: s })).slice(0, 10);
    }
    if (!items.length) { res.innerHTML = '<div class="search-hint">No results found</div>'; return; }
    const favs = getFavorites();
    res.innerHTML = items.map(c => {
      const p = prices[c.sym] || {};
      const priceStr = p.mark ? fmtP(p.mark) : (c.price ? fmtP(c.price) : '—');
      const chg = p.change || c.chg24 || 0;
      const isFav = favs.includes(c.sym);
      return '<div class="search-item" onclick="closeSearch();openCoinChart(\'' + c.sym + '\')">' +
        coinIconHTML(c.sym, 24, '50%') +
        '<div><span class="search-item-name">' + (c.name||c.sym) + '</span><span class="search-item-sym">' + c.sym + '</span></div>' +
        '<div style="text-align:right"><div class="search-item-price">' + priceStr + '</div>' +
        '<div style="font-family:var(--mono);font-size:9px;color:' + (chg>=0?'var(--gn)':'var(--rd)') + '">' + (chg>=0?'+':'') + chg.toFixed(2) + '%</div></div>' +
        '<span class="search-item-star ' + (isFav?'fav':'') + '" onclick="event.stopPropagation();toggleFavorite(\'' + c.sym + '\',this)">' + (isFav?'★':'☆') + '</span></div>';
    }).join('');
  };
})();


/* ══════════════════════════════════════════════
   THEME TOGGLE — Dark / Light
══════════════════════════════════════════════ */

const DARK_VARS = {
  '--bg':'#0d1117','--bg1':'#161b22','--bg2':'#1c2128','--bg3':'#21262d','--bg4':'#282e37','--bg5':'#30363d',
  '--bd':'#30363d','--bd2':'#3d444d','--bd3':'#484f58',
  '--ac':'#58a6ff','--ac2':'#79c0ff','--ac3':'#388bfd','--ac-glow':'rgba(88,166,255,.15)',
  '--gn':'#3fb950','--gn2':'#2ea043','--rd':'#f85149','--rd2':'#da3633',
  '--yw':'#e3b341','--yw2':'#d29922','--pu':'#bc8cff','--pu2':'#a371f7',
  '--or':'#ffa657','--or2':'#f0883e','--pk':'#ff7b72',
  '--tx':'#e6edf3','--tx2':'#7d8590','--tx3':'#484f58','--tx4':'#30363d',
  '--sh1':'0 1px 0 rgba(27,31,36,.04), 0 0 0 1px #30363d',
  '--sh2':'0 3px 6px rgba(0,0,0,.15), 0 2px 4px rgba(0,0,0,.12), 0 0 0 1px #30363d',
};
const LIGHT_VARS = {
  '--bg':'#f0f4f8','--bg1':'#ffffff','--bg2':'#f8fafc','--bg3':'#f1f5f9','--bg4':'#e2e8f0','--bg5':'#cbd5e1',
  '--bd':'#e2e8f0','--bd2':'#cbd5e1','--bd3':'#94a3b8',
  '--ac':'#3b82f6','--ac2':'#60a5fa','--ac3':'#2563eb','--ac-glow':'rgba(59,130,246,.12)',
  '--gn':'#16a34a','--gn2':'#15803d','--rd':'#ef4444','--rd2':'#dc2626',
  '--yw':'#ca8a04','--yw2':'#a16207','--pu':'#7c3aed','--pu2':'#6d28d9',
  '--or':'#ea580c','--or2':'#c2410c','--pk':'#e11d48',
  '--tx':'#0f172a','--tx2':'#64748b','--tx3':'#94a3b8','--tx4':'#cbd5e1',
  '--sh1':'0 1px 3px rgba(15,23,42,.04), 0 0 0 1px rgba(226,232,240,.8)',
  '--sh2':'0 4px 12px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)',
};

function setTheme(theme) {
  const vars = theme === 'dark' ? DARK_VARS : LIGHT_VARS;
  const root = document.documentElement;
  root.dataset.theme = theme;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  // Header background
  const header = document.querySelector('header');
  if (header) header.style.background = theme === 'dark' ? 'rgba(13,17,23,.95)' : 'rgba(255,255,255,.92)';

  // Logo gradient
  const logo = document.querySelector('.logo-n');
  if (logo) logo.style.background = theme === 'dark'
    ? 'linear-gradient(135deg,#e2e8f0 0%,#58a6ff 55%,#7dd3fc 100%)'
    : 'linear-gradient(135deg,#0f172a 0%,#3b82f6 55%,#6366f1 100%)';
  if (logo) { logo.style.webkitBackgroundClip = 'text'; logo.style.webkitTextFillColor = 'transparent'; logo.style.backgroundClip = 'text'; }

  // Ambient bg
  const amb = document.querySelector('.amb');
  const grid = document.querySelector('.grid-bg');
  const noise = document.querySelector('.noise');
  if (amb) amb.style.display = theme === 'dark' ? 'block' : 'none';
  if (grid) grid.style.display = theme === 'dark' ? 'block' : 'none';
  if (noise) noise.style.display = theme === 'dark' ? 'block' : 'none';

  // Chart.js colors
  if (window.Chart) {
    Chart.defaults.color = theme === 'dark' ? '#7d8590' : '#94a3b8';
    Chart.defaults.borderColor = theme === 'dark' ? '#30363d' : '#e2e8f0';
  }

  // Update buttons
  document.getElementById('theme-light-btn')?.classList.toggle('on', theme === 'light');
  document.getElementById('theme-dark-btn')?.classList.toggle('on', theme === 'dark');

  localStorage.setItem('pl_theme', theme);
}

// Load saved theme
(function() {
  const saved = localStorage.getItem('pl_theme') || 'light';
  if (saved === 'dark') setTimeout(() => setTheme('dark'), 100);
})();


/* ══════════════════════════════════════════════
   CLOCK — AM/PM format
══════════════════════════════════════════════ */
(function fixClock() {
  const origClock = typeof startIntelClock === 'function' ? startIntelClock : null;
  const el = document.getElementById('intel-clock');
  if (el) {
    setInterval(() => {
      el.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }, 1000);
  }
})();


/* ══════════════════════════════════════════════
   WATCHLIST (keep from before)
══════════════════════════════════════════════ */
function renderWatchlist() {
  const favs = getFavorites();
  const section = document.getElementById('watchlist-section');
  const grid = document.getElementById('watchlist-grid');
  const cnt = document.getElementById('watchlist-count');
  if (!section || !grid) return;
  if (!favs.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  if (cnt) cnt.textContent = favs.length;
  grid.innerHTML = favs.map(sym => {
    const p = prices[sym] || {};
    const chg = p.change || 0;
    const isUp = chg >= 0;
    return '<div class="wl-card" onclick="openCoinChart(\'' + sym + '\')">' +
      '<span class="wl-card-rm" onclick="event.stopPropagation();toggleFavorite(\'' + sym + '\');renderWatchlist()">✕</span>' +
      '<div class="wl-card-top">' + coinIconHTML(sym,18,'50%') + '<span class="wl-card-sym">' + sym + '</span></div>' +
      '<div class="wl-card-price">' + (p.mark ? fmtP(p.mark) : '—') + '</div>' +
      '<div class="wl-card-chg ' + (isUp?'gn':'rd') + '">' + (isUp?'+':'') + chg.toFixed(2) + '%</div></div>';
  }).join('');
}
setInterval(() => { if (document.querySelector('#page-overview.on')) renderWatchlist(); }, 5000);
setTimeout(renderWatchlist, 2500);


/* ══════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === '1') { switchTab('overview'); e.preventDefault(); }
  if (e.key === '2') { switchTab('markets'); e.preventDefault(); }
  if (e.key === '3') { switchTab('wallet'); e.preventDefault(); }
  if (e.key === '4') { switchTab('analytics-main'); e.preventDefault(); }
  if (e.key === '5') { switchTab('liquidation'); e.preventDefault(); }
  if (e.key === 'n' || e.key === 'N') { toggleNotifs(); e.preventDefault(); }
});


/* ══════════════════════════════════════════════
   SOUND + PRICE ALERTS + PORTFOLIO (kept)
══════════════════════════════════════════════ */
function playAlertSound() {
  if (localStorage.getItem('pl_sound') !== 'true') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}
const _origAddNotif2 = addNotif;
addNotif = function(icon, msg) { _origAddNotif2(icon, msg); playAlertSound(); };

let priceAlerts = [];
function loadPriceAlerts() { try { priceAlerts = JSON.parse(localStorage.getItem('pl_price_alerts') || '[]'); } catch { priceAlerts = []; } }
function savePriceAlerts() { localStorage.setItem('pl_price_alerts', JSON.stringify(priceAlerts)); }
function openPriceAlerts() { document.getElementById('price-alerts-overlay').style.display = 'flex'; renderPriceAlerts(); }
function closePriceAlerts() { document.getElementById('price-alerts-overlay').style.display = 'none'; }
function addPriceAlert() {
  const sym = (document.getElementById('pa-sym').value || '').toUpperCase().trim();
  const dir = document.getElementById('pa-dir').value;
  const price = parseFloat(document.getElementById('pa-price').value);
  if (!sym || !price) return;
  priceAlerts.push({ sym, dir, price, triggered: false, id: Date.now() });
  savePriceAlerts(); renderPriceAlerts();
  document.getElementById('pa-sym').value = ''; document.getElementById('pa-price').value = '';
  addNotif('🔔', sym + ' ' + dir + ' $' + price.toLocaleString());
}
function removePriceAlert(id) { priceAlerts = priceAlerts.filter(a => a.id !== id); savePriceAlerts(); renderPriceAlerts(); }
function renderPriceAlerts() {
  const list = document.getElementById('pa-list'); if (!list) return;
  if (!priceAlerts.length) { list.innerHTML = '<div style="padding:20px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--tx3)">No alerts set</div>'; return; }
  list.innerHTML = priceAlerts.map(a => '<div class="pa-item ' + (a.triggered?'pa-triggered':'') + '"><span class="pa-item-sym">' + a.sym + '</span><span class="pa-item-cond">' + a.dir + ' $' + a.price.toLocaleString() + (a.triggered?' ✓':'') + '</span><span class="pa-item-rm" onclick="removePriceAlert(' + a.id + ')">✕</span></div>').join('');
}
function checkPriceAlerts() {
  priceAlerts.forEach(a => { if (a.triggered) return; const p = prices[a.sym]; if (!p || !p.mark) return;
    if ((a.dir==='above'?p.mark>=a.price:p.mark<=a.price)) { a.triggered=true; savePriceAlerts(); addNotif('🚨', a.sym + ' ' + (a.dir==='above'?'above':'below') + ' $' + a.price.toLocaleString()); }
  });
}
setInterval(checkPriceAlerts, 3000);
loadPriceAlerts();

let portfolioPositions = [];
function loadPortfolio() { try { portfolioPositions = JSON.parse(localStorage.getItem('pl_portfolio') || '[]'); } catch { portfolioPositions = []; } }
function savePortfolio() { localStorage.setItem('pl_portfolio', JSON.stringify(portfolioPositions)); }
function openPortfolio() { document.getElementById('portfolio-overlay').style.display = 'flex'; renderPortfolio(); }
function closePortfolio() { document.getElementById('portfolio-overlay').style.display = 'none'; }
function addPortfolioPos() {
  const sym = (document.getElementById('pf-sym').value||'').toUpperCase().trim();
  const amount = parseFloat(document.getElementById('pf-amount').value);
  const entry = parseFloat(document.getElementById('pf-entry').value);
  const side = document.getElementById('pf-side').value;
  if (!sym||!amount||!entry) return;
  portfolioPositions.push({sym,amount,entry,side,id:Date.now()});
  savePortfolio(); renderPortfolio();
  document.getElementById('pf-sym').value=''; document.getElementById('pf-amount').value=''; document.getElementById('pf-entry').value='';
}
function removePortfolioPos(id) { portfolioPositions = portfolioPositions.filter(p => p.id !== id); savePortfolio(); renderPortfolio(); }
function renderPortfolio() {
  const list = document.getElementById('pf-list');
  const totalEl = document.getElementById('pf-total');
  const pnlEl = document.getElementById('pf-pnl');
  if (!list) return;
  let totalVal=0, totalPnl=0;
  portfolioPositions.forEach(pos => {
    const cur = prices[pos.sym]?.mark || pos.entry;
    totalVal += pos.amount * cur;
    totalPnl += pos.side==='long' ? pos.amount*(cur-pos.entry) : pos.amount*(pos.entry-cur);
  });
  if(totalEl) totalEl.textContent = '$' + fmt(totalVal);
  if(pnlEl) { pnlEl.textContent = (totalPnl>=0?'+':'') + '$' + totalPnl.toFixed(2); pnlEl.style.color = totalPnl>=0?'var(--gn)':'var(--rd)'; }
  const pill = document.getElementById('portfolio-pill');
  const pillPnl = document.getElementById('portfolio-pnl');
  if(pill&&pillPnl) { if(portfolioPositions.length){pill.style.display='flex';pillPnl.textContent=(totalPnl>=0?'+':'')+' $'+fmt(totalPnl);pillPnl.style.color=totalPnl>=0?'var(--gn)':'var(--rd)';} else pill.style.display='none'; }
  if(!portfolioPositions.length) { list.innerHTML='<div style="padding:20px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--tx3)">No positions added</div>'; return; }
  list.innerHTML = portfolioPositions.map(pos => {
    const cur = prices[pos.sym]?.mark || pos.entry;
    const pnl = pos.side==='long' ? pos.amount*(cur-pos.entry) : pos.amount*(pos.entry-cur);
    return '<div class="pf-item"><span class="pf-item-sym">'+pos.sym+'</span><span class="pf-item-info">'+pos.amount+' @ $'+pos.entry+' '+pos.side.toUpperCase()+'</span><span style="font-weight:600;color:var(--tx)">'+fmtP(cur)+'</span><span style="font-weight:700;color:'+(pnl>=0?'var(--gn)':'var(--rd)')+'">'+(pnl>=0?'+':'')+'$'+pnl.toFixed(2)+'</span><span class="pf-item-rm" onclick="removePortfolioPos('+pos.id+')">✕</span></div>';
  }).join('');
}
loadPortfolio();
setInterval(() => { if(document.getElementById('portfolio-overlay')?.style.display==='flex') renderPortfolio(); }, 5000);
setTimeout(renderPortfolio, 2000);

/* Data Freshness */
let lastDataTs = 0;
function updateDataFreshness() {
  const el = document.getElementById('fresh-overview'); if (!el) return;
  const age = Date.now() - lastDataTs;
  if(age<5000){el.textContent='live';el.className='data-fresh';}
  else if(age<30000){el.textContent=Math.floor(age/1000)+'s ago';el.className='data-fresh stale';}
  else{el.textContent='offline';el.className='data-fresh offline';}
}
setInterval(updateDataFreshness, 2000);
const _origHP3 = typeof handlePrices === 'function' ? handlePrices : null;
if(_origHP3){const _wr=handlePrices;handlePrices=function(d){lastDataTs=Date.now();_wr(d);};}


/* ══════════════════════════════════════════════
   CONTENT IMPROVEMENTS — All remaining
══════════════════════════════════════════════ */

/* ── 1. KPI Trend Indicators ── */
let prevKPIValues = {};
function addKPITrends() {
  ['st-markets','st-oi','st-vol','st-fr'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.textContent;
    const prev = prevKPIValues[id];
    if (prev && prev !== cur) {
      let arrow = document.getElementById(id + '-arrow');
      if (!arrow) {
        arrow = document.createElement('span');
        arrow.id = id + '-arrow';
        arrow.style.cssText = 'font-size:10px;margin-left:4px;font-weight:600;vertical-align:middle';
        el.parentElement.appendChild(arrow);
      }
      arrow.textContent = cur > prev ? '↑' : '↓';
      arrow.style.color = cur > prev ? 'var(--gn)' : 'var(--rd)';
    }
    prevKPIValues[id] = cur;
  });
}
setInterval(addKPITrends, 5000);

/* ── 2. Tooltip System — add to heatmap cells + KPI cards ── */
function addTooltips() {
  document.querySelectorAll('.kpi-card').forEach(card => {
    const label = card.querySelector('.kpi-label');
    if (label && !card.dataset.tipAdded) {
      card.dataset.tipAdded = '1';
      card.classList.add('tt');
      const tips = {
        'Active Markets': 'Number of perpetual trading pairs currently active on Pacifica',
        'Total OI': 'Total Open Interest across all markets in USD',
        '24h Volume': 'Total trading volume in the last 24 hours',
        'Avg Funding APR': 'Average annualized funding rate across all markets',
      };
      card.dataset.tip = tips[label.textContent] || label.textContent;
    }
  });
}
setTimeout(addTooltips, 3000);

/* ── 3. Economic Calendar Mock Data ── */
function seedCalendarMock() {
  const cal = document.getElementById('cal-list');
  if (!cal || !cal.querySelector('.cal-loading')) return;
  const events = [
    { time: '14:30', flag: '🇺🇸', title: 'US CPI (YoY)', impact: 'high', actual: '3.2%', forecast: '3.3%', prev: '3.4%' },
    { time: '15:00', flag: '🇺🇸', title: 'Fed Interest Rate Decision', impact: 'high', actual: '—', forecast: '5.50%', prev: '5.50%' },
    { time: '10:00', flag: '🇪🇺', title: 'ECB Press Conference', impact: 'high', actual: '—', forecast: '—', prev: '—' },
    { time: '08:30', flag: '🇬🇧', title: 'UK GDP (QoQ)', impact: 'medium', actual: '0.1%', forecast: '0.2%', prev: '-0.1%' },
    { time: '01:30', flag: '🇯🇵', title: 'Japan Tankan Index', impact: 'medium', actual: '12', forecast: '10', prev: '9' },
    { time: '03:00', flag: '🇨🇳', title: 'China PMI Manufacturing', impact: 'medium', actual: '50.1', forecast: '49.8', prev: '49.5' },
    { time: '16:00', flag: '🇺🇸', title: 'US Existing Home Sales', impact: 'low', actual: '—', forecast: '4.1M', prev: '3.95M' },
    { time: '11:00', flag: '🇪🇺', title: 'Eurozone CPI (YoY)', impact: 'medium', actual: '2.4%', forecast: '2.5%', prev: '2.6%' },
  ];
  cal.innerHTML = events.map(e => {
    const impactColor = e.impact === 'high' ? 'var(--rd)' : e.impact === 'medium' ? 'var(--yw)' : 'var(--tx3)';
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--bd);font-family:var(--mono);font-size:10px">' +
      '<span style="color:var(--tx3);min-width:36px">' + e.time + '</span>' +
      '<span style="font-size:14px">' + e.flag + '</span>' +
      '<span style="flex:1;color:var(--tx);font-weight:500">' + e.title + '</span>' +
      '<span style="width:6px;height:6px;border-radius:50%;background:' + impactColor + ';flex-shrink:0"></span>' +
      '<span style="min-width:40px;text-align:right;color:var(--tx)">' + e.actual + '</span>' +
      '<span style="min-width:40px;text-align:right;color:var(--tx3)">' + e.forecast + '</span>' +
      '</div>';
  }).join('');
}
setTimeout(seedCalendarMock, 2000);

/* ── 4. News Filter Click Handlers ── */
document.querySelectorAll('.news-cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.news-cat-pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    const cat = pill.dataset.cat;
    if (typeof intelNewsFilter !== 'undefined') intelNewsFilter = cat;
  });
});

/* ── 5. AI Context Auto-Injection ── */
function enhancedAiContext() {
  const ctx = document.getElementById('ai-context');
  if (!ctx) return;
  const n = Object.keys(prices).length;
  const topByVol = Object.entries(prices)
    .filter(([,p]) => p.mark)
    .sort((a,b) => (b[1].vol||0) - (a[1].vol||0))
    .slice(0, 5);

  const topFR = Object.entries(prices)
    .filter(([,p]) => p.funding !== undefined)
    .sort((a,b) => Math.abs(b[1].funding) - Math.abs(a[1].funding))
    .slice(0, 3);

  let html = '<strong style="color:var(--tx)">Live Context (' + n + ' markets)</strong><br><br>';
  html += '<strong>Top Volume:</strong><br>';
  topByVol.forEach(([sym, p]) => {
    const chg = p.change || 0;
    html += sym + ': ' + fmtP(p.mark) + ' (' + (chg>=0?'+':'') + chg.toFixed(2) + '%) vol:$' + fmt(p.vol||0) + '<br>';
  });
  html += '<br><strong>Extreme Funding:</strong><br>';
  topFR.forEach(([sym, p]) => {
    const apr = (p.funding * 3 * 365 * 100).toFixed(1);
    html += sym + ': ' + (p.funding*100).toFixed(4) + '%/8h (' + apr + '% APR)<br>';
  });
  html += '<br><strong>Whale Alerts:</strong> ' + whaleRows.length + ' trades detected';
  ctx.innerHTML = html;
}
setInterval(() => {
  if (document.querySelector('#subpage-ai.on') || document.querySelector('#subpage-ai')?.classList.contains('on')) enhancedAiContext();
}, 5000);
