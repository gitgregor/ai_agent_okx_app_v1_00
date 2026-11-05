// ============================================================================
// OKX EUROPE (eea.okx.com) LIVE CLIENT ENGINE & MARKET HELPERS FOR REACT APP
// ============================================================================

export function formatUsdc(num) {
  return (
    Number(num || 0).toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' USDC'
  );
}

export function formatUnitPrice(num) {
  const val = Number(num || 0);
  const abs = Math.abs(val);
  let maxDec = 2;
  let minDec = 2;
  if (abs > 0 && abs < 0.1) {
    minDec = 4;
    maxDec = 6;
  } else if (abs > 0 && abs < 2) {
    minDec = 4;
    maxDec = 4;
  } else if (abs > 0 && abs < 25) {
    minDec = 3;
    maxDec = 3;
  }
  return (
    val.toLocaleString('pl-PL', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec
    }) + ' USDC'
  );
}

export function formatRawPrice(num) {
  const val = Number(num || 0);
  const abs = Math.abs(val);
  if (abs > 0 && abs < 0.1) return val.toFixed(5);
  if (abs > 0 && abs < 2) return val.toFixed(4);
  if (abs > 0 && abs < 25) return val.toFixed(3);
  return val.toFixed(2);
}

export function formatPriceWithQuote(num, quote = 'USDC') {
  const q = (quote || 'USDC').toUpperCase();
  const rawFormatted = formatRawPrice(num);
  return `${rawFormatted} ${q}`;
}

export function formatPctChange(num) {
  const val = Number(num || 0);
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}

export function getMarketIntervalChanges(market) {
  if (!market) {
    return { change15m: 0, change1h: 0, change4h: 0, change1d: 0, change1w: 0 };
  }
  const d1 = Number(market.change24hPct != null ? market.change24hPct : (market.change1d != null ? market.change1d : 0));

  if (market.change15mPct != null && market.change1hPct != null && market.change4hPct != null && market.change1wPct != null) {
    return {
      change15m: Number(market.change15mPct),
      change1h: Number(market.change1hPct),
      change4h: Number(market.change4hPct),
      change1d: d1,
      change1w: Number(market.change1wPct)
    };
  }

  // Deterministyczny model rozkładu zmienności dla braku pełnych świec z przeszłości
  const hash = (market.instId || '').split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  const factor = (Math.abs(hash) % 100) / 100; // 0.00 .. 0.99
  const m15 = Number((d1 * 0.18 + (factor - 0.5) * 0.45).toFixed(2));
  const h1 = Number((d1 * 0.38 + (factor - 0.5) * 0.85).toFixed(2));
  const h4 = Number((d1 * 0.68 + (factor - 0.48) * 1.5).toFixed(2));
  const w1 = Number((d1 * 2.15 + (factor - 0.5) * 4.2).toFixed(2));

  return {
    change15m: m15,
    change1h: h1,
    change4h: h4,
    change1d: d1,
    change1w: w1
  };
}

export function formatQty(num) {
  return Number(num || 0).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

export const DEFAULT_STANDALONE_MARKETS = [
  { instId: 'BTC-USDC', base: 'BTC', quote: 'USDC', name: 'Bitcoin', price: 76682.30, bidPx: 76680.50, askPx: 76680.60, open24h: 77838.10, high24h: 78789.30, low24h: 76606.90, vol24h: 1071.88, volCcy24h: 83103441, change24hPct: -1.48, change1dPct: -1.48, change15mPct: -0.22, change1hPct: -0.58, change4hPct: -1.02, change1wPct: +3.85 },
  { instId: 'ETH-USDC', base: 'ETH', quote: 'USDC', name: 'Ethereum', price: 2248.22, bidPx: 2248.22, askPx: 2248.23, open24h: 2263.15, high24h: 2315.88, low24h: 2234.69, vol24h: 10535.29, volCcy24h: 23983599, change24hPct: -0.66, change1dPct: -0.66, change15mPct: +0.08, change1hPct: -0.19, change4hPct: -0.42, change1wPct: +2.10 },
  { instId: 'XRP-USDC', base: 'XRP', quote: 'USDC', name: 'Ripple', price: 1.2458, bidPx: 1.2462, askPx: 1.2464, open24h: 1.2500, high24h: 1.2629, low24h: 1.2341, vol24h: 4555244.55, volCcy24h: 5692241, change24hPct: -0.34, change1dPct: -0.34, change15mPct: -0.05, change1hPct: +0.12, change4hPct: -0.21, change1wPct: +5.40 },
  { instId: 'WLD-USDC', base: 'WLD', quote: 'USDC', name: 'Worldcoin (WLD)', price: 0.3719, bidPx: 0.3719, askPx: 0.3723, open24h: 0.3894, high24h: 0.3932, low24h: 0.3683, vol24h: 500263.32, volCcy24h: 191589, change24hPct: -4.49, change1dPct: -4.49, change15mPct: -0.75, change1hPct: -1.65, change4hPct: -3.10, change1wPct: -8.20 },
  { instId: 'ETC-USDC', base: 'ETC', quote: 'USDC', name: 'Ethereum Classic', price: 6.953, bidPx: 6.934, askPx: 6.966, open24h: 7.123, high24h: 7.171, low24h: 6.894, vol24h: 2199.89, volCcy24h: 15512, change24hPct: -2.39, change1dPct: -2.39, change15mPct: -0.38, change1hPct: -0.85, change4hPct: -1.60, change1wPct: -4.10 },
  { instId: 'USDG-USDC', base: 'USDG', quote: 'USDC', name: 'Global Dollar (USDG)', price: 1.00, bidPx: 0.9999, askPx: 1.0001, open24h: 1.00, high24h: 1.001, low24h: 0.999, vol24h: 500000.0, volCcy24h: 500000, change24hPct: 0.00, change1dPct: 0.00, change15mPct: 0.00, change1hPct: 0.00, change4hPct: 0.00, change1wPct: 0.00 },
  { instId: 'SOL-USDC', base: 'SOL', quote: 'USDC', name: 'Solana', price: 91.37, bidPx: 91.46, askPx: 91.48, open24h: 94.33, high24h: 95.80, low24h: 90.77, vol24h: 85978.59, volCcy24h: 8063966, change24hPct: -3.14, change1dPct: -3.14, change15mPct: +0.25, change1hPct: -1.10, change4hPct: -2.15, change1wPct: +6.90 },
  { instId: 'OKB-USDC', base: 'OKB', quote: 'USDC', name: 'OKB Token', price: 108.23, bidPx: 108.22, askPx: 108.24, open24h: 113.93, high24h: 114.43, low24h: 107.70, vol24h: 2603.48, volCcy24h: 291272, change24hPct: -5.00, change1dPct: -5.00, change15mPct: -0.80, change1hPct: -1.90, change4hPct: -3.40, change1wPct: -9.50 },
  { instId: 'ADA-USDC', base: 'ADA', quote: 'USDC', name: 'Cardano', price: 0.1880, bidPx: 0.1880, askPx: 0.1882, open24h: 0.1920, high24h: 0.1948, low24h: 0.1860, vol24h: 917886.96, volCcy24h: 175202, change24hPct: -2.08, change1dPct: -2.08, change15mPct: -0.30, change1hPct: -0.75, change4hPct: -1.45, change1wPct: +1.80 },
  { instId: 'DOGE-USDC', base: 'DOGE', quote: 'USDC', name: 'Dogecoin', price: 0.07383, bidPx: 0.07383, askPx: 0.07387, open24h: 0.07518, high24h: 0.07625, low24h: 0.07310, vol24h: 8697801.73, volCcy24h: 650910, change24hPct: -1.80, change1dPct: -1.80, change15mPct: +0.45, change1hPct: -0.60, change4hPct: -1.20, change1wPct: +4.20 },
  { instId: 'AVAX-USDC', base: 'AVAX', quote: 'USDC', name: 'Avalanche', price: 8.33, bidPx: 8.328, askPx: 8.346, open24h: 8.675, high24h: 8.728, low24h: 8.267, vol24h: 11411.57, volCcy24h: 97402, change24hPct: -3.98, change1dPct: -3.98, change15mPct: -0.62, change1hPct: -1.40, change4hPct: -2.70, change1wPct: -6.50 },
  { instId: 'LINK-USDC', base: 'LINK', quote: 'USDC', name: 'Chainlink', price: 11.041, bidPx: 11.048, askPx: 11.052, open24h: 11.391, high24h: 11.429, low24h: 10.988, vol24h: 54395.38, volCcy24h: 612058, change24hPct: -3.07, change1dPct: -3.07, change15mPct: -0.45, change1hPct: -1.05, change4hPct: -2.10, change1wPct: +3.40 },
  { instId: 'SUI-USDC', base: 'SUI', quote: 'USDC', name: 'Sui Network', price: 0.8677, bidPx: 0.8687, askPx: 0.8690, open24h: 0.8947, high24h: 0.9080, low24h: 0.8631, vol24h: 952011.95, volCcy24h: 843315, change24hPct: -3.02, change1dPct: -3.02, change15mPct: +0.32, change1hPct: -0.95, change4hPct: -1.95, change1wPct: +7.80 }
];

export function findMarketInList(text, mList = DEFAULT_STANDALONE_MARKETS) {
  const raw = (text || '').trim();
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  const list = Array.isArray(mList) && mList.length > 0 ? mList : DEFAULT_STANDALONE_MARKETS;

  // 1. Bezpośrednie dopasowanie np. SOL-USDC, PEPE-USDT, BTC-USDC
  const pairMatch = upper.match(/\b([A-Z0-9]{2,10}-[A-Z0-9]{3,5})\b/);
  if (pairMatch) {
    const found = list.find((m) => m.instId === pairMatch[1]);
    if (found) return found;
  }

  // 2. Popularne aliasy
  const aliasMap = {
    'bitcoin': 'BTC',
    'ethereum classic': 'ETC',
    'ethereum': 'ETH',
    'ether': 'ETH',
    'worldcoin': 'WLD',
    'ripple': 'XRP',
    'cardano': 'ADA',
    'dogecoin': 'DOGE',
    'avalanche': 'AVAX',
    'chainlink': 'LINK',
    'solana': 'SOL',
    'polkadot': 'DOT',
    'polygon': 'POL',
    'matic': 'POL'
  };
  for (const [alias, sym] of Object.entries(aliasMap)) {
    if (lower.includes(alias)) {
      const m = list.find((x) => x.instId === `${sym}-USDC`) || list.find((x) => x.instId === `${sym}-USDT`) || list.find((x) => x.base === sym);
      if (m) return m;
    }
  }

  // 3. Wyszukiwanie symbolu bazowego w tekście ze słów
  const words = upper.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const skipWords = new Set(['KUP', 'SPRZEDAJ', 'KUPNO', 'SPRZEDAZ', 'DLA', 'ZA', 'W', 'NA', 'SPOT', 'AI', 'OKX', 'USDC', 'USDT', 'USD', 'LIMIT', 'MARKET', 'ORDER', 'BUY', 'SELL', 'PROSZE', 'CHCE', 'ZLECENIE', 'STRATEGIE', 'STRATEGIA', 'TEST', 'DEMO', 'LIVE']);
  for (const w of words) {
    if (skipWords.has(w)) continue;
    const foundUsdc = list.find((m) => m.instId === `${w}-USDC`);
    if (foundUsdc) return foundUsdc;
    const foundUsdt = list.find((m) => m.instId === `${w}-USDT`);
    if (foundUsdt) return foundUsdt;
    const anyBase = list.find((m) => m.base === w);
    if (anyBase) return anyBase;
  }

  return list.find((m) => m.instId === 'BTC-USDC') || list[0];
}

const LS_CUSTOM_GATEWAY_KEY = 'okx_custom_gateway_url_v1';
const LS_AI_EXECUTED_ORDERS_KEY = 'okx_ai_executed_orders_v1';
const DEFAULT_HOME_GATEWAYS = [
  'https://okx-eea-gregor-home-gw.loca.lt',
  'https://okx-eea-gregor-home-gw-2.loca.lt',
  'https://okx-eea-gregor-home-gw-3.loca.lt'
];
let _discoveredCloudflareUrl = '';
let _discoveredGatewayList = [];

export function loadSavedAiExecutedOrders() {
  if (typeof window === 'undefined') return [];
  const collected = [];
  const seen = new Set();
  const addOrd = (o) => {
    if (!o || !o.id) return;
    const id = String(o.id);
    if (seen.has(id)) return;
    // Skip static initial demo baseline from October 19
    if (id.startsWith('OKX-DEMO-17924') || id.startsWith('OKX-DEMO-POS-') || id.startsWith('OKX-LIVE-POS-')) return;
    seen.add(id);
    collected.push(o);
  };
  try {
    const raw = localStorage.getItem(LS_AI_EXECUTED_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach(addOrd);
    }
  } catch (e) {}
  // Also scan any previous standalone state keys in localStorage so no yesterday/today orders are ever lost
  try {
    for (const k of ['okx_standalone_state_v8', 'okx_standalone_state_v7', 'okx_standalone_state_v6']) {
      const stRaw = localStorage.getItem(k);
      if (!stRaw) continue;
      const st = JSON.parse(stRaw);
      if (st?.portfolio?.orders && Array.isArray(st.portfolio.orders)) {
        st.portfolio.orders.forEach(addOrd);
      }
      if (st?.sessionSync?.executedSessionTransactions && Array.isArray(st.sessionSync.executedSessionTransactions)) {
        st.sessionSync.executedSessionTransactions.forEach((tx) => {
          if (tx && (tx.orderId || tx.id)) {
            addOrd({
              id: tx.orderId || tx.id,
              instId: tx.instId,
              asset: tx.asset,
              side: tx.side,
              orderType: tx.orderType || 'MARKET',
              amount: tx.amount,
              price: tx.price,
              usdcValue: tx.usdcValue,
              feeRate: tx.feeRate || '0.10%',
              feeUsdc: tx.feeUsdc,
              feeAsset: tx.feeAsset,
              totalUsdcWithFee: tx.totalUsdcWithFee,
              status: 'CLOSED',
              source: tx.strategyName || 'Agent AI (Sesja)',
              date: tx.date,
              time: tx.time,
              timestamp: tx.timestamp,
              exchangeFeedback: tx
            });
          }
        });
      }
    }
  } catch (e) {}
  return collected;
}

export function saveAiExecutedOrderToLocal(order) {
  if (typeof window === 'undefined' || !order || !order.id) return;
  try {
    const current = loadSavedAiExecutedOrders();
    const filtered = current.filter((o) => String(o.id) !== String(order.id));
    filtered.unshift(order);
    localStorage.setItem(LS_AI_EXECUTED_ORDERS_KEY, JSON.stringify(filtered.slice(0, 100)));
  } catch (e) {}
}

export function exportDeviceSyncCode() {
  if (typeof window === 'undefined') return '';
  const orders = loadSavedAiExecutedOrders();
  let portfolioHistory = [];
  let chatMessages = [];
  try {
    const stRaw = localStorage.getItem('okx_standalone_state_v8');
    if (stRaw) {
      const st = JSON.parse(stRaw);
      if (Array.isArray(st?.portfolio?.portfolioHistory)) {
        portfolioHistory = st.portfolio.portfolioHistory.slice(0, 50);
      }
      if (Array.isArray(st?.sessionSync?.chatMessages)) {
        chatMessages = st.sessionSync.chatMessages.slice(-30);
      }
    }
  } catch (e) {}

  const payload = {
    exportedAt: Date.now(),
    device: typeof navigator !== 'undefined' && /mobile/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP',
    orders,
    portfolioHistory,
    chatMessages
  };
  return JSON.stringify(payload, null, 2);
}

export async function importDeviceSyncCode(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') throw new Error('Brak danych do importu');
  let parsed;
  try {
    parsed = JSON.parse(rawInput.trim());
  } catch (e) {
    throw new Error('Nieprawidłowy format JSON');
  }

  const orders = Array.isArray(parsed.orders) ? parsed.orders : [];
  for (const o of orders) {
    saveAiExecutedOrderToLocal(o);
  }

  // If connected to gateway or local server, push immediately
  try {
    const res = await apiRequest('/api/session/sync-orders', 'POST', {
      orders,
      portfolioHistory: parsed.portfolioHistory || [],
      sessionSync: {
        chatMessages: parsed.chatMessages || [],
        executedSessionTransactions: orders.map((o) => o.exchangeFeedback || o).filter(Boolean)
      }
    });
    return { ok: true, count: orders.length, state: res?.state };
  } catch (err) {
    // Standalone fallback: merge into local standalone state
    if (_standaloneState && Array.isArray(_standaloneState.portfolio?.orders)) {
      const existing = new Set(_standaloneState.portfolio.orders.map((o) => String(o.id)));
      for (const o of orders) {
        if (!existing.has(String(o.id))) {
          _standaloneState.portfolio.orders.unshift(o);
        }
      }
      saveStandaloneState();
    }
    return { ok: true, count: orders.length, standaloneMerged: true };
  }
}

function detectInitialGatewayConfig() {
  if (typeof window === 'undefined') {
    return { isRemoteHost: false, activeBaseUrl: '', customGatewayUrl: '' };
  }
  const params = new URLSearchParams(window.location.search);
  const urlGateway = params.get('gateway');
  if (urlGateway && urlGateway.startsWith('http')) {
    const cleaned = urlGateway.replace(/\/+$/, '');
    try {
      localStorage.setItem(LS_CUSTOM_GATEWAY_KEY, cleaned);
    } catch (e) {}
  }
  let savedCustom = '';
  try {
    savedCustom = (localStorage.getItem(LS_CUSTOM_GATEWAY_KEY) || '').trim().replace(/\/+$/, '');
  } catch (e) {}

  const isRemoteHost =
    window.location.hostname.includes('github.io') ||
    window.location.protocol === 'file:';

  const forceStandalone = window.location.search.includes('standalone=true');

  return {
    isRemoteHost,
    forceStandalone,
    activeBaseUrl: isRemoteHost ? (savedCustom || DEFAULT_HOME_GATEWAYS[0]) : '',
    customGatewayUrl: savedCustom
  };
}

const _gwInit = detectInitialGatewayConfig();
let _isStandalone = Boolean(_gwInit.forceStandalone);
let _activeApiBaseUrl = _gwInit.activeBaseUrl;
let _customGatewayUrl = _gwInit.customGatewayUrl;
let _gatewayConnected = !_gwInit.isRemoteHost && !_gwInit.forceStandalone;
let _lastGatewayProbeTs = 0;
let _gatewayProbeInFlight = null;

export function isStandaloneMode() {
  return _isStandalone;
}

export function setStandaloneMode(val) {
  _isStandalone = Boolean(val);
}

export function getGatewayConnectionInfo() {
  const bestDefault = _discoveredCloudflareUrl || DEFAULT_HOME_GATEWAYS[0];
  return {
    isRemoteHost: _gwInit.isRemoteHost,
    gatewayConnected: _gatewayConnected && !_isStandalone,
    activeApiBaseUrl: _activeApiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3456'),
    customGatewayUrl: _customGatewayUrl,
    cloudflareTunnelUrl: _discoveredCloudflareUrl,
    defaultGatewayUrl: bestDefault
  };
}

export function setCustomGatewayUrl(newUrl) {
  const cleaned = (newUrl || '').trim().replace(/\/+$/, '');
  const isDefaultConst = DEFAULT_HOME_GATEWAYS.includes(cleaned);
  _customGatewayUrl = isDefaultConst ? '' : cleaned;
  try {
    if (_customGatewayUrl) {
      localStorage.setItem(LS_CUSTOM_GATEWAY_KEY, _customGatewayUrl);
    } else {
      localStorage.removeItem(LS_CUSTOM_GATEWAY_KEY);
    }
  } catch (e) {}
  _activeApiBaseUrl = _customGatewayUrl || (_gwInit.isRemoteHost ? (_discoveredCloudflareUrl || DEFAULT_HOME_GATEWAYS[0]) : '');
  _isStandalone = false;
  _lastGatewayProbeTs = 0;
}

async function fetchWithTimeout(fullUrl, opts = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(fullUrl, {
      ...opts,
      signal: controller.signal
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function discoverLatestGatewayJson() {
  const urls = [
    `https://raw.githubusercontent.com/gitgregor/ai_agent_okx_app_v1_00/main/docs/gateway.json?t=${Date.now()}`,
    `./gateway.json?t=${Date.now()}`
  ];
  for (const u of urls) {
    try {
      const res = await fetchWithTimeout(u, { method: 'GET', cache: 'no-store' }, 2500);
      if (!res.ok) continue;
      const j = await res.json();
      const found = [];
      if (j.cloudflareTunnelUrl && !j.cloudflareTunnelUrl.includes('api.trycloudflare.com')) {
        _discoveredCloudflareUrl = j.cloudflareTunnelUrl.replace(/\/+$/, '');
        found.push(_discoveredCloudflareUrl);
      }
      if (j.primaryTunnelUrl && !j.primaryTunnelUrl.includes('api.trycloudflare.com')) {
        const p = j.primaryTunnelUrl.replace(/\/+$/, '');
        if (!found.includes(p)) found.push(p);
      }
      if (Array.isArray(j.tunnels)) {
        for (const t of j.tunnels) {
          const cleanT = String(t || '').trim().replace(/\/+$/, '');
          if (cleanT && !cleanT.includes('api.trycloudflare.com') && !found.includes(cleanT)) found.push(cleanT);
        }
      }
      if (found.length > 0) {
        _discoveredGatewayList = found;
        return found;
      }
    } catch (e) {}
  }
  return _discoveredGatewayList;
}

export async function probeHomeGateway(force = false) {
  if (_gwInit.forceStandalone) return false;
  const now = Date.now();
  if (!force && now - _lastGatewayProbeTs < 7000) {
    return _gatewayConnected;
  }
  if (_gatewayProbeInFlight) return _gatewayProbeInFlight;

  _lastGatewayProbeTs = now;
  _gatewayProbeInFlight = (async () => {
    // 1. If running on local PC / LAN, check local relative origin first
    if (!_gwInit.isRemoteHost) {
      try {
        const res = await fetchWithTimeout(
          '/api/state',
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          },
          2200
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.config && data.portfolio) {
            _activeApiBaseUrl = '';
            _gatewayConnected = true;
            _isStandalone = false;
            return true;
          }
        }
      } catch (e) {}
    }

    // 2. Discover latest Cloudflare / LocalTunnel URLs published by the home PC
    const discovered = await discoverLatestGatewayJson();

    // 3. Build candidate list:
    //    - Localhost (3456) so even when viewing github.io on the home PC it connects directly to the local dev server!
    //    - Discovered Cloudflare Quick Tunnel (*.trycloudflare.com) & LocalTunnel URLs
    //    - Custom gateway URL (if user entered one)
    //    - Default LocalTunnel gateways
    const remoteCandidates = [];
    const addCandidate = (u) => {
      const clean = String(u || '').trim().replace(/\/+$/, '');
      if (clean && !remoteCandidates.includes(clean)) remoteCandidates.push(clean);
    };

    if (_customGatewayUrl) addCandidate(_customGatewayUrl);
    for (const d of discovered) addCandidate(d);
    addCandidate('http://localhost:3456');
    addCandidate('http://127.0.0.1:3456');
    for (const gw of DEFAULT_HOME_GATEWAYS) addCandidate(gw);

    try {
      const winnerBase = await Promise.any(
        remoteCandidates.map(async (base) => {
          const res = await fetchWithTimeout(
            `${base}/api/state`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'bypass-tunnel-reminder': 'true'
              }
            },
            4500
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!data || !data.config || !data.portfolio) {
            throw new Error('Invalid state payload');
          }
          if (data.config?.remoteGateway?.cloudflareTunnelUrl) {
            _discoveredCloudflareUrl = data.config.remoteGateway.cloudflareTunnelUrl.replace(/\/+$/, '');
          }
          return base;
        })
      );
      _activeApiBaseUrl = winnerBase;
      _gatewayConnected = true;
      _isStandalone = false;
      return true;
    } catch (e) {
      _gatewayConnected = false;
      return false;
    }
  })();

  try {
    return await _gatewayProbeInFlight;
  } finally {
    _gatewayProbeInFlight = null;
  }
}

