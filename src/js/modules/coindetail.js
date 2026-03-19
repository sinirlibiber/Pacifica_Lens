/* ═══════════════════════════════════════════
   COIN DETAIL PAGE
═══════════════════════════════════════════ */
const COIN_DESCS = {
  BTC:'Bitcoin is the first decentralized digital currency, created in 2009. It has a fixed limit of 21 million coins and works without banks or governments. Often called digital gold.',
  ETH:'Ethereum is a decentralized computing platform that enables smart contracts and decentralized applications (dApps). It introduced the concept of programmable blockchain.',
  SOL:'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale. Known for fast transactions and low fees.',
  BNB:'BNB is the native token of the BNB Chain ecosystem. Originally created as Binance Exchange token, it powers the largest exchange ecosystem in crypto.',
  DEFAULT:'A leading cryptocurrency asset in the digital economy ecosystem.',
};

function openCoinDetail(sym, name){
  let coin = MARKETS_COINS.find(c=>c.sym===sym) || {sym,name,price:0,chg24:0,rank:'—',mcap:0};
  // Switch to coin detail page
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.getElementById('page-coindetail').classList.add('on');

  // Subscribe to live price updates for this symbol
  if(ws && ws.readyState===1){
    try{ ws.send(JSON.stringify({method:'subscribe',params:{source:'trades',symbol:sym}})); }catch(e){}
  }
  // Poll live price from prices[] object every second while on coin detail
  clearInterval(window._cdPricePoller);
  window._cdPricePoller = setInterval(()=>{
    if(!document.getElementById('page-coindetail')?.classList.contains('on')){
      clearInterval(window._cdPricePoller); return;
    }
    const live = prices[sym]||prices[sym+'-USD'];
    if(!live||!live.mark) return;
    const priceEl=document.getElementById('cd-price');
    if(priceEl) priceEl.textContent=fmtPrice(live.mark);
  }, 1000);

  // Fill header
  document.getElementById('cd-name').textContent = name;
  document.getElementById('cd-symbol').textContent = sym;
  document.getElementById('cd-rank').textContent = '#'+coin.rank;
  document.getElementById('cd-price').textContent = fmtPrice(coin.price);
  const chgEl = document.getElementById('cd-chg24');
  chgEl.textContent = (coin.chg24>=0?'+':'')+coin.chg24.toFixed(2)+'%';
  chgEl.className = coin.chg24>=0?'gn':'rd';
  chgEl.style.cssText='font-size:13px;font-weight:600';

  // Logo
  const logoEl = document.getElementById('cd-logo');
  const imgUrl = COIN_IMG[sym] || '';
  if(imgUrl){ logoEl.src=imgUrl; logoEl.onerror=()=>{logoEl.style.display='none'}; }
  else logoEl.style.display='none';

  // Sidebar
  // about title removed
  // desc removed
  document.getElementById('cd-stat-rank').textContent = '#'+coin.rank;
  document.getElementById('cd-stat-mcap').textContent = fmtMcap(coin.mcap);
  document.getElementById('cd-stat-mcap-chg').textContent = (coin.chg24>=0?'+':'')+coin.chg24.toFixed(2)+'%';
  document.getElementById('cd-stat-mcap-chg').className = coin.chg24>=0?'gn':'rd';
  const supplyMap={BTC:'21.00M',ETH:'120.2M',SOL:'584M',BNB:'145M',XRP:'57.4B',DOGE:'145B',ADA:'35.6B',AVAX:'412M',DOT:'1.4B',LINK:'609M'};
  document.getElementById('cd-stat-supply').textContent = (supplyMap[sym]||'—')+' '+sym;
  document.getElementById('cd-perf-coin').textContent = sym;
  const glChgEl=document.getElementById('cd-gl-chg');
  if(glChgEl){glChgEl.textContent=(coin.chg24>=0?'+':'')+coin.chg24.toFixed(2)+'%';glChgEl.style.color=coin.chg24>=0?'var(--gn)':'var(--rd)';}

  // Per-coin ATH data
  const ATH_DATA = {
    BTC:{ath:'$126,077',athPct:-25,ex:92,vol:'$34.58B',volChg:-0.68},
    ETH:{ath:'$4,878',athPct:-52,ex:86,vol:'$18.2B',volChg:1.2},
    SOL:{ath:'$295',athPct:-68,ex:64,vol:'$4.8B',volChg:2.1},
    BNB:{ath:'$793',athPct:-15,ex:42,vol:'$2.1B',volChg:-0.8},
    XRP:{ath:'$3.84',athPct:-60,ex:88,vol:'$3.2B',volChg:3.4},
    DOGE:{ath:'$0.73',athPct:-86,ex:58,vol:'$1.4B',volChg:-1.2},
    ADA:{ath:'$3.09',athPct:-83,ex:72,vol:'$0.9B',volChg:0.5},
    AVAX:{ath:'$147',athPct:-81,ex:68,vol:'$0.7B',volChg:1.8},
    LINK:{ath:'$52.70',athPct:-70,ex:78,vol:'$0.8B',volChg:2.4},
    DOT:{ath:'$54.98',athPct:-89,ex:66,vol:'$0.4B',volChg:-0.9},
  };
  const athInfo = ATH_DATA[sym] || {ath:'—',athPct:0,ex:30,vol:'—',volChg:0};
  const athEl = document.getElementById('cd-stat-ath');
  if(athEl) athEl.textContent = athInfo.ath;
  const athPctEl = athEl?.nextElementSibling;
  if(athPctEl){ athPctEl.textContent=athInfo.athPct+'%'; athPctEl.className='rd'; }
  const exEl = document.getElementById('cd-stat-exchanges');
  if(exEl) exEl.textContent = athInfo.ex;
  const volEl = document.getElementById('cd-stat-vol');
  if(volEl) volEl.textContent = athInfo.vol;
  const volChgEl = document.getElementById('cd-stat-vol-chg');
  if(volChgEl){ volChgEl.textContent=(athInfo.volChg>=0?'+':'')+athInfo.volChg.toFixed(2)+'%'; volChgEl.className=athInfo.volChg>=0?'gn':'rd'; }

  // Init charts with current data
  setTimeout(()=>{ initCoinDetailCharts(sym, coin, '1h'); }, 100);

  // Try to get fresh price from CoinGecko
  const geckoId = PACIFICA_GECKO_IDS[sym];
  if(geckoId){
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`)
      .then(r=>r.json()).then(d=>{
        const info = d[geckoId];
        if(!info) return;
        const freshCoin = {...coin, price:info.usd||coin.price, chg24:info.usd_24h_change||coin.chg24, mcap:info.usd_market_cap||coin.mcap};
        // Update displayed price
        const priceEl=document.getElementById('cd-price');
        const chgEl=document.getElementById('cd-chg24');
        if(priceEl) priceEl.textContent=fmtPrice(freshCoin.price);
        if(chgEl){chgEl.textContent=(freshCoin.chg24>=0?'+':'')+freshCoin.chg24.toFixed(2)+'%';chgEl.className=freshCoin.chg24>=0?'gn':'rd';}
        // Update stats
        const mcapEl=document.getElementById('cd-stat-mcap');
        const volEl=document.getElementById('cd-stat-vol');
        if(mcapEl) mcapEl.textContent=fmtMcap(freshCoin.mcap);
        if(volEl && info.usd_24h_vol) volEl.textContent='$'+(info.usd_24h_vol/1e9).toFixed(2)+'B';
        // Re-render chart with fresh data
        document._cdCoin = {sym, coin:freshCoin};
        const curTf = document.querySelector('.cd-tf[data-tf].on')?.dataset?.tf||'1h';
        initCoinDetailCharts(sym, freshCoin, curTf);
      }).catch(()=>{});
  }

  // Timeframe buttons — use data attribute on wrapper to avoid listener stacking
  document._cdCoin = {sym, coin};
}

let cdPriceChart=null, cdPerfChart=null, cdGlChart=null;

/* ═══════════════════════════════════════════
   REAL CHART DATA — Pacifica kline API
   Endpoint: /api/v1/kline?symbol=BTC&interval=1m&limit=60
═══════════════════════════════════════════ */
async function initCoinDetailCharts(sym, coin, tf='24h'){
  if(!window.Chart) return;

  // Show loading state
  const priceCtx = document.getElementById('cd-price-chart');
  const perfCtx  = document.getElementById('cd-perf-chart');
  const glCtx    = document.getElementById('cd-gl-chart');
  if(!priceCtx||!perfCtx||!glCtx) return;

  if(cdPriceChart) cdPriceChart.destroy();
  if(cdPerfChart)  cdPerfChart.destroy();
  if(cdGlChart)    cdGlChart.destroy();
  cdPriceChart = cdPerfChart = cdGlChart = null;

  const {interval, limit} = TF_INTERVAL[tf]||TF_INTERVAL['24h'];
  const priceColor = coin.chg24>=0?'#00e59e':'#ff4466';
  const priceFill  = coin.chg24>=0?'rgba(0,229,158,.08)':'rgba(255,68,102,.08)';
  const REST = 'https://api.pacifica.fi/api/v1';

  let closes=[], labels=[];

  try{
    // Try Pacifica kline endpoint
    const url = `/api/pacifica?path=kline&symbol=${sym}&interval=${interval}&limit=${limit}`;
    const alt  = `${REST}/kline?symbol=${sym}&interval=${interval}&limit=${limit}`;
    let raw = null;
    try{ raw = await fetchJ(url); }catch(e){ raw = await fetchJ(alt); }

    // Pacifica kline format: array of [timestamp, open, high, low, close, volume]
    // or array of objects with t/o/h/l/c/v fields
    if(Array.isArray(raw) && raw.length){
      const sample = raw[0];
      if(Array.isArray(sample)){
        closes = raw.map(r=>parseFloat(r[4]));
        labels  = raw.map(r=>fmtCandleTime(r[0], tf));
      } else {
        closes = raw.map(r=>parseFloat(r.c||r.close||r[4]||0));
        labels  = raw.map(r=>fmtCandleTime(r.t||r.time||r[0], tf));
      }
    }
  }catch(err){
    console.warn('kline fetch failed for',sym,err.message);
  }

  // Fallback: use sparkBuf from WebSocket if kline API failed
  if(closes.length < 5){
    if(sparkBuf[sym] && sparkBuf[sym].length > 5){
      closes = [...sparkBuf[sym]];
      labels  = closes.map((_,i)=>i.toString());
    } else {
      // No data available — show empty state, don't fake it
      const ctx = priceCtx.getContext('2d');
      ctx.clearRect(0,0,priceCtx.width,priceCtx.height);
      ctx.fillStyle='#484f58'; ctx.font='11px monospace'; ctx.textAlign='center';
      ctx.fillText('Waiting for price data from Pacifica...', priceCtx.width/2, priceCtx.height/2);
      return;
    }
  }

  // Update price display with last close
  const lastClose = closes[closes.length-1];
  const firstClose = closes[0];
  if(lastClose){
    const el = document.getElementById('cd-price');
    if(el) el.textContent = fmtPrice(lastClose);
    const chgPct = firstClose ? ((lastClose-firstClose)/firstClose*100) : coin.chg24;
    const chgEl = document.getElementById('cd-chg24');
    if(chgEl){
      chgEl.textContent = (chgPct>=0?'+':'')+chgPct.toFixed(2)+'%';
      chgEl.className = chgPct>=0?'gn':'rd';
      chgEl.style.cssText='font-size:13px;font-weight:600';
    }
  }

  const hi = Math.max(...closes), lo = Math.min(...closes);
  const hiEl = document.getElementById('cd-chart-hi');
  if(hiEl) hiEl.textContent = `H: ${fmtPrice(hi)}  L: ${fmtPrice(lo)}`;

  // ── Price chart ──────────────────────────────
  cdPriceChart = new Chart(priceCtx, {
    type:'line',
    data:{
      labels,
      datasets:[{
        data:closes,
        borderColor:priceColor,
        backgroundColor:priceFill,
        fill:true, tension:0.2,
        pointRadius:0, borderWidth:1.5,
        pointHoverRadius:4,
        pointHoverBackgroundColor:priceColor,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:300},
      plugins:{
        legend:{display:false},
        tooltip:{
          mode:'index', intersect:false,
          backgroundColor:'rgba(10,14,18,.95)',
          borderColor:'rgba(0,212,232,.3)', borderWidth:1,
          padding:10,
          callbacks:{
            title:ctx=>labels[ctx[0].dataIndex]||'',
            label:ctx=>{
              const v = ctx.raw;
              return ' '+fmtPrice(v);
            },
            labelColor:()=>({backgroundColor:priceColor, borderColor:priceColor})
          }
        }
      },
      scales:{
        x:{
          grid:{color:'rgba(28,40,48,.4)',drawBorder:false},
          ticks:{color:'#3a5060',font:{size:9},maxTicksLimit:8, maxRotation:0}
        },
        y:{
          grid:{color:'rgba(28,40,48,.4)',drawBorder:false},
          ticks:{color:'#3a5060',font:{size:9},
            callback:v=>fmtPrice(v)
          },
          position:'right'
        }
      }
    }
  });

  // Update x-axis time labels
  const xaxis = document.getElementById('cd-xaxis');
  if(xaxis){
    const step = Math.max(1, Math.floor(labels.length/7));
    xaxis.innerHTML = labels
      .filter((_,i)=>i%step===0)
      .map(l=>`<span>${l}</span>`).join('');
  }

  // ── Percent performance chart ─────────────────
  const perfPts  = closes.map(p=>firstClose?((p-firstClose)/firstClose*100):0);
  const perfColor= coin.chg24>=0?'#00e59e':'#ff4466';
  const perfFill = coin.chg24>=0?'rgba(0,229,158,.05)':'rgba(255,68,102,.05)';
  cdPerfChart = new Chart(perfCtx,{
    type:'line',
    data:{labels,datasets:[{
      label:sym,data:perfPts,
      borderColor:perfColor,backgroundColor:perfFill,
      fill:true,tension:0.2,pointRadius:0,borderWidth:1.5
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,
      animation:{duration:300},
      plugins:{
        legend:{display:false},
        tooltip:{
          mode:'index',intersect:false,
          backgroundColor:'rgba(10,14,18,.95)',
          borderColor:'rgba(0,212,232,.3)',borderWidth:1,
          callbacks:{label:ctx=>(ctx.raw>=0?'+':'')+ctx.raw.toFixed(2)+'%'}
        }
      },
      scales:{
        x:{grid:{color:'rgba(28,40,48,.4)'},ticks:{color:'#3a5060',font:{size:9},maxTicksLimit:8,maxRotation:0}},
        y:{grid:{color:'rgba(28,40,48,.4)'},ticks:{color:'#3a5060',font:{size:9},callback:v=>v.toFixed(1)+'%'},position:'right'}
      }
    }
  });

  // ── Gains/Losses bar chart (hourly candle change) ──
  const glPts   = closes.slice(-48).map((p,i,a)=>i===0?0:((p-a[i-1])/a[i-1]*100));
  const glColors= glPts.map(v=>v>=0?'rgba(0,229,158,.7)':'rgba(255,68,102,.7)');
  const glChgEl = document.getElementById('cd-gl-chg');
  if(glChgEl){
    const last = glPts[glPts.length-1]||0;
    glChgEl.textContent = (last>=0?'+':'')+last.toFixed(2)+'%';
    glChgEl.style.color = last>=0?'var(--gn)':'var(--rd)';
  }
  cdGlChart = new Chart(glCtx,{
    type:'bar',
    data:{labels:glPts.map((_,i)=>i+''),datasets:[{data:glPts,backgroundColor:glColors,borderWidth:0}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      animation:{duration:200},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>(ctx.raw>=0?'+':'')+ctx.raw.toFixed(3)+'%'}}},
      scales:{
        x:{grid:{display:false},ticks:{display:false}},
        y:{grid:{color:'rgba(28,40,48,.4)'},ticks:{color:'#3a5060',font:{size:9},callback:v=>v.toFixed(1)+'%'}}
      }
    }
  });
}

function fmtCandleTime(ts, tf){
  if(!ts) return '';
  const d = new Date(ts>1e12 ? ts : ts*1000);
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  if(['1h','3h','12h','24h'].includes(tf))
    return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
  if(['7d','30d'].includes(tf))
    return mon+' '+d.getDate();
  return d.getFullYear()+' '+mon;
}


function addPerfComparison(){
  const tags=document.getElementById('cd-perf-compare-tags');
  if(!tags) return;
  const options=['GOLD','SPX','NDX','ETH','SOL'];
  const existing=[...tags.querySelectorAll('.cd-perf-tag')].map(t=>t.dataset.comp);
  const next=options.find(o=>!existing.includes(o));
  if(!next) return;
  const span=document.createElement('span');
  span.className='cd-perf-tag';
  span.dataset.comp=next;
  span.innerHTML=next+' <span onclick="removePerfTag(this)" style="cursor:pointer;margin-left:4px;opacity:.6">×</span>';
  tags.appendChild(span);
}
function removePerfTag(el){ el.parentElement.remove(); }


