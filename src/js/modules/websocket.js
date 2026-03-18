/* ══════════════════════════════════════════════
   WEBSOCKET — PRICES + TRADES
══════════════════════════════════════════════ */
function connectWS(){
  if(ws) return;
  try{
    ws = new WebSocket(C.WS_URL);
    ws.onopen = ()=>{
      wsConnected = true;
      setWsStatus(true);
      ws.send(JSON.stringify({method:'subscribe',params:{source:'prices'}}));
      ws.send(JSON.stringify({method:'subscribe',params:{source:'liquidations'}}));
      // Subscribe to trades for top markets
      ['BTC','ETH','SOL','BNB','DOGE','XRP','AVAX','LINK','ARB','OP'].forEach(sym=>{
        ws.send(JSON.stringify({method:'subscribe',params:{source:'trades',symbol:sym}}));
      });
      // heartbeat
      setInterval(()=>{ if(ws&&ws.readyState===1) ws.send(JSON.stringify({method:'ping'})) },30000);
    };
    ws.onmessage = e=>handleWS(JSON.parse(e.data));
    ws.onclose = ()=>{ wsConnected=false; setWsStatus(false); ws=null; scheduleReconnect(); };
    ws.onerror = ()=>{ ws?.close(); };
  }catch(e){ scheduleReconnect(); }
}

function scheduleReconnect(){
  clearTimeout(wsReconnectTimer);
  wsReconnectTimer = setTimeout(connectWS, 3000);
}

function setWsStatus(on){
  const dot=$('ws-dot'), lbl=$('ws-lbl'), banner=$('ws-banner');
  if(on){
    dot.className='ws-dot pulsing'; lbl.textContent='LIVE';
    if(banner) banner.classList.remove('show');
  } else {
    dot.className='ws-dot off'; lbl.textContent='RECONNECTING';
    if(banner) banner.classList.add('show');
  }
}

function handleWS(msg){
  if(!msg.channel) return;
  if(msg.channel==='prices')            handlePrices(msg.data);
  if(msg.channel==='trades')            handleTrades(msg.data);
  if(msg.channel==='book')              handleBookData(msg.data);
  if(msg.channel==='account_positions') handlePositions(msg.data);
  if(msg.channel==='account_trades')    handleAccountTrades(msg.data);
  if(msg.channel==='liquidations')      handleLiquidationEvent(msg.data);
  // pong response — connection alive
  if(msg.channel==='pong') return;
}

/* ── Prices ── */
function handlePrices(data){
  if(!Array.isArray(data)) return;
  let totalFR=0, totalOI=0, totalVol=0, n=0;

  data.forEach(p=>{
    const sym=p.symbol;
    const old=prices[sym];
    const _mark = parseFloat(p.mark||0);
    const _prev = parseFloat(p.yesterday_price||p.mark||0);
    prices[sym]={
      mark:  _mark,
      price: _mark,
      mid:   parseFloat(p.mid||0),
      funding: parseFloat(p.funding||0),
      next_funding: parseFloat(p.next_funding||0),
      oi:    parseFloat(p.open_interest||0)*_mark,
      vol:   parseFloat(p.volume_24h||0),
      ts:    p.timestamp,
      prev:  _prev,
      change: _prev > 0 ? ((_mark - _prev) / _prev * 100) : 0,
    };
    if(!frHistory[sym]) frHistory[sym]=[];
    if(!old||old.funding!==prices[sym].funding){
      frHistory[sym].push({t:Date.now(),rate:prices[sym].funding});
      if(frHistory[sym].length>72) frHistory[sym].shift();
      // Check for extreme funding rate → Telegram/Discord alert
      const _fr = prices[sym].funding;
      const _apr = Math.abs(_fr * 3 * 365 * 100);
      if(_apr > 50) maybeSendFundingAlert(sym, _fr, _apr);
    }
    // Subscribe to trades for every new market we see
    if(!old && ws && ws.readyState===1){
      ws.send(JSON.stringify({method:'subscribe',params:{source:'trades',symbol:sym}}));
    }
    totalFR+=prices[sym].funding; totalOI+=prices[sym].oi; totalVol+=prices[sym].vol; n++;
  });

  // Update stats
  $('st-markets').textContent=n;
  $('st-oi').textContent='$'+fmt(totalOI);
  $('st-vol').textContent='$'+fmt(totalVol);
  const avgFR=n?totalFR/n:0;
  const avgAPR=(avgFR*3*365*100).toFixed(1)+'%';
  const frEl=$('st-fr'); frEl.textContent=avgAPR;
  frEl.className='s-val '+(avgFR>=0?'gn':'rd');

  renderFundingTable();
  renderHeatmap();
  // Auto-refresh markets table if it's the active page
  if(document.getElementById('page-markets')?.classList.contains('on')){
    // Throttle to max once per 3 seconds
    if(!window._mktRefreshTimer){
      window._mktRefreshTimer = setTimeout(()=>{
        window._mktRefreshTimer = null;
        renderMarketsTable(document.querySelector('.mpill.on')?.dataset?.mcat||'all');
      }, 3000);
    }
  }
  renderMarketGrid();
  renderTicker();
  renderAlerts();
  renderArbBestOpportunity();
  if(document.querySelector('#page-arbitrage.on')) renderArbTable();
  updateWalletPnL();
  // Overview ek paneller
  if(window.Chart) updateOverviewFRChart();
  updateOverviewWhale();
}

