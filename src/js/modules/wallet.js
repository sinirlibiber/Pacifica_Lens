/* ══════════════════════════════════════════════
   WALLET TRACKER
══════════════════════════════════════════════ */
async function connectWallet(){
  const addr=$('wallet-addr').value.trim();
  if(!addr){alert('Please enter a wallet address');return;}
  walletAddr=addr;
  $('wallet-addr-badge').textContent=addr.slice(0,6)+'...'+addr.slice(-4);
  $('btn-disco').style.display='';

  // Fetch trade history — try proxy first, then direct
  try{
    // Try via Vercel proxy (handles CORS)
    let d = await fetchJ(`/api/pacifica?path=positions/history&account=${encodeURIComponent(addr)}&limit=20`).catch(()=>null);
    // Fallback: direct REST
    if(!d) d = await fetchJ(`${C.REST_BASE}/positions/history?account=${encodeURIComponent(addr)}&limit=20`).catch(()=>null);
    // Fallback: trades endpoint
    if(!d) d = await fetchJ(`${C.REST_BASE}/trades?account=${encodeURIComponent(addr)}&limit=20`).catch(()=>null);
    if(d && (d.success||Array.isArray(d.data)||Array.isArray(d))){
      tradeHistory = d.data||d||[];
      if(!Array.isArray(tradeHistory)) tradeHistory=[];
    }
    renderTradeHistory();
    buildExtendedPnlStats();
  }catch(e){ console.warn('Trade history fetch failed',e); renderTradeHistory(); }

  // Subscribe to live positions via WebSocket
  // If WS not yet connected, retry after connection
  function subscribeWallet(){
    if(ws&&ws.readyState===1){
      ws.send(JSON.stringify({method:'subscribe',params:{source:'account_positions',account:addr}}));
      ws.send(JSON.stringify({method:'subscribe',params:{source:'account_trades',account:addr}}));
    } else {
      setTimeout(subscribeWallet, 1500);
    }
  }
  subscribeWallet();
}

function disconnectWallet(){
  if(ws&&ws.readyState===1&&walletAddr){
    ws.send(JSON.stringify({method:'unsubscribe',params:{source:'account_positions',account:walletAddr}}));
  }
  walletAddr=''; positions={}; tradeHistory=[];
  $('wallet-addr').value='';
  $('btn-disco').style.display='none';
  $('wallet-addr-badge').textContent='—';
  renderPositionsTable();
  renderTradeHistory();
}

function handlePositions(data){
  if(!Array.isArray(data)){
    // Some APIs return {data:[...]} or {positions:[...]}
    if(data && Array.isArray(data.data)) data=data.data;
    else if(data && Array.isArray(data.positions)) data=data.positions;
    else return;
  }
  if(data.length===0){ positions={}; }
  else {
    data.forEach(p=>{
      // Support both short-field (WS) and long-field (REST) formats
      const sym = p.symbol||p.s;
      if(!sym) return;
      const amt = parseFloat(p.amount||p.size||p.a||0);
      if(amt===0){ delete positions[sym]; return; }
      positions[sym]={
        sym,
        side: p.side||p.direction||p.d,
        amount: amt,
        entry: parseFloat(p.entry_price||p.entry||p.p||0),
        margin: parseFloat(p.margin||p.m||0),
        funding: parseFloat(p.funding_fee||p.funding||p.f||0),
        liqPrice: p.liquidation_price||p.liq_price||p.l ? parseFloat(p.liquidation_price||p.liq_price||p.l) : null,
        ts: p.created_at||p.timestamp||p.t
      };
    });
  }
  renderPositionsTable();
  updateWalletPnL();
}

function handleAccountTrades(data){
  if(!Array.isArray(data)){
    if(data && Array.isArray(data.data)) data=data.data;
    else if(data && Array.isArray(data.trades)) data=data.trades;
    else return;
  }
  tradeHistory=[...data,...tradeHistory].slice(0,20);
  renderTradeHistory();
  buildExtendedPnlStats();
}

