/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let ws = null;
let wsReconnectTimer = null;
let prices = {};       // sym → {mark, funding, next_funding, oi, vol24, mid}
let lsVol = {};        // sym → {l, s}
let tradeCount = 0;
let liqCount = 0;
let frHistory = {};    // sym → [{t, rate}]  (last 24 * 3 = 72 points)
let walletWs = null;
let walletAddr = '';
let positions = {};    // sym → position
let tradeHistory = []; // last 20 trades
let charts = {};
let chatHistory = [];
let wsConnected = false;
// Whale Watcher state
let whaleMin = 1000;
const whaleRows = [];
const whaleAlerts = [];
const whaleByMkt = {};
let whaleTotalVol = 0;
let whaleLargest = 0;
// Orderbook state
let obSym = 'BTC';
let obTimer = null;
let obHistory = [];
let obChartInst = null;
// PnL chart
let pnlChartInst = null;
// Arb performance state
let arbTotalFound = 0;
let arbBestApr = 0;
const spreadHistory = []; // {t, apr, pair}
let spreadChartInst = null;
// Alert config
let tgConfig = null;   // {token, chatId, minApr, cooldown}
let dcConfig = null;   // {webhook, minApr, cooldown}
let lastTgAlert = 0;
let lastDcAlert = 0;