/* ── Trades ── */
function handleTrades(data){
  if(!Array.isArray(data)) return;
  tradeCount+=data.length;
  $('feed-cnt').textContent=tradeCount+' trades';
  data.forEach(t=>{
    const sym=t.s;
    const side=t.d||'';
    const usd=parseFloat(t.a||0)*parseFloat(t.p||0);
    if(!lsVol[sym]) lsVol[sym]={l:0,s:0};
    if(side.includes('long')) lsVol[sym].l+=usd;
    else lsVol[sym].s+=usd;
    if(t.tc&&t.tc!=='normal') liqCount++;
    addTradeToFeed(t,sym);
    // Whale: store all, filter at render time
    whaleIngest(t,sym,usd);
  });
  renderLSRatio();
  if(document.querySelector('#page-whale.on')) renderWhalePage();
  // Her zaman overview panelini güncelle
  updateOverviewWhale();
}

function addTradeToFeed(t,sym){
  const feed=$('feed');
  const loading=feed.querySelector('.spin-w');if(loading)loading.remove();
  const side=t.d||'';
  let label='OPEN L', cls='fi-ol';
  if(side==='open_short'){label='OPEN S';cls='fi-os';}
  else if(side==='close_long'){label='CLOSE L';cls='fi-cl';}
  else if(side==='close_short'){label='CLOSE S';cls='fi-cs';}
  if(t.tc&&t.tc!=='normal'){label='LIQ';cls='fi-lq';}
  const usd=parseFloat(t.a||0)*parseFloat(t.p||0);
  const el=document.createElement('div');
  el.className='feed-item';
  el.innerHTML=`
    <span class="fi-side ${cls}">${label}</span>
    ${coinIconHTML(sym,16,'50%')}<span class="fi-sym">${sym}</span>
    <span class="fi-px">${fmtP(t.p)}</span>
    <span class="fi-sz ${side.includes('long')?'gn':'rd'}">${fmt(usd)}$</span>
    <span class="fi-t">${timeAgo(t.t||Date.now())}</span>`;
  feed.insertBefore(el,feed.firstChild);
  while(feed.children.length>80) feed.removeChild(feed.lastChild);
}

