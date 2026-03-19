/* ══════════════════════════════════════════════
   CROSS-DEX FUNDING RATE ARBITRAGE
   Pacifica vs Hyperliquid real-time comparison
══════════════════════════════════════════════ */
let hlPrices = {};       // coin → {funding, markPx, oi, vol}
let hlLastFetch = 0;
let crossDexPairs = [];  // sorted arbitrage opportunities
let crossDexChartInst = null;
const crossDexHistory = []; // {t, bestApr, pair}

// ── Fetch Hyperliquid data via proxy ──
async function fetchHyperliquid(){
  try {
    const r = await fetch('/api/hyperliquid');
    if(!r.ok) throw new Error(r.status);
    const data = await r.json();
    hlPrices = {};
    data.forEach(d => {
      hlPrices[d.coin] = {
        funding: d.funding,        // per-hour rate
        markPx: d.markPx,
        oi: d.openInterest * d.markPx,
        vol: d.volume,
      };
    });
    hlLastFetch = Date.now();
    renderCrossDex();
  } catch(e){
    console.warn('Hyperliquid fetch:', e.message);
  }
}

// ── Normalize funding rates to 8h for comparison ──
// Pacifica: funding is per 8h already
// Hyperliquid: funding is per 1h → multiply by 8
function normalizeFR(pacFR, hlFR){
  return { pac: pacFR, hl: hlFR * 8 };
}

// ── Scan cross-dex opportunities ──
function scanCrossDex(){
  crossDexPairs = [];
  const pacSyms = Object.keys(prices);
  
  pacSyms.forEach(sym => {
    const pac = prices[sym];
    const hl = hlPrices[sym];
    if(!hl || !pac) return;
    
    const {pac: pacFR8h, hl: hlFR8h} = normalizeFR(pac.funding, hl.funding);
    const spread = Math.abs(pacFR8h - hlFR8h);
    if(spread < 0.00005) return; // min spread filter
    
    const apr = spread * 3 * 365 * 100; // 3 periods per day × 365
    const isPacCheaper = pacFR8h < hlFR8h; // cheaper to be long on Pacifica
    
    crossDexPairs.push({
      sym,
      pacFR: pacFR8h,
      hlFR: hlFR8h,
      spread,
      apr,
      strategy: isPacCheaper 
        ? `Long ${sym} on Pacifica, Short on Hyperliquid`
        : `Short ${sym} on Pacifica, Long on Hyperliquid`,
      longVenue: isPacCheaper ? 'Pacifica' : 'Hyperliquid',
      shortVenue: isPacCheaper ? 'Hyperliquid' : 'Pacifica',
      pacPrice: pac.mark,
      hlPrice: hl.markPx,
      priceDiff: Math.abs(pac.mark - hl.markPx) / Math.max(pac.mark, hl.markPx) * 100,
      combinedOI: (pac.oi || 0) + (hl.oi || 0),
    });
  });
  
  crossDexPairs.sort((a,b) => b.apr - a.apr);
  
  // Track history
  if(crossDexPairs.length > 0){
    crossDexHistory.push({
      t: Date.now(),
      bestApr: crossDexPairs[0].apr,
      pair: crossDexPairs[0].sym,
    });
    if(crossDexHistory.length > 100) crossDexHistory.shift();
  }
}