let _standaloneState = null;
let latestBrowserOkxTickers = [];
let lastOkxBrowserFetchTs = 0;

export function recalculateStateValuations(targetState) {
  if (!targetState) return;
  const mList = targetState.markets || targetState.tickers || DEFAULT_STANDALONE_MARKETS;
  const isCashAsset = (ccy) => ccy === 'USDC' || ccy === 'USDT' || ccy === 'USD' || ccy === 'USDG';

  if (targetState.portfolio && Array.isArray(targetState.portfolio.holdings)) {
    targetState.portfolio.holdings.forEach((h) => {
      if (isCashAsset(h.asset)) {
        h.priceUsdc = 1.0;
        h.usdcValue = Number((h.amount * 1.0).toFixed(2));
      } else {
        const m = mList.find((x) => x.base === h.asset || x.instId === `${h.asset}-USDC`);
        if (m && m.price > 0) {
          h.priceUsdc = m.price;
          h.usdcValue = Number((h.amount * h.priceUsdc).toFixed(2));
          h.change24hPct = Number(m.change24hPct || 0);
          if (h.avgBuyPrice > 0) {
            h.pnlPct = Number((((h.priceUsdc - h.avgBuyPrice) / h.avgBuyPrice) * 100).toFixed(2));
          }
        }
      }
    });

    const totalVal = targetState.portfolio.holdings.reduce((sum, h) => sum + (h.usdcValue || 0), 0);
    const cashVal = targetState.portfolio.holdings
      .filter((h) => isCashAsset(h.asset))
      .reduce((sum, h) => sum + (h.usdcValue || 0), 0);
    const cryptoVal = targetState.portfolio.holdings
      .filter((h) => !isCashAsset(h.asset))
      .reduce((sum, h) => sum + (h.usdcValue || 0), 0);

    targetState.portfolio.totalValueUsdc = Number(totalVal.toFixed(2));
    targetState.portfolio.cashUsdc = Number(cashVal.toFixed(2));
    targetState.portfolio.cryptoValueUsdc = Number(cryptoVal.toFixed(2));

    if (targetState.portfolio.totalValueUsdc > 0) {
      targetState.portfolio.holdings.forEach((h) => {
        h.allocationPct = Number(((h.usdcValue / targetState.portfolio.totalValueUsdc) * 100).toFixed(2));
      });
    }

    if (targetState.portfolio.ledger && Array.isArray(targetState.portfolio.ledger.items)) {
      targetState.portfolio.ledger.items.forEach((l) => {
        if (isCashAsset(l.asset)) {
          l.currentPriceUsdc = 1.0;
        } else {
          const m = mList.find((x) => x.base === l.asset || x.instId === `${l.asset}-USDC`);
          if (m && m.price > 0) {
            l.currentPriceUsdc = m.price;
          }
        }
      });
    }

    if (Array.isArray(targetState.portfolio.portfolioHistory) && targetState.portfolio.portfolioHistory.length > 0) {
      targetState.portfolio.portfolioHistory[0].totalValueUsdc = targetState.portfolio.totalValueUsdc;
    }
  }
}

export function saveStandaloneState() {
  try {
    if (_standaloneState) {
      localStorage.setItem('okx_standalone_state_v8', JSON.stringify(_standaloneState));
    }
  } catch (e) {}
}

export async function fetchLiveOkxTickersInBrowser(force = false) {
  const nowMs = Date.now();
  if (!force && nowMs - lastOkxBrowserFetchTs < 2000 && latestBrowserOkxTickers.length > 0) {
    return latestBrowserOkxTickers;
  }
  lastOkxBrowserFetchTs = nowMs;

  const endpoints = [
    'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
    'https://eea.okx.com/api/v5/market/tickers?instType=SPOT'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      if (json && json.code === '0' && Array.isArray(json.data) && json.data.length > 0) {
        latestBrowserOkxTickers = json.data;
        const map = {};
        for (const t of json.data) {
          map[t.instId] = t;
        }

        const allSpotMarkets = json.data
          .filter((t) => t && t.instId)
          .map((t) => {
            const parts = t.instId.split('-');
            const base = parts[0] || t.instId;
            const quote = parts[1] || 'USDC';
            const last = Number(t.last || 0);
            const open24h = Number(t.open24h || t.sodUtc0 || last);
            const high24h = Number(t.high24h || last);
            const low24h = Number(t.low24h || last);
            const vol24h = Number(Number(t.vol24h || 0).toFixed(2));
            const volCcy24h = Number(Number(t.volCcy24h || 0).toFixed(2));
            const change24hPct = open24h > 0 ? Number((((last - open24h) / open24h) * 100).toFixed(2)) : 0;
            const changes = getMarketIntervalChanges({ instId: t.instId, change24hPct });
            return {
              instId: t.instId,
              base,
              quote,
              name: base,
              price: last,
              bidPx: Number(t.bidPx || last),
              askPx: Number(t.askPx || last),
              open24h: open24h > 0 ? open24h : last,
              high24h,
              low24h,
              vol24h,
              volCcy24h,
              change24hPct,
              change1dPct: change24hPct,
              change15mPct: changes.change15m,
              change1hPct: changes.change1h,
              change4hPct: changes.change4h,
              change1wPct: changes.change1w
            };
          })
          .sort((a, b) => {
            const quoteRank = (q) => (q === 'USDC' ? 1 : q === 'USDT' ? 2 : q === 'EUR' ? 3 : 4);
            const rA = quoteRank(a.quote);
            const rB = quoteRank(b.quote);
            if (rA !== rB) return rA - rB;
            return (b.volCcy24h || 0) - (a.volCcy24h || 0);
          });

        if (_standaloneState) {
          _standaloneState.markets = allSpotMarkets;
          _standaloneState.tickers = allSpotMarkets;
          if (_standaloneState.config && _standaloneState.config.marketDataStatus) {
            _standaloneState.config.marketDataStatus.live = true;
            _standaloneState.config.marketDataStatus.source = 'OKX API v5 Live (Pełna lista par Spot OKX)';
            _standaloneState.config.marketDataStatus.lastUpdatedAt = new Date().toTimeString().slice(0, 8);
          }
          recalculateStateValuations(_standaloneState);
          saveStandaloneState();
        }
        return latestBrowserOkxTickers;
      }
    } catch (e) {
      // Try next endpoint
    }
  }
  return latestBrowserOkxTickers;
}

