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

// Get logo URL from CoinGecko
function coinLogoUrl(sym) {
  const id = COIN_IDS[sym.toUpperCase()];
  if(!id) return null;
  return `https://assets.coingecko.com/coins/images/1/small/bitcoin.png`.replace('1/small/bitcoin', `${coinLogoId(sym)}`);
}

// CoinGecko image IDs (precomputed to avoid extra API calls)
const COIN_IMG = {
  // Top 60+ crypto by market cap - CoinGecko small images
  BTC:  'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH:  'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  BNB:  'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  SOL:  'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  XRP:  'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  ADA:  'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  TRX:  'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  TON:  'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  DOT:  'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  MATIC:'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  POL:  'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  UNI:  'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  LTC:  'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  BCH:  'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
  ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
  XLM:  'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
  ICP:  'https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png',
  ETC:  'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',
  FIL:  'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
  APT:  'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  OP:   'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  ARB:  'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  HBAR: 'https://assets.coingecko.com/coins/images/3688/small/hbar.png',
  CRO:  'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png',
  VET:  'https://assets.coingecko.com/coins/images/1167/small/VET_Token_Icon.png',
  MKR:  'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  AAVE: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
  SUI:  'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  GRT:  'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png',
  INJ:  'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  ALGO: 'https://assets.coingecko.com/coins/images/4380/small/download.png',
  SAND: 'https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg',
  AXS:  'https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png',
  MANA: 'https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png',
  THETA:'https://assets.coingecko.com/coins/images/2538/small/theta-token-logo.png',
  EOS:  'https://assets.coingecko.com/coins/images/738/small/eos-eos-logo.png',
  SNX:  'https://assets.coingecko.com/coins/images/3406/small/SNX.png',
  CRV:  'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  COMP: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
  ONEINCH:'https://assets.coingecko.com/coins/images/13469/small/1inch-token.png',
  YFI:  'https://assets.coingecko.com/coins/images/11849/small/yfi-192x192.png',
  SUSHI:'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
  FLOKI:'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png',
  BONK: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
  WIF:  'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  TRUMP:'https://assets.coingecko.com/coins/images/36154/small/cz6bZa_A_400x400.jpg',
  JUP:  'https://assets.coingecko.com/coins/images/34188/small/jup.png',
  PYTH: 'https://assets.coingecko.com/coins/images/31924/small/pyth.png',
  SEI:  'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
  TIA:  'https://assets.coingecko.com/coins/images/31967/small/tia.jpg',
  W:    'https://assets.coingecko.com/coins/images/35087/small/wormhole.png',
  PAXG: 'https://assets.coingecko.com/coins/images/9519/small/paxg.PNG',
  XAU:  'https://assets.coingecko.com/coins/images/9519/small/paxg.PNG',
  HYPE: 'https://assets.coingecko.com/coins/images/50220/small/hyperliquid.jpg',
  PENGU:'https://assets.coingecko.com/coins/images/50147/small/pudgy.jpg',
  PUMP: 'https://assets.coingecko.com/coins/images/50145/small/pump.jpg',
  HOOD: 'https://assets.coingecko.com/coins/images/50143/small/hood.jpg',
  PIPPIN:'https://assets.coingecko.com/coins/images/50144/small/pippin.jpg',
  XAG:  'https://assets.coingecko.com/coins/images/9519/small/paxg.PNG',
  FTM:  'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
  KPEPE:'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  DYDX: 'https://assets.coingecko.com/coins/images/17500/small/hjnIm9bV.jpg',
  GMX:  'https://assets.coingecko.com/coins/images/18323/small/arbit.png',
  BLUR: 'https://assets.coingecko.com/coins/images/28453/small/blur.png',
  CFG:  'https://assets.coingecko.com/coins/images/17106/small/CFG.png',
  CFGU: 'https://assets.coingecko.com/coins/images/17106/small/CFG.png',
  WLD:  'https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg',
  STX:  'https://assets.coingecko.com/coins/images/2069/small/Stacks_logo_full.png',
  RNDR: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  IMX:  'https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png',
  // Pacifica-specific and additional coins
  ZEC:    'https://assets.coingecko.com/coins/images/486/small/circle-zcash-color.png',
  EURUS:  'https://assets.coingecko.com/coins/images/15100/small/EURUS.png',
  LIT:    'https://assets.coingecko.com/coins/images/13868/small/lit_logo.png',
  WLFI:   'https://assets.coingecko.com/coins/images/39253/small/world-liberty-financial.png',
  USDJPY: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDJP:  'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  XMR:    'https://assets.coingecko.com/coins/images/69/small/monero_logo.png',
  VIRTU:  'https://assets.coingecko.com/coins/images/17672/small/virtuals_protocol.png',
  VIRTUAL:'https://assets.coingecko.com/coins/images/17672/small/virtuals_protocol.png',
  FARTC:  'https://assets.coingecko.com/coins/images/50146/small/fartcoin.jpg',
  FARTCOIN:'https://assets.coingecko.com/coins/images/50146/small/fartcoin.jpg',
  MON:    'https://assets.coingecko.com/coins/images/35234/small/monad.jpg',
  MONAD:  'https://assets.coingecko.com/coins/images/35234/small/monad.jpg',
  ENA:    'https://assets.coingecko.com/coins/images/36530/small/ethena.png',
  ASTER:  'https://assets.coingecko.com/coins/images/28527/small/astr.png',
  ASTR:   'https://assets.coingecko.com/coins/images/28527/small/astr.png',
  KBONK:  'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
  CL:     'https://assets.coingecko.com/coins/images/40760/small/chainlink.png',
  MEGA:   'https://assets.coingecko.com/coins/images/50148/small/mega.jpg',
  NVDA:   'https://upload.wikimedia.org/wikipedia/sco/thumb/2/21/Nvidia_logo.svg/220px-Nvidia_logo.svg.png',
  XPL:    'https://assets.coingecko.com/coins/images/50149/small/xpl.jpg',
  PLTR:   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Palantir_Technologies_logo.svg/200px-Palantir_Technologies_logo.svg.png',
  STRK:   'https://assets.coingecko.com/coins/images/26433/small/starknet.png',
  ZRO:    'https://assets.coingecko.com/coins/images/28206/small/layerzero.jpeg',
  COPPER: 'https://assets.coingecko.com/coins/images/50150/small/copper.jpg',
  TAO:    'https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg',
  ZK:     'https://assets.coingecko.com/coins/images/35044/small/zksync.jpeg',
  GOOGL:  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/200px-Google_2015_logo.svg.png',
  URNM:   'https://assets.coingecko.com/coins/images/50151/small/uranium.jpg',
  NATGA:  'https://assets.coingecko.com/coins/images/50152/small/natgas.jpg',
  NATGAS: 'https://assets.coingecko.com/coins/images/50152/small/natgas.jpg',
  LDO:    'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
  TSLA:   'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Tesla_logo.png/120px-Tesla_logo.png',
  BP:     'https://assets.coingecko.com/coins/images/50153/small/bp.jpg',
  ZZ:     'https://assets.coingecko.com/coins/images/50154/small/zz.jpg',
  '2Z':   'https://assets.coingecko.com/coins/images/50154/small/zz.jpg',
  KPEPE:  'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  LTC:    'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  AVAX:   'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',

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


