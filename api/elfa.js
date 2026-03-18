export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ELFA_KEY = process.env.ELFA_API_KEY;
  if (!ELFA_KEY) {
    return res.status(500).json({ error: 'ELFA_API_KEY not configured' });
  }

  // Decode endpoint — browser may encode slashes as %2F
  const rawEndpoint = req.query.endpoint || '';
  const endpoint = decodeURIComponent(rawEndpoint);

  const ALLOWED = [
    'v2/aggregations/trending-tokens',
    'v2/data/trending-narratives',
    'v2/data/top-mentions',
    'v2/ping',
    'v2/chat',
  ];

  if (!ALLOWED.some(a => endpoint.startsWith(a))) {
    return res.status(403).json({ error: 'Not allowed: ' + endpoint });
  }

  const isChat = endpoint === 'v2/chat';
  const { endpoint: _, ...params } = req.query;
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.elfa.ai/${endpoint}${(!isChat && qs) ? '?' + qs : ''}`;

  try {
    const fetchOpts = {
      method: isChat ? 'POST' : 'GET',
      headers: { 'x-elfa-api-key': ELFA_KEY, 'Content-Type': 'application/json' },
    };

    if (isChat) {
      const body = req.body || {};
      const message = body.context
        ? `${body.message}\n\n[Live Pacifica Market Data]\n${body.context}`
        : (body.message || '');
      const payload = { message, analysisType: 'chat' };
      if (body.sessionId) payload.sessionId = body.sessionId;
      fetchOpts.body = JSON.stringify(payload);
    }

    const upstream = await fetch(url, fetchOpts);
    const data = await upstream.json();
    if (!isChat) res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
