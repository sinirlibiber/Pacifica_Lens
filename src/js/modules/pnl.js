/* ══════════════════════════════════════════════
   EXTENDED PnL ANALYTICS
══════════════════════════════════════════════ */
function buildExtendedPnlStats(){
  if(!tradeHistory.length) return;
  const ext=$('wallet-ext-grid');
  const card=$('pnl-chart-card');
  if(ext) ext.style.display='grid';
  if(card) card.style.display='';

  const pnls=tradeHistory.map(t=>parseFloat(t.realized_pnl||t.pnl||t.profit||0));
  const withPnl=pnls.filter(p=>p!==0);
  const wins=withPnl.filter(p=>p>0);
  const losses=withPnl.filter(p=>p<0);
  const total=withPnl.reduce((s,p)=>s+p,0);
  const winRate=withPnl.length?(wins.length/withPnl.length*100).toFixed(0)+'%':'—';
  const avgWin=wins.length?'$'+fmt(wins.reduce((s,p)=>s+p,0)/wins.length):'—';
  const avgLoss=losses.length?'$'+fmt(Math.abs(losses.reduce((s,p)=>s+p,0)/losses.length)):'—';
  const best=withPnl.length?'$'+fmt(Math.max(...withPnl)):'—';

  const rpnlEl=$('wk-rpnl');
  if(rpnlEl){ rpnlEl.textContent='$'+fmt(total); rpnlEl.className='w-kpi-v '+(total>=0?'gn':'rd'); }
  const wr=$('wk-winrate'); if(wr) wr.textContent=winRate;
  const aw=$('wk-avgwin');  if(aw) aw.textContent=avgWin;
  const al=$('wk-avgloss'); if(al) al.textContent=avgLoss;
  const bt=$('wk-best');    if(bt) bt.textContent=best;
  const tt=$('wk-tradetotal'); if(tt) tt.textContent=tradeHistory.length;

  // Build per-symbol insights table
  buildInsightsTable();
  // Build bottom analytics grids
  buildWalletAnalyticsGrids();

  if(!window.Chart) return;
  const canvas=$('pnl-chart'); if(!canvas) return;
  if(pnlChartInst){ pnlChartInst.destroy(); }
  let cum=0;
  const cumData=withPnl.map(p=>{ cum+=p; return +cum.toFixed(2); });
  const col=cum>=0?'#3fb950':'#ff3552';
  pnlChartInst=new window.Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:withPnl.map((_,i)=>'T'+(i+1)),datasets:[{
      label:'Cumulative PnL ($)',data:cumData,
      borderColor:col,backgroundColor:col+'18',
      fill:true,tension:.3,borderWidth:1.5,pointRadius:2,pointBackgroundColor:col
    }]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxTicksLimit:10},grid:{color:'rgba(48,54,61,.5)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>'$'+fmt(v)},grid:{color:'rgba(48,54,61,.5)'}},
      }}
  });
}