/* ── Funding table ── */
function renderFundingTable(){
  const tbody=$('fr-tbody');if(!tbody)return;
  const sorted=Object.entries(prices).sort((a,b)=>Math.abs(b[1].funding)-Math.abs(a[1].funding)).slice(0,16);
  tbody.innerHTML='';
  sorted.forEach(([sym,p])=>{
    const fr=p.funding, ann=(fr*3*365*100);
    const bar=clamp(Math.abs(fr)/0.001*100,0,100);
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td class="sym">${sym}</td>
      <td class="${fr>=0?'gn':'rd'}">${(fr*100).toFixed(4)}%</td>
      <td class="${ann>=0?'gn':'rd'}">${ann.toFixed(1)}%</td>
      <td>${fmt(p.oi)}</td>
      <td><div class="rb-w"><div class="rb-bg"><div class="rb-f" style="width:${bar}%;background:${fr>=0?'var(--gn)':'var(--rd)'}"></div></div></div></td>`;
    tbody.appendChild(tr);
  });
}

/* ── Heatmap ── */
function renderHeatmap(){
  const hm=$('heatmap');if(!hm)return;
  hm.innerHTML='';
  Object.entries(prices).forEach(([sym,p])=>{
    const fr=p.funding, ann=(fr*3*365*100).toFixed(1);
    const cell=document.createElement('div');
    cell.className='hm-cell';
    cell.style.background=rateColor(fr);
    cell.title=`${sym}: ${(fr*100).toFixed(4)}%/8h · ${ann}% APR`;
    cell.innerHTML=`<div class="hm-sym">${sym}</div>
      <div class="hm-r">${(fr*100).toFixed(4)}%</div>
      <div class="hm-a">${ann}% APR</div>`;
    hm.appendChild(cell);
  });
}

/* ── Market sparkline grid ── */
const sparkBuf = {}; // sym → [prices]
function renderMarketGrid(){
  const grid = $('mk-grid');
  if(!grid) return;
  const syms = Object.keys(prices);
  if(!syms.length){
    grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--tx3);font-size:10px;font-family:var(--mono)">Connecting to WebSocket...</div>';
    return;
  }
  grid.innerHTML = syms.slice(0,24).map(sym => {
    const p = prices[sym] || {};
    const chg = p.change || ((p.mark - p.prev) / (p.prev||p.mark||1) * 100);
    const cls = chg >= 0 ? 'gn' : 'rd';
    const icon = coinIconHTML(sym, 16, '50%');
    const priceStr = p.mark ? fmtPrice(p.mark) : '—';
    return `<div class="mk-cell">
      <div class="mk-top">
        <div style="display:flex;align-items:center;gap:4px">
          ${icon}<span class="mk-sym">${sym}</span>
        </div>
        <span class="mk-chg ${cls}">${chg>=0?'+':''}${chg.toFixed(2)}%</span>
      </div>
      <div class="mk-price">$${priceStr}</div>
      <canvas id="mk-sp-${sym}" class="mk-spark" width="100" height="28"></canvas>
    </div>`;
  }).join('');
  // Draw sparklines after DOM update
  requestAnimationFrame(() => {
    syms.slice(0,24).forEach(sym => {
      const ph = (typeof priceHistory !== 'undefined') ? priceHistory[sym] : null;
      if(ph && ph.length > 2){
        const chg = prices[sym]?.change || 0;
        drawSpark('mk-sp-'+sym, ph.map(h=>h.p||h), chg>=0?'#22d3a5':'#f43f5e');
      }
    });
  });
}

function drawSpark(id,pts,color){
  const c=$(id);if(!c)return;
  const W=c.offsetWidth||200,H=32;c.width=W;c.height=H;
  if(!pts||pts.length<2)return;
  const ctx=c.getContext('2d');
  const mn=Math.min(...pts),mx=Math.max(...pts),rng=(mx-mn)||1;
  ctx.clearRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,color+'35');g.addColorStop(1,color+'00');
  ctx.beginPath();
  pts.forEach((v,i)=>{
    const x=(i/(pts.length-1))*W,y=H-((v-mn)/rng)*(H-4)-2;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();
  pts.forEach((v,i)=>{
    const x=(i/(pts.length-1))*W,y=H-((v-mn)/rng)*(H-4)-2;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
}

/* ── Ticker ── */
function renderTicker(){
  const track=$('ticker');if(!track)return;
  const items=Object.entries(prices).slice(0,20).map(([sym,p])=>{
    const fr=p.funding,chg=p.prev?((p.mark-p.prev)/p.prev*100):0;
    return`<div class="ticker-item">
      ${coinIconHTML(sym,18,'50%')}
      <span class="ti-sym">${sym}</span>
      <span class="ti-price">${fmtP(p.mark)}</span>
      <span class="ti-fr ${fr>=0?'gn':'rd'}">${(fr*100).toFixed(4)}%</span>
      <span class="ti-chg ${chg>=0?'gn':'rd'}">${chg>=0?'+':''}${chg.toFixed(2)}%</span>
    </div>`;
  }).join('');
  track.innerHTML=items+items; // duplicate for seamless loop
}

/* ── LS Ratio ── */
function renderLSRatio(){
  const wrap=$('ls-wrap');if(!wrap)return;
  const loading=wrap.querySelector('.spin-w');if(loading)loading.remove();
  Object.entries(lsVol).slice(0,6).forEach(([sym,{l,s}])=>{
    const tot=l+s||1,lp=(l/tot*100).toFixed(1),sp=(s/tot*100).toFixed(1);
    let el=$('ls-'+sym);
    if(!el){el=document.createElement('div');el.className='ls-row';el.id='ls-'+sym;wrap.appendChild(el);}
    el.innerHTML=`
      <div class="ls-hd"><span class="ls-sym" style="display:flex;align-items:center;gap:6px">${coinIconHTML(sym,18,'50%')}${sym}</span>
        <span class="ls-pct"><span class="gn">${lp}%L</span> / <span class="rd">${sp}%S</span></span></div>
      <div class="ls-bar"><div class="ls-l" style="width:${lp}%"></div><div class="ls-s" style="width:${sp}%"></div></div>`;
  });
}

/* ── Alerts ── */
function renderAlerts(){
  const list=$('alrt-list');if(!list)return;
  list.innerHTML='';let cnt=0;
  const POS_T=0.0003, NEG_T=-0.0002;
  const sorted=Object.entries(prices).sort((a,b)=>Math.abs(b[1].funding)-Math.abs(a[1].funding));
  sorted.forEach(([sym,p])=>{
    const fr=p.funding,ann=(fr*3*365*100);
    if(fr>=POS_T){
      cnt++;
      const el=document.createElement('div');el.className='alrt';
      el.style.borderColor='rgba(0,229,153,.25)';
      el.innerHTML=`<div class="alrt-ico">⚡</div>
        <div class="alrt-body">
          <div class="alrt-ttl">${sym} — High Positive Funding</div>
          <div class="alrt-desc">Shorts receive <strong>${(fr*100).toFixed(4)}%/8h ≈ ${ann.toFixed(0)}% APR</strong>. Cash-and-carry opportunity: buy spot + short perp.</div>
        </div><div class="alrt-rate gn">+${(fr*100).toFixed(4)}%</div>`;
      list.appendChild(el);
    } else if(fr<=NEG_T){
      cnt++;
      const el=document.createElement('div');el.className='alrt';
      el.style.borderColor='rgba(255,53,82,.2)';
      el.innerHTML=`<div class="alrt-ico">⚠️</div>
        <div class="alrt-body">
          <div class="alrt-ttl">${sym} — Negative Funding Rate</div>
          <div class="alrt-desc">Longs receive <strong>${Math.abs(fr*100).toFixed(4)}%/8h ≈ ${Math.abs(ann).toFixed(0)}% APR</strong>. Extreme short bias — possible long opportunity.</div>
        </div><div class="alrt-rate rd">${(fr*100).toFixed(4)}%</div>`;
      list.appendChild(el);
    }
  });
  $('alrt-cnt').textContent=cnt+' alerts';
  if(!cnt) list.innerHTML=`<div style="padding:14px;font-family:var(--mono);font-size:10px;color:var(--tx3)">
    ✓ No extreme funding rates. Market is balanced.</div>`;
}