// ── Render cross-dex table ──
function renderCrossDex(){
  scanCrossDex();
  
  // Stats
  const el = id => document.getElementById(id);
  const matched = crossDexPairs.length;
  const best = crossDexPairs[0];
  
  if(el('xdex-matched')) el('xdex-matched').textContent = matched;
  if(el('xdex-best-apr') && best){
    el('xdex-best-apr').textContent = best.apr.toFixed(1) + '%';
    el('xdex-best-apr').className = 's-val ' + (best.apr > 50 ? 'yw' : 'gn');
  }
  if(el('xdex-best-pair') && best) el('xdex-best-pair').textContent = best.sym;
  if(el('xdex-avg-apr') && matched > 0){
    const avg = crossDexPairs.reduce((s,p) => s + p.apr, 0) / matched;
    el('xdex-avg-apr').textContent = avg.toFixed(1) + '%';
  }
  if(el('xdex-last-update')){
    el('xdex-last-update').textContent = hlLastFetch 
      ? new Date(hlLastFetch).toLocaleTimeString() 
      : '—';
  }
  
  // Table
  const tbody = el('xdex-tbody');
  if(!tbody) return;
  
  if(!matched){
    tbody.innerHTML = `<tr><td colspan="8" style="padding:20px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--tx3)">
      Fetching Hyperliquid data...</td></tr>`;
    return;
  }
  
  tbody.innerHTML = '';
  crossDexPairs.slice(0, 15).forEach(p => {
    const signal = p.apr > 100 ? '🔥 HIGH' : p.apr > 30 ? '⚡ MED' : '● LOW';
    const signalClass = p.apr > 100 ? 'yw' : p.apr > 30 ? 'gn' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:700;display:flex;align-items:center;gap:6px">
        ${coinIconHTML(p.sym, 18, '50%')} ${p.sym}
      </td>
      <td class="${p.pacFR >= 0 ? 'gn' : 'rd'}" style="font-family:var(--mono);font-size:10px">
        ${(p.pacFR * 100).toFixed(4)}%
      </td>
      <td class="${p.hlFR >= 0 ? 'gn' : 'rd'}" style="font-family:var(--mono);font-size:10px">
        ${(p.hlFR * 100).toFixed(4)}%
      </td>
      <td class="yw" style="font-weight:700;font-family:var(--mono);font-size:10px">
        ${(p.spread * 100).toFixed(4)}%
      </td>
      <td class="yw" style="font-weight:700">${p.apr.toFixed(1)}%</td>
      <td style="font-size:9px;color:var(--tx2)">
        Long <span class="${p.longVenue==='Pacifica'?'ac':'pu'}">${p.longVenue}</span><br>
        Short <span class="${p.shortVenue==='Pacifica'?'ac':'pu'}">${p.shortVenue}</span>
      </td>
      <td style="font-size:10px;color:var(--tx3)">${p.priceDiff.toFixed(2)}%</td>
      <td><span class="${signalClass}" style="font-size:10px">${signal}</span></td>`;
    tbody.appendChild(tr);
  });
  
  // Update chart
  updateCrossDexChart();
  
  // Best opportunity card
  if(best){
    const bodyEl = el('xdex-strat-body');
    if(bodyEl){
      bodyEl.innerHTML = `
        <strong>${best.sym}</strong> — ${best.strategy}.<br>
        Pacifica FR: <span class="${best.pacFR>=0?'gn':'rd'}">${(best.pacFR*100).toFixed(4)}%/8h</span> · 
        Hyperliquid FR: <span class="${best.hlFR>=0?'gn':'rd'}">${(best.hlFR*100).toFixed(4)}%/8h</span><br>
        Collect <span class="yw">${(best.spread*100).toFixed(4)}%/8h</span> spread on a delta-neutral cross-venue position.`;
    }
    const aprEl = el('xdex-strat-apr');
    if(aprEl) aprEl.textContent = best.apr.toFixed(1) + '%';
    const mEl = el('xdex-strat-monthly');
    if(mEl) mEl.textContent = (best.apr / 12).toFixed(2) + '%';
    const simEl = el('xdex-strat-sim');
    if(simEl) simEl.textContent = '$' + fmt((best.apr / 100 / 12) * 10000);
  }
}

// ── Cross-dex spread chart ──
function initCrossDexChart(){
  const canvas = document.getElementById('xdex-chart');
  if(!canvas || !window.Chart) return;
  if(crossDexChartInst) crossDexChartInst.destroy();
  crossDexChartInst = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Best Cross-DEX APR %',
        data: [],
        borderColor: '#bc8cff',
        backgroundColor: 'rgba(188,140,255,.08)',
        fill: true,
        tension: .3,
        borderWidth: 1.5,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#7d8590', font: { family: 'monospace', size: 9 } } } },
      scales: {
        x: { ticks: { color: '#484f58', font: { family: 'monospace', size: 7 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: 'rgba(48,54,61,.5)' } },
        y: { ticks: { color: '#484f58', font: { family: 'monospace', size: 7 }, callback: v => v.toFixed(0) + '%' }, grid: { color: 'rgba(48,54,61,.5)' } },
      },
    },
  });
}

function updateCrossDexChart(){
  if(!crossDexChartInst) { initCrossDexChart(); if(!crossDexChartInst) return; }
  crossDexChartInst.data.labels = crossDexHistory.map(h => new Date(h.t).toLocaleTimeString());
  crossDexChartInst.data.datasets[0].data = crossDexHistory.map(h => +h.bestApr.toFixed(2));
  crossDexChartInst.update('none');
}

// ── Init ──
function initCrossDex(){
  fetchHyperliquid();
  // Refresh every 30 seconds
  setInterval(fetchHyperliquid, 30000);
}
