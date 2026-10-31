#!/usr/bin/env node
/**
 * OKX EEA Model Context Protocol (MCP) Server
 * Compatible with okx/agent-trade-kit (@okx_ai/okx-trade-mcp) and okx/agent-skills
 * Configured for OKX Europe (https://eea.okx.com, OKX_SITE=eea)
 */

const readline = require('readline');
const { OkxEeaTradingEngine } = require('./okx-eea-client');

const MCP_TOOLS = [
  {
    name: 'market_get_ticker',
    description: '[okx-cex-market] Pobierz aktualny kurs i statystyki 24h dla pary na OKX Europe (eea.okx.com), np. BTC-USDC, ETH-USDC, SOL-USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: 'Para handlowa np. BTC-USDC, ETH-USDC, SOL-USDC' }
      },
      required: ['instId']
    }
  },
  {
    name: 'market_get_candles',
    description: '[okx-cex-market] Pobierz świece OHLCV dla wykresu danego aktywa na eea.okx.com (1m, 5m, 15m, 1H, 4H, 1D).',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: 'Para np. BTC-USDC' },
        bar: { type: 'string', description: 'Interwał: 1m, 5m, 15m, 1H, 4H, 1D' }
      },
      required: ['instId']
    }
  },
  {
    name: 'account_get_balance',
    description: '[okx-cex-portfolio] Pobierz Portfel Handlowy (Demo/Live) oraz bilans kupiono/sprzedano w ilości aktywa i w przeliczeniu na USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['demo', 'live'], description: 'Tryb portfela (domyślnie demo)' }
      }
    }
  },
  {
    name: 'bot_create_strategy',
    description: '[okx-cex-bot] Zbuduj strategię AI (Spot DCA, Grid, Momentum, Rebalance) na podstawie polecenia w języku naturalnym i przygotuj zlecenie do autoryzacji przyciskiem Start handlu.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Polecenie użytkownika w języku naturalnym' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'spot_place_order',
    description: '[okx-cex-trade] Utwórz zlecenie kupna lub sprzedaży na eea.okx.com. Zlecenie trafia do autoryzacji (status: Czekam na start zlecenia) i czeka na wciśnięcie przycisku START w pop-upie.',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: 'Para handlowa np. BTC-USDC' },
        side: { type: 'string', enum: ['BUY', 'SELL'], description: 'Kierunek zlecenia: BUY lub SELL' },
        orderType: { type: 'string', enum: ['MARKET', 'LIMIT'], description: 'Typ zlecenia: MARKET lub LIMIT' },
        amount: { type: 'number', description: 'Ilość aktywa bazowego' },
        usdcAmount: { type: 'number', description: 'Kwota w USDC' },
        strategyName: { type: 'string', description: 'Nazwa strategii AI' }
      },
      required: ['instId', 'side']
    }
  },
  {
    name: 'trade_authorize_start',
    description: '[okx-cex-trade] Autoryzuj i rozpocznij realizację oczekującego zlecenia (odpowiednik wciśnięcia przycisku START w pop-upie handlu).',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'ID oczekującego zlecenia' }
      }
    }
  }
];

async function handleMcpJsonRpc(engine, request) {
  const { id, method, params } = request || {};

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'okx-eea-trade-mcp (@okx_ai/okx-trade-mcp)',
          version: '1.0.0',
          site: 'eea.okx.com'
        },
        capabilities: {
          tools: {}
        }
      }
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS
      }
    };
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};
    let output = null;

    switch (toolName) {
      case 'market_get_ticker': {
        const state = engine.getState();
        const found = state.markets.find((m) => m.instId === (args.instId || 'BTC-USDC'));
        output = found || state.markets[0];
        break;
      }
      case 'market_get_candles': {
        output = await engine.getCandles(args.instId || 'BTC-USDC', args.bar || '15m', 80);
        break;
      }
      case 'account_get_balance': {
        output = engine.calculatePortfolioSummary(args.mode || engine.config.apiMode);
        break;
      }
      case 'bot_create_strategy': {
        if (engine.config.aiStatus !== 'active') {
          await engine.updateConfig({ aiStatus: 'active' });
        }
        output = engine.processAiAgentPrompt(args.prompt || 'Kup 0.02 BTC po cenie rynkowej');
        break;
      }
      case 'spot_place_order': {
        output = engine.proposeTradeOrder(args);
        break;
      }
      case 'trade_authorize_start': {
        output = await engine.authorizeAndExecuteTrade(args.orderId);
        break;
      }
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Nieznane narzędzie MCP: ${toolName}` }
        };
    }

    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2)
          }
        ]
      }
    };
  }

  return {
    jsonrpc: '2.0',
    id,
    result: { status: 'ok', server: 'okx-eea-trade-mcp', toolsCount: MCP_TOOLS.length }
  };
}

// If executed directly via CLI (`node server/mcp-server.js --site eea --demo`), run stdio JSON-RPC loop
if (require.main === module) {
  const standaloneEngine = new OkxEeaTradingEngine();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    try {
      const req = JSON.parse(line);
      const res = await handleMcpJsonRpc(standaloneEngine, req);
      process.stdout.write(JSON.stringify(res) + '\n');
    } catch (err) {
      process.stdout.write(
        JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: err.message } }) + '\n'
      );
    }
  });
}

module.exports = { MCP_TOOLS, handleMcpJsonRpc };
