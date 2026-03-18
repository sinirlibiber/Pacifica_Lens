/* ══════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════ */
const C = {
  WS_URL:    'wss://ws.pacifica.fi/ws',
  REST_BASE: 'https://api.pacifica.fi/api/v1',
  ELFA_PROXY: '/api/elfa',
};

/* ══════════════════════════════════════════════
   COIN LOGOS — CoinGecko CDN
══════════════════════════════════════════════ */
// Maps common symbol → CoinGecko coin id
const COIN_IDS = {
  BTC:'bitcoin', ETH:'ethereum', SOL:'solana', BNB:'binancecoin',
  XRP:'ripple', DOGE:'dogecoin', ADA:'cardano', AVAX:'avalanche-2',
  DOT:'polkadot', LINK:'chainlink', UNI:'uniswap', MATIC:'matic-network',
  OP:'optimism', ARB:'arbitrum', LTC:'litecoin', BCH:'bitcoin-cash',
  ATOM:'cosmos', FIL:'filecoin', APT:'aptos', SUI:'sui',
  INJ:'injective-protocol', SEI:'sei-network', TIA:'celestia',
  NEAR:'near', FTM:'fantom', ALGO:'algorand', VET:'vechain',
  XLM:'stellar', HBAR:'hedera-hashgraph', ICP:'internet-computer',
  AAVE:'aave', CRV:'curve-dao-token', MKR:'maker', SNX:'synthetix-network-token',
  COMP:'compound-governance-token', YFI:'yearn-finance', SUSHI:'sushi',
  PEPE:'pepe', SHIB:'shiba-inu', FLOKI:'floki', WIF:'dogwifcoin',
  BONK:'bonk', POPCAT:'popcat', MEW:'cat-in-a-dogs-world',
  W:'wormhole', JUP:'jupiter-exchange-solana', PYTH:'pyth-network',
  TRUMP:'maga-hat', PUMP:'pump-fun', HYPE:'hyperliquid', PENGU:'pudgy-penguins',
  PAXG:'pax-gold', XAU:'pax-gold', XAG:'silver',
  HOOD:'robinhood', PIPPIN:'pippin',
};

// Fallback solid colors per symbol
const COIN_COLORS = {
  BTC:'#f7931a', ETH:'#627eea', SOL:'#9945ff', BNB:'#f0b90b',
  XRP:'#346aa9', DOGE:'#c2a633', ADA:'#0d1e2d', AVAX:'#e84142',
  DOT:'#e6007a', LINK:'#2a5ada', UNI:'#ff007a', MATIC:'#8247e5',
  OP:'#ff0420', ARB:'#12aaff', LTC:'#bfbbbb', BCH:'#8dc351',
  ATOM:'#2e3148', NEAR:'#00c08b', FTM:'#1969ff', PEPE:'#5dad4a',
  SHIB:'#ff8d00', TRUMP:'#c8222a', HYPE:'#7c3aed', PAXG:'#e5c84a',
  XAU:'#e5c84a', PUMP:'#ff6b35', SOL:'#9945ff', PENGU:'#4ac0e0',
  DEFAULT:'#38bdf8',
};

// Get logo URL from Pacifica CDN
function coinLogoUrl(sym) {
  return COIN_IMG[sym.toUpperCase()] || COIN_IMG[sym] || ('https://app.pacifica.fi/imgs/tokens/' + sym + '.svg');
}

