/* ══════════════════════════════════════════════
   TELEGRAM & DISCORD ALERTS — Enhanced
   Supports: Arb Spread, Whale Trades, Liquidations, Funding Spikes
══════════════════════════════════════════════ */

/* ── Persist / Restore config from localStorage ── */
function loadAlertConfig() {
  try {
    const tg = localStorage.getItem('pl_tg_config');
    const dc = localStorage.getItem('pl_dc_config');
    if (tg) {
      tgConfig = JSON.parse(tg);
      const el = $('tg-token'); if (el) el.value = tgConfig.token;
      const el2 = $('tg-chat'); if (el2) el2.value = tgConfig.chatId;
      const el3 = $('tg-min-apr'); if (el3) el3.value = tgConfig.minApr;
      const el4 = $('tg-cooldown'); if (el4) el4.value = (tgConfig.cooldown / 60000);
      if (tgConfig.alertTypes) {
        const types = tgConfig.alertTypes;
        const cb1 = $('tg-alert-arb'); if (cb1) cb1.checked = types.arb !== false;
        const cb2 = $('tg-alert-whale'); if (cb2) cb2.checked = !!types.whale;
        const cb3 = $('tg-alert-liq'); if (cb3) cb3.checked = !!types.liquidation;
        const cb4 = $('tg-alert-funding'); if (cb4) cb4.checked = !!types.funding;
      }
      const badge = $('tg-status-badge');
      if (badge) { badge.textContent = '✓ active'; badge.className = 'bdg bdg-g'; }
      validateTgConfig();
    }
    if (dc) {
      dcConfig = JSON.parse(dc);
      const el = $('dc-webhook'); if (el) el.value = dcConfig.webhook;
      const el2 = $('dc-min-apr'); if (el2) el2.value = dcConfig.minApr;
      const el3 = $('dc-cooldown'); if (el3) el3.value = (dcConfig.cooldown / 60000);
      if (dcConfig.alertTypes) {
        const types = dcConfig.alertTypes;
        const cb1 = $('dc-alert-arb'); if (cb1) cb1.checked = types.arb !== false;
        const cb2 = $('dc-alert-whale'); if (cb2) cb2.checked = !!types.whale;
        const cb3 = $('dc-alert-liq'); if (cb3) cb3.checked = !!types.liquidation;
        const cb4 = $('dc-alert-funding'); if (cb4) cb4.checked = !!types.funding;
      }
      const badge = $('dc-status-badge');
      if (badge) { badge.textContent = '✓ active'; badge.className = 'bdg bdg-g'; }
      validateDcConfig();
    }
  } catch (e) { console.warn('Alert config load error:', e); }
}

/* ── Alert stats tracking ── */
let alertStats = { sent: 0, lastTime: 0, history: [] };
function trackAlert(type, msg) {
  alertStats.sent++;
  alertStats.lastTime = Date.now();
  alertStats.history.unshift({ type, msg: msg.slice(0, 80), ts: Date.now() });
  if (alertStats.history.length > 50) alertStats.history.pop();
  updateAlertStatsUI();
}

function updateAlertStatsUI() {
  const el = $('alert-stats-sent');
  if (el) el.textContent = alertStats.sent;
  const el2 = $('alert-stats-last');
  if (el2) el2.textContent = alertStats.lastTime ? timeAgo(alertStats.lastTime) : '—';
}

/* ── Cooldown tracker per alert type ── */
const alertCooldowns = { arb: 0, whale: 0, liquidation: 0, funding: 0 };

function isOnCooldown(type, cooldownMs) {
  if (Date.now() - alertCooldowns[type] < cooldownMs) return true;
  alertCooldowns[type] = Date.now();
  return false;
}

/* ── Validate & Save ── */
function validateTgConfig() {
  const token = ($('tg-token')?.value || '').trim();
  const chat = ($('tg-chat')?.value || '').trim();
  const btn = $('tg-save-btn');
  if (token && chat) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
  else { btn.disabled = true; btn.style.opacity = '.4'; btn.style.cursor = 'not-allowed'; }
}

function validateDcConfig() {
  const url = ($('dc-webhook')?.value || '').trim();
  const btn = $('dc-save-btn');
  if (url.startsWith('https://discord.com/api/webhooks/')) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
  else { btn.disabled = true; btn.style.opacity = '.4'; btn.style.cursor = 'not-allowed'; }
}