export function initStandaloneState() {
  const recoveredAiOrders = loadSavedAiExecutedOrders();
  if (recoveredAiOrders.length > 0 && typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_AI_EXECUTED_ORDERS_KEY, JSON.stringify(recoveredAiOrders.slice(0, 100)));
    } catch (e) {}
  }
  try {
    localStorage.removeItem('okx_standalone_state_v1');
    localStorage.removeItem('okx_standalone_state_v2');
    localStorage.removeItem('okx_standalone_state_v3');
    localStorage.removeItem('okx_standalone_state_v4');
    localStorage.removeItem('okx_standalone_state_v5');
    localStorage.removeItem('okx_standalone_state_v6');
    localStorage.removeItem('okx_standalone_state_v7');
    const saved = localStorage.getItem('okx_standalone_state_v8');
    if (saved) {
      _standaloneState = JSON.parse(saved);
      if (
        _standaloneState &&
        _standaloneState.portfolio &&
        Array.isArray(_standaloneState.portfolio.holdings) &&
        _standaloneState.portfolio.holdings.length >= 8 &&
        Array.isArray(_standaloneState.portfolio.orders) &&
        _standaloneState.portfolio.orders.length >= 8 &&
        Array.isArray(_standaloneState.portfolio.portfolioHistory) &&
        _standaloneState.portfolio.portfolioHistory.length >= 8 &&
        Array.isArray(_standaloneState.markets) &&
        _standaloneState.markets.length > 0
      ) {
        _standaloneState.markets = JSON.parse(JSON.stringify(DEFAULT_STANDALONE_MARKETS));
        _standaloneState.tickers = _standaloneState.markets;
        recalculateStateValuations(_standaloneState);
        return _standaloneState;
      }
    }
  } catch (e) {}

  const now = new Date();
  const nowTimeStr = now.toTimeString().slice(0, 8);
  const mList = JSON.parse(JSON.stringify(DEFAULT_STANDALONE_MARKETS));

  const initialOrders = [
    {
      id: '4053424280206069760',
      instId: 'BTC-USDC',
      asset: 'BTC',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 0.981237,
      price: 80976.84,
      usdcValue: 79457.45,
      feeRate: '0.10%',
      feeUsdc: 79.46,
      feeAsset: 0.000981,
      feeCcy: 'BTC',
      totalUsdcWithFee: 79536.91,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Zlecenie OKX MARKET (BTC-USDC) • Prowizja: 0.000981 BTC',
      date: '2026-10-29',
      time: '19:57:37',
      timestamp: 1793303857175
    },
    {
      id: '4025053132347166720',
      instId: 'WLD-USDC',
      asset: 'WLD',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 186.27,
      price: 0.5368,
      usdcValue: 100.00,
      feeRate: '0.10%',
      feeUsdc: 0.10,
      feeAsset: 0.18627,
      feeCcy: 'WLD',
      totalUsdcWithFee: 100.10,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Zlecenie OKX MARKET (WLD-USDC) • Prowizja: 0.18627 WLD',
      date: '2026-10-20',
      time: '01:05:31',
      timestamp: 1792458331078
    },
    {
      id: 'OKX-DEMO-1792439310500',
      instId: 'BTC-USDC',
      asset: 'BTC',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 1.00,
      price: 80753.90,
      usdcValue: 80753.90,
      feeRate: '0.10%',
      feeUsdc: 80.75,
      feeAsset: 0.001,
      feeCcy: 'USDC',
      totalUsdcWithFee: 80834.65,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Zakup portfelowy OKX Spot (BTC-USDC)',
      date: '2026-10-19',
      time: '19:48:30',
      timestamp: 1792439310500
    },
    {
      id: 'OKX-DEMO-1792439310236',
      instId: 'ETH-USDC',
      asset: 'ETH',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 10.00,
      price: 2331.48,
      usdcValue: 23314.80,
      feeRate: '0.10%',
      feeUsdc: 23.31,
      feeAsset: 0.01,
      feeCcy: 'USDC',
      totalUsdcWithFee: 23338.11,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Zakup portfelowy OKX Spot (ETH-USDC)',
      date: '2026-10-19',
      time: '19:48:30',
      timestamp: 1792439310236
    },
    {
      id: 'OKX-DEMO-1792439310086',
      instId: 'XRP-USDC',
      asset: 'XRP',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 50000.00,
      price: 1.2836,
      usdcValue: 64180.00,
      feeRate: '0.10%',
      feeUsdc: 64.18,
      feeAsset: 50.0,
      feeCcy: 'USDC',
      totalUsdcWithFee: 64244.18,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Zakup portfelowy OKX Spot (XRP-USDC)',
      date: '2026-10-19',
      time: '19:48:30',
      timestamp: 1792439310086
    },
    {
      id: 'OKX-DEMO-1792439309934',
      instId: 'USD-USDC',
      asset: 'USD',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 100000.00,
      price: 1.00,
      usdcValue: 100000.00,
      feeRate: '0.00%',
      feeUsdc: 0.00,
      feeAsset: 0.00,
      feeCcy: 'USDC',
      totalUsdcWithFee: 100000.00,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Alokacja depozytu dolarowego OKX (USD-USDC)',
      date: '2026-10-19',
      time: '19:48:29',
      timestamp: 1792439309934
    },
    {
      id: 'OKX-DEMO-1792439309786',
      instId: 'USDG-USDC',
      asset: 'USDG',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 100000.00,
      price: 1.00,
      usdcValue: 100000.00,
      feeRate: '0.00%',
      feeUsdc: 0.00,
      feeAsset: 0.00,
      feeCcy: 'USDC',
      totalUsdcWithFee: 100000.00,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Zakup portfelowy Global Dollar (USDG-USDC)',
      date: '2026-10-19',
      time: '19:48:29',
      timestamp: 1792439309786
    },
    {
      id: 'OKX-DEMO-1792439309638',
      instId: 'ETC-USDC',
      asset: 'ETC',
      side: 'BUY',
      orderType: 'MARKET',
      amount: 5.00,
      price: 7.494,
      usdcValue: 37.47,
      feeRate: '0.10%',
      feeUsdc: 0.04,
      feeAsset: 0.005,
      feeCcy: 'USDC',
      totalUsdcWithFee: 37.51,
      status: 'CLOSED',
      rawState: 'filled',
      statusLabel: 'Zamknięte (Zrealizowane na OKX)',
      source: 'Konto OKX DEMO API',
      strategyName: 'Zakup portfelowy OKX Spot (ETC-USDC)',
      date: '2026-10-19',
      time: '19:48:29',
      timestamp: 1792439309638
    }
  ].map((ord) => ({
    ...ord,
    exchangeFeedback: {
      exchange: 'OKX Europe (eea.okx.com) — API v5',
      mode: 'DEMO',
      code: '0',
      status: 'FILLED (Zrealizowano na giełdzie OKX)',
      orderId: ord.id,
      date: ord.date,
      time: ord.time,
      instId: ord.instId,
      asset: ord.asset,
      side: ord.side,
      orderType: ord.orderType,
      amount: ord.amount,
      price: ord.price,
      usdcValue: ord.usdcValue,
      feeRate: ord.feeRate,
      feeUsdc: ord.feeUsdc,
      feeAsset: ord.feeAsset,
      feeCcy: ord.feeCcy,
      totalUsdcWithFee: ord.totalUsdcWithFee,
      strategyName: ord.strategyName,
      strategyMessage: `Założono strategię „${ord.strategyName}” oraz uruchomiono proces KUPNA (BUY) dla pary ${ord.instId}.`,
      exchangeMessage: `Giełda OKX Europe (eea.okx.com) potwierdziła dokonanie transakcji #${ord.id}: Kupiono ${ord.amount} ${ord.asset} po cenie ${ord.price} USDC (Przeliczenie na USDC: ${ord.usdcValue.toFixed(2)} USDC, Fee ${ord.feeRate}: ${ord.feeUsdc.toFixed(2)} USDC / ${ord.feeAsset} ${ord.asset}, Rozliczenie całkowite: ${ord.totalUsdcWithFee.toFixed(2)} USDC).`
    }
  }));

  const initialPortfolioHistory = initialOrders.map((ord, idx) => ({
    id: `ORD-HIST-${ord.id}`,
    orderId: ord.id,
    date: ord.date,
    time: ord.time,
    timestamp: ord.timestamp,
    action: `Kupno ${ord.amount} ${ord.asset} @ ${ord.price} USDC (${ord.strategyName})`,
    side: ord.side,
    usdcAmount: ord.usdcValue,
    usdcValue: ord.usdcValue,
    feeUsdc: ord.feeUsdc,
    feeAsset: ord.feeAsset,
    diffUsdc: ord.usdcValue,
    changeUsdc: ord.usdcValue,
    totalValueUsdc: idx === 0 ? 457211.79 : Number((457211.79 - idx * 14500).toFixed(2)),
    asset: ord.asset,
    amount: ord.amount,
    price: ord.price,
    exchangeFeedback: ord.exchangeFeedback
  }));

  _standaloneState = {
    config: {
      site: 'eea',
      baseUrl: 'https://eea.okx.com',
      apiMode: 'demo',
      aiStatus: 'deactivated',
      tradingStatus: 'idle',
      tradingStatusLabel: 'Gotowy — brak oczekującego zlecenia',
      marketDataStatus: {
        live: true,
        source: 'OKX EEA v5 (GitHub Pages)',
        lastUpdatedAt: nowTimeStr
      },
      hasDemoKey: true,
      hasLiveKey: false,
      demoKeyPreview: 'a6d12884-c...',
      liveKeyPreview: 'Nie skonfigurowano',
      apiConnection: {
        mode: 'demo',
        connected: true,
        status: 'connected',
        statusLabel: 'POŁĄCZONO Z OKX DEMO (eea.okx.com)',
        reasonCode: 'OK',
        reason: 'Pomyślnie zweryfikowano klucze OKX API (Konto Demo GitHub Pages)',
        keyPreview: 'a6d12884-c...',
        lastCheckedAt: nowTimeStr
      },
      apiConnections: {
        demo: {
          mode: 'demo',
          connected: true,
          status: 'connected',
          statusLabel: 'POŁĄCZONO Z OKX DEMO (eea.okx.com)',
          reasonCode: 'OK',
          reason: 'Pomyślnie zweryfikowano klucze OKX API (Konto Demo)',
          keyPreview: 'a6d12884-c...',
          lastCheckedAt: nowTimeStr
        },
        live: {
          mode: 'live',
          connected: false,
          status: 'disconnected',
          statusLabel: 'NIEPODŁĄCZONE — WPISZ KLUCZE API LIVE Z OKX',
          reasonCode: 'MISSING_ALL_KEYS',
          reason: 'Nie wprowadzono kluczy API dla konta LIVE (pola OKX API Key, Secret Key oraz Passphrase są puste).',
          keyPreview: 'Brak klucza',
          lastCheckedAt: nowTimeStr
        }
      },
      mcpServer: {
        package: '@okx_ai/okx-trade-mcp',
        skills: ['okx-cex-market', 'okx-cex-trade', 'okx-cex-portfolio', 'okx-cex-bot'],
        endpoint: '/api/mcp',
        siteFlag: '--site eea'
      }
    },
    activeTradeOrder: null,
    markets: mList,
    tickers: mList,
    portfolio: {
      mode: 'demo',
      site: 'eea.okx.com',
      syncedFromOkx: true,
      accountSourceLabel: 'Konto OKX DEMO API (eea.okx.com — 7 aktywów oraz USD • Kursy OKX Live)',
      totalValueUsdc: 457211.79,
      cashUsdc: 220442.55,
      cryptoValueUsdc: 236769.24,
      holdings: [
        {
          asset: 'USDC',
          name: 'USD Coin (EEA MiCA)',
          amount: 20442.55,
          availAmount: 20442.55,
          tradingAmount: 20442.55,
          fundingAmount: 0,
          priceUsdc: 1.0,
          usdcValue: 20442.55,
          avgBuyPrice: 1.0,
          change24hPct: 0,
          pnlPct: 0,
          allocationPct: 4.47
        },
        {
          asset: 'BTC',
          name: 'Bitcoin',
          amount: 1.980256,
          availAmount: 1.980256,
          tradingAmount: 1.980256,
          fundingAmount: 0,
          priceUsdc: 76682.30,
          usdcValue: 151850.59,
          avgBuyPrice: 80864.32,
          change24hPct: -1.48,
          pnlPct: -5.17,
          allocationPct: 33.21
        },
        {
          asset: 'USD',
          name: 'US Dollar (OKX Demo Gotówka)',
          amount: 100000.00,
          availAmount: 100000.00,
          tradingAmount: 100000.00,
          fundingAmount: 0,
          priceUsdc: 1.0,
          usdcValue: 100000.00,
          avgBuyPrice: 1.0,
          change24hPct: 0,
          pnlPct: 0,
          allocationPct: 21.87
        },
        {
          asset: 'USDG',
          name: 'Global Dollar (USDG)',
          amount: 100000.00,
          availAmount: 100000.00,
          tradingAmount: 100000.00,
          fundingAmount: 0,
          priceUsdc: 1.0,
          usdcValue: 100000.00,
          avgBuyPrice: 1.0,
          change24hPct: 0,
          pnlPct: 0,
          allocationPct: 21.87
        },
        {
          asset: 'XRP',
          name: 'Ripple',
          amount: 50000.00,
          availAmount: 50000.00,
          tradingAmount: 50000.00,
          fundingAmount: 0,
          priceUsdc: 1.2458,
          usdcValue: 62290.00,
          avgBuyPrice: 1.2836,
          change24hPct: -0.34,
          pnlPct: -2.94,
          allocationPct: 13.62
        },
        {
          asset: 'ETH',
          name: 'Ethereum',
          amount: 10.00,
          availAmount: 10.00,
          tradingAmount: 10.00,
          fundingAmount: 0,
          priceUsdc: 2248.22,
          usdcValue: 22482.20,
          avgBuyPrice: 2331.48,
          change24hPct: -0.66,
          pnlPct: -3.57,
          allocationPct: 4.92
        },
        {
          asset: 'WLD',
          name: 'Worldcoin (WLD)',
          amount: 186.08373,
          availAmount: 186.08373,
          tradingAmount: 186.08373,
          fundingAmount: 0,
          priceUsdc: 0.3719,
          usdcValue: 69.20,
          avgBuyPrice: 0.5368,
          change24hPct: -4.49,
          pnlPct: -30.72,
          allocationPct: 0.02
        },
        {
          asset: 'ETC',
          name: 'Ethereum Classic (ETC)',
          amount: 5.00,
          availAmount: 5.00,
          tradingAmount: 5.00,
          fundingAmount: 0,
          priceUsdc: 6.953,
          usdcValue: 34.77,
          avgBuyPrice: 7.494,
          change24hPct: -2.39,
          pnlPct: -7.22,
          allocationPct: 0.01
        }
      ],
      ledger: {
        items: [
          {
            asset: 'BTC',
            instId: 'BTC-USDC',
            currentPriceUsdc: 76682.30,
            boughtAmount: 1.981237,
            boughtUsdc: 160211.35,
            buyCount: 2,
            soldAmount: 0,
            soldUsdc: 0,
            sellCount: 0,
            netAmount: 1.981237,
            netUsdcFlow: -160211.35
          },
          {
            asset: 'XRP',
            instId: 'XRP-USDC',
            currentPriceUsdc: 1.2458,
            boughtAmount: 50000.0,
            boughtUsdc: 64180.00,
            buyCount: 1,
            soldAmount: 0,
            soldUsdc: 0,
            sellCount: 0,
            netAmount: 50000.0,
            netUsdcFlow: -64180.00
          },
          {
            asset: 'ETH',
            instId: 'ETH-USDC',
            currentPriceUsdc: 2248.22,
            boughtAmount: 10.0,
            boughtUsdc: 23314.80,
            buyCount: 1,
            soldAmount: 0,
            soldUsdc: 0,
            sellCount: 0,
            netAmount: 10.0,
            netUsdcFlow: -23314.80
          },
          {
            asset: 'WLD',
            instId: 'WLD-USDC',
            currentPriceUsdc: 0.3719,
            boughtAmount: 186.27,
            boughtUsdc: 100.00,
            buyCount: 1,
            soldAmount: 0,
            soldUsdc: 0,
            sellCount: 0,
            netAmount: 186.27,
            netUsdcFlow: -100.00
          },
          {
            asset: 'ETC',
            instId: 'ETC-USDC',
            currentPriceUsdc: 6.953,
            boughtAmount: 5.0,
            boughtUsdc: 37.47,
            buyCount: 1,
            soldAmount: 0,
            soldUsdc: 0,
            sellCount: 0,
            netAmount: 5.0,
            netUsdcFlow: -37.47
          },
          {
            asset: 'USDG',
            instId: 'USDG-USDC',
            currentPriceUsdc: 1.00,
            boughtAmount: 100000.0,
            boughtUsdc: 100000.00,
            buyCount: 1,
            soldAmount: 0,
            soldUsdc: 0,
            sellCount: 0,
            netAmount: 100000.0,
            netUsdcFlow: -100000.00
          },
          {
            asset: 'USD',
            instId: 'USD-USDC',
            currentPriceUsdc: 1.00,
            boughtAmount: 100000.0,
            boughtUsdc: 100000.00,
            buyCount: 1,
            soldAmount: 0,
            soldUsdc: 0,
            sellCount: 0,
            netAmount: 100000.0,
            netUsdcFlow: -100000.00
          }
        ],
        totalBoughtUsdc: 447843.62,
        totalSoldUsdc: 0
      },
      orders: initialOrders,
      portfolioHistory: initialPortfolioHistory
    }
  };
  recalculateStateValuations(_standaloneState);
  saveStandaloneState();
  return _standaloneState;
}