// Pacifica CDN token logos — SVG format from app.pacifica.fi
const PACIFICA_CDN = 'https://app.pacifica.fi/imgs/tokens/';
const COIN_IMG = {
  BTC: PACIFICA_CDN+'BTC.svg', ETH: PACIFICA_CDN+'ETH.svg', SOL: PACIFICA_CDN+'SOL.svg',
  BNB: PACIFICA_CDN+'BNB.svg', XRP: PACIFICA_CDN+'XRP.svg', ADA: PACIFICA_CDN+'ADA.svg',
  AVAX: PACIFICA_CDN+'AVAX.svg', LINK: PACIFICA_CDN+'LINK.svg', LTC: PACIFICA_CDN+'LTC.svg',
  BCH: PACIFICA_CDN+'BCH.svg', AAVE: PACIFICA_CDN+'AAVE.svg', UNI: PACIFICA_CDN+'UNI.svg',
  CRV: PACIFICA_CDN+'CRV.svg', LDO: PACIFICA_CDN+'LDO.svg', JUP: PACIFICA_CDN+'JUP.svg',
  ZRO: PACIFICA_CDN+'ZRO.svg', ARB: PACIFICA_CDN+'ARB.svg', STRK: PACIFICA_CDN+'STRK.svg',
  TAO: PACIFICA_CDN+'TAO.svg', ICP: PACIFICA_CDN+'ICP.svg', NEAR: PACIFICA_CDN+'NEAR.svg',
  DOGE: PACIFICA_CDN+'DOGE.svg', PENGU: PACIFICA_CDN+'PENGU.svg', TRUMP: PACIFICA_CDN+'TRUMP.svg',
  kPEPE: PACIFICA_CDN+'kPEPE.svg', kBONK: PACIFICA_CDN+'kBONK.svg',
  FARTC: PACIFICA_CDN+'FARTCOIN.svg', FARTCOIN: PACIFICA_CDN+'FARTCOIN.svg',
  HYPE: PACIFICA_CDN+'HYPE.svg', PIPPIN: PACIFICA_CDN+'PIPPIN.svg', PUMP: PACIFICA_CDN+'PUMP.svg',
  VIRTU: PACIFICA_CDN+'VIRTUAL.svg', VIRTUAL: PACIFICA_CDN+'VIRTUAL.svg',
  ASTER: PACIFICA_CDN+'ASTER.svg', MON: PACIFICA_CDN+'MON.svg', MONAD: PACIFICA_CDN+'MON.svg',
  ENA: PACIFICA_CDN+'ENA.svg', SUI: PACIFICA_CDN+'SUI.svg',
  PAXG: PACIFICA_CDN+'PAXG.svg', XAU: PACIFICA_CDN+'XAU.svg', XAG: PACIFICA_CDN+'XAG.svg',
  HOOD: PACIFICA_CDN+'HOOD.svg', PLTR: PACIFICA_CDN+'PLTR.svg', NVDA: PACIFICA_CDN+'NVDA.svg',
  TSLA: PACIFICA_CDN+'TSLA.svg', GOOGL: PACIFICA_CDN+'GOOGL.svg',
  ZK: PACIFICA_CDN+'ZK.svg', ZEC: PACIFICA_CDN+'ZEC.svg', XMR: PACIFICA_CDN+'XMR.svg',
  DOT: PACIFICA_CDN+'DOT.svg', ATOM: PACIFICA_CDN+'ATOM.svg', FIL: PACIFICA_CDN+'FIL.svg',
  APT: PACIFICA_CDN+'APT.svg', OP: PACIFICA_CDN+'OP.svg', SEI: PACIFICA_CDN+'SEI.svg',
  TIA: PACIFICA_CDN+'TIA.svg', INJ: PACIFICA_CDN+'INJ.svg', PYTH: PACIFICA_CDN+'PYTH.svg',
  SHIB: PACIFICA_CDN+'SHIB.svg', FLOKI: PACIFICA_CDN+'FLOKI.svg',
  BONK: PACIFICA_CDN+'BONK.svg', WIF: PACIFICA_CDN+'WIF.svg', PEPE: PACIFICA_CDN+'PEPE.svg',
  MATIC: PACIFICA_CDN+'MATIC.svg', POL: PACIFICA_CDN+'POL.svg',
  MKR: PACIFICA_CDN+'MKR.svg', SNX: PACIFICA_CDN+'SNX.svg', COMP: PACIFICA_CDN+'COMP.svg',
  SUSHI: PACIFICA_CDN+'SUSHI.svg', GRT: PACIFICA_CDN+'GRT.svg',
  IMX: PACIFICA_CDN+'IMX.svg', BLUR: PACIFICA_CDN+'BLUR.svg', WLD: PACIFICA_CDN+'WLD.svg',
  STX: PACIFICA_CDN+'STX.svg', RNDR: PACIFICA_CDN+'RNDR.svg',
  DYDX: PACIFICA_CDN+'DYDX.svg', GMX: PACIFICA_CDN+'GMX.svg',
  LIT: PACIFICA_CDN+'LIT.svg', MEGA: PACIFICA_CDN+'MEGA.svg', BP: PACIFICA_CDN+'BP.svg',
  CL: PACIFICA_CDN+'CL.svg', COPPE: PACIFICA_CDN+'COPPER.svg', COPPER: PACIFICA_CDN+'COPPER.svg',
  URNM: PACIFICA_CDN+'URNM.svg', XPL: PACIFICA_CDN+'XPL.svg',
  NATGA: PACIFICA_CDN+'NATGAS.svg', NATGAS: PACIFICA_CDN+'NATGAS.svg',
  EURUSI: PACIFICA_CDN+'EURUSD.svg', EURUSD: PACIFICA_CDN+'EURUSD.svg',
  USDJPY: PACIFICA_CDN+'USDJPY.svg', USDJP: PACIFICA_CDN+'USDJPY.svg',
  LFI: PACIFICA_CDN+'LFI.svg', IF: PACIFICA_CDN+'IF.svg', ILD: PACIFICA_CDN+'ILD.svg',
  '2Z': PACIFICA_CDN+'2Z.svg', WLFI: PACIFICA_CDN+'WLFI.svg',
  W: PACIFICA_CDN+'W.svg', FTM: PACIFICA_CDN+'FTM.svg',
  HBAR: PACIFICA_CDN+'HBAR.svg', VET: PACIFICA_CDN+'VET.svg', ALGO: PACIFICA_CDN+'ALGO.svg',
};

// Build a coin icon HTML element (img with fallback to colored circle)
// Build a coin icon HTML// Build a coin icon HTML element (img with fallback to colored circle)
function coinIconHTML(sym, size=22, borderRadius='50%') {
  const url = COIN_IMG[sym.toUpperCase()];
  const color = COIN_COLORS[sym.toUpperCase()] || COIN_COLORS.DEFAULT;
  if(url) {
    return `<img src="${url}" width="${size}" height="${size}"
      style="border-radius:${borderRadius};object-fit:contain;flex-shrink:0;display:inline-block;vertical-align:middle"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
      alt="${sym}">
      <span style="display:none;width:${size}px;height:${size}px;border-radius:${borderRadius};
        background:${color}20;border:1px solid ${color}40;flex-shrink:0;
        align-items:center;justify-content:center;font-family:var(--mono);
        font-size:${Math.max(7,size/3)}px;font-weight:700;color:${color}">
        ${sym.slice(0,3)}
      </span>`;
  }
  return `<span style="display:inline-flex;width:${size}px;height:${size}px;
    border-radius:${borderRadius};background:${color}22;border:1px solid ${color}44;
    flex-shrink:0;align-items:center;justify-content:center;vertical-align:middle;
    font-family:var(--mono);font-size:${Math.max(7,size/3)}px;font-weight:700;color:${color}">
    ${sym.slice(0,3)}</span>`;
}

function coinColor(sym) {
  return COIN_COLORS[sym.toUpperCase()] || COIN_COLORS.DEFAULT;
}


