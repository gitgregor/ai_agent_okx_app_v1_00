---
name: okx-cex-bot
description: Natural language AI strategy builder for OKX Europe (eea.okx.com) supporting Spot DCA, Grid Bots, Momentum, and Smart Rebalancing via MCP.
repository: https://github.com/okx/agent-trade-kit
command: npx skills add okx/agent-skills
---

# OKX CEX Bot & AI Strategy Skill (`eea.okx.com`)

## Natural Language to Strategy Execution
Allows Claude, ChatGPT, or any MCP-enabled AI client to translate natural language goals (e.g., *"Kup BTC za 1000 USDC z ochroną stop-loss"*, *"Zbuduj strategię DCA na ETH i SOL"*) into structured OKX EEA orders queued for user authorization (`Czekam na start zlecenia`).

## MCP Tools Exposed
- `bot_create_strategy`: Analyze market conditions on `eea.okx.com`, build an AI trading strategy, and queue the resulting order(s) for user confirmation in the Start Trading Pop-up.
