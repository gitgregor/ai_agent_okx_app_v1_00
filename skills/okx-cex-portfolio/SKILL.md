---
name: okx-cex-portfolio
description: Real-time Demo and Live portfolio balance tracking, bought/sold asset & USDC ledger, and historical portfolio snapshots for OKX Europe (eea.okx.com).
repository: https://github.com/okx/agent-trade-kit
command: npx skills add okx/agent-skills
---

# OKX CEX Portfolio Skill (`eea.okx.com`)

## Dual Portfolio Panels & History
1. **Panel 1 — Portfel Handlowy (Demo / Live)**: Displays current asset balances (`USDC`, `BTC`, `ETH`, `SOL`, `OKB`, `XRP`, `ADA`), live prices, value in `USDC`, and allocation percentage.
2. **Panel 2 — Bilans Kupiono / Sprzedano (w ilości aktywa i w USDC)**: Tracks cumulative bought quantity & `USDC` value and cumulative sold quantity & `USDC` value for each asset.
3. **Historia Portfela**: Automatically records a portfolio snapshot after every buy or sell execution.

## MCP Tools Exposed
- `account_get_balance`: Query current trading portfolio and bought/sold ledger in `USDC`.
- `account_get_portfolio_history`: Query historical snapshots of the trading portfolio.
