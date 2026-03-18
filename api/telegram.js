// api/telegram.js — Vercel Serverless Proxy for Telegram Bot API
// Solves CORS issues by proxying Telegram API calls through Vercel

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { token, chat_id, text, parse_mode } = req.body || {};

  if (!token || !chat_id || !text) {
    return res.status(400).json({ error: 'Missing token, chat_id, or text' });
  }

  // Basic token format validation
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    return res.status(400).json({ error: 'Invalid bot token format' });
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: parse_mode || 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Telegram API request failed', detail: err.message });
  }
}
