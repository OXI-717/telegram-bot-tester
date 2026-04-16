# Universal Telegram Bot Tester

**Bot-to-bot E2E testing for ANY Telegram bot — no code changes to the target bot required.**

Uses the new [Telegram Bot-to-Bot Communication Mode](https://core.telegram.org/bots/features#bot-to-bot-communication) (April 2026) to automatically discover, crawl, and test any Telegram bot through a simple n8n workflow.

## How It Works

```
Runner Bot ──sends commands──> Test Group <──responds── Target Bot (any bot)
    │                                                        │
    └── sees responses via bot-to-bot mode ──<───────────────┘
    │
    ├── discovers commands (/start, /help, etc.)
    ├── maps inline keyboard buttons
    ├── crawls button tree (3 levels deep)
    ├── tests data input flows (name, email, etc.)
    └── sends HTML report to admin
```

## Quick Start

### 1. Create a Runner Bot

Talk to [@BotFather](https://t.me/BotFather):
```
/newbot → "My Test Runner" → @my_test_runner_bot
```

In BotFather's mini app: enable **Bot-to-Bot Communication Mode**.

### 2. Enable Bot-to-Bot on the Target Bot

In BotFather's mini app: select your target bot → enable **Bot-to-Bot Communication Mode**.

### 3. Create a Test Group

- Create a Telegram group
- Add both bots as admins
- Disable privacy mode for the runner bot (`/setprivacy` → Disable)

### 4. Set Up n8n Workflow

1. Import the workflow or create a new one with:
   - **Schedule Trigger** (every 6 hours) + **Manual Trigger**
   - **Code Node** (v2) — paste contents of [`n8n-workflows/universal-tester.js`](n8n-workflows/universal-tester.js)

2. Edit the config at the top of the Code node:
   ```js
   const RUNNER_TOKEN = 'your_runner_bot_token';
   const TARGET_USERNAME = '@your_target_bot';
   const TEST_GROUP_ID = '-your_group_id';
   const ADMIN_CHAT_ID = 'your_telegram_user_id';
   ```

3. Click **Execute** — you'll get a report in Telegram within ~60 seconds.

### 5. (Optional) Deploy Example Target Bot

To verify your setup, deploy the example target bot:
1. Create another bot via BotFather, enable bot-to-bot
2. Create a workflow: **Telegram Trigger** → **Code Node** with [`n8n-workflows/target-bot-example.js`](n8n-workflows/target-bot-example.js)
3. Set the token in the code

## Test Phases

| Phase | What it does |
|-------|-------------|
| **Discover** | Sends 8 standard commands (`/start`, `/help`, `/ping`, `/status`, `/register`, `/menu`, `/cancel`, `/about`) |
| **Crawl L0** | For each discovered button, sends its `callback_data` as a text message |
| **Crawl L1** | Tests buttons discovered during L0 |
| **Crawl L2** | Third level (max 10 buttons) |
| **Input Tests** | Sends test inputs: name, email, invalid data, generic text |
| **Report** | HTML report to admin DM + summary to test group |

## Example Report

```
✅ Universal Bot Tester
Target: @my_bot

Score: 18/18
Buttons: 6
Avg: 1675ms | Max: 3200ms
Duration: 60s

━━ Commands ━━
✅ /start 1200ms 🔘×5
  └ 👋 Welcome! Choose an action:
✅ /help 980ms
  └ ❓ Help...
✅ /ping 450ms
  └ 🏓 Pong!
❌ /menu 12000ms
  (no response — bot doesn't handle this command)

━━ Buttons ━━
✅ [L0] register 1100ms
  └ 📋 Registration — Step 1...
✅ [L0] catalog 900ms →🔘×4
  └ 📦 Course Catalog...

━━ Button Map (6) ━━
🟢 register
🟢 status
🟢 ping
🟢 help
🟢 catalog
🟢 back_menu
```

## Limitations

- **Inline button clicks**: Buttons are tested by sending `callback_data` as text. Many bots respond to this, but not all. Real button clicks require a userbot session (MTProto/Telethon).
- **Stateful flows**: Each probe is independent — the bot doesn't maintain conversation state between probes.
- **Rate limits**: ~800ms pause between probes. Full crawl takes ~60 seconds.

## Roadmap

- [ ] **Baseline & regression detection** — save first crawl, compare on subsequent runs
- [ ] **Userbot mode** — click inline buttons via MTProto for full coverage
- [ ] **n8n config form** — configure via UI instead of editing code
- [ ] **n8n marketplace template** — publish as importable workflow
- [ ] **Multi-bot** — test multiple bots in one run

## Requirements

- [n8n](https://n8n.io) (self-hosted or cloud)
- Two Telegram bots (runner + target) with Bot-to-Bot Communication Mode enabled
- A Telegram group with both bots as admins

## License

MIT
