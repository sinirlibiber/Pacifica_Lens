/* ══════════════════════════════════════════════
   AI ASSISTANT
══════════════════════════════════════════════ */
function updateAiContext(){
  const ctx=$('ai-context');if(!ctx)return;
  const top=Object.entries(prices).sort((a,b)=>Math.abs(b[1].funding)-Math.abs(a[1].funding)).slice(0,5);
  if(!top.length){ctx.textContent='Waiting for market data...';return;}
  ctx.innerHTML=top.map(([sym,p])=>`
    <span style="color:var(--tx2)">${sym}</span> mark:<span class="ac">${fmtP(p.mark)}</span>
    fr:<span class="${p.funding>=0?'gn':'rd'}">${(p.funding*100).toFixed(4)}%</span><br>`).join('');
}

function setPrompt(text){
  $('chat-inp').value=text;
  $('chat-inp').focus();
}

function addMsg(role,text){
  const msgs=$('chat-msgs');
  const div=document.createElement('div');
  div.className='msg '+role;
  div.innerHTML=`<div class="msg-bubble">${text.replace(/\n/g,'<br>')}</div>
    <div class="msg-meta">${role==='user'?'You':'Elfa AI'} · ${new Date().toLocaleTimeString()}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
  return div;
}

function showTyping(){
  const msgs=$('chat-msgs');
  const div=document.createElement('div');
  div.className='msg ai';div.id='typing-ind';
  div.innerHTML=`<div class="typing"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}

function removeTyping(){ const el=$('typing-ind');if(el)el.remove(); }

async function sendChat(){
  const inp=$('chat-inp');
  const text=inp.value.trim();
  if(!text) return;

  addMsg('user',text);
  inp.value='';
  $('btn-send').disabled=true;

  // Build market context
  const top=Object.entries(prices).sort((a,b)=>Math.abs(b[1].funding)-Math.abs(a[1].funding)).slice(0,6);
  const mktCtx=top.map(([sym,p])=>`${sym}: mark=$${p.mark?.toFixed(0)}, funding=${(p.funding*100).toFixed(4)}%/8h (${(p.funding*3*365*100).toFixed(0)}% APR)`).join('\n');

  const systemPrompt=`You are an expert crypto trading assistant specializing in perpetual futures, funding rates, and DeFi. You have access to real-time Pacifica exchange data.

Current Pacifica Market Data:
${mktCtx}

${Object.keys(positions).length>0?`Connected wallet has ${Object.keys(positions).length} open positions: ${Object.keys(positions).join(', ')}`:''}

Provide concise, actionable trading intelligence. Focus on funding rate strategies, market sentiment, and risk management. Be specific with numbers when discussing the provided market data.`;

  chatHistory.push({role:'user',content:text});
  showTyping();

  try{
    const r=await fetch(C.ELFA_PROXY+'?endpoint=v2%2Fchat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:text,system:systemPrompt,history:chatHistory.slice(-6)})
    });
    const d=await r.json();
    removeTyping();
    const reply=d.data?.response||d.response||d.message||d.content||
      d.data?.content?.[0]?.text||'Sorry, I could not get a response. Make sure ELFA_API_KEY is set.';
    chatHistory.push({role:'assistant',content:reply});
    addMsg('ai',reply);
  }catch(e){
    removeTyping();
    addMsg('ai','⚠️ Could not reach Elfa AI. Check that ELFA_API_KEY is configured in Vercel environment variables, or try again.');
  }
  $('btn-send').disabled=false;
  inp.focus();
}

