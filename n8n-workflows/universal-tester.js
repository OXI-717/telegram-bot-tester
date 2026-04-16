// ====================================================
// Universal Telegram Bot Tester v1
// Bot-to-bot E2E crawler for ANY Telegram bot
// https://github.com/OXI-717/telegram-bot-tester
// ====================================================
//
// n8n Code Node (v2) — paste into a Code node connected
// to Schedule Trigger + Manual Trigger
//
// REQUIRES: Bot-to-Bot Communication Mode enabled on BOTH bots
// via @BotFather mini app.

// --- CONFIG: edit these ---
const RUNNER_TOKEN = process.env.RUNNER_BOT_TOKEN || 'YOUR_RUNNER_BOT_TOKEN';
const TARGET_USERNAME = '@your_target_bot';
const TEST_GROUP_ID = '-123456789';           // Group with both bots
const ADMIN_CHAT_ID = '123456789';            // Your Telegram user ID
// --- END CONFIG ---

const API = `https://api.telegram.org/bot${RUNNER_TOKEN}`;

// n8n Code Node body — wrapped in IIFE for linting compatibility
// In n8n, paste ONLY the contents of the function (without the wrapper)
const _run = async function() {

// Persistent offset to avoid processing duplicate updates
let lastOffset = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function req(url, body) {
  try {
    return await this.helpers.httpRequest({method: 'POST', url, body, json: true});
  } catch (_e) {
    return {ok: false, description: e.message};
  }
}

async function getUpd() {
  try {
    const url = `${API}/getUpdates?limit=100${lastOffset ? '&offset=' + lastOffset : ''}`;
    return await this.helpers.httpRequest({method: 'GET', url, json: true});
  } catch (_e) {
    return {ok: false, result: []};
  }
}

async function drain() {
  for (let i = 0; i < 10; i++) {
    const r = await getUpd.call(this);
    if (!r.ok || !r.result?.length) break;
    lastOffset = r.result[r.result.length - 1].update_id + 1;
    await sleep(200);
  }
}

async function probe(cmd) {
  await drain.call(this);
  await sleep(400);
  const sent = await req.call(this, `${API}/sendMessage`, {chat_id: TEST_GROUP_ID, text: cmd});
  if (!sent.ok) return {ok: false, cmd, ms: 0, text: '', buttons: []};
  const t0 = Date.now();
  for (let i = 0; i < 7; i++) {
    await sleep(1500);
    const r = await getUpd.call(this);
    if (!r.ok) continue;
    for (const u of (r.result || [])) {
      const m = u.message;
      lastOffset = u.update_id + 1;
      if (!m?.from?.is_bot) continue;
      const buttons = [];
      if (m.reply_markup?.inline_keyboard)
        for (const row of m.reply_markup.inline_keyboard)
          for (const b of row) buttons.push({text: b.text, cb: b.callback_data || ''});
      return {ok: true, ms: Date.now() - t0, text: m.text || '', buttons, cmd};
    }
  }
  return {ok: false, ms: Date.now() - t0, text: '', buttons: [], cmd};
}

// ===== MAIN =====
const T0 = Date.now();
const all = [];
const seenCb = new Set();

// Phase 1: Discover — try standard commands
const cmds = ['/start', '/help', '/ping', '/status', '/register', '/menu', '/cancel', '/about'];
for (const cmd of cmds) {
  const r = await probe.call(this, cmd);
  all.push({phase: 'cmd', ...r});
  for (const b of r.buttons) if (b.cb) seenCb.add(b.cb);
  await sleep(800);
}

// Phase 2: Crawl L0 — test discovered buttons by sending callback_data as text
const L0 = [...seenCb];
for (const cb of L0) {
  const r = await probe.call(this, cb);
  all.push({phase: 'btn_L0', btnCb: cb, ...r});
  for (const b of r.buttons) if (b.cb && !seenCb.has(b.cb)) seenCb.add(b.cb);
  await sleep(800);
}

// Phase 2b: Crawl L1 — newly discovered buttons from L0
const L1 = [...seenCb].filter(cb => !L0.includes(cb));
for (const cb of L1) {
  const r = await probe.call(this, cb);
  all.push({phase: 'btn_L1', btnCb: cb, ...r});
  for (const b of r.buttons) if (b.cb && !seenCb.has(b.cb)) seenCb.add(b.cb);
  await sleep(800);
}

// Phase 2c: Crawl L2 — third level buttons
const L2 = [...seenCb].filter(cb => !L0.includes(cb) && !L1.includes(cb));
for (const cb of L2.slice(0, 10)) {
  const r = await probe.call(this, cb);
  all.push({phase: 'btn_L2', btnCb: cb, ...r});
  await sleep(800);
}

// Phase 3: Input tests — trigger a registration-like flow, try various inputs
await probe.call(this, '/register'); await sleep(500);
const inputs = [
  {v: 'Test User',       t: 'name',      e: null},
  {v: 'test@example.com', t: 'email',     e: null},
  {v: 'invalid-no-at',   t: 'bad_input', e: null},
  {v: 'Hello bot',       t: 'generic',   e: null}
];
for (const inp of inputs) {
  const r = await probe.call(this, inp.v);
  const matched = inp.e ? r.text.toLowerCase().includes(inp.e.toLowerCase()) : true;
  all.push({phase: 'input', inputType: inp.t, expected: inp.e, matched, ...r});
  await sleep(800);
}

const totalTime = Date.now() - T0;

// Phase 4: Report
const ok = all.filter(r => r.ok).length;
const total = all.length;
const avgMs = Math.round(all.filter(r => r.ok).reduce((s, r) => s + r.ms, 0) / Math.max(ok, 1));
const maxMs = Math.max(...all.filter(r => r.ok).map(r => r.ms), 0);
const icon = ok === total ? '✅' : (ok > total * 0.8 ? '⚠️' : '🚨');

let rpt = `${icon} <b>Universal Bot Tester</b>\n<b>Target:</b> ${TARGET_USERNAME}\n\n`;
rpt += `<b>Score:</b> ${ok}/${total}\n<b>Buttons:</b> ${seenCb.size}\n`;
rpt += `<b>Avg:</b> ${avgMs}ms | <b>Max:</b> ${maxMs}ms\n`;
rpt += `<b>Duration:</b> ${Math.round(totalTime / 1000)}s\n\n`;

rpt += `<b>━━ Commands ━━</b>\n`;
for (const r of all.filter(r => r.phase === 'cmd')) {
  rpt += `${r.ok ? '✅' : '❌'} <code>${r.cmd}</code> ${r.ms}ms${r.buttons.length ? ' 🔘×' + r.buttons.length : ''}\n`;
  if (r.ok) rpt += `  └ <i>${r.text.substring(0, 55)}</i>\n`;
}

const btns = all.filter(r => r.phase.startsWith('btn_'));
if (btns.length) {
  rpt += `\n<b>━━ Buttons ━━</b>\n`;
  for (const r of btns) {
    const d = r.phase.replace('btn_', '');
    rpt += `${r.ok ? '✅' : '❌'} [${d}] <code>${r.btnCb}</code> ${r.ms}ms${r.buttons.length ? ' →🔘×' + r.buttons.length : ''}\n`;
    if (r.ok) rpt += `  └ <i>${r.text.substring(0, 55)}</i>\n`;
  }
}

const inps = all.filter(r => r.phase === 'input');
if (inps.length) {
  rpt += `\n<b>━━ Inputs ━━</b>\n`;
  for (const r of inps) {
    rpt += `${r.ok ? (r.matched ? '✅' : '⚠️') : '❌'} [${r.inputType}] "${r.cmd.substring(0, 20)}" ${r.ms}ms\n`;
    if (r.ok) rpt += `  └ <i>${r.text.substring(0, 55)}</i>\n`;
  }
}

rpt += `\n<b>━━ Button Map (${seenCb.size}) ━━</b>\n`;
for (const cb of seenCb) rpt += `${all.find(r => r.btnCb === cb)?.ok ? '🟢' : '🔴'} <code>${cb}</code>\n`;
rpt += `\n<i>🤖 Universal Bot Tester | ${new Date().toISOString().substring(0, 16)}</i>`;

await req.call(this, `${API}/sendMessage`, {chat_id: ADMIN_CHAT_ID, text: rpt, parse_mode: 'HTML'});
await req.call(this, `${API}/sendMessage`, {
  chat_id: TEST_GROUP_ID,
  text: `${icon} Crawl: ${ok}/${total}, ${seenCb.size} btn, ${Math.round(totalTime / 1000)}s`
});

return [{json: {ok: all.filter(r => r.ok).length, total: all.length, buttons: seenCb.size, avgMs, duration: Math.round(totalTime / 1000)}}];
}; // end _run
export default _run;