function getAlertTypes(prefix) {
  return {
    arb: $(`${prefix}-alert-arb`)?.checked !== false,
    whale: $(`${prefix}-alert-whale`)?.checked || false,
    liquidation: $(`${prefix}-alert-liq`)?.checked || false,
    funding: $(`${prefix}-alert-funding`)?.checked || false,
  };
}

function saveTgConfig() {
  tgConfig = {
    token: $('tg-token').value.trim(),
    chatId: $('tg-chat').value.trim(),
    minApr: parseFloat($('tg-min-apr').value) || 50,
    cooldown: (parseFloat($('tg-cooldown').value) || 60) * 60000,
    alertTypes: getAlertTypes('tg'),
  };
  localStorage.setItem('pl_tg_config', JSON.stringify(tgConfig));
  $('tg-status-badge').textContent = '✓ active';
  $('tg-status-badge').className = 'bdg bdg-g';
  const types = Object.entries(tgConfig.alertTypes).filter(([, v]) => v).map(([k]) => k).join(', ');
  showFeedback('tg-feedback', '✓ Saved! Alerts: ' + types + ' | Min APR: ' + tgConfig.minApr + '% | Cooldown: ' + (tgConfig.cooldown / 60000) + 'm', 'var(--gn)');
  showToast('✓ Telegram alerts enabled');
}

function saveDcConfig() {
  dcConfig = {
    webhook: $('dc-webhook').value.trim(),
    minApr: parseFloat($('dc-min-apr').value) || 50,
    cooldown: (parseFloat($('dc-cooldown').value) || 60) * 60000,
    alertTypes: getAlertTypes('dc'),
  };
  localStorage.setItem('pl_dc_config', JSON.stringify(dcConfig));
  $('dc-status-badge').textContent = '✓ active';
  $('dc-status-badge').className = 'bdg bdg-g';
  showFeedback('dc-feedback', '✓ Discord config saved and persisted.', 'var(--gn)');
  showToast('✓ Discord alerts enabled');
}

function clearTgConfig() {
  tgConfig = null;
  localStorage.removeItem('pl_tg_config');
  const el = $('tg-token'); if (el) el.value = '';
  const el2 = $('tg-chat'); if (el2) el2.value = '';
  $('tg-status-badge').textContent = 'not configured';
  $('tg-status-badge').className = 'bdg bdg-c';
  showFeedback('tg-feedback', 'Config cleared.', 'var(--tx3)');
  validateTgConfig();
}

function clearDcConfig() {
  dcConfig = null;
  localStorage.removeItem('pl_dc_config');
  const el = $('dc-webhook'); if (el) el.value = '';
  $('dc-status-badge').textContent = 'not configured';
  $('dc-status-badge').className = 'bdg bdg-p';
  showFeedback('dc-feedback', 'Config cleared.', 'var(--tx3)');
  validateDcConfig();
}

/* ── Feedback helper ── */
function showFeedback(id, msg, color) {
  const el = $(id); if (!el) return;
  el.style.display = 'block'; el.style.color = color; el.textContent = msg;
}

/* ── Send via Vercel proxy (avoids CORS) with fallback ── */
async function sendTgMessage(token, chatId, text) {
  try {
    const r = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return await r.json();
  } catch (e) {
    try {
      const r2 = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      return await r2.json();
    } catch (e2) {
      console.warn('TG alert failed:', e2);
      return { ok: false, description: 'Network error' };
    }
  }
}

/* ── Test buttons ── */
async function testTgAlert() {
  const token = ($('tg-token')?.value || '').trim();
  const chat = ($('tg-chat')?.value || '').trim();
  if (!token || !chat) { showFeedback('tg-feedback', '⚠ Enter Bot Token and Chat ID first', 'var(--yw)'); return; }
  showFeedback('tg-feedback', 'Sending test message...', 'var(--tx3)');
  const d = await sendTgMessage(token, chat,
    '✅ <b>Pacifica Lens — Test Alert</b>\n\n' +
    '🔔 Your Telegram alerts are configured correctly!\n' +
    '📊 You will receive alerts for: Arb spreads, Whale trades, Liquidations, Funding spikes\n\n' +
    '<i>' + new Date().toLocaleTimeString() + '</i>'
  );
  if (d.ok) showFeedback('tg-feedback', '✓ Test message sent successfully!', 'var(--gn)');
  else showFeedback('tg-feedback', '✗ Error: ' + (d.description || 'Unknown error'), 'var(--rd)');
}

