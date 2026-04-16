// ====================================================
// Example Target Bot — realistic demo bot for testing
// https://github.com/OXI-717/telegram-bot-tester
// ====================================================
//
// n8n Code Node (v2) — paste into a Code node connected
// to Telegram Trigger (message + callback_query).
//
// This is a DEMO bot with menus, catalog, registration flow.
// Use it to verify your tester setup works before pointing
// at a real production bot.

// --- CONFIG ---
const TOKEN = process.env.TARGET_BOT_TOKEN || 'YOUR_TARGET_BOT_TOKEN';
// --- END CONFIG ---

const API = `https://api.telegram.org/bot${TOKEN}`;

// n8n Code Node body — wrapped in IIFE for linting compatibility
// In n8n, paste ONLY the contents of the function (without the wrapper)
const _run = async function() {
const msg = $input.first().json;
const text = (msg.message?.text || '').trim();
const cb = msg.callback_query?.data || '';
const chatId = String(msg.message?.chat?.id || msg.callback_query?.message?.chat?.id || '');
const userName = msg.message?.from?.first_name || msg.callback_query?.from?.first_name || 'User';
const userId = msg.message?.from?.id || msg.callback_query?.from?.id || 0;
const cbId = msg.callback_query?.id || '';

if (!chatId) return [];

const mainMenu = [
  [{text: '📋 Регистрация', callback_data: 'register'}, {text: '📊 Статус', callback_data: 'status'}],
  [{text: '🏓 Пинг', callback_data: 'ping'}, {text: '❓ Помощь', callback_data: 'help'}],
  [{text: '📦 Каталог', callback_data: 'catalog'}]
];
const catP1 = [
  [{text: '📘 AI Basics — $99', callback_data: 'item_ai_basics'}],
  [{text: '📗 n8n Pro — $149', callback_data: 'item_n8n_pro'}],
  [{text: '📙 LMS Builder — $199', callback_data: 'item_lms'}],
  [{text: '➡️ Page 2', callback_data: 'catalog_p2'}, {text: '🔙 Menu', callback_data: 'back_menu'}]
];
const catP2 = [
  [{text: '📕 Security — $249', callback_data: 'item_security'}],
  [{text: '📓 DevOps — $179', callback_data: 'item_devops'}],
  [{text: '⬅️ Page 1', callback_data: 'catalog'}, {text: '🔙 Menu', callback_data: 'back_menu'}]
];
const back = [[{text: '🔙 Menu', callback_data: 'back_menu'}]];
const items = {
  item_ai_basics:  {n: 'AI Basics',    p: 99,  d: 'AI fundamentals. 12 lessons, 6h video.'},
  item_n8n_pro:    {n: 'n8n Pro',      p: 149, d: 'Advanced n8n automation. 18 lessons.'},
  item_lms:        {n: 'LMS Builder',  p: 199, d: 'Build LMS from scratch. Next.js + Auth.'},
  item_security:   {n: 'Security',     p: 249, d: 'Web app security. OWASP, audit. 24 lessons.'},
  item_devops:     {n: 'DevOps',       p: 179, d: 'CI/CD, Docker, K8s. 15 lessons.'}
};

let r = '', kb = null;

if (text === '/start' || cb === 'back_menu') {
  r = '👋 Welcome!\nI am a demo bot.\n\nChoose an action:'; kb = mainMenu;
} else if (text === '/help' || cb === 'help') {
  r = '❓ Help\n\nCommands:\n/start — main menu\n/help — this help\n/ping — connectivity check\n/status — system status\n/register — registration\n\nUse inline buttons for navigation.\nAfter /register the bot asks for name and email.'; kb = back;
} else if (text === '/ping' || cb === 'ping') {
  r = '🏓 Pong!\n\nServer time: ' + new Date().toISOString() + '\nLatency: OK'; kb = back;
} else if (text === '/status' || cb === 'status') {
  r = '📊 System Status\n\n✅ API: OK\n✅ DB: Connected\n✅ n8n: Running\n📅 v2.0.0\n⏰ Uptime: ' + Math.floor(Date.now() / 1000 % 86400) + 's\n👤 ' + userName + ' (' + userId + ')';
  kb = [[{text: '🔄 Refresh', callback_data: 'status'}, {text: '🔙 Menu', callback_data: 'back_menu'}]];
} else if (text === '/register' || cb === 'register') {
  r = '📋 Registration — Step 1/3\n\nEnter your name:'; kb = back;
} else if (cb === 'catalog') {
  r = '📦 Course Catalog — Page 1\n\nSelect a course:'; kb = catP1;
} else if (cb === 'catalog_p2') {
  r = '📦 Course Catalog — Page 2'; kb = catP2;
} else if (cb && cb.startsWith('item_') && items[cb]) {
  const i = items[cb];
  r = '📖 ' + i.n + '\n\n' + i.d + '\n\n💰 Price: $' + i.p;
  kb = [[{text: '🛒 Buy', callback_data: 'buy_' + cb.replace('item_', '')}, {text: '⬅️ Catalog', callback_data: 'catalog'}], [{text: '🔙 Menu', callback_data: 'back_menu'}]];
} else if (cb && cb.startsWith('buy_')) {
  r = '🛒 Checkout\n\nProduct: ' + cb.replace('buy_', '') + '\nEnter your email:'; kb = back;
} else if (text && text.includes('@') && text.includes('.')) {
  r = '✉️ Email confirmed\n\n' + text + '\n✅ Format OK'; kb = back;
} else if (text && text.length >= 2 && text.length <= 50 && !text.startsWith('/')) {
  r = '👍 Registration — Step 2/3\n\nName: ' + text + '\n\nEnter your email:'; kb = back;
} else if (text) {
  r = '🤖 Unknown command: ' + text.substring(0, 50) + '\n/start or /help'; kb = back;
} else { return []; }

// Answer callback query (removes loading indicator on button)
if (cbId) {
  try {
    const cbText = cb === 'ping' ? 'Pong!' : cb.startsWith('buy_') ? '✅ Added!' : '';
    await this.helpers.httpRequest({method: 'POST', url: API + '/answerCallbackQuery', body: {callback_query_id: cbId, text: cbText}, json: true});
  } catch (_e) {
    // Non-critical: button loading indicator stays but message still sends
  }
}

// Send response
const body = {chat_id: chatId, text: r};
if (kb) body.reply_markup = {inline_keyboard: kb};
const sendResp = await this.helpers.httpRequest({method: 'POST', url: API + '/sendMessage', body, json: true});
if (!sendResp.ok) throw new Error(`Telegram sendMessage failed: ${sendResp.description || 'unknown error'}`);

return [{json: {ok: true}}];
}; // end _run
export default _run;