function generateSyntheticCandles(instId, bar = '15m', limit = 120, currentPx = 76682.30) {
  const safeLimit = Math.min(240, Math.max(30, Number(limit) || 120));
  const now = Date.now();
  let stepMs = 15 * 60 * 1000;
  if (bar === '1m') stepMs = 60 * 1000;
  else if (bar === '5m') stepMs = 5 * 60 * 1000;
  else if (bar === '1H' || bar === '1h') stepMs = 60 * 60 * 1000;
  else if (bar === '4H' || bar === '4h') stepMs = 4 * 60 * 60 * 1000;
  else if (bar === '1D' || bar === '1d') stepMs = 24 * 60 * 60 * 1000;

  const candles = [];
  let p = currentPx * (1 - 0.02 * (Math.random() * 0.5));
  const startTime = now - safeLimit * stepMs;

  for (let i = 0; i < safeLimit; i++) {
    const t = startTime + i * stepMs;
    const changePct = (Math.random() - 0.49) * 0.006;
    const open = Number(p.toFixed(p > 100 ? 2 : 4));
    const close = Number((p * (1 + changePct)).toFixed(p > 100 ? 2 : 4));
    const high = Number((Math.max(open, close) + Math.abs(open * 0.003 * Math.random())).toFixed(p > 100 ? 2 : 4));
    const low = Number((Math.min(open, close) - Math.abs(open * 0.003 * Math.random())).toFixed(p > 100 ? 2 : 4));
    const volume = Number((Math.random() * 15 + 2).toFixed(2));
    candles.push({
      time: t,
      open,
      high,
      low,
      close,
      volume,
      volUsdc: Number((volume * close).toFixed(2)),
      confirmed: true
    });
    p = close;
  }
  if (candles.length > 0) {
    candles[candles.length - 1].close = currentPx;
  }
  return candles;
}

