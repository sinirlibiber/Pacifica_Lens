/* ══════════════════════════════════════════════
   ORDERBOOK IMBALANCE
══════════════════════════════════════════════ */

// ── Real Pacifica Orderbook Data Handler ────────────────
// API: channel='book', data={l:[bids,asks], s:symbol, t:timestamp}
// Each level: {a:amount, n:orders, p:price}
let obLiveData = {};  // sym → {bids:[], asks:[]}

function handleBookData(data){
  if(!data || !data.s) return;
  const sym = data.s;
  const [rawBids, rawAsks] = data.l || [[], []];
  
  // Convert to standard format: [{price, size, count}]
  const bids = rawBids.map(l => ({
    price: parseFloat(l.p), 
    size:  parseFloat(l.a),
    count: l.n || 1
  })).sort((a,b) => b.price - a.price);
  
  const asks = rawAsks.map(l => ({
    price: parseFloat(l.p),
    size:  parseFloat(l.a),
    count: l.n || 1
  })).sort((a,b) => a.price - b.price);

  obLiveData[sym] = { bids, asks, ts: data.t };

  // Update orderbook display if on that page and same symbol
  if(sym === obSym && document.querySelector('#page-orderbook.on')){
    renderLiveOrderbook(sym);
  }
}

function renderLiveOrderbook(sym){
  const d = obLiveData[sym];
  if(!d) return;
  
  const bidsEl = document.getElementById('ob-bids');
  const asksEl = document.getElementById('ob-asks');
  const spreadEl = document.getElementById('ob-spread');
  if(!bidsEl || !asksEl) return;

  const maxSize = Math.max(
    ...d.bids.slice(0,15).map(b=>b.size),
    ...d.asks.slice(0,15).map(a=>a.size),
    0.001
  );

  const rowHTML = (level, side) => {
    const pct = Math.min((level.size / maxSize) * 100, 100);
    const col = side === 'bid' ? '#22d3a5' : '#f43f5e';
    const price = parseFloat(level.price);
    const size  = parseFloat(level.size);
    const usd   = (price * size).toFixed(0);
    return `<div class="ob-row ob-${side}" style="position:relative">
      <div style="position:absolute;${side==='bid'?'right':'left'}:0;top:0;bottom:0;width:${pct}%;background:${col}12;pointer-events:none"></div>
      <span class="ob-price" style="color:${col}">${fmtPrice(level.price)}</span>
      <span class="ob-size">${size.toFixed(4)}</span>
      <span class="ob-usd">$${Number(usd).toLocaleString()}</span>
    </div>`;
  };

  bidsEl.innerHTML = d.bids.slice(0,15).map(b => rowHTML(b,'bid')).join('');
  asksEl.innerHTML = d.asks.slice(0,15).reverse().map(a => rowHTML(a,'ask')).join('');

  if(d.bids.length && d.asks.length && spreadEl){
    const spread = d.asks[0].price - d.bids[0].price;
    const spreadPct = (spread / d.bids[0].price * 100).toFixed(4);
    spreadEl.textContent = `Spread: $${spread.toFixed(2)} (${spreadPct}%)`;
  }
}

function initOrderbook(){
  const btns=$('ob-sym-btns'); if(!btns) return;
  // All available symbols — no limit
  const syms=Object.keys(prices);
  if(!syms.length){ setTimeout(initOrderbook,1000); return; }
  if(!syms.includes(obSym)) obSym=syms[0];
  btns.innerHTML='';
  syms.forEach(s=>{
    const b=document.createElement('div');
    b.className='ob-sym-btn'+(s===obSym?' on':'');
    b.textContent=s;
    b.onclick=()=>{
      obSym=s;
      document.querySelectorAll('.ob-sym-btn').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      renderOBFallback();
      // Subscribe to real orderbook
      if(ws && ws.readyState===1){
        ws.send(JSON.stringify({method:'subscribe',params:{source:'book',symbol:s,agg_level:1}}));
      }
    };
    btns.appendChild(b);
  });
  clearInterval(obTimer);
  // Subscribe to real book data immediately
  if(ws && ws.readyState===1){
    ws.send(JSON.stringify({method:'subscribe',params:{source:'book',symbol:obSym,agg_level:1}}));
  }
  renderOBFallback();
  obTimer=setInterval(renderOBFallback,2000);
  setTimeout(initObChart,300);
}

function renderOBFallback(){
  const p=prices[obSym]; if(!p||!p.mark) return;
  // Check if we have real WS book data first
  if(obLiveData[obSym] && obLiveData[obSym].bids.length > 0){
    renderLiveOrderbook(obSym);
    return;
  }
  // No real book data yet — subscribe and show waiting
  if(ws && ws.readyState===1){
    ws.send(JSON.stringify({method:'subscribe',params:{source:'book',symbol:obSym,agg_level:1}}));
  }
  $('ob-sym-lbl').textContent=obSym;
  $('ob-spread').textContent='Waiting for WS book data...';
}

