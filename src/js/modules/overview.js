/* ══════════════════════════════════════════════
   OVERVIEW — FUNDING RATE HISTORY CHART
══════════════════════════════════════════════ */
let ovFrChartInst = null;
const FR_COLORS = ['#58a6ff','#3fb950','#e3b341','#bc8cff','#ffa657'];

function updateOverviewFRChart(){
  const canvas=$('ov-fr-chart');
  if(!canvas||!window.Chart) return;

  const syms = Object.keys(frHistory)
    .filter(s=>frHistory[s].length>1)
    .sort((a,b)=>Math.abs(prices[b]?.funding||0)-Math.abs(prices[a]?.funding||0))
    .slice(0,5);
  if(!syms.length) return;

  // Build common time labels from longest history
  const longest = syms.reduce((a,s)=>frHistory[s].length>frHistory[a].length?s:a, syms[0]);
  const labels = frHistory[longest].map(h=>new Date(h.t).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}));

  const datasets = syms.map((s,i)=>({
    label: s,
    data: frHistory[s].map(h=>(h.rate*100).toFixed(4)),
    borderColor: FR_COLORS[i],
    backgroundColor: FR_COLORS[i]+'15',
    fill: false,
    tension: .3,
    borderWidth: 1.5,
    pointRadius: 0,
  }));

  if(ovFrChartInst){
    ovFrChartInst.data.labels = labels;
    ovFrChartInst.data.datasets = datasets;
    ovFrChartInst.update('none');
  } else {
    ovFrChartInst = new window.Chart(canvas.getContext('2d'),{
      type:'line',
      data:{labels, datasets},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{
          x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxTicksLimit:8,maxRotation:0},grid:{color:'rgba(48,54,61,.5)'}},
          y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v+'%'},grid:{color:'rgba(48,54,61,.5)'}},
        }}
    });
  }

  // Legend
  const leg=$('fr-hist-legend'); if(leg){
    leg.innerHTML=syms.map((s,i)=>
      `<span style="display:flex;align-items:center;gap:4px;font-family:var(--mono);font-size:8px;color:${FR_COLORS[i]}">
        <span style="width:10px;height:2px;background:${FR_COLORS[i]};display:inline-block;border-radius:1px"></span>${s}</span>`
    ).join('');
  }

  // FR rank list
  const rank=$('fr-rank-list'); if(rank){
    const sorted=Object.entries(prices)
      .filter(([,p])=>p.funding!==undefined)
      .sort((a,b)=>Math.abs(b[1].funding)-Math.abs(a[1].funding))
      .slice(0,8);
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
}

/* ══════════════════════════════════════════════
   OVERVIEW — WHALE PANEL UPDATE
══════════════════════════════════════════════ */
function updateOverviewWhale(){
  const filtered=whaleRows.filter(r=>r.usd>=whaleMin);
  $('ov-whale-cnt').textContent=filtered.length+' whales';
  $('ov-wh-largest').textContent=whaleLargest>0?'$'+fmt(whaleLargest):'—';
  $('ov-wh-vol').textContent='$'+fmt(whaleTotalVol);

  // Most active market
  const topMkt=Object.entries(whaleByMkt).sort((a,b)=>b[1].vol-a[1].vol)[0];
  $('ov-wh-market').textContent=topMkt?topMkt[0]:'—';

  // Latest alert
  const latest=filtered[0];
  const latEl=$('ov-wh-latest');
  if(latEl&&latest){
    const isLong=latest.side.includes('long')||latest.side==='bid';
    latEl.textContent=`${latest.sym} ${isLong?'LONG':'SHORT'} $${fmt(latest.usd)}`;
    latEl.className='s-val '+(isLong?'gn':'rd');
  }

  // Mini table
  const tbody=$('ov-whale-tbody'); if(!tbody) return;
  if(!filtered.length){
    tbody.innerHTML=`<tr><td colspan="5" style="padding:12px;font-family:var(--mono);font-size:10px;color:var(--tx3);text-align:center">
      Watching for trades above $${fmt(whaleMin)}...</td></tr>`;
    return;
  }
  tbody.innerHTML='';
  filtered.slice(0,8).forEach(r=>{
    const isLong=r.side.includes('long')||r.side==='bid';
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td class="dim">${timeAgo(r.ts)}</td>
      <td style="font-weight:700;color:var(--tx)">${r.sym}</td>
      <td class="${isLong?'gn':'rd'}">${(r.side||'—').replace(/_/g,' ').toUpperCase()}</td>
      <td class="yw" style="font-weight:700">$${fmt(r.usd)}</td>
      <td>${fmtP(r.price)}</td>`;
    tbody.appendChild(tr);
  });
}

