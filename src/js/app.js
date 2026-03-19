/* ── Chart.js Arctic Frost Theme ── */
document.addEventListener('DOMContentLoaded', function(){
  if(window.Chart){
    window.Chart.defaults.color = '#94a3b8';
    window.Chart.defaults.borderColor = '#e2e8f0';
    window.Chart.defaults.font = {family:"'JetBrains Mono', ui-monospace, monospace", size:9};
    setTimeout(()=>{
      if(document.querySelector('#page-overview.on')) initOverviewCharts();
      if(document.querySelector('#page-analytics.on')) initCharts();
    }, 300);
  }
});


/* ══════════════════════════════════════════════
   TABS — 5 main tabs (dropdown tabs handled by dashboard.js)
══════════════════════════════════════════════ */
document.querySelectorAll('.tab:not(.has-dropdown)').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');

    const tab = t.dataset.tab;
    const pageEl = document.getElementById('page-'+tab);
    if(pageEl) pageEl.classList.add('on');

    if(tab==='overview'){
      setTimeout(()=>{
        renderAlerts();
        renderArbBestOpportunity();
        if(window.Chart) initOverviewCharts();
        if(typeof updateDashMarketsTable==='function') updateDashMarketsTable();
        if(typeof updateDashFRTable==='function') updateDashFRTable();
      },100);
    }
    if(tab==='markets'){ initIntelPage(); }
    if(tab==='liquidation') initLiquidation();
  });
});


/* ══════════════════════════════════════════════
   TIMESTAMP + TOAST
══════════════════════════════════════════════ */
setInterval(()=>{ $('ts').textContent=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); },1000);

function showToast(msg,dur=3000){
  const t=document.createElement('div');
  t.className='toast';t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),dur);
}


/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
const cs=document.createElement('script');
cs.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
cs.onload=()=>{
  window._chartJsLoaded = true;
  window.Chart.defaults.color = '#94a3b8';
  window.Chart.defaults.borderColor = '#e2e8f0';
  if(document.querySelector('#page-analytics.on')) initCharts();
  else if(document.querySelector('#page-overview.on')) initOverviewCharts();
};
document.head.appendChild(cs);

connectWS();
setTimeout(seedMockPrices, 500);

document.addEventListener('click', function(e){
  const pill = e.target.closest('.mpill');
  if(!pill) return;
  document.querySelectorAll('.mpill').forEach(x=>x.classList.remove('on'));
  pill.classList.add('on');
  renderMarketsTable(pill.dataset.mcat);
});

document.addEventListener('click', function(e){
  const btn = e.target.closest('.cd-tf[data-tf]');
  if(!btn) return;
  document.querySelectorAll('.cd-tf[data-tf]').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const d = document._cdCoin;
  if(d){ initCoinDetailCharts(d.sym, d.coin, btn.dataset.tf); }
});

/* ══════════════════════════════════════════════
   SWITCH TAB HELPER — supports old tab names
══════════════════════════════════════════════ */
function switchTab(tabName){
  const tabMapping = {
    'wallet': { main: 'trading', sub: 'wallet' },
    'ai': { main: 'trading', sub: 'ai' },
    'arbitrage': { main: 'trading', sub: 'arbitrage' },
    'orderbook': { main: 'analytics', sub: 'orderbook' },
    'whale': { main: 'analytics', sub: 'whale' },
    'analytics-main': { main: 'analytics', sub: 'analytics-main' },
  };

  let mainTab = tabName;
  let subTab = null;

  if(tabMapping[tabName]){
    mainTab = tabMapping[tabName].main;
    subTab = tabMapping[tabName].sub;
  }

  // Switch main tabs
  document.querySelectorAll('.tab').forEach(t=>{
    t.classList.toggle('on', t.dataset.tab===mainTab);
  });
  document.querySelectorAll('.page').forEach(p=>{
    p.classList.toggle('on', p.id==='page-'+mainTab);
  });

  // Switch sub-pages and dropdown active states
  if(subTab){
    const page = document.getElementById('page-'+mainTab);
    if(page){
      page.querySelectorAll('.subpage').forEach(sp=> sp.classList.toggle('on', sp.id==='subpage-'+subTab));
    }
    const parentTab = document.querySelector('.tab[data-tab="'+mainTab+'"]');
    if(parentTab){
      parentTab.querySelectorAll('.tab-drop-item').forEach(di=> di.classList.toggle('on', di.dataset.subtab===subTab));
    }
  }

  // Init logic
  if(mainTab==='analytics') setTimeout(()=>{
    if(subTab==='orderbook') initOrderbook();
    else if(subTab==='whale') renderWhalePage();
    else { if(window.Chart) initCharts(); }
  },100);
  if(mainTab==='trading'){
    if(subTab==='arbitrage'){ setTimeout(()=>{ renderArbTable(); renderArbBestOpportunity(); initSpreadChart(); },150); }
    if(subTab==='ai') updateAiContext();
  }
  if(mainTab==='liquidation') initLiquidation();
  if(mainTab==='overview'){ setTimeout(()=>{ renderAlerts(); renderArbBestOpportunity(); if(window.Chart) initOverviewCharts(); },100); }
  if(mainTab==='markets') initIntelPage();
}
