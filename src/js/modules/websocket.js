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
  const feedCnt=$('feed-cnt'); if(feedCnt) feedCnt.textContent=tradeCount+' trades';
  data.forEach(t=>{
    const sym=t.s;
    const side=t.d||'';
    const usd=parseFloat(t.a||0)*parseFloat(t.p||0);
    if(!lsVol[sym]) lsVol[sym]={l:0,s:0};
    if(side.includes('long')) lsVol[sym].l+=usd;
    else lsVol[sym].s+=usd;
    if(t.tc&&t.tc!=='normal') liqCount++;
    addTradeToFeed(t,sym);
    whaleIngest(t,sym,usd);
    // Update Overview live trades table
    if(typeof updateDashTradesTable === 'function') updateDashTradesTable(sym, t.p, t.a, side);
  });
  renderLSRatio();
  if(document.querySelector('#subpage-whale.on')) renderWhalePage();
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

/* ── Market heatmap grid — 60 markets, 6×10 ── */
const sparkBuf = {}; // sym → [prices]
function renderMarketGrid(){
  const grid = $('mk-grid');
  if(!grid) return;

  // Collect all symbols: from prices (live) + MARKETS_COINS (static fallback)
  let allCoins = [];
  if(typeof MARKETS_COINS !== 'undefined'){
    allCoins = MARKETS_COINS.slice(0, 60).map(c => {
      const live = prices[c.sym] || {};
      return {
        sym: c.sym,
        name: c.name,
        price: live.mark || c.price,
        chg: live.change || c.chg24 || 0,
        vol: live.vol || 0,
      };
    });
  } else {
    allCoins = Object.entries(prices).slice(0, 60).map(([sym, p]) => ({
      sym,
      name: sym,
      price: p.mark,
      chg: p.change || 0,
      vol: p.vol || 0,
    }));
  }

  if(!allCoins.length){
    grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--tx3)">Loading markets...</div>';
    return;
  }

  grid.innerHTML = allCoins.map(c => {
    const isUp = c.chg >= 0;
    const absChg = Math.abs(c.chg);
    const intensity = absChg < 2 ? '1' : absChg < 5 ? '2' : '3';
    const cls = (isUp ? 'up' : 'dn') + '-' + intensity;
    const chgColor = isUp ? 'var(--gn)' : 'var(--rd)';
    const icon = COIN_IMG[c.sym.toUpperCase()] || COIN_IMG[c.sym];
    const color = COIN_COLORS[c.sym.toUpperCase()] || COIN_COLORS.DEFAULT || '#3b82f6';

    let iconHTML;
    if(icon){
      iconHTML = '<img class="hm60-icon" src="' + icon + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" alt="' + c.sym + '">' +
        '<div class="hm60-fallback" style="display:none;background:' + color + '22;color:' + color + '">' + c.sym.slice(0,2) + '</div>';
    } else {
      iconHTML = '<div class="hm60-fallback" style="background:' + color + '22;color:' + color + ';display:flex">' + c.sym.slice(0,2) + '</div>';
    }

    const priceStr = c.price >= 10000 ? '$' + (c.price/1000).toFixed(1) + 'K'
      : c.price >= 100 ? '$' + Math.round(c.price)
      : c.price >= 1 ? '$' + c.price.toFixed(2)
      : c.price >= 0.01 ? '$' + c.price.toFixed(3)
      : '$' + c.price.toFixed(4);

    return '<div class="hm60-cell ' + cls + '" onclick="openCoinChart(\'' + c.sym + '\')" title="' + c.name + ' · ' + c.sym + '">' +
      iconHTML +
      '<div class="hm60-sym">' + c.sym + '</div>' +
      '<div class="hm60-price">' + priceStr + '</div>' +
      '<div class="hm60-chg" style="color:' + chgColor + '">' + (isUp?'+':'') + c.chg.toFixed(1) + '%</div>' +
      '</div>';
  }).join('');
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
  // Clear skeleton on first real data
  if(wrap.querySelector('.skel-row')){
    const entries = Object.entries(lsVol);
    if(entries.length > 0) wrap.innerHTML = '';
    else return;
  }
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

