/* ══════════════════════════════════════════════
   ARBITRAGE
══════════════════════════════════════════════ */
function renderArbTable(){
  const tbody=$('arb-tbody');if(!tbody)return;
  const syms=Object.keys(prices);if(!syms.length)return;

  const pairs=[];
  for(let i=0;i<syms.length;i++)
    for(let j=i+1;j<syms.length;j++){
      const a=syms[i],b=syms[j];
      const ra=prices[a].funding,rb=prices[b].funding;
      const spread=Math.abs(ra-rb);
      if(spread>0.00003) pairs.push({a,b,ra,rb,spread,
        longSym:ra<=rb?a:b, shortSym:ra>rb?a:b,
        longFR:Math.min(ra,rb), shortFR:Math.max(ra,rb)});
    }
  pairs.sort((x,y)=>y.spread-x.spread);
  tbody.innerHTML='';
  pairs.slice(0,10).forEach(p=>{
    const apr=(p.spread*3*365*100);
    const signal=apr>100?'🔥 HIGH':apr>30?'⚡ MED':'● LOW';
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td style="font-weight:700;color:var(--gn)">${p.longSym}</td>
      <td style="font-weight:700;color:var(--rd)">${p.shortSym}</td>
      <td class="gn">${(p.longFR*100).toFixed(4)}%</td>
      <td class="rd">${(p.shortFR*100).toFixed(4)}%</td>
      <td class="yw">${(p.spread*100).toFixed(4)}%</td>
      <td class="yw" style="font-weight:700">${apr.toFixed(1)}%</td>
      <td>${signal}</td>`;
    tbody.appendChild(tr);
  });
  if(!pairs.length)
    tbody.innerHTML=`<tr><td colspan="7" style="padding:14px;font-family:var(--mono);font-size:10px;color:var(--tx3)">Loading market data...</td></tr>`;
}

function renderArbBestOpportunity(){
  const syms=Object.keys(prices);if(syms.length<2)return;
  let best=null,bestSpread=0;
  let totalApr=0, pairCount=0;
  const MIN_SPREAD=0.00003;
  for(let i=0;i<syms.length;i++)
    for(let j=i+1;j<syms.length;j++){
      const ra=prices[syms[i]].funding,rb=prices[syms[j]].funding;
      const s=Math.abs(ra-rb);
      if(s>=MIN_SPREAD){
        totalApr+=(s*3*365*100);
        pairCount++;
        if(s>bestSpread){bestSpread=s;best={a:syms[i],b:syms[j],ra,rb,s};}
      }
    }
  if(!best)return;
  const apr=(best.s*3*365*100);
  const monthly=apr/12;

  // Track spread history for chart
  spreadHistory.push({t:Date.now(),apr,pair:`${best.a}/${best.b}`});
  if(spreadHistory.length>120) spreadHistory.shift();
  updateSpreadChart();

  // Performance metrics
  arbTotalFound++;
  if(apr>arbBestApr) arbBestApr=apr;
  const avgApr=pairCount>0?(totalApr/pairCount):0;
  const simProfit=(apr/100/12)*10000; // 30-day on $10K
  const el_tot=$('perf-total'); if(el_tot) el_tot.textContent=pairCount;
  const el_avg=$('perf-avg-apr'); if(el_avg){ el_avg.textContent=avgApr.toFixed(1)+'%'; el_avg.className='s-val '+(avgApr>30?'gn':'yw'); }
  const el_best=$('perf-best-apr'); if(el_best) el_best.textContent=arbBestApr.toFixed(1)+'%';
  const el_sim=$('perf-sim-profit'); if(el_sim) el_sim.textContent='$'+fmt(simProfit);
  const el_pairs=$('perf-pairs'); if(el_pairs) el_pairs.textContent=pairCount;

  // Overview card
  $('st-arb').textContent=apr.toFixed(1)+'%';
  $('st-arb-sub').textContent=`${best.a} vs ${best.b}`;
  const bodyEl=$('strat-body');
  if(bodyEl) bodyEl.textContent=`Long ${best.ra<=best.rb?best.a:best.b} (${((Math.min(best.ra,best.rb))*100).toFixed(4)}%/8h) — Short ${best.ra>best.rb?best.a:best.b} (${(Math.max(best.ra,best.rb)*100).toFixed(4)}%/8h). Collect ${(best.s*100).toFixed(4)}%/8h spread on a delta-neutral position.`;
  const aprEl=$('strat-apr');if(aprEl) aprEl.textContent=apr.toFixed(1)+'%';
  const mEl=$('strat-monthly');if(mEl) mEl.textContent=monthly.toFixed(2)+'%';
  const rEl=$('strat-risk');if(rEl){rEl.textContent=apr>50?'Medium':'Low';rEl.className='strat-mv '+(apr>50?'yw':'gn');}
  const bEl=$('strat-badge');if(bEl) bEl.textContent=`${best.a} / ${best.b}`;

  // Trigger alerts if configured
  const alertMsg=`🔥 Pacifica Arb Alert\nPair: ${best.a} / ${best.b}\nAPR: ${apr.toFixed(1)}%\nMonthly: ${monthly.toFixed(2)}%\nSpread: ${(best.s*100).toFixed(4)}%/8h\nLong ${best.ra<=best.rb?best.a:best.b} | Short ${best.ra>best.rb?best.a:best.b}`;
  maybeSendTgAlert(apr, alertMsg);
  maybeSendDcAlert(apr, alertMsg, best);
}

/* ══════════════════════════════════════════════
   SPREAD HISTORY CHART
══════════════════════════════════════════════ */
function initSpreadChart(){
  const canvas=$('spread-chart');if(!canvas||!window.Chart)return;
  if(spreadChartInst){spreadChartInst.destroy();}
  spreadChartInst=new window.Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:[],datasets:[
      {label:'Best Spread APR %',data:[],borderColor:'#e3b341',backgroundColor:'rgba(255,208,96,.07)',fill:true,tension:.3,borderWidth:1.5,pointRadius:0},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7d8590',font:{family:'monospace',size:9}}}},
      scales:{
        x:{ticks:{color:'#484f58',font:{family:'monospace',size:7},maxTicksLimit:10,maxRotation:0},grid:{color:'rgba(48,54,61,.5)'}},
        y:{ticks:{color:'#484f58',font:{family:'monospace',size:7},callback:v=>v.toFixed(0)+'%'},grid:{color:'rgba(48,54,61,.5)'}},
      }}
  });
}

function updateSpreadChart(){
  if(!spreadChartInst){initSpreadChart();if(!spreadChartInst)return;}
  spreadChartInst.data.labels=spreadHistory.map(h=>new Date(h.t).toLocaleTimeString());
  spreadChartInst.data.datasets[0].data=spreadHistory.map(h=>+h.apr.toFixed(2));
  const lbl=$('spread-chart-lbl');
  if(lbl&&spreadHistory.length){lbl.textContent=spreadHistory[spreadHistory.length-1].pair;}
  spreadChartInst.update('none');
}

