#!/usr/bin/env python3
"""
Pacifica Lens — Funding Rate Arbitrage Bot v2
=============================================
Monitors Pacifica perpetuals via WebSocket.
Alerts on high-APR funding spreads via Telegram and/or Discord.

Usage:
    pip install websocket-client requests

    # Telegram only:
    TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy python bot/funding_arb_bot.py

    # Discord only:
    DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... python bot/funding_arb_bot.py

    # Both + custom thresholds:
    TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy \
    DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... \
    ALERT_APR=30 COOLDOWN_MIN=30 python bot/funding_arb_bot.py
"""

import websocket
import json
import time
import threading
import os
import requests
from datetime import datetime
from typing import Optional

# ── Config ────────────────────────────────────────────────────────────────────
WS_URL            = "wss://ws.pacifica.fi/ws"
REST_URL          = "https://api.pacifica.fi/api/v1"
ALERT_APR         = float(os.getenv("ALERT_APR", "30.0"))
MIN_SPREAD        = float(os.getenv("MIN_SPREAD", "0.0003"))
COOLDOWN_MIN      = float(os.getenv("COOLDOWN_MIN", "60"))
SCAN_INTERVAL     = 10

TELEGRAM_TOKEN    = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT     = os.getenv("TELEGRAM_CHAT_ID", "")
DISCORD_WEBHOOK   = os.getenv("DISCORD_WEBHOOK_URL", "")

# ── State ─────────────────────────────────────────────────────────────────────
prices: dict = {}
last_alerts: dict = {}
COOLDOWN_SEC = COOLDOWN_MIN * 60

perf = {
    "total_opps":   0,
    "total_alerts": 0,
    "best_apr":     0.0,
    "apr_history":  [],
    "start_time":   time.time(),
}

# ── Logging ───────────────────────────────────────────────────────────────────
def log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    icons = {"INFO": "ℹ️ ", "ALERT": "🔥", "WARN": "⚠️ ", "OK": "✅", "PERF": "📊"}
    print(f"[{ts}] {icons.get(level, '')} {msg}")

# ── Telegram ──────────────────────────────────────────────────────────────────
def send_telegram(msg: str) -> bool:
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT:
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        r = requests.post(url, json={
            "chat_id":    TELEGRAM_CHAT,
            "text":       msg,
            "parse_mode": "HTML"
        }, timeout=8)
        if r.ok:
            log("Telegram alert sent", "OK")
            return True
        log(f"Telegram error: {r.text[:120]}", "WARN")
        return False
    except Exception as e:
        log(f"Telegram failed: {e}", "WARN")
        return False

# ── Discord ───────────────────────────────────────────────────────────────────
def send_discord(opp: dict) -> bool:
    if not DISCORD_WEBHOOK:
        return False
    apr     = opp["apr"]
    monthly = apr / 12
    try:
        payload = {"embeds": [{
            "title":       f"🔥 Arb Alert: {opp['long']} / {opp['short']}",
            "description": f"Spread APR **{apr:.1f}%** — estimated monthly **{monthly:.2f}%**",
            "color":       0xffd060,
            "fields": [
                {"name": "Long",      "value": f"**{opp['long']}** ({opp['long_fr']*100:.4f}%/8h)",  "inline": True},
                {"name": "Short",     "value": f"**{opp['short']}** ({opp['short_fr']*100:.4f}%/8h)", "inline": True},
                {"name": "Spread/8h", "value": f"{opp['spread']*100:.4f}%",                           "inline": True},
                {"name": "APR",       "value": f"**{apr:.1f}%**",                                     "inline": True},
                {"name": "Monthly",   "value": f"**{monthly:.2f}%** on 30 days",                      "inline": True},
                {"name": "Risk",      "value": "Medium" if apr > 50 else "Low",                        "inline": True},
            ],
            "footer": {"text": f"Pacifica Lens · {datetime.now().strftime('%H:%M:%S')}"}
        }]}
        r = requests.post(DISCORD_WEBHOOK, json=payload, timeout=8)
        if r.status_code == 204:
            log("Discord alert sent", "OK")
            return True
        log(f"Discord error: {r.status_code}", "WARN")
        return False
    except Exception as e:
        log(f"Discord failed: {e}", "WARN")
        return False

# ── Scanner ───────────────────────────────────────────────────────────────────
def scan_opportunities() -> list:
    syms = list(prices.keys())
    opps = []
    for i in range(len(syms)):
        for j in range(i + 1, len(syms)):
            a, b   = syms[i], syms[j]
            ra, rb = prices[a]["funding"], prices[b]["funding"]
            spread = abs(ra - rb)
            if spread < MIN_SPREAD:
                continue
            apr = spread * 3 * 365 * 100
            long_sym  = a if ra <= rb else b
            short_sym = b if ra <= rb else a
            opps.append({
                "long":     long_sym,
                "short":    short_sym,
                "long_fr":  min(ra, rb),
                "short_fr": max(ra, rb),
                "spread":   spread,
                "apr":      apr,
                "pair_key": f"{long_sym}_{short_sym}",
            })
    opps.sort(key=lambda x: x["apr"], reverse=True)
    return opps

