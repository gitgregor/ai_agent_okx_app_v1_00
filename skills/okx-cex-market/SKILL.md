---
name: okx-cex-market
description: Read-only public market data queries for OKX Europe (eea.okx.com) including USDC spot tickers, order books, and candlestick charts.
repository: https://github.com/okx/agent-trade-kit
command: npx skills add okx/agent-skills
---

# OKX CEX Market Skill (`eea.okx.com`)

## Overview
Provides real-time and simulated market data from `https://eea.okx.com/api/v5/market/*` for European Economic Area (EEA) trading pairs settled in `USDC` and `EUR`.

## MCP Tools Exposed
- `market_get_ticker`: Fetch latest price, 24h volume, 24h high/low, and 24h change for pairs such as `BTC-USDC`, `ETH-USDC`, `SOL-USDC`, `OKB-USDC`, `XRP-USDC`, `ADA-USDC`.
- `market_get_candles`: Fetch OHLCV candlesticks (`1m`, `5m`, `15m`, `1H`, `4H`, `1D`) for interactive small/medium/full charts.
- `market_get_orderbook`: Retrieve top bids and asks on `eea.okx.com`.
