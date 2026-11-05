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
  const bodyStr = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, bypass-tunnel-reminder, ngrok-skip-browser-warning, Authorization, X-Requested-With',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(bodyStr);
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
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': '0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, bypass-tunnel-reminder, ngrok-skip-browser-warning, Authorization, X-Requested-With',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '86400'
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
      if (Array.isArray(body.clientTickers)) {
        engine.applyClientTickers(body.clientTickers);
      }
      await engine.fetchRealOkxTickers();
      const result = engine.processAiAgentPrompt(body.message || '');
      return sendJson(res, 200, result);
    }

    // 4B. AI Agent OKX Buy Strategy & Deep Market Analysis
    if (pathname === '/api/agent/strategy' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (Array.isArray(body.clientTickers)) {
        engine.applyClientTickers(body.clientTickers);
      }
      await engine.fetchRealOkxTickers();
      const result = engine.generateAiBuyStrategy(body.query || body.message || 'BTC');
      return sendJson(res, 200, result);
    }

    // 4C. Sync live OKX tickers from browser client (fallback when server runs in isolated network)
    if (pathname === '/api/market/tickers' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (Array.isArray(body.tickers)) {
        engine.applyClientTickers(body.tickers);
      }
      return sendJson(res, 200, { ok: true, state: engine.getState() });
    }

    // 5. Propose trade order (sets status to "Czekam na start zlecenia" and opens Authorization Pop-up)
    if (pathname === '/api/trade/propose' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (Array.isArray(body.clientTickers)) {
        engine.applyClientTickers(body.clientTickers);
      }
      await engine.fetchRealOkxTickers();
      const result = engine.proposeTradeOrder(body);
      return sendJson(res, 200, result);
    }

    // 6. Authorize and execute trade from Pop-up START button
    if (pathname === '/api/trade/authorize' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await engine.authorizeAndExecuteTrade(body.orderId);
      return sendJson(res, 200, result);
    }

    // 6B. Toggle transaction collapse state in synchronized session
    if (pathname === '/api/session/toggle-tx' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const orderId = body.orderId;
      if (orderId && engine.sessionSync && Array.isArray(engine.sessionSync.executedSessionTransactions)) {
        engine.sessionSync.executedSessionTransactions = engine.sessionSync.executedSessionTransactions.map((tx) =>
          tx.orderId === orderId ? { ...tx, collapsed: !tx.collapsed } : tx
        );
        engine._saveSessionOrders();
      }
      return sendJson(res, 200, { ok: true, state: engine.getState() });
    }

    // 6C. Merge AI Agent / session orders from browser client (Desktop / Mobile / Offline sync)
    if (pathname === '/api/session/sync-orders' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const state = engine.mergeClientSessionOrders(body);
      return sendJson(res, 200, { ok: true, state });
    }

    // 6D. Gateway discovery endpoint
    if ((pathname === '/api/gateway' || pathname === '/gateway.json') && req.method === 'GET') {
      return sendJson(res, 200, getGatewayRegistryPayload());
    }

    // 7. Stop trading button / Reject trade order
    if (pathname === '/api/trade/stop' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = engine.stopTrading(body);
      return sendJson(res, 200, result);
    }

    // 7B. Complete strategy in progress
    if (pathname === '/api/strategy/complete' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = engine.completeStrategy(body.orderId);
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

const GATEWAY_SUBDOMAINS = [
  'okx-eea-gregor-home-gw',
  'okx-eea-gregor-home-gw-2',
  'okx-eea-gregor-home-gw-3'
];

let activeCloudflareTunnel = null;
let activeCloudflareUrl = '';
let reconnectingCloudflare = false;

let activeTunnelInstance = null;
let activeLocaltunnelUrl = '';
let reconnectingTunnel = false;
let currentLtSubdomainIdx = 0;
let lastPublishedPrimaryUrl = '';
let gitSyncInFlight = false;

function getGatewayRegistryPayload() {
  const primary = activeCloudflareUrl || activeLocaltunnelUrl || `https://${GATEWAY_SUBDOMAINS[0]}.loca.lt`;
  const tunnels = [];
  if (activeCloudflareUrl) tunnels.push(activeCloudflareUrl);
  if (activeLocaltunnelUrl && !tunnels.includes(activeLocaltunnelUrl)) tunnels.push(activeLocaltunnelUrl);
  for (const sub of GATEWAY_SUBDOMAINS) {
    const u = `https://${sub}.loca.lt`;
    if (!tunnels.includes(u)) tunnels.push(u);
  }
  return {
    updatedAt: Date.now(),
    homePublicIp: engine.config?.remoteGateway?.homePublicIp || '81.99.228.78',
    primaryTunnelUrl: primary,
    cloudflareTunnelUrl: activeCloudflareUrl || null,
    fallbackTunnelUrl: activeLocaltunnelUrl || `https://${GATEWAY_SUBDOMAINS[0]}.loca.lt`,
    tunnels
  };
}

function updateAndPublishGatewayStatus() {
  const payload = getGatewayRegistryPayload();
  const bestUrl = payload.primaryTunnelUrl;
  const isReady = Boolean(activeCloudflareUrl || activeLocaltunnelUrl);

  engine.setGatewayStatus({
    active: isReady,
    tunnelUrl: bestUrl,
    cloudflareTunnelUrl: activeCloudflareUrl || null,
    fallbackTunnelUrl: activeLocaltunnelUrl || null,
    tunnels: payload.tunnels,
    mobileAppUrl: `https://gitgregor.github.io/ai_agent_okx_app_v1_00/?gateway=${encodeURIComponent(bestUrl)}`,
    statusLabel: isReady
      ? `AKTYWNA BRAMA DOMOWEGO IP (${bestUrl.replace('https://', '')}) — Telefon działa poza domem przez Whitelist IP`
      : 'Inicjalizacja tunelu Bramy Domowej IP...',
    lastConnectedAt: new Date().toTimeString().slice(0, 8)
  });

  // Write gateway.json to public/, docs/, and root so both local and GitHub Pages clients can auto-discover the live tunnel URL
  try {
    const jsonStr = JSON.stringify(payload, null, 2);
    const rootDir = path.join(__dirname, '..');
    const targets = [
      path.join(rootDir, 'public', 'gateway.json'),
      path.join(rootDir, 'docs', 'gateway.json'),
      path.join(rootDir, 'gateway.json')
    ];
    for (const tPath of targets) {
      const dir = path.dirname(tPath);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(tPath, jsonStr, 'utf8');
      }
    }
  } catch (e) {}

  // If a new Cloudflare URL is active, auto-push gateway.json to GitHub in background so mobile phones outside home discover it via raw.githubusercontent.com
  if (activeCloudflareUrl && activeCloudflareUrl !== lastPublishedPrimaryUrl && !gitSyncInFlight) {
    lastPublishedPrimaryUrl = activeCloudflareUrl;
    gitSyncInFlight = true;
    const { exec } = require('child_process');
    const rootDir = path.join(__dirname, '..');
    exec(
      'git add gateway.json public/gateway.json docs/gateway.json && git commit -m "chore: update active Home IP Gateway tunnel URL" && git push origin main',
      { cwd: rootDir, timeout: 25000 },
      () => {
        gitSyncInFlight = false;
      }
    );
  }
}