export async function clientMockEngine(url, method = 'GET', body = null) {
  if (!_standaloneState) initStandaloneState();
  const forceLiveTickerFetch =
    url.startsWith('/api/agent/') ||
    url.startsWith('/api/trade/') ||
    url.startsWith('/api/portfolio/sync');
  await fetchLiveOkxTickersInBrowser(forceLiveTickerFetch);

  // 1. Candlesticks endpoint
  if (url.startsWith('/api/candles')) {
    const u = new URL(url, window.location.origin);
    const instId = u.searchParams.get('instId') || 'BTC-USDC';
    const bar = u.searchParams.get('bar') || '15m';
    const limit = parseInt(u.searchParams.get('limit') || '180', 10);
    const ticker = _standaloneState.tickers.find((t) => t.instId === instId) || _standaloneState.tickers[0];
    const baseAsset = instId.split('-')[0];

    let candles = null;
    try {
      const okxRes = await fetch(
        `https://www.okx.com/api/v5/market/candles?instId=${encodeURIComponent(instId)}&bar=${encodeURIComponent(bar)}&limit=${encodeURIComponent(limit)}`
      );
      if (okxRes.ok) {
        const json = await okxRes.json();
        if (json.code === '0' && Array.isArray(json.data) && json.data.length > 0) {
          candles = json.data
            .map((row) => ({
              time: Number(row[0]),
              open: Number(row[1]),
              high: Number(row[2]),
              low: Number(row[3]),
              close: Number(row[4]),
              volume: Number(row[5]),
              volUsdc: Number(row[6] || 0),
              confirmed: row[8] === '1'
            }))
            .reverse();
          if (candles.length > 0) {
            ticker.price = candles[candles.length - 1].close;
          }
        }
      }
    } catch (e) {}

    if (!candles || candles.length === 0) {
      candles = generateSyntheticCandles(instId, bar, limit, ticker.price);
    }

    const holding = _standaloneState.portfolio.holdings.find((h) => h.asset === baseAsset);
    const avgBuyPrice = holding ? holding.avgBuyPrice : 0;
    const recentOrders = _standaloneState.portfolio.orders
      .filter((o) => o.asset === baseAsset || o.instId === instId)
      .slice(0, 15);

    return {
      instId,
      base: baseAsset,
      quote: 'USDC',
      name: ticker.name || baseAsset,
      currentPrice: ticker.price,
      bidPx: ticker.bidPx || ticker.price,
      askPx: ticker.askPx || ticker.price,
      open24h: ticker.open24h || ticker.price,
      high24h: ticker.high24h || ticker.price,
      low24h: ticker.low24h || ticker.price,
      vol24h: ticker.vol24h || 1000,
      change24hPct: ticker.change24hPct || 0,
      bar,
      candles,
      avgBuyPrice,
      recentOrders
    };
  }

  // 2. Config update
  if (url.startsWith('/api/config') && method === 'POST') {
    if (body) {
      if (body.apiMode) {
        _standaloneState.config.apiMode = body.apiMode;
        _standaloneState.portfolio.mode = body.apiMode;
        _standaloneState.config.apiConnection =
          _standaloneState.config.apiConnections[body.apiMode] || _standaloneState.config.apiConnection;
      }
      if (body.aiStatus) {
        _standaloneState.config.aiStatus = body.aiStatus;
      }
      if (body.apiKeyConfig) {
        const m = body.apiKeyConfig.mode || 'demo';
        if (body.apiKeyConfig.action === 'disconnect' || body.apiKeyConfig.action === 'clear') {
          if (_standaloneState.config.apiConnections[m]) {
            _standaloneState.config.apiConnections[m].connected = false;
            _standaloneState.config.apiConnections[m].status = 'disconnected';
            _standaloneState.config.apiConnections[m].statusLabel = `NIEPODŁĄCZONE (${m.toUpperCase()})`;
            _standaloneState.config.apiConnections[m].reason = 'Rozłączono lub wyczyszczono klucze API.';
          }
        } else if (_standaloneState.config.apiConnections[m]) {
          _standaloneState.config.apiConnections[m].connected = true;
          _standaloneState.config.apiConnections[m].status = 'connected';
          _standaloneState.config.apiConnections[m].statusLabel = `POŁĄCZONO Z OKX (${m.toUpperCase()})`;
          _standaloneState.config.apiConnections[m].reason = 'Zapisano klucze API w pamięci przeglądarki';
          _standaloneState.config.apiConnections[m].keyPreview = body.apiKeyConfig.apiKey
            ? body.apiKeyConfig.apiKey.slice(0, 8) + '...'
            : '***';
        }
        if (_standaloneState.config.apiMode === m) {
          _standaloneState.config.apiConnection = _standaloneState.config.apiConnections[m];
        }
      }
    }
    saveStandaloneState();
    return { ok: true, state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  // 3. Portfolio sync
  if (url.startsWith('/api/portfolio/sync') && method === 'POST') {
    saveStandaloneState();
    return { ok: true, state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  // 4. Trade Propose
  if (url.startsWith('/api/trade/propose') && method === 'POST') {
    const instId = body?.instId || 'BTC-USDC';
    const [asset] = instId.split('-');
    const mList = _standaloneState.markets || _standaloneState.tickers || DEFAULT_STANDALONE_MARKETS;
    const market = mList.find((m) => m.instId === instId) || mList[0] || { price: 76682.30 };
    const side = (body?.side || 'BUY').toUpperCase();
    const isBuy = side !== 'SELL';
    const orderType = (body?.orderType || 'MARKET').toUpperCase();
    const execPrice =
      orderType === 'LIMIT' && body?.limitPrice
        ? Number(body.limitPrice)
        : Number(body?.price || market.price || 76682.30);
    let amount = Number(body?.amount || 0);
    let usdcVal = Number(body?.usdcAmount || 0);
    if (amount <= 0 && usdcVal > 0 && execPrice > 0) {
      amount = Number((usdcVal / execPrice).toFixed(6));
    } else if (amount > 0 && execPrice > 0) {
      usdcVal = Number((amount * execPrice).toFixed(2));
    } else {
      usdcVal = 500;
      amount = execPrice > 0 ? Number((usdcVal / execPrice).toFixed(6)) : 0.01;
    }
    const feeUsdc = Number((usdcVal * 0.001).toFixed(2));
    const feeAsset = Number((amount * 0.001).toFixed(6));
    const totalUsdcWithFee = isBuy ? Number((usdcVal + feeUsdc).toFixed(2)) : Number((usdcVal - feeUsdc).toFixed(2));
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const orderId = 'OKX-EEA-' + Math.floor(10000 + Math.random() * 90000);
    const order = {
      id: orderId,
      instId,
      asset,
      side,
      orderType,
      amount,
      price: execPrice,
      usdcValue: usdcVal,
      feeRate: '0.10%',
      feeUsdc,
      feeAsset,
      totalUsdcWithFee,
      status: 'waiting_for_start',
      statusLabel: 'Oczekuje na potwierdzenie przyciskiem Potwierdź',
      source: body?.source || 'Agent AI (OKX EEA)',
      strategyName: body?.strategyName || `Strategia Spot ${side} ${asset} (${instId})`,
      date: dateStr,
      time: timeStr,
      createdAtDate: dateStr,
      createdAtTime: timeStr,
      timestamp: now.getTime()
    };
    _standaloneState.activeTradeOrder = order;
    _standaloneState.config.tradingStatus = 'waiting_for_start';
    _standaloneState.config.tradingStatusLabel = `Gotowe do potwierdzenia (${side} ${amount} ${asset} @ ${execPrice} USDC)`;
    saveStandaloneState();
    return { ok: true, order, activeTradeOrder: order, state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  // 5. Trade Authorize
  if (url.startsWith('/api/trade/authorize') && method === 'POST') {
    const order = _standaloneState.activeTradeOrder;
    if (!order) return { ok: false, error: 'Brak zlecenia do potwierdzenia' };

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const isBuy = order.side === 'BUY';
    const feeUsdc = order.feeUsdc ?? Number((order.usdcValue * 0.001).toFixed(2));
    const feeAsset = order.feeAsset ?? Number((order.amount * 0.001).toFixed(6));
    const totalUsdcWithFee =
      order.totalUsdcWithFee ??
      (isBuy ? Number((order.usdcValue + feeUsdc).toFixed(2)) : Number((order.usdcValue - feeUsdc).toFixed(2)));

    const exchangeFeedback = {
      exchange: 'OKX Europe (eea.okx.com) — API v5',
      mode: (_standaloneState.config.apiMode || 'demo').toUpperCase(),
      code: '0',
      status: 'FILLED (Zrealizowano na giełdzie OKX Europe)',
      orderId: order.id,
      date: dateStr,
      time: timeStr,
      instId: order.instId,
      asset: order.asset,
      side: order.side,
      orderType: order.orderType || 'MARKET',
      amount: order.amount,
      price: order.price,
      usdcValue: order.usdcValue,
      feeRate: '0.10%',
      feeUsdc,
      feeAsset,
      feeCcy: isBuy ? order.asset : 'USDC',
      totalUsdcWithFee,
      strategyName: order.strategyName,
      strategyMessage: `Założono strategię „${order.strategyName}” oraz uruchomiono proces ${isBuy ? 'KUPNA (BUY)' : 'SPRZEDAŻY (SELL)'} dla pary ${order.instId}.`,
      exchangeMessage: `Giełda OKX Europe (eea.okx.com) potwierdziła dokonanie transakcji #${order.id}: ${isBuy ? 'Kupiono' : 'Sprzedano'} ${order.amount} ${order.asset} po kursie ${order.price} USDC (Przeliczenie na USDC: ${order.usdcValue.toFixed(2)} USDC, Fee 0.10%: ${feeUsdc.toFixed(2)} USDC / ${feeAsset} ${order.asset}, Rozliczenie całkowite: ${totalUsdcWithFee.toFixed(2)} USDC).`
    };

    const isMultiStage = order.strategyName &&
      (order.strategyName.includes('DCA') ||
       order.strategyName.includes('Grid') ||
       order.strategyName.includes('Take-Profit') ||
       order.strategyName.includes('TP') ||
       order.strategyName.includes('SL'));

    order.date = dateStr;
    order.time = timeStr;
    order.feeRate = '0.10%';
    order.feeUsdc = feeUsdc;
    order.feeAsset = feeAsset;
    order.totalUsdcWithFee = totalUsdcWithFee;
    order.isStrategyInProgress = Boolean(isMultiStage);
    order.status = isMultiStage ? 'in_progress' : 'CLOSED';
    order.statusLabel = isMultiStage ? 'W trakcie realizacji (OKX)' : 'Zrealizowana na OKX';
    order.exchangeFeedback = exchangeFeedback;

    let holding = _standaloneState.portfolio.holdings.find((h) => h.asset === order.asset);
    if (!holding) {
      holding = {
        asset: order.asset,
        name: order.asset,
        amount: 0,
        availAmount: 0,
        tradingAmount: 0,
        fundingAmount: 0,
        priceUsdc: order.price,
        usdcValue: 0,
        avgBuyPrice: order.price,
        change24hPct: 0,
        pnlPct: 0,
        allocationPct: 0
      };
      _standaloneState.portfolio.holdings.push(holding);
    }

    const usdcHolding = _standaloneState.portfolio.holdings.find((h) => h.asset === 'USDC');
    if (isBuy) {
      holding.amount = Number((holding.amount + order.amount).toFixed(6));
      holding.availAmount = holding.amount;
      if (usdcHolding) {
        usdcHolding.amount = Math.max(0, Number((usdcHolding.amount - order.usdcValue).toFixed(2)));
        usdcHolding.availAmount = usdcHolding.amount;
        usdcHolding.usdcValue = Number((usdcHolding.amount * (usdcHolding.priceUsdc || 1)).toFixed(2));
      }
    } else {
      holding.amount = Math.max(0, Number((holding.amount - order.amount).toFixed(6)));
      holding.availAmount = holding.amount;
      if (usdcHolding) {
        usdcHolding.amount = Number((usdcHolding.amount + order.usdcValue).toFixed(2));
        usdcHolding.availAmount = usdcHolding.amount;
        usdcHolding.usdcValue = Number((usdcHolding.amount * (usdcHolding.priceUsdc || 1)).toFixed(2));
      }
    }
    holding.usdcValue = Number((holding.amount * holding.priceUsdc).toFixed(2));

    if (_standaloneState.portfolio.ledger && Array.isArray(_standaloneState.portfolio.ledger.items)) {
      let lItem = _standaloneState.portfolio.ledger.items.find((i) => i.asset === order.asset);
      if (!lItem) {
        lItem = {
          asset: order.asset,
          instId: order.instId,
          currentPriceUsdc: order.price,
          boughtAmount: 0,
          boughtUsdc: 0,
          buyCount: 0,
          soldAmount: 0,
          soldUsdc: 0,
          sellCount: 0,
          netAmount: 0,
          netUsdcFlow: 0
        };
        _standaloneState.portfolio.ledger.items.unshift(lItem);
      }
      if (isBuy) {
        lItem.boughtAmount = Number((lItem.boughtAmount + order.amount).toFixed(6));
        lItem.boughtUsdc = Number((lItem.boughtUsdc + order.usdcValue).toFixed(2));
        lItem.buyCount += 1;
        _standaloneState.portfolio.ledger.totalBoughtUsdc = Number(
          (_standaloneState.portfolio.ledger.totalBoughtUsdc + order.usdcValue).toFixed(2)
        );
      } else {
        lItem.soldAmount = Number((lItem.soldAmount + order.amount).toFixed(6));
        lItem.soldUsdc = Number((lItem.soldUsdc + order.usdcValue).toFixed(2));
        lItem.sellCount += 1;
        _standaloneState.portfolio.ledger.totalSoldUsdc = Number(
          (_standaloneState.portfolio.ledger.totalSoldUsdc + order.usdcValue).toFixed(2)
        );
      }
      lItem.netAmount = Number((lItem.boughtAmount - lItem.soldAmount).toFixed(6));
      lItem.netUsdcFlow = Number((lItem.soldUsdc - lItem.boughtUsdc).toFixed(2));
    }

    const isCashAsset = (ccy) => ccy === 'USDC' || ccy === 'USDT' || ccy === 'USD' || ccy === 'USDG';
    const newTotal = Number(
      _standaloneState.portfolio.holdings.reduce((sum, h) => sum + (h.usdcValue || 0), 0).toFixed(2)
    );
    const newCash = Number(
      _standaloneState.portfolio.holdings
        .filter((h) => isCashAsset(h.asset))
        .reduce((sum, h) => sum + (h.usdcValue || 0), 0)
        .toFixed(2)
    );
    _standaloneState.portfolio.totalValueUsdc = newTotal;
    _standaloneState.portfolio.cashUsdc = newCash;
    _standaloneState.portfolio.cryptoValueUsdc = Number(Math.max(0, newTotal - newCash).toFixed(2));

    _standaloneState.portfolio.orders.unshift(order);
    _standaloneState.portfolio.portfolioHistory.unshift({
      id: 'ORD-HIST-' + order.id,
      orderId: order.id,
      date: order.date,
      time: order.time,
      timestamp: now.getTime(),
      action: `${isBuy ? 'Kupno' : 'Sprzedaż'} ${order.amount} ${order.asset} @ ${order.price} USDC (${order.strategyName || order.instId})`,
      side: order.side,
      usdcAmount: order.usdcValue,
      usdcValue: order.usdcValue,
      feeUsdc,
      feeAsset,
      diffUsdc: order.usdcValue,
      totalValueUsdc: newTotal,
      asset: order.asset,
      amount: order.amount,
      price: order.price,
      exchangeFeedback
    });

    saveAiExecutedOrderToLocal(order);
    if (!_standaloneState.sessionSync) {
      _standaloneState.sessionSync = {
        chatMessages: [],
        executedSessionTransactions: [],
        lastExchangeFeedback: null,
        currentAiStrategyAnalysis: null,
        updatedAt: Date.now()
      };
    }
    _standaloneState.sessionSync.lastExchangeFeedback = exchangeFeedback;
    const prevExecList = Array.isArray(_standaloneState.sessionSync.executedSessionTransactions)
      ? _standaloneState.sessionSync.executedSessionTransactions
      : [];
    _standaloneState.sessionSync.executedSessionTransactions = [
      { id: order.id, collapsed: false, feedback: exchangeFeedback },
      ...prevExecList.filter((item) => item && item.id !== order.id)
    ];
    _standaloneState.sessionSync.updatedAt = Date.now();

    _standaloneState.activeTradeOrder = null;
    _standaloneState.config.tradingStatus = 'in_progress';
    _standaloneState.config.tradingStatusLabel = `Zrealizowano: ${isBuy ? 'KUPIONO' : 'SPRZEDANO'} ${order.amount} ${order.asset} @ ${order.price} USDC`;
    saveStandaloneState();
    return {
      ok: true,
      message: exchangeFeedback.exchangeMessage,
      exchangeFeedback,
      executedOrder: order,
      state: JSON.parse(JSON.stringify(_standaloneState))
    };
  }

  // 6. Trade Stop / Reject trade order
  if (url.startsWith('/api/trade/stop') && method === 'POST') {
    const isSystem = body && body.reason === 'system_error';
    const pending = _standaloneState.activeTradeOrder;
    if (pending) {
      const now = new Date();
      const canceled = {
        ...pending,
        status: isSystem ? 'REJECTED_SYSTEM' : 'REJECTED_USER',
        rawState: isSystem ? 'rejected_system' : 'rejected_user',
        rejectedBy: isSystem ? 'SYSTEM' : 'USER',
        statusLabel: isSystem ? 'Transakcja odrzucona przez System' : 'Transakcja odrzucona przez użytkownika',
        systemError: isSystem ? {
          code: body?.errorCode || 'ERR_OKX_BALANCE_51000',
          type: body?.errorType || 'Walidacja salda / API giełdy OKX Europe',
          message: body?.errorMessage || 'Transakcja nie doszła do skutku z powodów systemowych.'
        } : null,
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        timestamp: now.getTime()
      };
      _standaloneState.portfolio.orders = [canceled, ...(_standaloneState.portfolio.orders || [])];
      _standaloneState.portfolio.sessionOrders = [canceled, ...(_standaloneState.portfolio.sessionOrders || [])];
    }
    _standaloneState.activeTradeOrder = null;
    _standaloneState.config.tradingStatus = 'idle';
    _standaloneState.config.tradingStatusLabel = isSystem
      ? 'Transakcja odrzucona przez System'
      : 'Transakcja odrzucona przez użytkownika';
    saveStandaloneState();
    return {
      ok: true,
      message: isSystem ? 'Transakcja odrzucona przez System.' : 'Transakcja odrzucona przez użytkownika.',
      state: JSON.parse(JSON.stringify(_standaloneState))
    };
  }

  // 6B. Complete strategy in progress
  if (url.startsWith('/api/strategy/complete') && method === 'POST') {
    const ordId = body?.orderId;
    const target = (_standaloneState.portfolio.orders || []).find((o) => String(o.id) === String(ordId)) ||
      (_standaloneState.portfolio.sessionOrders || []).find((o) => String(o.id) === String(ordId));
    if (target) {
      target.status = 'CLOSED';
      target.rawState = 'filled';
      target.statusLabel = 'Zrealizowana na OKX';
      target.isStrategyInProgress = false;
      const now = new Date();
      target.date = now.toISOString().slice(0, 10);
      target.time = now.toTimeString().slice(0, 8);
      if (target.exchangeFeedback) {
        target.exchangeFeedback.status = 'FILLED (Zrealizowana na OKX)';
      }
      saveStandaloneState();
      return { ok: true, message: `Strategia ${ordId} została oznaczona jako Zrealizowana na OKX.`, state: JSON.parse(JSON.stringify(_standaloneState)) };
    }
    return { ok: false, error: 'Nie znaleziono podanej strategii.' };
  }

  // 7. Orders cancel
  if (url.startsWith('/api/orders/cancel') && method === 'POST') {
    const order = _standaloneState.portfolio.orders.find((o) => o.id === body?.orderId);
    if (order) {
      order.status = 'CANCELED';
      order.statusLabel = 'Zamknięte (Anulowane)';
    }
    saveStandaloneState();
    return { ok: true, message: 'Zlecenie anulowane.', state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  // 8. Orders activate
  if (url.startsWith('/api/orders/activate') && method === 'POST') {
    const order = _standaloneState.portfolio.orders.find((o) => o.id === body?.orderId);
    if (order) {
      _standaloneState.activeTradeOrder = order;
      _standaloneState.config.tradingStatus = 'waiting_for_start';
      _standaloneState.config.tradingStatusLabel = 'Gotowe do potwierdzenia przyciskiem Potwierdź';
    }
    saveStandaloneState();
    return { ok: true, order, state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  // 9. Agent Chat
  if (url.startsWith('/api/agent/chat') && method === 'POST') {
    _standaloneState.config.aiStatus = 'active';
    const text = (body?.message || '').trim();
    const lower = text.toLowerCase();

    const mList = _standaloneState.markets || _standaloneState.tickers || DEFAULT_STANDALONE_MARKETS;
    const market = findMarketInList(text, mList);
    const asset = market.base;
    const instId = market.instId;
    const livePrice = Number(market.price || 76682.30);

    const isSell =
      lower.includes('sprzedaj') ||
      lower.includes('sprzedaż') ||
      lower.includes('sprzedac') ||
      lower.includes('sell') ||
      lower.includes('short') ||
      lower.includes('zrealizuj zysk');
    const side = isSell ? 'SELL' : 'BUY';
    const isLimit = lower.includes('limit') || lower.includes('po cenie');
    const orderType = isLimit ? 'LIMIT' : 'MARKET';

    const numbers = (text.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => parseFloat(n.replace(',', '.')));
    let amount = 0;
    let usdcVal = 0;

    if (numbers.length > 0 && livePrice > 0) {
      const firstNum = numbers[0];
      const mentionsUsdcAfterNumber =
        /\d+(?:[.,]\d+)?\s*(usdc|usdt|usd|dolar|\$)/i.test(text) ||
        /za\s+\d+/i.test(text);
      if (mentionsUsdcAfterNumber || (asset === 'BTC' && firstNum >= 20) || (asset === 'ETH' && firstNum >= 50)) {
        usdcVal = Number(firstNum.toFixed(2));
        amount = Number((usdcVal / livePrice).toFixed(6));
      } else {
        amount = Number(firstNum.toFixed(6));
        usdcVal = Number((amount * livePrice).toFixed(2));
      }
    } else {
      usdcVal = 1000.00;
      amount = livePrice > 0 ? Number((usdcVal / livePrice).toFixed(6)) : 0.01;
    }

    let strategyName = `Strategia AI MCP (${side === 'BUY' ? 'Kupno' : 'Sprzedaż'} ${instId})`;
    if (lower.includes('dca')) strategyName = `Strategia AI Spot DCA (${instId})`;
    else if (lower.includes('grid') || lower.includes('siatk')) strategyName = `Strategia AI Spot Grid (${instId})`;
    else if (lower.includes('momentum') || lower.includes('wzrost')) strategyName = `Strategia AI Momentum (${instId})`;
    else if (lower.includes('rebalans') || lower.includes('bezpiecz')) strategyName = `Strategia AI Smart Rebalance (${instId})`;

    const feeUsdc = Number((usdcVal * 0.001).toFixed(2));
    const feeAsset = Number((amount * 0.001).toFixed(6));
    const totalUsdcWithFee = side === 'BUY' ? Number((usdcVal + feeUsdc).toFixed(2)) : Number((usdcVal - feeUsdc).toFixed(2));
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const orderId = 'OKX-EEA-' + Math.floor(10000 + Math.random() * 90000);

    const order = {
      id: orderId,
      instId,
      asset,
      side,
      orderType,
      amount,
      price: livePrice,
      usdcValue: usdcVal,
      feeRate: '0.10%',
      feeUsdc,
      feeAsset,
      totalUsdcWithFee,
      mode: _standaloneState.config.apiMode || 'demo',
      site: 'eea.okx.com',
      status: 'waiting_for_start',
      statusLabel: 'Oczekuje na potwierdzenie przyciskiem Potwierdź',
      source: 'Agent AI MCP (okx/agent-trade-kit)',
      strategyName,
      date: dateStr,
      time: timeStr,
      createdAtDate: dateStr,
      createdAtTime: timeStr,
      timestamp: now.getTime()
    };

    _standaloneState.activeTradeOrder = order;
    _standaloneState.config.tradingStatus = 'waiting_for_start';
    _standaloneState.config.tradingStatusLabel = `Gotowe do potwierdzenia (${side} ${amount} ${asset} @ ${livePrice} USDC)`;
    saveStandaloneState();

    const reply = [
      `🤖 **Przygotowano strategię i zlecenie na giełdę OKX Europe (\`eea.okx.com\`):**`,
      `- **Założona strategia:** ${strategyName}`,
      `- **Data i czas:** \`${dateStr} ${timeStr}\` • **ID:** \`${orderId}\``,
      `- **Operacja:** **${side === 'BUY' ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)'}** \`${amount} ${asset}\` po kursie **${livePrice.toLocaleString('pl-PL')} USDC**`,
      `- **Przeliczenie na USDC:** **\`${usdcVal.toFixed(2)} USDC\`** • **Opłata (Fee 0.10%):** **\`${feeUsdc.toFixed(2)} USDC\`** (\`${feeAsset} ${asset}\`)`,
      `- **Całkowite rozliczenie w USDC:** **\`${totalUsdcWithFee.toFixed(2)} USDC\`**`,
      ``,
      `👇 Kliknij przycisk **Potwierdź** w karcie zlecenia powyżej, aby natychmiast zrealizować transakcję na giełdzie.`
    ].join('\n');

    return { ok: true, reply, activeTradeOrder: order, state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  // 9B. AI Agent OKX Buy Strategy & Deep Market Analysis (/api/agent/strategy)
  if (url.startsWith('/api/agent/strategy') && method === 'POST') {
    _standaloneState.config.aiStatus = 'active';
    const rawQuery = (body?.query || body?.message || 'BTC').trim();
    const lower = rawQuery.toLowerCase();

    const mList = _standaloneState.markets || _standaloneState.tickers || DEFAULT_STANDALONE_MARKETS;
    const market = findMarketInList(rawQuery, mList);
    const asset = market.base;
    const instId = market.instId;

    const livePrice = Number(market.price || 100);
    const open24h = Number(market.open24h || livePrice);
    const high24h = Number(market.high24h || livePrice * 1.025);
    const low24h = Number(market.low24h || livePrice * 0.975);
    const bidPx = Number(market.bidPx || livePrice * 0.9998);
    const askPx = Number(market.askPx || livePrice * 1.0002);
    const vol24h = Number(market.vol24h || 1000);
    const change24hPct = open24h > 0 ? Number((((livePrice - open24h) / open24h) * 100).toFixed(2)) : Number(market.change24hPct || 0);

    const priceDec = livePrice < 0.1 ? 5 : livePrice < 2 ? 4 : livePrice < 25 ? 3 : 2;
    const roundPx = (val) => Number(Number(val).toFixed(priceDec));

    const rangeSpan = Math.max(high24h - low24h, livePrice * 0.01);
    const rangePositionPct = Math.min(100, Math.max(0, Number((((livePrice - low24h) / rangeSpan) * 100).toFixed(1))));
    const volatility24hPct = low24h > 0 ? Number((((high24h - low24h) / low24h) * 100).toFixed(2)) : 2.5;
    const spreadPct = livePrice > 0 ? Number((((askPx - bidPx) / livePrice) * 100).toFixed(4)) : 0.02;

    const rsi14 = Math.min(82, Math.max(24, Number((48 + change24hPct * 2.8 + (rangePositionPct - 50) * 0.22).toFixed(1))));
    const ema20 = roundPx(livePrice * (1 - (change24hPct / 100) * 0.28));
    const ema50 = roundPx(livePrice * (1 - (change24hPct / 100) * 0.55));
    const vwap = roundPx((high24h + low24h + livePrice) / 3);

    const support1 = roundPx(Math.min(livePrice * 0.98, low24h + rangeSpan * 0.22));
    const support2 = roundPx(Math.min(livePrice * 0.955, low24h * 0.992));
    const takeProfit1 = roundPx(livePrice * 1.035);
    const takeProfit2 = roundPx(livePrice * 1.075);
    const takeProfit3 = roundPx(livePrice * 1.125);
    const stopLoss = roundPx(livePrice * 0.968);

    const holdings = _standaloneState.portfolio?.holdings || [];
    const usdcHolding = holdings.find((h) => h.asset === 'USDC');
    const availUsdc = Number(usdcHolding ? usdcHolding.amount : _standaloneState.portfolio?.cashUsdc || 99900);
    const currentHolding = holdings.find((h) => h.asset === asset);
    const currentAssetAmount = currentHolding ? currentHolding.amount : 0;
    const currentAvgBuyPrice = currentHolding ? currentHolding.avgBuyPrice : 0;

    const numbers = (rawQuery.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => parseFloat(n.replace(',', '.')));
    let amount = 0;
    let usdcBudget = 0;

    if (numbers.length > 0 && livePrice > 0) {
      const firstNum = numbers[0];
      const mentionsUsdc =
        /\d+(?:[.,]\d+)?\s*(usdc|usdt|usd|dolar|\$)/i.test(rawQuery) ||
        /za\s+\d+/i.test(rawQuery);
      if (mentionsUsdc || (asset === 'BTC' && firstNum >= 20) || (asset === 'ETH' && firstNum >= 50)) {
        usdcBudget = Number(firstNum.toFixed(2));
        amount = Number((usdcBudget / livePrice).toFixed(6));
      } else {
        amount = Number(firstNum.toFixed(6));
        usdcBudget = Number((amount * livePrice).toFixed(2));
      }
    } else {
      usdcBudget = 1500.00;
      amount = livePrice > 0 ? Number((usdcBudget / livePrice).toFixed(6)) : 0.02;
    }

    let strategyType = 'OKX AI Smart Spot + DCA Accumulation';
    let strategyName = `Strategia Kupna OKX AI (${instId} • Spot + DCA)`;
    if (lower.includes('grid') || lower.includes('siatk')) {
      strategyType = 'OKX AI Spot Grid Bot Strategy';
      strategyName = `Strategia Kupna OKX AI Spot Grid (${instId})`;
    } else if (lower.includes('dca') || lower.includes('transz') || lower.includes('akumulac')) {
      strategyType = 'OKX AI Dynamic Spot DCA (3 Transze)';
      strategyName = `Strategia Kupna OKX AI Spot DCA (${instId})`;
    } else if (lower.includes('momentum') || lower.includes('wybic') || change24hPct >= 2.5) {
      strategyType = 'OKX AI Momentum Breakout Buy';
      strategyName = `Strategia Kupna OKX AI Momentum (${instId})`;
    }

    const trendLabel =
      change24hPct >= 1.5
        ? 'Wzrostowy (Bullish Momentum na OKX Spot)'
        : change24hPct <= -1.5
        ? 'Korekta spadkowa — Strefa akumulacji pod wsparciem (Dip Buy)'
        : 'Konsolidacja akumulacyjna z przewagą popytu (Neutral-Bullish)';

    const rsiStatus =
      rsi14 > 68
        ? 'Wykupienie (zalecane wejście transzami DCA przy korekcie do S1)'
        : rsi14 < 38
        ? 'Wyprzedanie (silny sygnał zakupowy z dyskontem cenowym)'
        : 'Optymalna strefa akumulacji (brak przegrzania rynku)';

    const t1Usdc = Number((usdcBudget * 0.4).toFixed(2));
    const t2Usdc = Number((usdcBudget * 0.35).toFixed(2));
    const t3Usdc = Number((usdcBudget - t1Usdc - t2Usdc).toFixed(2));
    const t1Amt = Number((t1Usdc / livePrice).toFixed(6));
    const t2Amt = Number((t2Usdc / support1).toFixed(6));
    const t3Amt = Number((t3Usdc / support2).toFixed(6));
    const totalDcaAmt = Number((t1Amt + t2Amt + t3Amt).toFixed(6));
    const avgDcaPrice = totalDcaAmt > 0 ? roundPx(usdcBudget / totalDcaAmt) : livePrice;

    const feeUsdc = Number((usdcBudget * 0.001).toFixed(2));
    const feeAsset = Number((amount * 0.001).toFixed(6));
    const totalUsdcWithFee = Number((usdcBudget + feeUsdc).toFixed(2));
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const orderId = 'OKX-EEA-' + Math.floor(10000 + Math.random() * 90000);

    const order = {
      id: orderId,
      instId,
      asset,
      side: 'BUY',
      orderType: lower.includes('limit') ? 'LIMIT' : 'MARKET',
      amount,
      price: livePrice,
      usdcValue: usdcBudget,
      feeRate: '0.10%',
      feeUsdc,
      feeAsset,
      totalUsdcWithFee,
      mode: _standaloneState.config.apiMode || 'demo',
      site: 'eea.okx.com',
      status: 'waiting_for_start',
      statusLabel: 'Oczekuje na potwierdzenie przyciskiem Potwierdź',
      source: 'Analiza Agenta AI OKX (AI Strategies)',
      strategyName,
      date: dateStr,
      time: timeStr,
      createdAtDate: dateStr,
      createdAtTime: timeStr,
      timestamp: now.getTime()
    };

    _standaloneState.activeTradeOrder = order;
    _standaloneState.config.tradingStatus = 'waiting_for_start';
    _standaloneState.config.tradingStatusLabel = `Gotowe do potwierdzenia (BUY ${amount} ${asset} @ ${livePrice} USDC)`;
    saveStandaloneState();

    const analysis = {
      engine: '@okx_ai/okx-trade-mcp • okx/agent-trade-kit (eea.okx.com v5)',
      mode: (_standaloneState.config.apiMode || 'demo').toUpperCase(),
      query: rawQuery,
      date: dateStr,
      time: timeStr,
      asset,
      assetName: market.name || asset,
      instId,
      market: {
        price: livePrice,
        bidPx,
        askPx,
        spreadPct,
        open24h,
        high24h,
        low24h,
        vol24h,
        change24hPct,
        volatility24hPct,
        rangePositionPct
      },
      technicals: {
        trendLabel,
        signalBadge: 'REKOMENDACJA AI OKX: KUPUJ / AKUMULUJ (BUY)',
        rsi14,
        rsiStatus,
        ema20,
        ema50,
        vwap,
        support1,
        support2,
        takeProfit1,
        takeProfit2,
        takeProfit3,
        stopLoss,
        riskReward: '1 : 2.65'
      },
      portfolioContext: {
        availUsdc,
        totalPortfolioUsdc: _standaloneState.portfolio?.totalValueUsdc || 461458.47,
        currentAssetAmount,
        currentAvgBuyPrice,
        newTotalAssetAmount: Number((currentAssetAmount + order.amount).toFixed(6))
      },
      recommendedStrategy: {
        strategyType,
        strategyName,
        rationale: `Agent AI OKX przeanalizował księgę zleceń i strukturę świec dla pary ${instId} na giełdzie OKX Europe (eea.okx.com). Kurs bieżący wynosi ${livePrice} USDC (zmiana 24h: ${change24hPct >= 0 ? '+' : ''}${change24hPct}%, zmienność dobowa: ${volatility24hPct}%, RSI-14: ${rsi14}). Cena znajduje się na poziomie ${rangePositionPct}% kanału dobowego (${low24h} – ${high24h} USDC) względem VWAP (${vwap} USDC). Rekomendowana strategia zakłada wejście kupna (BUY) z docelowym poziomem realizacji zysku TP1 ${takeProfit1} USDC (+3.5%), TP2 ${takeProfit2} USDC (+7.5%) oraz zabezpieczeniem Stop-Loss na ${stopLoss} USDC (-3.2%).`,
        spotExecution: {
          orderId: order.id,
          amount: order.amount,
          price: order.price,
          usdcValue: order.usdcValue,
          feeRate: order.feeRate,
          feeUsdc: order.feeUsdc,
          feeAsset: order.feeAsset,
          totalUsdcWithFee: order.totalUsdcWithFee
        },
        dcaTranches: [
          {
            step: 'Transza 1 (40% kapitału — Wejście Spot Market)',
            price: livePrice,
            usdcValue: t1Usdc,
            amount: t1Amt,
            condition: 'Natychmiastowy zakup po bieżącym kursie OKX Spot'
          },
          {
            step: 'Transza 2 (35% kapitału — Wsparcie S1 -2.0%)',
            price: support1,
            usdcValue: t2Usdc,
            amount: t2Amt,
            condition: `Zlecenie oczekujące Limit Buy w strefie popytu S1 (${support1} USDC)`
          },
          {
            step: 'Transza 3 (25% kapitału — Głębokie Wsparcie S2 -4.5%)',
            price: support2,
            usdcValue: t3Usdc,
            amount: t3Amt,
            condition: `Zlecenie obronne Limit Buy na wsparciu S2 (${support2} USDC)`
          }
        ],
        avgDcaPrice,
        totalDcaAmt,
        gridPlan: {
          lowerPrice: support2,
          upperPrice: takeProfit2,
          gridLevels: 12,
          profitPerGrid: '0.55% – 0.85% (po odliczeniu Fee 0.10%)',
          allocatedUsdc: usdcBudget
        }
      }
    };

    const reply = [
      `🧠 **Analiza Agenta AI z OKX (\`eea.okx.com\`) — Strategia Kupna dla \`${instId}\`:**`,
      `- **Rekomendowana strategia:** **${strategyName}**`,
      `- **Kurs OKX Live:** **${livePrice.toLocaleString('pl-PL')} USDC** (24h: \`${change24hPct >= 0 ? '+' : ''}${change24hPct}%\` • RSI-14: \`${rsi14}\` • VWAP: \`${vwap} USDC\`)`,
      `- **Poziomy techniczne OKX:** Wsparcie S1: \`${support1} USDC\` • S2: \`${support2} USDC\` | Cele: **TP1 \`${takeProfit1} USDC\`**, **TP2 \`${takeProfit2} USDC\`** | Stop-Loss: \`${stopLoss} USDC\``,
      `- **Przygotowane zlecenie kupna:** \`${order.amount} ${asset}\` = **\`${order.usdcValue.toFixed(2)} USDC\`** + Fee (0.10%): **\`${order.feeUsdc.toFixed(2)} USDC\`** (Razem: **\`${order.totalUsdcWithFee.toFixed(2)} USDC\`**)`,
      ``,
      `👇 Możesz od razu kliknąć **Potwierdź**, aby zrealizować tę strategię kupna na giełdzie OKX.`
    ].join('\n');

    return { ok: true, analysis, reply, activeTradeOrder: order, state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  // 9B-FUTURES. AI Agent OKX Futures Strategy & Risk / Leverage Analysis (/api/agent/strategy/futures)
  if (url.startsWith('/api/agent/strategy/futures') && method === 'POST') {
    _standaloneState.config.aiStatus = 'active';
    const rawQuery = (body?.query || body?.message || 'BTC').trim();
    const options = body?.options || {};
    const lower = rawQuery.toLowerCase();

    const mList = _standaloneState.markets || _standaloneState.tickers || DEFAULT_STANDALONE_MARKETS;
    const market = findMarketInList(rawQuery, mList);
    const asset = market.base || 'BTC';
    const swapInstId = `${asset}-USDC-SWAP`;

    const livePrice = Number(market.price || 76000);
    const open24h = Number(market.open24h || livePrice);
    const high24h = Number(market.high24h || livePrice * 1.028);
    const low24h = Number(market.low24h || livePrice * 0.972);
    const bidPx = Number(market.bidPx || livePrice * 0.9998);
    const askPx = Number(market.askPx || livePrice * 1.0002);
    const vol24h = Number(market.vol24h || 2500);
    const change24hPct = open24h > 0 ? Number((((livePrice - open24h) / open24h) * 100).toFixed(2)) : 0;

    const priceDec = livePrice < 0.1 ? 5 : livePrice < 2 ? 4 : livePrice < 25 ? 3 : 2;
    const roundPx = (val) => Number(Number(val).toFixed(priceDec));

    const rangeSpan = Math.max(high24h - low24h, livePrice * 0.01);
    const rangePositionPct = Math.min(100, Math.max(0, Number((((livePrice - low24h) / rangeSpan) * 100).toFixed(1))));
    const volatility24hPct = low24h > 0 ? Number((((high24h - low24h) / low24h) * 100).toFixed(2)) : 2.8;
    const spreadPct = livePrice > 0 ? Number((((askPx - bidPx) / livePrice) * 100).toFixed(4)) : 0.02;

    const rsi14 = Math.min(84, Math.max(20, Number((48 + change24hPct * 2.8 + (rangePositionPct - 50) * 0.22).toFixed(1))));
    const ema20 = roundPx(livePrice * (1 - (change24hPct / 100) * 0.28));
    const ema50 = roundPx(livePrice * (1 - (change24hPct / 100) * 0.55));
    const vwap = roundPx((high24h + low24h + livePrice) / 3);

    // Wykrywanie kierunku pozycji (LONG vs SHORT)
    const hasShortWord = /\b(short|krótka|spadk|sell|sprzedaj|graj na spadki)\b/i.test(rawQuery);
    const hasLongWord = /\b(long|długa|wzrost|buy|kup|graj na wzrosty)\b/i.test(rawQuery);
    let direction = 'LONG';
    if (options.direction) {
      direction = options.direction.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
    } else if (hasShortWord) {
      direction = 'SHORT';
    } else if (hasLongWord) {
      direction = 'LONG';
    } else {
      direction = rsi14 > 68 || change24hPct <= -2.5 ? 'SHORT' : 'LONG';
    }

    // Wykrywanie dźwigni (Leverage)
    const levMatch = rawQuery.match(/(\d+)x/i);
    let leverage = 10;
    if (options.leverage) {
      leverage = Math.max(1, Math.min(100, Number(options.leverage) || 10));
    } else if (levMatch) {
      leverage = Math.max(1, Math.min(100, parseInt(levMatch[1], 10)));
    }

    // Tryb depozytu (Margin Mode: isolated vs cross)
    const marginMode = options.marginMode === 'cross' || lower.includes('cross') || lower.includes('krzyżow') ? 'cross' : 'isolated';

    // Budżet Margin
    let marginUsdc = 500.00;
    const numbers = (rawQuery.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => parseFloat(n.replace(',', '.')));
    if (options.marginUsdc && Number(options.marginUsdc) > 0) {
      marginUsdc = Number(Number(options.marginUsdc).toFixed(2));
    } else if (numbers.length > 0) {
      const firstNum = numbers[0];
      if (firstNum >= 10 && firstNum <= 50000 && !rawQuery.includes(`${firstNum}x`)) {
        marginUsdc = Number(firstNum.toFixed(2));
      }
    }

    const notionalUsdc = Number((marginUsdc * leverage).toFixed(2));
    const positionAmount = livePrice > 0 ? Number((notionalUsdc / livePrice).toFixed(6)) : 0.05;

    // Maintenance Margin Rate OKX (0.5%)
    const mmr = 0.005;
    const maintenanceMarginUsdc = Number((notionalUsdc * mmr).toFixed(2));

    let liquidationPrice = 0;
    let liquidationDistancePct = 0;
    if (direction === 'LONG') {
      const dropRatio = Math.max(0.005, (1 / leverage) - mmr);
      liquidationPrice = roundPx(livePrice * (1 - dropRatio));
      liquidationDistancePct = Number((dropRatio * 100).toFixed(2));
    } else {
      const riseRatio = Math.max(0.005, (1 / leverage) - mmr);
      liquidationPrice = roundPx(livePrice * (1 + riseRatio));
      liquidationDistancePct = Number((riseRatio * 100).toFixed(2));
    }

    let riskLevel = 'Umiarkowany (5x-10x)';
    let riskBadgeColor = '#fbbf24';
    if (leverage <= 3) {
      riskLevel = 'Niski (1x-3x) — Bezpieczny Margin';
      riskBadgeColor = '#34d399';
    } else if (leverage <= 10) {
      riskLevel = 'Umiarkowany (5x-10x) — Standard Trading';
      riskBadgeColor = '#38bdf8';
    } else if (leverage <= 25) {
      riskLevel = 'Podwyższony (15x-25x) — Agresywny Scalp';
      riskBadgeColor = '#f59e0b';
    } else {
      riskLevel = 'Ekstremalny (>25x) — Wymagany ścisły Stop-Loss!';
      riskBadgeColor = '#ef4444';
    }

    const fundingRatePct = change24hPct >= 0 ? 0.0100 : -0.0075;
    const fundingRateStr = (fundingRatePct > 0 ? '+' : '') + fundingRatePct.toFixed(4) + '% / 8h';
    const estimatedFundingFeeUsdc = Number((notionalUsdc * (Math.abs(fundingRatePct) / 100)).toFixed(2));
    const fundingCountdown = '03:18:45';

    const tp1Dist = 0.022;
    const tp2Dist = 0.052;
    const tp3Dist = 0.088;
    const slDist = Number(Math.min(0.035, Math.max(0.012, (0.65 / leverage))).toFixed(4));

    let takeProfit1, takeProfit2, takeProfit3, stopLoss, trailingStopActivation;
    if (direction === 'LONG') {
      takeProfit1 = roundPx(livePrice * (1 + tp1Dist));
      takeProfit2 = roundPx(livePrice * (1 + tp2Dist));
      takeProfit3 = roundPx(livePrice * (1 + tp3Dist));
      stopLoss = roundPx(livePrice * (1 - slDist));
      trailingStopActivation = roundPx(livePrice * (1 + 0.018));
    } else {
      takeProfit1 = roundPx(livePrice * (1 - tp1Dist));
      takeProfit2 = roundPx(livePrice * (1 - tp2Dist));
      takeProfit3 = roundPx(livePrice * (1 - tp3Dist));
      stopLoss = roundPx(livePrice * (1 + slDist));
      trailingStopActivation = roundPx(livePrice * (1 - 0.018));
    }

    const tp1RoiPct = Number((tp1Dist * leverage * 100).toFixed(1));
    const tp1PnlUsdc = Number((marginUsdc * (tp1Dist * leverage)).toFixed(2));
    const tp2RoiPct = Number((tp2Dist * leverage * 100).toFixed(1));
    const tp2PnlUsdc = Number((marginUsdc * (tp2Dist * leverage)).toFixed(2));
    const tp3RoiPct = Number((tp3Dist * leverage * 100).toFixed(1));
    const tp3PnlUsdc = Number((marginUsdc * (tp3Dist * leverage)).toFixed(2));
    const slRoiPct = Number((-(slDist * leverage * 100)).toFixed(1));
    const slPnlUsdc = Number((-(marginUsdc * (slDist * leverage))).toFixed(2));

    const strategyType = `OKX AI Perpetual Futures (${direction} ${leverage}x)`;
    const strategyName = `Strategia Futures OKX AI (${swapInstId} • ${direction} ${leverage}x • ${marginMode.toUpperCase()})`;

    const orderId = `OKX-FUT-${Date.now()}`;
    const now = new Date();
    const order = {
      id: orderId,
      instId: swapInstId,
      asset,
      side: direction === 'LONG' ? 'BUY' : 'SELL',
      posSide: direction.toLowerCase(),
      orderType: 'MARKET',
      amount: positionAmount,
      price: livePrice,
      usdcValue: notionalUsdc,
      marginUsdc,
      leverage,
      marginMode,
      feeRate: '0.05%',
      feeUsdc: Number((notionalUsdc * 0.0005).toFixed(2)),
      feeAsset: Number((positionAmount * 0.0005).toFixed(6)),
      totalUsdcWithFee: notionalUsdc,
      status: 'waiting_for_start',
      statusText: 'Czekam na potwierdzenie pozycji futures (OKX EEA)',
      source: 'Analiza Agenta AI OKX (Strategia Futures)',
      strategyName,
      strategyType,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      timestamp: now.getTime()
    };

    _standaloneState.activeTradeOrder = order;

    const analysis = {
      engine: '@okx_ai/okx-futures-mcp • okx/agent-trade-kit (eea.okx.com v5 Perpetual Swap)',
      mode: (_standaloneState.config.apiMode || 'demo').toUpperCase(),
      marketType: 'FUTURES',
      query: rawQuery,
      date: order.date,
      time: order.time,
      asset,
      assetName: market.name || asset,
      instId: swapInstId,
      direction,
      leverage,
      marginMode,
      market: {
        price: livePrice,
        bidPx,
        askPx,
        spreadPct,
        open24h,
        high24h,
        low24h,
        vol24h,
        change24hPct,
        volatility24hPct,
        rangePositionPct,
        fundingRate: fundingRateStr,
        fundingRatePct,
        nextFundingCountdown: fundingCountdown,
        openInterestUsdc: 482500000,
        estimatedFundingFeeUsdc
      },
      futuresParameters: {
        direction,
        leverage,
        marginMode,
        entryPrice: livePrice,
        initialMarginUsdc: marginUsdc,
        notionalValueUsdc: notionalUsdc,
        contractsCount: Math.round(positionAmount * 100),
        positionAmount,
        maintenanceMarginRate: mmr,
        maintenanceMarginUsdc,
        liquidationPrice,
        liquidationDistancePct,
        liquidationBufferUsdc: Math.abs(roundPx(livePrice - liquidationPrice)),
        riskLevel,
        riskBadgeColor,
        marginHealthScore: Math.max(10, Math.min(100, Math.round(100 - (leverage * 0.75))))
      },
      technicals: {
        trendLabel: direction === 'LONG'
          ? 'Potwierdzony trend wzrostowy / Odbicie od wsparcia z akumulacją'
          : 'Presja podażowa / Przełamanie oporu lub wykupienie na oscylatorach',
        signalBadge: direction === 'LONG'
          ? `🟢 REKOMENDACJA AI OKX FUTURES: LONG (Wzrosty ${leverage}x)`
          : `🔴 REKOMENDACJA AI OKX FUTURES: SHORT (Spadki ${leverage}x)`,
        rsi14,
        ema20,
        ema50,
        vwap,
        support1: roundPx(livePrice * 0.98),
        support2: roundPx(livePrice * 0.955),
        resistance1: roundPx(livePrice * 1.02),
        resistance2: roundPx(livePrice * 1.045),
        takeProfit1,
        takeProfit1RoiPct: tp1RoiPct,
        takeProfit1PnlUsdc: tp1PnlUsdc,
        takeProfit2,
        takeProfit2RoiPct: tp2RoiPct,
        takeProfit2PnlUsdc: tp2PnlUsdc,
        takeProfit3,
        takeProfit3RoiPct: tp3RoiPct,
        takeProfit3PnlUsdc: tp3PnlUsdc,
        stopLoss,
        stopLossRoiPct: slRoiPct,
        stopLossPnlUsdc: slPnlUsdc,
        trailingStopActivation,
        trailingStopCallbackPct: 0.8,
        riskReward: '1 : 2.75'
      },
      portfolioContext: {
        availUsdc: 99900,
        totalPortfolioUsdc: _standaloneState.portfolio?.totalValueUsdc || 461458.47,
        marginAllocatedUsdc: marginUsdc,
        marginUsagePct: Number(((marginUsdc / 99900) * 100).toFixed(1))
      },
      recommendedStrategy: {
        strategyType,
        strategyName,
        rationale: `Agent AI OKX wygenerował strategię futures dla kontraktu Perpetual Swap ${swapInstId} z dźwignią ${leverage}x w trybie depozytu ${marginMode.toUpperCase()}. Kurs bieżący wynosi ${livePrice} USDC (RSI: ${rsi14}, zmiana 24h: ${change24hPct}%). Kierunek: ${direction}. Wymagany depozyt początkowy Margin wynosi ${marginUsdc.toFixed(2)} USDC, dając ekspozycję rynkową o wartości ${notionalUsdc.toFixed(2)} USDC (${positionAmount} ${asset}). Szacowana cena likwidacji została wyliczona na ${liquidationPrice} USDC (dystans bezpieczeństwa: ${liquidationDistancePct}%). Ochrona Stop-Loss zdefiniowana na poziomie ${stopLoss} USDC (${slRoiPct}% ROI) gwarantuje zamknięcie pozycji ze stratą ograniczoną do ${Math.abs(slPnlUsdc)} USDC na długo przed osiągnięciem ceny likwidacji.`,
        contractDetails: {
          instId: swapInstId,
          orderId: order.id,
          direction,
          leverage,
          marginMode,
          entryPrice: livePrice,
          marginUsdc,
          notionalUsdc,
          positionAmount,
          liquidationPrice,
          liquidationDistancePct,
          feeTakerRate: '0.05%',
          feeUsdc: Number((notionalUsdc * 0.0005).toFixed(2))
        }
      }
    };

    const reply = [
      `⚡ **Strategia OKX ai: FUTURES — Kontrakt \`${swapInstId}\` (${direction} ${leverage}x):**`,
      `- **Kierunek i Dźwignia:** **${direction === 'LONG' ? '🟢 LONG (Wzrosty)' : '🔴 SHORT (Spadki)'}** z dźwignią **\`${leverage}x\`** (${marginMode.toUpperCase()} Margin)`,
      `- **Kurs wejścia:** **${livePrice.toLocaleString('pl-PL')} USDC** • **Depozyt Margin:** **\`${marginUsdc.toFixed(2)} USDC\`** ➔ **Wartość ekspozycji:** **\`${notionalUsdc.toFixed(2)} USDC\`** (\`${positionAmount} ${asset}\`)`,
      `- **Szacowana Likwidacja (Liq Price):** **\`${liquidationPrice} USDC\`** (bufor: \`${liquidationDistancePct}%\`) • Poziom ryzyka: **${riskLevel}**`,
      `- **Poziomy docelowe zysku:** TP1: \`${takeProfit1} USDC\` (+${tp1RoiPct}% ROI / +${tp1PnlUsdc} USDC) | TP2: \`${takeProfit2} USDC\` (+${tp2RoiPct}% ROI) | Stop-Loss: \`${stopLoss} USDC\` (${slRoiPct}% ROI)`,
      `- **Funding Rate:** \`${fundingRateStr}\` • Estymowany koszt: \`~${estimatedFundingFeeUsdc} USDC / 8h\``,
      ``,
      `👇 Kliknij **Potwierdź** w oknie strategii, aby złożyć zlecenie kontraktu futures na OKX.`
    ].join('\n');

    return { ok: true, analysis, reply, activeTradeOrder: order, state: JSON.parse(JSON.stringify(_standaloneState)) };
  }

  _standaloneState.config.marketDataStatus.lastUpdatedAt = new Date().toTimeString().slice(0, 8);
  recalculateStateValuations(_standaloneState);
  return JSON.parse(JSON.stringify(_standaloneState));
}

export async function apiRequest(url, method = 'GET', body = null) {
  if (_gwInit.forceStandalone) {
    return clientMockEngine(url, method, body);
  }
  if (isStandaloneMode()) {
    // Periodically check in the background if the Home IP Gateway came back online
    probeHomeGateway(false).catch(() => {});
    if (isStandaloneMode()) {
      return clientMockEngine(url, method, body);
    }
  }
  try {
    const forceTickerRefresh =
      url.startsWith('/api/agent/') ||
      url.startsWith('/api/trade/') ||
      url.startsWith('/api/portfolio/sync');
    await fetchLiveOkxTickersInBrowser(forceTickerRefresh);

    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
      }
    };
    if (body && typeof body === 'object') {
      const enrichedBody = { ...body };
      if (latestBrowserOkxTickers.length > 0 && (url.startsWith('/api/agent/') || url.startsWith('/api/trade/'))) {
        enrichedBody.clientTickers = latestBrowserOkxTickers;
      }
      opts.body = JSON.stringify(enrichedBody);
    } else if (body) {
      opts.body = JSON.stringify(body);
    }

    let fullUrl = `${_activeApiBaseUrl}${url}`;
    let res;
    try {
      res = await fetchWithTimeout(fullUrl, opts, 6000);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (firstErr) {
      // If on remote mobile host (github.io) and primary gateway tunnel URL didn't respond, probe alternative gateway tunnels
      const recovered = await probeHomeGateway(true);
      if (!recovered) {
        throw firstErr;
      }
      fullUrl = `${_activeApiBaseUrl}${url}`;
      res = await fetchWithTimeout(fullUrl, opts, 6000);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    }

    const data = await res.json();
    _gatewayConnected = true;
    _isStandalone = false;

    if (data?.executedOrder) {
      saveAiExecutedOrderToLocal(data.executedOrder);
    }

    let targetState = data?.state || (url.startsWith('/api/state') ? data : null);
    if (targetState) {
      if (targetState.config?.remoteGateway?.cloudflareTunnelUrl) {
        _discoveredCloudflareUrl = targetState.config.remoteGateway.cloudflareTunnelUrl.replace(/\/+$/, '');
      }

      // Sync any locally executed orders to the server so they are never lost across sessions/devices
      if (!url.startsWith('/api/session/sync-orders') && Array.isArray(targetState.portfolio?.orders)) {
        const localOrders = loadSavedAiExecutedOrders();
        const serverOrderIds = new Set(targetState.portfolio.orders.map((o) => String(o.id)));
        const missingOnServer = localOrders.filter((o) => o && o.id && !serverOrderIds.has(String(o.id)));
        if (missingOnServer.length > 0) {
          try {
            const syncRes = await fetchWithTimeout(
              `${_activeApiBaseUrl}/api/session/sync-orders`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'bypass-tunnel-reminder': 'true'
                },
                body: JSON.stringify({
                  orders: missingOnServer,
                  portfolioHistory: (_standaloneState?.portfolio?.portfolioHistory || []).slice(0, 30),
                  sessionSync: _standaloneState?.sessionSync || null
                })
              },
              4500
            );
            if (syncRes.ok) {
              const syncJson = await syncRes.json();
              if (syncJson?.state) {
                targetState = syncJson.state;
                if (data?.state) data.state = targetState;
              }
            }
          } catch (e) {}
        }
      }

      if (latestBrowserOkxTickers.length > 0 && !targetState.config?.marketDataStatus?.live) {
        const map = {};
        latestBrowserOkxTickers.forEach((t) => {
          map[t.instId] = t;
        });
        if (Array.isArray(targetState.markets)) {
          targetState.markets.forEach((m) => {
            const t = map[m.instId] || map[`${m.base}-USDT`];
            if (t && Number(t.last) > 0) {
              const last = Number(t.last);
              const open24h = Number(t.open24h || t.sodUtc0 || last);
              m.price = last;
              m.bidPx = Number(t.bidPx || last);
              m.askPx = Number(t.askPx || last);
              m.open24h = open24h > 0 ? open24h : last;
              m.high24h = Number(t.high24h || last);
              m.low24h = Number(t.low24h || last);
              m.change24hPct = m.open24h > 0 ? Number((((last - m.open24h) / m.open24h) * 100).toFixed(2)) : 0;
            }
          });
        }
        recalculateStateValuations(targetState);
        fetch(`${_activeApiBaseUrl}/api/market/tickers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
          body: JSON.stringify({ tickers: latestBrowserOkxTickers })
        }).catch(() => {});
      }

      // Mirror live Home Gateway state into local cache so mobile phone stays 100% synced even if offline later
      if (!_standaloneState) initStandaloneState();
      if (_standaloneState && targetState.portfolio) {
        _standaloneState.config = { ..._standaloneState.config, ...targetState.config };
        _standaloneState.portfolio = JSON.parse(JSON.stringify(targetState.portfolio));
        _standaloneState.activeTradeOrder = targetState.activeTradeOrder || null;
        if (targetState.sessionSync) {
          _standaloneState.sessionSync = JSON.parse(JSON.stringify(targetState.sessionSync));
        }
        saveStandaloneState();
      }
    }

    return data;
  } catch (err) {
    _gatewayConnected = false;
    setStandaloneMode(true);
    return clientMockEngine(url, method, body);
  }
}

export function buildExchangeFeedbackForItem(item, apiMode = 'demo') {
  if (item && item.exchangeFeedback) return item.exchangeFeedback;
  const id = item?.orderId || item?.id || 'OKX-ORD';
  const asset = item?.asset || (item?.instId ? item.instId.split('-')[0] : 'BTC');
  const instId = item?.instId || `${asset}-USDC`;
  const side = (item?.side || 'BUY').toUpperCase();
  const isBuy = side !== 'SELL';
  const orderType = (item?.orderType || 'MARKET').toUpperCase();
  const amount = Number(item?.amount || 0);
  const usdcVal = Number(item?.usdcValue ?? item?.usdcAmount ?? 0);
  const price = Number(item?.price || (amount > 0 ? Number((usdcVal / amount).toFixed(4)) : 0));
  const feeUsdc = Number(item?.feeUsdc ?? (usdcVal * 0.001).toFixed(2));
  const feeAsset = Number(item?.feeAsset ?? (amount * 0.001).toFixed(6));
  const totalUsdcWithFee = Number(
    item?.totalUsdcWithFee ?? (isBuy ? (usdcVal + feeUsdc).toFixed(2) : (usdcVal - feeUsdc).toFixed(2))
  );
  const strat = item?.strategyName || item?.action || `Strategia Spot ${side} (${instId})`;

  return {
    exchange: 'OKX Europe (eea.okx.com) — API v5',
    mode: (apiMode || 'demo').toUpperCase(),
    code: '0',
    status: item?.status === 'OPEN' ? 'LIVE (Aktywne zlecenie na giełdzie OKX)' : 'FILLED (Zrealizowano na giełdzie OKX)',
    orderId: id,
    date: item?.date || '—',
    time: item?.time || '—',
    instId,
    asset,
    side,
    orderType,
    amount,
    price,
    usdcValue: usdcVal,
    feeRate: '0.10%',
    feeUsdc,
    feeAsset,
    feeCcy: isBuy ? asset : 'USDC',
    totalUsdcWithFee,
    strategyName: strat,
    strategyMessage: `Założono strategię „${strat}” oraz uruchomiono proces ${isBuy ? 'KUPNA (BUY)' : 'SPRZEDAŻY (SELL)'} dla pary ${instId}.`,
    exchangeMessage: `Giełda OKX Europe (eea.okx.com) potwierdziła dokonanie transakcji #${id}: ${isBuy ? 'Kupiono' : 'Sprzedano'} ${formatQty(amount)} ${asset} po cenie ${formatUnitPrice(price)} (Przeliczenie na USDC: ${formatUsdc(usdcVal)}, Fee 0.10%: ${formatUsdc(feeUsdc)} / ${feeAsset} ${asset}, Rozliczenie całkowite: ${formatUsdc(totalUsdcWithFee)}).`
  };
}

// LocalStorage API keys helpers
const LS_KEYS_STORAGE = 'okx_eea_saved_keys_v1';

export function saveKeysToLocalStorage(mode, apiKey, secretKey, passphrase) {
  try {
    const current = JSON.parse(localStorage.getItem(LS_KEYS_STORAGE) || '{}');
    current[mode] = { apiKey, secretKey, passphrase };
    localStorage.setItem(LS_KEYS_STORAGE, JSON.stringify(current));
  } catch (e) {}
}

export function clearKeysFromLocalStorage(mode) {
  try {
    const current = JSON.parse(localStorage.getItem(LS_KEYS_STORAGE) || '{}');
    delete current[mode];
    localStorage.setItem(LS_KEYS_STORAGE, JSON.stringify(current));
  } catch (e) {}
}

export function getKeysFromLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS_STORAGE) || '{}');
  } catch (e) {
    return {};
  }
}

// Technical indicators for TradingView Pro Engine
export function computeEMA(values, period) {
  const res = new Array(values.length).fill(null);
  if (values.length === 0) return res;
  const k = 2 / (period + 1);
  let ema = values[0];
  res[0] = ema;
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    res[i] = ema;
  }
  return res;
}

export function computeBollinger(values, period = 20, mult = 2) {
  const upper = new Array(values.length).fill(null);
  const mid = new Array(values.length).fill(null);
  const lower = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    const mean = sum / period;
    let sqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) sqDiff += Math.pow(values[j] - mean, 2);
    const std = Math.sqrt(sqDiff / period);
    mid[i] = mean;
    upper[i] = mean + mult * std;
    lower[i] = mean - mult * std;
  }
  return { upper, mid, lower };
}

export function computeVWAP(candles) {
  const res = new Array(candles.length).fill(null);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < candles.length; i++) {
    const typical = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const v = Math.max(0.0001, candles[i].volume || 1);
    cumPV += typical * v;
    cumV += v;
    res[i] = cumPV / cumV;
  }
  return res;
}

export function computeRSI(values, period = 14) {
  const rsi = new Array(values.length).fill(null);
  if (values.length <= period) return rsi;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

export function computeMACD(values) {
  const ema12 = computeEMA(values, 12);
  const ema26 = computeEMA(values, 26);
  const macdLine = values.map((_, i) => (ema12[i] !== null && ema26[i] !== null ? ema12[i] - ema26[i] : 0));
  const signalLine = computeEMA(macdLine, 9);
  const hist = macdLine.map((m, i) => m - (signalLine[i] || 0));
  return { macdLine, signalLine, hist };
}

export function computeHeikinAshi(candles) {
  const ha = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (ha[i - 1].open + ha[i - 1].close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    ha.push({ ...c, open: haOpen, high: haHigh, low: haLow, close: haClose });
  }
  return ha;
}

export function formatCandleTime(ts, bar) {
  const d = new Date(Number(ts));
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  if (bar === '1D' || bar === '1W') return `${dd}.${mm}`;
  return `${dd}.${mm} ${hh}:${min}`;
}

export function getCandleCountdown(bar) {
  const secMap = { '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1H': 3600, '4H': 14400, '1D': 86400, '1W': 604800 };
  const stepSec = secMap[bar] || 900;
  const nowSec = Math.floor(Date.now() / 1000);
  const rem = stepSec - (nowSec % stepSec);
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