function renderOB(data){
  const asks=data.asks||[]; const bids=data.bids||[];
  $('ob-sym-lbl').textContent=obSym;
  const bidDepth=bids.reduce((s,r)=>s+parseFloat(r[1])*parseFloat(r[0]),0);
  const askDepth=asks.reduce((s,r)=>s+parseFloat(r[1])*parseFloat(r[0]),0);
  const tot=bidDepth+askDepth||1;
  const bidPct=bidDepth/tot*100;
  const askPct=100-bidPct;
  $('ob-bid-bar').style.width=bidPct.toFixed(1)+'%';
  $('ob-ask-bar').style.width=askPct.toFixed(1)+'%';
  $('ob-bid-pct').textContent=bidPct.toFixed(1)+'%';
  $('ob-ask-pct').textContent=askPct.toFixed(1)+'%';
  $('ob-bid-depth').textContent='$'+fmt(bidDepth);
  $('ob-ask-depth').textContent='$'+fmt(askDepth);
  const bestAsk=asks.length?parseFloat(asks[0][0]):0;
  const bestBid=bids.length?parseFloat(bids[0][0]):0;
  $('ob-spread').textContent=(bestAsk&&bestBid)?((bestAsk-bestBid)/bestBid*100).toFixed(4)+'%':'—';
  const imb=bidPct-50;
  const sig=$('ob-signal');
  if(imb>15){sig.textContent='🟢 Strong bid pressure — bullish signal';sig.className='gn';}
  else if(imb>5){sig.textContent='🟡 Mild bid dominance';sig.className='yw';}
  else if(imb<-15){sig.textContent='🔴 Strong ask pressure — bearish signal';sig.className='rd';}
  else if(imb<-5){sig.textContent='🟡 Mild ask dominance';sig.className='yw';}
  else{sig.textContent='⚪ Balanced — no clear directional bias';sig.className='dim';}
  obHistory.push({t:Date.now(),bid:+bidPct.toFixed(1)});
  if(obHistory.length>60) obHistory.shift();
  updateObChart();
  const maxA=Math.max(...asks.map(r=>parseFloat(r[1])*parseFloat(r[0])))||1;
  const maxB=Math.max(...bids.map(r=>parseFloat(r[1])*parseFloat(r[0])))||1;
  const asksEl=$('ob-asks'); const bidsEl=$('ob-bids');
  if(!asksEl||!bidsEl) return;
  asksEl.innerHTML='';
  [...asks].slice(0,20).reverse().forEach(r=>{
    const sz=parseFloat(r[1])*parseFloat(r[0]);
    const pct=(sz/maxA*80);
    const row=document.createElement('div');
    row.className='ob-row ask';
    row.innerHTML=`<div class="ob-row-bg" style="width:${pct}%;right:0;left:auto"></div>
      <span class="rd">${r[0]}</span>
      <span class="dim" style="text-align:right">${r[1]}</span>`;
    asksEl.appendChild(row);
  });
  bidsEl.innerHTML='';
  bids.slice(0,20).forEach(r=>{
    const sz=parseFloat(r[1])*parseFloat(r[0]);
    const pct=(sz/maxB*80);
    const row=document.createElement('div');
    row.className='ob-row bid';
    row.innerHTML=`<div class="ob-row-bg" style="width:${pct}%"></div>
      <span class="gn">${r[0]}</span>
      <span class="dim" style="text-align:right">${r[1]}</span>`;
    bidsEl.appendChild(row);
  });
}

function initObChart(){
  const canvas=$('ob-history-chart'); if(!canvas||!window.Chart) return;
  if(obChartInst){ obChartInst.destroy(); }
  obChartInst=new window.Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:[],datasets:[
      {label:'Bid %',data:[],borderColor:'#3fb950',backgroundColor:'rgba(0,229,153,.06)',fill:true,tension:.3,borderWidth:1.5,pointRadius:0},
      {label:'50%',data:[],borderColor:'rgba(100,136,168,.35)',borderDash:[4,4],borderWidth:1,pointRadius:0,fill:false},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxTicksLimit:8,maxRotation:0},grid:{color:'rgba(48,54,61,.5)'}},
        y:{min:20,max:80,ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v+'%'},grid:{color:'rgba(48,54,61,.5)'}},
      }}
  });
}

function updateObChart(){
  if(!obChartInst||!obHistory.length) return;
  obChartInst.data.labels=obHistory.map(h=>new Date(h.t).toLocaleTimeString());
  obChartInst.data.datasets[0].data=obHistory.map(h=>h.bid);
  obChartInst.data.datasets[1].data=obHistory.map(()=>50);
  obChartInst.update('none');
}