function renderPositionsTable(){
  const tbody=$('pos-tbody');if(!tbody)return;
  const syms=Object.keys(positions);
  $('pos-cnt').textContent=syms.length;
  if(!syms.length){
    tbody.innerHTML=`<tr><td colspan="7" style="padding:20px;font-family:var(--mono);font-size:10px;color:var(--tx3);text-align:center">
      ${walletAddr?'No open positions':'Connect a wallet to see positions'}</td></tr>`;
    return;
  }
  tbody.innerHTML='';
  syms.forEach(sym=>{
    const p=positions[sym];
    const mark=prices[sym]?.mark||p.entry;
    const isLong=p.side==='bid';
    const uPnL=isLong?(mark-p.entry)*p.amount:(p.entry-mark)*p.amount;
    const uPnLPct=(uPnL/(p.entry*p.amount))*100;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td style="font-weight:700;color:var(--tx);display:flex;align-items:center;gap:7px">${coinIconHTML(sym,20,'50%')}${sym}</td>
      <td><span class="pos-side-tag ${isLong?'pos-side-long':'pos-side-short'}">${isLong?'LONG':'SHORT'}</span></td>
      <td>${p.amount.toFixed(4)}</td>
      <td>${fmtP(p.entry)}</td>
      <td>${fmtP(mark)}</td>
      <td class="${uPnL>=0?'gn':'rd'}" id="upnl-${sym}">$${fmt(uPnL)} <span style="opacity:.7">(${uPnLPct>=0?'+':''}${uPnLPct.toFixed(1)}%)</span></td>
      <td class="${p.liqPrice?'liq-warn':'yw'}">${p.liqPrice?fmtP(p.liqPrice):'—'}</td>`;
    tbody.appendChild(tr);
  });
}

function updateWalletPnL(){
  let totalUPnL=0,totalMargin=0,totalFunding=0;
  Object.values(positions).forEach(p=>{
    const mark=prices[p.sym]?.mark||p.entry;
    const isLong=p.side==='bid';
    totalUPnL+=isLong?(mark-p.entry)*p.amount:(p.entry-mark)*p.amount;
    totalMargin+=Math.abs(p.margin);
    totalFunding+=p.funding;
    // Flash update
    const el=$('upnl-'+p.sym);
    if(el){const isLong2=totalUPnL>=0;el.className=isLong2?'gn':'rd';
      el.classList.add(isLong2?'pnl-flash-g':'pnl-flash-r');
      setTimeout(()=>el.classList.remove('pnl-flash-g','pnl-flash-r'),500);}
  });
  $('wk-pos').textContent=Object.keys(positions).length;
  const upnlEl=$('wk-upnl');
  upnlEl.textContent='$'+fmt(totalUPnL);
  upnlEl.className='w-kpi-v '+(totalUPnL>=0?'gn':'rd');
  $('wk-margin').textContent='$'+fmt(totalMargin);
  $('wk-funding').textContent='$'+fmt(totalFunding);
}

function renderTradeHistory(){
  const tbody=$('hist-tbody');if(!tbody)return;
  if(!tradeHistory.length){
    tbody.innerHTML=`<tr><td colspan="6" style="padding:16px;font-family:var(--mono);font-size:10px;color:var(--tx3);text-align:center">${walletAddr?'No trade history found':'Connect a wallet to see history'}</td></tr>`;
    return;
  }
  tbody.innerHTML='';
  tradeHistory.slice(0,20).forEach(t=>{
    const sym  = t.symbol||t.market||t.s||'—';
    const side = t.side||t.direction||t.d||'—';
    const price= parseFloat(t.price||t.fill_price||t.p||0);
    const amount=parseFloat(t.amount||t.size||t.quantity||t.a||0);
    const pnl  = parseFloat(t.realized_pnl||t.pnl||t.profit||0);
    const ts   = t.created_at||t.timestamp||t.time||t.t||0;
    const isLong= side.toLowerCase().includes('long')||side==='bid'||side==='buy';
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><span style="display:flex;align-items:center;gap:7px">${coinIconHTML(sym,18,'50%')}<span style="font-weight:700;color:var(--tx)">${sym}</span></span></td>
      <td class="${isLong?'gn':'rd'}">${side.replace(/_/g,' ').toUpperCase()}</td>
      <td>${fmtP(price)}</td>
      <td>${amount.toFixed(4)}</td>
      <td class="${pnl>=0?'gn':'rd'}">${pnl!==0?'$'+fmt(pnl):'—'}</td>
      <td class="dim">${ts?timeAgo(typeof ts==='string'?new Date(ts).getTime():ts):'-'}</td>`;
    tbody.appendChild(tr);
  });
}

