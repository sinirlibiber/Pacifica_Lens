export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const r = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    });
    const data = await r.json();
    // data = [ {universe:[...], marginTables}, [{funding, markPx, openInterest, ...}, ...] ]
    const meta = data[0]?.universe || [];
    const ctxs = data[1] || [];
    const result = meta.map((m, i) => ({
      coin: m.name,
      funding: parseFloat(ctxs[i]?.funding || 0),
      markPx: parseFloat(ctxs[i]?.markPx || 0),
      openInterest: parseFloat(ctxs[i]?.openInterest || 0),
      volume: parseFloat(ctxs[i]?.dayNtlVlm || 0),
    }));
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
