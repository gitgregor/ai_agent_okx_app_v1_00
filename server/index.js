const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { OkxEeaTradingEngine } = require('./okx-eea-client');
const { MCP_TOOLS, handleMcpJsonRpc } = require('./mcp-server');

const PORT = process.env.PORT || 3456;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const engine = new OkxEeaTradingEngine();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  try {
    // 1. State endpoint
    if (pathname === '/api/state' && req.method === 'GET') {
      return sendJson(res, 200, engine.getState());
    }

    // 2. Update top-bar configuration (Demo/Live API key, AI Agent status)
    if (pathname === '/api/config' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const state = await engine.updateConfig(body);
      return sendJson(res, 200, { ok: true, state });
    }

    // 2B. Force sync portfolio & orders from OKX Demo / Live account
    if (pathname === '/api/portfolio/sync' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const mode = body.mode || engine.config.apiMode;
      await engine.fetchRealOkxTickers();
      const syncRes = await engine.syncAccountFromOkx(mode);
      return sendJson(res, 200, {
        ok: syncRes.ok,
        error: syncRes.error || null,
        state: engine.getState()
      });
    }

    // 3. Candlesticks endpoint for resizable/draggable TradingView chart (Small / Medium / Full)
    if (pathname === '/api/candles' && req.method === 'GET') {
      const instId = parsedUrl.searchParams.get('instId') || 'BTC-USDC';
      const bar = parsedUrl.searchParams.get('bar') || '15m';
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '120', 10);
      const candlesData = await engine.getCandles(instId, bar, limit);
      return sendJson(res, 200, candlesData);
    }

    // 4. AI Agent MCP natural language chat
    if (pathname === '/api/agent/chat' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = engine.processAiAgentPrompt(body.message || '');
      return sendJson(res, 200, result);
    }

    // 4B. AI Agent OKX Buy Strategy & Deep Market Analysis
    if (pathname === '/api/agent/strategy' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = engine.generateAiBuyStrategy(body.query || body.message || 'BTC');
      return sendJson(res, 200, result);
    }

    // 5. Propose trade order (sets status to "Czekam na start zlecenia" and opens Authorization Pop-up)
    if (pathname === '/api/trade/propose' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = engine.proposeTradeOrder(body);
      return sendJson(res, 200, result);
    }

    // 6. Authorize and execute trade from Pop-up START button
    if (pathname === '/api/trade/authorize' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await engine.authorizeAndExecuteTrade(body.orderId);
      return sendJson(res, 200, result);
    }

    // 7. Stop trading button
    if (pathname === '/api/trade/stop' && req.method === 'POST') {
      const result = engine.stopTrading();
      return sendJson(res, 200, result);
    }

    // 8. Cancel an open limit order
    if (pathname === '/api/orders/cancel' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await engine.cancelOpenOrder(body.orderId);
      return sendJson(res, 200, result);
    }

    // 9. Send open order to Start Authorization Pop-up
    if (pathname === '/api/orders/activate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = engine.activateOpenOrderToStart(body.orderId);
      return sendJson(res, 200, result);
    }

    // 10. MCP Server JSON-RPC & tools discovery endpoint
    if (pathname === '/api/mcp' && req.method === 'GET') {
      return sendJson(res, 200, {
        server: '@okx_ai/okx-trade-mcp (eea.okx.com)',
        repository: 'https://github.com/okx/agent-trade-kit',
        skillsCommand: 'npx skills add okx/agent-skills',
        site: 'eea',
        baseUrl: 'https://eea.okx.com',
        tools: MCP_TOOLS
      });
    }

    if (pathname === '/api/mcp' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const rpcResponse = await handleMcpJsonRpc(engine, body);
      return sendJson(res, 200, rpcResponse);
    }

    // Serve static frontend files
    let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexFile = path.join(PUBLIC_DIR, 'index.html');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      fs.createReadStream(indexFile).pipe(res);
    }
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`===================================================================`);
  console.log(`🚀 OKX Europe (eea.okx.com) AI Agent & MCP Trading Server uruchomiony!`);
  console.log(`🌐 Adres aplikacji: http://localhost:${PORT}`);
  console.log(`🔌 Serwer MCP (okx-trade-mcp): http://localhost:${PORT}/api/mcp`);
  console.log(`📊 Domyślny tryb: DEMO | Status Agenta AI: DEZAKTYWOWANY`);
  console.log(`===================================================================`);
});