async function testDcAlert() {
  const url = ($('dc-webhook')?.value || '').trim();
  if (!url) { showFeedback('dc-feedback', '⚠ Enter Webhook URL first', 'var(--yw)'); return; }
  showFeedback('dc-feedback', 'Sending test message...', 'var(--tx3)');
  try {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ title: '✅ Pacifica Lens — Test Alert', description: 'Discord webhook is working!\nYou will receive alerts for configured event types.', color: 0x00cfff, footer: { text: new Date().toLocaleTimeString() } }] }),
    });
    if (r.status === 204 || r.ok) showFeedback('dc-feedback', '✓ Test message sent to Discord!', 'var(--gn)');
    else showFeedback('dc-feedback', '✗ Error: HTTP ' + r.status, 'var(--rd)');
  } catch (e) { showFeedback('dc-feedback', '✗ Network error — check webhook URL', 'var(--rd)'); }
}

/* ══════════════════════════════════════════════
   ALERT TRIGGERS — Called from other modules
══════════════════════════════════════════════ */

/* ── 1. Arbitrage Spread Alert ── */
async function maybeSendTgAlert(apr, msg) {
  if (!tgConfig) return;
  if (!tgConfig.alertTypes?.arb) return;
  if (apr < tgConfig.minApr) return;
  if (isOnCooldown('arb', tgConfig.cooldown)) return;
  await sendTgMessage(tgConfig.token, tgConfig.chatId,
    '🔥 <b>ARB ALERT</b>\n\n' + msg.replace(/\\n/g, '\n')
  );
  trackAlert('arb', msg);
}

async function maybeSendDcAlert(apr, msg, best) {
  if (!dcConfig) return;
  if (!dcConfig.alertTypes?.arb) return;
  if (apr < dcConfig.minApr) return;
  if (isOnCooldown('arb', dcConfig.cooldown)) return;
  const monthly = (apr / 12).toFixed(2);
  try {
    await fetch(dcConfig.webhook, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🔥 Arb Opportunity: ' + best.a + ' / ' + best.b,
          color: 0xffd060,
          fields: [
            { name: 'Spread APR', value: '**' + apr.toFixed(1) + '%**', inline: true },
            { name: 'Monthly Return', value: '**' + monthly + '%**', inline: true },
            { name: 'Strategy', value: 'Long **' + (best.ra <= best.rb ? best.a : best.b) + '** · Short **' + (best.ra > best.rb ? best.a : best.b) + '**', inline: false },
            { name: 'Spread/8h', value: (best.s * 100).toFixed(4) + '%', inline: true },
          ],
          footer: { text: 'Pacifica Lens · ' + new Date().toLocaleTimeString() },
        }],
      }),
    });
    trackAlert('arb', best.a + '/' + best.b + ' ' + apr.toFixed(1) + '%');
  } catch (e) { console.warn('DC alert failed', e); }
}

/* ── 2. Whale Trade Alert ── */
async function maybeSendWhaleAlert(sym, usd, isLong, price, isLiq) {
  const side = isLong ? 'LONG' : 'SHORT';
  const emoji = usd >= whaleMin * 10 ? '🐳' : '🐋';
  const liqTag = isLiq ? ' [LIQUIDATION]' : '';

  if (tgConfig && tgConfig.alertTypes?.whale && usd >= whaleMin * 5) {
    if (!isOnCooldown('whale', Math.min(tgConfig.cooldown, 300000))) {
      await sendTgMessage(tgConfig.token, tgConfig.chatId,
        emoji + ' <b>WHALE ALERT</b>' + liqTag + '\n\n' +
        '<b>' + sym + '</b> — $' + fmt(usd) + ' ' + side + '\n' +
        'Price: $' + fmtPrice(price) + '\n' +
        '<i>' + new Date().toLocaleTimeString() + '</i>'
      );
      trackAlert('whale', sym + ' $' + fmt(usd) + ' ' + side);
    }
  }

  if (dcConfig && dcConfig.alertTypes?.whale && usd >= whaleMin * 5) {
    if (!isOnCooldown('whale', Math.min(dcConfig.cooldown, 300000))) {
      try {
        await fetch(dcConfig.webhook, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: emoji + ' Whale ' + side + ': ' + sym + liqTag,
              color: isLong ? 0x3fb950 : 0xf85149,
              fields: [
                { name: 'Size', value: '**$' + fmt(usd) + '**', inline: true },
                { name: 'Price', value: '$' + fmtPrice(price), inline: true },
              ],
              footer: { text: 'Pacifica Lens · ' + new Date().toLocaleTimeString() },
            }],
          }),
        });
      } catch (e) { console.warn('DC whale alert failed', e); }
    }
  }
}