# ── Performance ───────────────────────────────────────────────────────────────
def update_perf(opps: list):
    if not opps:
        return
    perf["total_opps"] += len(opps)
    best_apr = opps[0]["apr"]
    if best_apr > perf["best_apr"]:
        perf["best_apr"] = best_apr
    perf["apr_history"].append((time.time(), best_apr, f"{opps[0]['long']}/{opps[0]['short']}"))
    if len(perf["apr_history"]) > 500:
        perf["apr_history"].pop(0)

def print_perf_summary():
    elapsed = (time.time() - perf["start_time"]) / 60
    hist    = perf["apr_history"]
    avg_apr = sum(h[1] for h in hist) / len(hist) if hist else 0
    sim_30d = (perf["best_apr"] / 100 / 12) * 10000
    log("─" * 52, "PERF")
    log(f"Session: {elapsed:.0f} min | Pairs scanned: {perf['total_opps']} | Alerts: {perf['total_alerts']}", "PERF")
    log(f"Best APR: {perf['best_apr']:.1f}%  |  Avg APR: {avg_apr:.1f}%", "PERF")
    log(f"Simulated 30-day profit on $10K @ best APR: ${sim_30d:.2f}", "PERF")
    log("─" * 52, "PERF")

# ── Alert ─────────────────────────────────────────────────────────────────────
def maybe_alert(opp: dict):
    key = opp["pair_key"]
    now = time.time()
    if now - last_alerts.get(key, 0) < COOLDOWN_SEC:
        return
    last_alerts[key] = now
    perf["total_alerts"] += 1
    apr     = opp["apr"]
    monthly = apr / 12
    log(f"ALERT  {opp['long']} / {opp['short']}  APR={apr:.1f}%  Monthly={monthly:.2f}%", "ALERT")
    tg_msg = (
        f"🔥 <b>Pacifica Arb Alert</b>\n"
        f"Pair: <b>{opp['long']} / {opp['short']}</b>\n"
        f"APR: <b>{apr:.1f}%</b>  |  Monthly: <b>{monthly:.2f}%</b>\n"
        f"Long  {opp['long']:6} ({opp['long_fr']*100:.4f}%/8h)\n"
        f"Short {opp['short']:6} ({opp['short_fr']*100:.4f}%/8h)\n"
        f"Spread: {opp['spread']*100:.4f}%/8h"
    )
    send_telegram(tg_msg)
    send_discord(opp)

# ── Periodic scan thread ──────────────────────────────────────────────────────
_scan_counter = 0
def periodic_scan():
    global _scan_counter
    while True:
        time.sleep(SCAN_INTERVAL)
        if not prices:
            continue
        opps = scan_opportunities()
        update_perf(opps)
        _scan_counter += 1
        if opps:
            log(f"── Top {min(5, len(opps))} of {len(opps)} opportunities ──────────")
            for opp in opps[:5]:
                flag = "🔥" if opp["apr"] > ALERT_APR else "⚡"
                log(f"  {flag} {opp['long']:6} / {opp['short']:6}"
                    f"  spread {opp['spread']*100:.4f}%/8h  APR {opp['apr']:.1f}%")
            if opps[0]["apr"] >= ALERT_APR:
                maybe_alert(opps[0])
        else:
            log("No spreads above threshold.")
        if _scan_counter % 10 == 0:
            print_perf_summary()

# ── WebSocket handlers ────────────────────────────────────────────────────────
def on_message(ws_app, raw):
    try:
        msg = json.loads(raw)
    except Exception:
        return
    if msg.get("channel") != "prices":
        return
    for p in msg.get("data", []):
        sym = p.get("symbol")
        if not sym:
            continue
        prices[sym] = {
            "mark":    float(p.get("mark", 0)),
            "funding": float(p.get("funding", 0)),
            "oi":      float(p.get("open_interest", 0)) * float(p.get("mark", 1)),
            "vol":     float(p.get("volume_24h", 0)),
        }

def on_open(ws_app):
    log("Connected to Pacifica WebSocket", "OK")
    ws_app.send(json.dumps({"method": "subscribe", "params": {"source": "prices"}}))
    log("Subscribed to prices stream")
    def heartbeat():
        while True:
            time.sleep(30)
            try:
                ws_app.send(json.dumps({"method": "ping"}))
            except Exception:
                break
    threading.Thread(target=heartbeat, daemon=True).start()

def on_error(ws_app, err):
    log(f"WS error: {err}", "WARN")

def on_close(ws_app, code, msg):
    log(f"Disconnected ({code}). Reconnecting in 5s...", "WARN")
    time.sleep(5)
    run()

# ── Entry ─────────────────────────────────────────────────────────────────────
def run():
    log("Pacifica Funding Arb Bot v2 starting...")
    log(f"  Alert threshold : {ALERT_APR}% APR")
    log(f"  Min spread      : {MIN_SPREAD*100:.4f}%/8h")
    log(f"  Cooldown        : {COOLDOWN_MIN} min")
    log(f"  Telegram        : {'✓ configured' if TELEGRAM_TOKEN else '✗ not set'}")
    log(f"  Discord         : {'✓ configured' if DISCORD_WEBHOOK else '✗ not set'}")
    threading.Thread(target=periodic_scan, daemon=True).start()
    ws_app = websocket.WebSocketApp(
        WS_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )
    ws_app.run_forever(ping_interval=30, ping_timeout=10)

if __name__ == "__main__":
    run()
