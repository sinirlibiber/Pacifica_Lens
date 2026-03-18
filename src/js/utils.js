/* ══════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
function fmt(n,d=2){
  const v=parseFloat(n);if(isNaN(v))return'—';
  if(Math.abs(v)>=1e9)return(v/1e9).toFixed(1)+'B';
  if(Math.abs(v)>=1e6)return(v/1e6).toFixed(1)+'M';
  if(Math.abs(v)>=1e3)return(v/1e3).toFixed(1)+'K';
  return v.toFixed(d);
}
function fmtP(n){
  const v=parseFloat(n);if(isNaN(v)||v===0)return'—';
  if(v>=10000)return'$'+Math.round(v).toLocaleString();
  if(v>=100)return'$'+v.toFixed(1);
  if(v>=1)return'$'+v.toFixed(3);
  return'$'+v.toFixed(5);
}
function timeAgo(ms){
  const s=Math.floor((Date.now()-ms)/1000);
  if(s<60)return s+'s';if(s<3600)return Math.floor(s/60)+'m';return Math.floor(s/3600)+'h';
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function rateColor(r){
  if(r>0){const t=clamp(r/0.001,0,1);return`rgb(${Math.round(lerp(20,0,t))},${Math.round(lerp(50,229,t))},${Math.round(lerp(60,100,t))})`}
  const t=clamp(-r/0.001,0,1);return`rgb(${Math.round(lerp(20,220,t))},${Math.round(lerp(50,40,t))},${Math.round(lerp(60,60,t))})`;
}
async function fetchJ(url){const r=await fetch(url);if(!r.ok)throw new Error(r.status);return r.json()}