/* ── 3. Liquidation Alert ── */
async function maybeSendLiqAlert(sym, usd, isLong, price) {
  if (usd < 50000) return;
  const side = isLong ? 'LONG' : 'SHORT';

  if (tgConfig && tgConfig.alertTypes?.liquidation) {
    if (!isOnCooldown('liquidation', Math.min(tgConfig.cooldown, 120000))) {
      await sendTgMessage(tgConfig.token, tgConfig.chatId,
        '💀 <b>LIQUIDATION ALERT</b>\n\n' +
        '<b>' + sym + '</b> — $' + fmt(usd) + ' ' + side + ' liquidated\n' +
        'Price: $' + fmtPrice(price) + '\n' +
        '<i>' + new Date().toLocaleTimeString() + '</i>'
      );
      trackAlert('liquidation', sym + ' $' + fmt(usd) + ' ' + side);
    }
  }

  if (dcConfig && dcConfig.alertTypes?.liquidation) {
    if (!isOnCooldown('liquidation', Math.min(dcConfig.cooldown, 120000))) {
      try {
        await fetch(dcConfig.webhook, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '💀 Liquidation: ' + sym + ' ' + side,
              color: 0xff4444,
              fields: [
                { name: 'Size', value: '**$' + fmt(usd) + '**', inline: true },
                { name: 'Price', value: '$' + fmtPrice(price), inline: true },
              ],
              footer: { text: 'Pacifica Lens · ' + new Date().toLocaleTimeString() },
            }],
          }),
        });
      } catch (e) { console.warn('DC liq alert failed', e); }
    }
  }
}

/* ── 4. Extreme Funding Rate Alert ── */
async function maybeSendFundingAlert(sym, rate, apr) {
  const minApr = tgConfig?.minApr || dcConfig?.minApr || 100;
  if (Math.abs(apr) < minApr) return;
  const direction = rate > 0 ? 'LONGS PAY' : 'SHORTS PAY';
  const emoji = Math.abs(apr) > 200 ? '🚨' : '⚠️';

  if (tgConfig && tgConfig.alertTypes?.funding) {
    if (!isOnCooldown('funding', Math.min(tgConfig.cooldown, 600000))) {
      await sendTgMessage(tgConfig.token, tgConfig.chatId,
        emoji + ' <b>FUNDING SPIKE</b>\n\n' +
        '<b>' + sym + '</b> — ' + (rate * 100).toFixed(4) + '%/8h\n' +
        'Annualized: ' + apr.toFixed(1) + '% APR\n' +
        'Direction: ' + direction + '\n' +
        '<i>' + new Date().toLocaleTimeString() + '</i>'
      );
      trackAlert('funding', sym + ' ' + apr.toFixed(1) + '% APR');
    }
  }

  if (dcConfig && dcConfig.alertTypes?.funding) {
    if (!isOnCooldown('funding', Math.min(dcConfig.cooldown, 600000))) {
      try {
        await fetch(dcConfig.webhook, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: emoji + ' Funding Spike: ' + sym,
              color: rate > 0 ? 0xe3b341 : 0xbc8cff,
              fields: [
                { name: 'Rate/8h', value: '**' + (rate * 100).toFixed(4) + '%**', inline: true },
                { name: 'APR', value: '**' + apr.toFixed(1) + '%**', inline: true },
                { name: 'Direction', value: direction, inline: true },
              ],
              footer: { text: 'Pacifica Lens · ' + new Date().toLocaleTimeString() },
            }],
          }),
        });
      } catch (e) { console.warn('DC funding alert failed', e); }
    }
  }
}

/* ── Init: load persisted config on page load ── */
document.addEventListener('DOMContentLoaded', loadAlertConfig);