function startCloudflareGatewayTunnel() {
  if (reconnectingCloudflare) return;
  reconnectingCloudflare = true;

  try {
    const { Tunnel } = require('cloudflared');
    const cfTunnel = Tunnel.quick(`http://127.0.0.1:${PORT}`);
    activeCloudflareTunnel = cfTunnel;
    reconnectingCloudflare = false;

    const handlePotentialUrl = (rawUrl) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const clean = rawUrl.trim().replace(/\/+$/, '');
      if (!clean.startsWith('https://')) return;
      if (clean.includes('api.trycloudflare.com')) return;

      const m = clean.match(/^https:\/\/([a-z0-9-]+)\.trycloudflare\.com$/i);
      if (m && m[1].toLowerCase() !== 'api') {
        if (activeCloudflareUrl !== clean) {
          activeCloudflareUrl = clean;
          console.log(`⚡ [Cloudflare Brama Domowa IP / OKX Whitelist] Tunel główny aktywny: ${activeCloudflareUrl}`);
          updateAndPublishGatewayStatus();
        }
      }
    };

    cfTunnel.on('url', (url) => {
      handlePotentialUrl(url);
    });

    cfTunnel.on('stdout', (data) => {
      const text = String(data || '');
      const matches = text.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/gi);
      for (const m of matches) {
        if (m[1] && m[1].toLowerCase() !== 'api') {
          handlePotentialUrl(m[0]);
        }
      }
    });

    cfTunnel.on('stderr', (data) => {
      const text = String(data || '');
      const matches = text.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/gi);
      for (const m of matches) {
        if (m[1] && m[1].toLowerCase() !== 'api') {
          handlePotentialUrl(m[0]);
        }
      }
    });

    cfTunnel.on('connected', () => {
      updateAndPublishGatewayStatus();
    });

    cfTunnel.on('exit', () => {
      activeCloudflareTunnel = null;
      activeCloudflareUrl = '';
      reconnectingCloudflare = false;
      updateAndPublishGatewayStatus();
      setTimeout(() => startCloudflareGatewayTunnel(), 4000);
    });

    cfTunnel.on('error', () => {
      // Handled by exit / watchdog
    });
  } catch (err) {
    reconnectingCloudflare = false;
    setTimeout(() => startCloudflareGatewayTunnel(), 8000);
  }
}

