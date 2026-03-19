/* ══════════════════════════════════════════════
   WHALE WATCHER
══════════════════════════════════════════════ */
function setWhaleThreshold(v){
  whaleMin=parseInt(v);
  $('wh-thresh-lbl').textContent='above $'+fmt(whaleMin);
  // Yeniden render — mevcut birikmiş verilerden eşiği geçenleri göster
  renderWhalePage();
}

// Called directly from handleTrades — no override, no recursion
function whaleIngest(t,sym,usd){
  // Store ALL trades in raw buffer (filter applied at render time)
  whaleTotalVol+=usd;
  if(usd>whaleLargest) whaleLargest=usd;
  const side=t.d||t.side||'';
  const isLiq=!!(t.tc&&t.tc!=='normal');
  if(!whaleByMkt[sym]) whaleByMkt[sym]={vol:0,count:0};
  whaleByMkt[sym].vol+=usd;
  whaleByMkt[sym].count++;
  whaleRows.unshift({sym,side,usd,price:parseFloat(t.p||0),ts:t.t||Date.now(),isLiq});
  if(whaleRows.length>500) whaleRows.pop();
  // Alert only for very large trades (5x current threshold)
  if(usd>=whaleMin*5){
    whaleAlerts.unshift({sym,side,usd,isLiq,ts:Date.now()});
    if(whaleAlerts.length>30) whaleAlerts.pop();
    // Telegram/Discord alert
    const isLong = side !== 'ask';
    maybeSendWhaleAlert(sym, usd, isLong, parseFloat(t.p||0), isLiq);
  }
}

function renderWhalePage(){
  // Filter by current threshold at render time
  const filtered=whaleRows.filter(r=>r.usd>=whaleMin);
  const filteredAlerts=whaleAlerts.filter(a=>a.usd>=whaleMin);

  $('wh-count').textContent=filtered.length;
  $('wh-largest').textContent=whaleLargest>0?'$'+fmt(whaleLargest):'—';
  $('wh-vol').textContent='$'+fmt(whaleTotalVol);
  $('wh-feed-cnt').textContent=filtered.length;

  const tbody=$('whale-tbody'); if(!tbody) return;
  tbody.innerHTML='';
  if(!filtered.length){
    tbody.innerHTML=`<tr><td colspan="6" style="padding:20px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--tx3)">
      No trades above $${fmt(whaleMin)} yet — ${whaleRows.length} total trades buffered, lower the threshold to see them</td></tr>`;
  } else {
    filtered.slice(0,50).forEach((r,i)=>{
      const isLong=r.side.includes('long')||r.side==='bid';
      const tr=document.createElement('tr');
      if(i===0) tr.className='whale-new';
      tr.innerHTML=`
        <td class="dim">${timeAgo(r.ts)}</td>
        <td><span style="display:flex;align-items:center;gap:7px">${coinIconHTML(r.sym,20,'50%')}<span style="font-weight:700;color:var(--tx)">${r.sym}</span></span></td>
        <td class="${isLong?'gn':'rd'}">${(r.side||'—').replace(/_/g,' ').toUpperCase()}</td>
        <td class="yw" style="font-weight:700">$${fmt(r.usd)}</td>
        <td>${fmtP(r.price)}</td>
        <td>${r.isLiq?'<span class="bdg bdg-o">LIQ</span>':'<span class="bdg bdg-c">TRADE</span>'}</td>
        <td><a class="copy-trade-btn ${isLong?'copy-long':'copy-short'}" href="https://app.pacifica.fi/trade/${r.sym}" target="_blank" rel="noopener">
          Trade ${r.sym} ↗
        </a></td>`;
      tbody.appendChild(tr);
    });
  }

  const alist=$('whale-alert-list');
  if(alist){
    $('wh-alert-cnt').textContent=filteredAlerts.length;
    if(filteredAlerts.length){
      alist.innerHTML='';
      filteredAlerts.slice(0,10).forEach(a=>{
        const isLong=a.side.includes('long')||a.side==='bid';
        const el=document.createElement('div');
        el.className='whale-alert'+(a.usd>=whaleMin*10?' mega':'');
        el.innerHTML=`<div class="whale-alert-top">
          <span class="whale-alert-sym" style="display:flex;align-items:center;gap:7px">${coinIconHTML(a.sym,20,'50%')}${a.sym} ${a.usd>=whaleMin*10?'🐳':'🐋'}</span>
          <span class="whale-alert-size ${isLong?'gn':'rd'}">$${fmt(a.usd)}</span></div>
          <div class="whale-alert-detail">${isLong?'Large LONG':'Large SHORT'} · ${timeAgo(a.ts)}${a.isLiq?' · LIQUIDATION':''}</div>
          <button class="copy-trade-btn ${isLong?'copy-long':'copy-short'}" style="margin-top:6px;width:100%" 
            onclick="window.open('https://app.pacifica.fi/trade/${a.sym}','_blank')">
            Trade ${a.sym} on Pacifica ↗
          </button>`;
        alist.appendChild(el);
      });
    } else {
      alist.innerHTML=`<div style="padding:12px;font-family:var(--mono);font-size:10px;color:var(--tx3)">No alerts above $${fmt(whaleMin*5)}...</div>`;
    }
  }

  const mlist=$('wh-market-list');
  if(mlist){
    const sorted=Object.entries(whaleByMkt).sort((a,b)=>b[1].vol-a[1].vol);
    if(sorted.length){
      const totalV=sorted.reduce((s,[,v])=>s+v.vol,0)||1;
      mlist.innerHTML='';
      sorted.slice(0,8).forEach(([sym,d])=>{
        const pct=(d.vol/totalV*100);
        const row=document.createElement('div');
        row.innerHTML=`<div class="dom-row-hd">
          <span class="dom-sym" style="display:flex;align-items:center;gap:6px">${coinIconHTML(sym,18,'50%')}<span>${sym}</span></span>
          <span class="dom-pct">${d.count} trades · $${fmt(d.vol)}</span></div>
          <div class="dom-bg"><div class="dom-fill" style="width:${pct}%;background:var(--yw)"></div></div>`;
        mlist.appendChild(row);
      });
    }
  }
}

