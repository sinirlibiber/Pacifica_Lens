// api/pacifica.js — Vercel Serverless Proxy for Pacifica REST API
// Solves CORS + regional blocking issues by proxying through Vercel's edge

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { path, ...params } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  // Whitelist allowed paths
  const ALLOWED_PREFIXES = [
    'info', 'info/prices', 'trades', 'kline',
    'positions', 'positions/history',
    'funding_rate/history', 'funding/history',
    'orderbook',
  ];
  if (!ALLOWED_PREFIXES.some(p => path.startsWith(p))) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  const qs = new URLSearchParams(params).toString();
  const url = `https://api.pacifica.fi/api/v1/${path}${qs ? '?' + qs : ''}`;

  try {
    const fetchFn = globalThis.fetch || (await import('node-fetch')).default;
    const r = await fetchFn(url, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    });
    const data = await r.json();
    // Cache prices/info for 3s, candles for 60s
    const cache = path.includes('kline') ? 60 : 3;
    res.setHeader('Cache-Control', `s-maxage=${cache}, stale-while-revalidate`);
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Upstream failed', detail: err.message });
  }
}