async function startHomeIpGatewayTunnel(subdomainIndex = 0) {
  if (reconnectingTunnel) return;
  reconnectingTunnel = true;
  currentLtSubdomainIdx = subdomainIndex;

  try {
    const localtunnel = require('localtunnel');
    const desiredSubdomain = GATEWAY_SUBDOMAINS[subdomainIndex % GATEWAY_SUBDOMAINS.length];

    const tunnel = await localtunnel({
      port: Number(PORT),
      local_host: '127.0.0.1',
      subdomain: desiredSubdomain
    });

    activeTunnelInstance = tunnel;
    reconnectingTunnel = false;

    const assignedUrl = (tunnel.url || `https://${desiredSubdomain}.loca.lt`).replace(/\/+$/, '');
    activeLocaltunnelUrl = assignedUrl;
    const isExactMatch = assignedUrl.includes(desiredSubdomain);

    updateAndPublishGatewayStatus();

    console.log(`🌐 [LocalTunnel Brama Domowa IP / OKX Whitelist] Tunel zapasowy aktywny: ${assignedUrl}`);
    console.log(`📱 [Telefon poza domem] Link zsynchronizowany: https://gitgregor.github.io/ai_agent_okx_app_v1_00/`);

    // If localtunnel gave a random subdomain because desiredSubdomain was still releasing, try next candidate in 15s
    if (!isExactMatch && subdomainIndex < GATEWAY_SUBDOMAINS.length - 1) {
      setTimeout(() => {
        try {
          tunnel.close();
        } catch (e) {}
      }, 15000);
    }

    tunnel.on('close', () => {
      activeTunnelInstance = null;
      activeLocaltunnelUrl = '';
      updateAndPublishGatewayStatus();
      setTimeout(() => startHomeIpGatewayTunnel((subdomainIndex + 1) % GATEWAY_SUBDOMAINS.length), 3000);
    });

    tunnel.on('error', () => {
      try {
        tunnel.close();
      } catch (e) {}
    });
  } catch (err) {
    reconnectingTunnel = false;
    activeLocaltunnelUrl = '';
    updateAndPublishGatewayStatus();
    setTimeout(() => startHomeIpGatewayTunnel((subdomainIndex + 1) % GATEWAY_SUBDOMAINS.length), 5000);
  }
}

// Self-Healing Watchdog: Every 25s verify external tunnels respond 200 OK; if localtunnel returns 503 Tunnel Unavailable, restart it immediately
let cfConsecutiveFailures = 0;
let ltConsecutiveFailures = 0;

async function probeExternalUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${url}/api/state`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'bypass-tunnel-reminder': 'true' },
      signal: controller.signal
    });
    clearTimeout(timer);
    return res.status === 200;
  } catch (e) {
    clearTimeout(timer);
    return false;
  }
}

setInterval(async () => {
  if (activeCloudflareUrl && !activeCloudflareUrl.includes('api.trycloudflare.com')) {
    const cfOk = await probeExternalUrl(activeCloudflareUrl);
    if (cfOk) {
      cfConsecutiveFailures = 0;
    } else {
      cfConsecutiveFailures += 1;
      if (cfConsecutiveFailures >= 3 && activeCloudflareTunnel) {
        console.log(`🔄 [Watchdog] Restartowanie tunelu Cloudflare (${activeCloudflareUrl})...`);
        cfConsecutiveFailures = 0;
        try {
          activeCloudflareTunnel.stop();
        } catch (e) {}
      }
    }
  }

  if (activeLocaltunnelUrl) {
    const ltOk = await probeExternalUrl(activeLocaltunnelUrl);
    if (ltOk) {
      ltConsecutiveFailures = 0;
    } else {
      ltConsecutiveFailures += 1;
      if (ltConsecutiveFailures >= 2 && activeTunnelInstance) {
        console.log(`🔄 [Watchdog] Wykryto uśpienie LocalTunnel (503/timeout) — automatyczny restart tunelu...`);
        ltConsecutiveFailures = 0;
        try {
          activeTunnelInstance.close();
        } catch (e) {}
      }
    }
  }
}, 25000);

server.listen(PORT, () => {
  console.log(`===================================================================`);
  console.log(`🚀 OKX Europe (eea.okx.com) AI Agent & MCP Trading Server uruchomiony!`);
  console.log(`🌐 Adres aplikacji (Desktop): http://localhost:${PORT}`);
  console.log(`🔌 Serwer MCP (okx-trade-mcp): http://localhost:${PORT}/api/mcp`);
  console.log(`📊 Domyślny tryb: DEMO | Status Agenta AI: DEZAKTYWOWANY`);
  console.log(`===================================================================`);
  startCloudflareGatewayTunnel();
  startHomeIpGatewayTunnel(0);
});