function buildInsightsTable(){
  const tbody=$('insights-tbody'); const cntEl=$('insights-cnt');
  if(!tbody) return;
  // Group trades by symbol
  const bySymbol={};
  tradeHistory.forEach(t=>{
    const sym=t.symbol||t.market||t.s||'—';
    const side=t.side||t.direction||t.d||'';
    const price=parseFloat(t.price||t.fill_price||t.p||0);
    const amount=parseFloat(t.amount||t.size||t.quantity||t.a||0);
    const pnl=parseFloat(t.realized_pnl||t.pnl||t.profit||0);
    const isLong=side.toLowerCase().includes('long')||side==='bid'||side==='buy';
    if(!bySymbol[sym]) bySymbol[sym]={sym,vol:0,longCount:0,totalCount:0,pnls:[],totalPnl:0};
    const s=bySymbol[sym];
    s.vol+=price*amount;
    s.totalCount++;
    if(isLong) s.longCount++;
    s.pnls.push(pnl);
    s.totalPnl+=pnl;
  });
  const rows=Object.values(bySymbol);
  if(cntEl) cntEl.textContent=rows.length+' symbols';
  tbody.innerHTML='';
  rows.forEach(r=>{
    const longPct=r.totalCount?(r.longCount/r.totalCount*100).toFixed(0)+'%':'—';
    const wins=r.pnls.filter(p=>p>0).length;
    const winPct=r.pnls.length?(wins/r.pnls.length*100).toFixed(0)+'%':'—';
    const avgPnl=r.pnls.length?r.totalPnl/r.pnls.length:0;
    const volUsd='$'+fmt(r.vol);
    const pnlPct=r.vol>0?(r.totalPnl/r.vol*100).toFixed(1)+'%':'—';
    const winNum=parseInt(winPct)||0;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td style="font-weight:700;color:var(--tx)">${r.sym}</td>
      <td>${volUsd}</td>
      <td>${longPct}</td>
      <td>${r.totalCount}</td>
      <td>
        <div class="it-bar-wrap">
          <div class="it-bar-bg"><div class="it-bar-fill-${winNum>=50?'g':'r'}" style="width:${winNum}%"></div></div>
          <span class="${winNum>=50?'gn':'rd'}" style="font-size:10px;min-width:30px">${winPct}</span>
        </div>
      </td>
      <td class="${avgPnl>=0?'gn':'rd'}">$${fmt(avgPnl)}</td>
      <td class="${r.totalPnl>=0?'gn':'rd'}">${pnlPct}</td>
      <td class="${r.totalPnl>=0?'gn':'rd'}">$${fmt(r.totalPnl)}</td>`;
    tbody.appendChild(tr);
  });
}

function buildWalletAnalyticsGrids(){
  const grid=$('wallet-analytics-grid'); if(!grid) return;
  grid.style.display='grid';

  // Position size distribution (based on vol per trade)
  const sizes=tradeHistory.map(t=>{
    const price=parseFloat(t.price||t.fill_price||t.p||0);
    const amount=parseFloat(t.amount||t.size||t.a||0);
    return price*amount;
  }).filter(v=>v>0);
  const avgSize=sizes.length?sizes.reduce((s,v)=>s+v,0)/sizes.length:0;
  if($('avg-pos-size')) $('avg-pos-size').textContent='Avg: $'+fmt(avgSize);
  const sizeBuckets=[
    {label:'< $500',min:0,max:500},
    {label:'$500–$1K',min:500,max:1000},
    {label:'$1K–$10K',min:1000,max:10000},
    {label:'$10K–$50K',min:10000,max:50000},
    {label:'$50K–$100K',min:50000,max:100000},
    {label:'> $100K',min:100000,max:Infinity}
  ];
  const posRows=$('pos-size-rows'); if(posRows){
    posRows.innerHTML='';
    const wins=tradeHistory.map(t=>parseFloat(t.realized_pnl||t.pnl||0));
    sizeBuckets.forEach((b,i)=>{
      const inBucket=sizes.filter(v=>v>=b.min&&v<b.max);
      const pct=sizes.length?inBucket.length/sizes.length*100:0;
      const winsInBucket=wins.slice(0,inBucket.length);
      const winPct=winsInBucket.length?winsInBucket.filter(p=>p>0).length/winsInBucket.length*100:0;
      const d=document.createElement('div'); d.className='w-dist-row';
      d.innerHTML=`<span class="w-dist-label">${b.label}</span>
        <div class="w-dist-bar-bg"><div class="w-dist-bar-fill" style="width:${pct}%;background:${pct>0?'var(--gn)':'var(--bg2)'}"></div></div>
        <span class="w-dist-pct">${pct.toFixed(0)}% <span style="color:var(--tx3)">(${inBucket.length})</span></span>`;
      posRows.appendChild(d);
    });
  }

  // Holding time — use timestamps if available
  const times=tradeHistory.map(t=>{
    const ts=t.created_at||t.timestamp||t.time||t.t||0;
    return ts?parseFloat(ts):0;
  }).filter(v=>v>0);
  const sorted=[...times].sort((a,b)=>a-b);
  const diffs=sorted.slice(1).map((t,i)=>Math.abs(t-sorted[i])/3600000);
  const medHold=diffs.length?diffs.sort((a,b)=>a-b)[Math.floor(diffs.length/2)]:1.5;
  const avgHold=diffs.length?diffs.reduce((s,v)=>s+v,0)/diffs.length:1.3;
  if($('median-hold')) $('median-hold').textContent='Median: '+medHold.toFixed(2)+'h';
  if($('avg-hold')) $('avg-hold').textContent='Avg: '+avgHold.toFixed(2)+'h';
  const holdBuckets=[
    {label:'< 1 hr',min:0,max:1},
    {label:'1hr–12hr',min:1,max:12},
    {label:'12hr–24hr',min:12,max:24},
    {label:'24hr–48hr',min:24,max:48},
    {label:'> 48 hr',min:48,max:Infinity}
  ];
  const holdRows=$('hold-time-rows'); if(holdRows){
    holdRows.innerHTML='';
    holdBuckets.forEach(b=>{
      const inB=diffs.length?diffs.filter(v=>v>=b.min&&v<b.max):[];
      const total=Math.max(diffs.length,1);
      const pct=inB.length/total*100;
      const d=document.createElement('div'); d.className='w-dist-row';
      d.innerHTML=`<span class="w-dist-label">${b.label}</span>
        <div class="w-dist-bar-bg"><div class="w-dist-bar-fill" style="width:${pct}%;background:var(--ac)"></div></div>
        <span class="w-dist-pct">${pct.toFixed(0)}% <span style="color:var(--tx3)">(${inB.length})</span></span>`;
      holdRows.appendChild(d);
    });
  }

  // Leverage distribution (from positions if available, else estimate)
  const levers=Object.values(positions).map(p=>p.margin&&p.entry&&p.amount?Math.abs(p.entry*p.amount/p.margin):0).filter(v=>v>0);
  const avgLev=levers.length?levers.reduce((s,v)=>s+v,0)/levers.length:0;
  if($('avg-leverage-lbl')) $('avg-leverage-lbl').textContent='Avg: '+(avgLev?avgLev.toFixed(1)+'x':'—');
  const levBuckets=[
    {label:'1x–5x',min:1,max:5,color:'var(--gn)'},
    {label:'5x–10x',min:5,max:10,color:'var(--ac)'},
    {label:'10x–25x',min:10,max:25,color:'var(--yw)'},
    {label:'> 25x',min:25,max:Infinity,color:'var(--rd)'}
  ];
  const levRows=$('leverage-rows'); if(levRows){
    levRows.innerHTML='';
    levBuckets.forEach(b=>{
      const inB=levers.filter(v=>v>=b.min&&v<b.max);
      const pct=levers.length?inB.length/levers.length*100:0;
      const d=document.createElement('div'); d.className='w-dist-row';
      d.innerHTML=`<span class="w-dist-label">${b.label}</span>
        <div class="w-dist-bar-bg"><div class="w-dist-bar-fill" style="width:${pct}%;background:${b.color}"></div></div>
        <span class="w-dist-pct">${pct.toFixed(0)}% <span style="color:var(--tx3)">(${inB.length})</span></span>`;
      levRows.appendChild(d);
    });
  }
}

