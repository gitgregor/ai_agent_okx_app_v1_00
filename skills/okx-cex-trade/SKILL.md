---
name: okx-cex-trade
description: Authorized spot and algorithmic order placement, amendment, and cancellation on OKX Europe (eea.okx.com) with mandatory user Start Trading confirmation.
repository: https://github.com/okx/agent-trade-kit
command: npx skills add okx/agent-skills
---

# OKX CEX Trade Skill (`eea.okx.com`)

## Mandatory Authorization Policy (Human-in-the-Loop)
1. Every trade or AI strategy generated via MCP (`spot_place_order`, `algo_place_order`) enters the **`waiting_for_start` (`Czekam na start zlecenia`)** state first.
2. Execution is strictly blocked until the user explicitly authorizes the trade by pressing the **START** button inside the Trading Status & Authorization Pop-up.
3. Supports both **Demo Trading** (`x-simulated-trading: 1`, default on application load) and **Live Trading** on `https://eea.okx.com`.

## MCP Tools Exposed
- `spot_place_order`: Propose a Spot Market or Limit Buy/Sell order in `USDC` on `eea.okx.com`.
- `trade_authorize_start`: Authorize and execute a pending order when the user clicks Start inside the authorization pop-up.
- `spot_cancel_order`: Cancel an open or pending order.
- `trade_get_orders`: Retrieve open (`Otwarte zlecenia`) and closed (`Zamknięte zlecenia`) orders with timestamps and chart links.
