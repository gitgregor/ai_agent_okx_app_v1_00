import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  apiRequest,
  formatUsdc,
  formatUnitPrice,
  formatQty,
  buildExchangeFeedbackForItem,
  saveKeysToLocalStorage,
  clearKeysFromLocalStorage,
  getKeysFromLocalStorage,
  DEFAULT_STANDALONE_MARKETS
} from './engine/okxClientEngine';
import { HeaderBar } from './components/HeaderBar';
import { LeftSidebar } from './components/LeftSidebar';
import { ControlWindows } from './components/ControlWindows';
import { AiChatWindow } from './components/AiChatWindow';
import { AiStrategiesWindow } from './components/AiStrategiesWindow';
import { QuickTradeWindow } from './components/QuickTradeWindow';
import { PortfoliosRow } from './components/PortfoliosRow';
import { PortfolioHistoryWindow } from './components/PortfolioHistoryWindow';
import { OrdersHistoryWindow } from './components/OrdersHistoryWindow';
import { TradingViewChartWindow } from './components/TradingViewChartWindow';

const INITIAL_WINDOWS_REGISTRY = [
  { id: 'win-ctrl-api', title: '1. Tryb i Klucze API', icon: '🔑', mode: 'docked-top', prevActiveMode: 'grid', posX: 40, posY: 90, isTopCtrl: true },
  { id: 'win-ctrl-trade', title: '2. Sterowanie Handlem', icon: '▶️', mode: 'docked-top', prevActiveMode: 'grid', posX: 80, posY: 110, isTopCtrl: true },
  { id: 'win-ctrl-ai', title: '3. Status Agenta AI', icon: '🤖', mode: 'docked-top', prevActiveMode: 'grid', posX: 120, posY: 130, isTopCtrl: true },
  { id: 'win-ai-chat', title: 'Agent AI Handlu', icon: '💬', mode: 'docked-top', prevActiveMode: 'grid', posX: 70, posY: 100 },
  { id: 'win-ai-strategies', title: 'AI Strategies (OKX AI)', icon: '🧠', mode: 'docked-top', prevActiveMode: 'floating-medium', posX: 95, posY: 70 },
  { id: 'win-quick-trade', title: 'Kreator Zlecenia', icon: '⚡', mode: 'docked-top', prevActiveMode: 'grid', posX: 130, posY: 120 },
  { id: 'win-portfolio', title: 'Portfel Handlowy', icon: '💼', mode: 'docked-top', prevActiveMode: 'grid', posX: 160, posY: 140 },
  { id: 'win-bought-sold', title: 'Kupiono / Sprzedano', icon: '📊', mode: 'docked-top', prevActiveMode: 'grid', posX: 190, posY: 160 },
  { id: 'win-portfolio-history', title: 'Historia Portfela', icon: '📈', mode: 'docked-top', prevActiveMode: 'grid', posX: 210, posY: 145 },
  { id: 'win-orders-history', title: 'Historia Transakcji', icon: '📜', mode: 'docked-top', prevActiveMode: 'grid', posX: 140, posY: 130 },
  { id: 'win-chart', title: 'Wykres Aktywa', icon: '🕯️', mode: 'docked-top', prevActiveMode: 'floating-medium', posX: 110, posY: 130, isChart: true }
];

export function App() {
  const [appState, setAppState] = useState(null);
  const [windowsRegistry, setWindowsRegistry] = useState(INITIAL_WINDOWS_REGISTRY);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [topMenuSize, setTopMenuSize] = useState('medium');
  const [topMenuPos, setTopMenuPos] = useState(null);
  const [topMenuZIndex, setTopMenuZIndex] = useState(1280);

  // Accordions & API Form state
  const [apiAccordionOpen, setApiAccordionOpen] = useState(false);
  const [tradeAccordionOpen, setTradeAccordionOpen] = useState(false);
  const [apiKeyProfile, setApiKeyProfile] = useState('demo');
  const [inputApiKey, setInputApiKey] = useState('');
  const [inputSecretKey, setInputSecretKey] = useState('');
  const [inputPassphrase, setInputPassphrase] = useState('');

  // AI Agent & Strategies state
  const [aiChatInput, setAiChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [aiStrategyInput, setAiStrategyInput] = useState('');
  const [currentAiStrategyAnalysis, setCurrentAiStrategyAnalysis] = useState(null);
  const [lastExchangeFeedback, setLastExchangeFeedback] = useState(null);
  const [executedSessionTransactions, setExecutedSessionTransactions] = useState([]);
  const [collapsedAiTxIds, setCollapsedAiTxIds] = useState(() => new Set());
  const [collapsedBubbleIds, setCollapsedBubbleIds] = useState(() => new Set());
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState(() => new Set());
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);

  // Manual Trade Form state
  const [orderSide, setOrderSide] = useState('BUY');
  const [tradePair, setTradePair] = useState('BTC-USDC');
  const [tradeOrderType, setTradeOrderType] = useState('MARKET');
  const [tradePrice, setTradePrice] = useState(76682.30);
  const [tradeAmount, setTradeAmount] = useState('0.02');
  const [tradeUsdc, setTradeUsdc] = useState('1533.65');
  const [tradeStrategy, setTradeStrategy] = useState('Zlecenie autoryzowane Spot EEA');

  // Orders Filter
  const [orderFilter, setOrderFilter] = useState('ALL');

  // Chart Window state
  const [chartState, setChartState] = useState({
    isOpen: false,
    isMinimized: false,
    dockLocation: 'top',
    size: 'medium',
    engine: 'pro',
    instId: 'BTC-USDC',
    bar: '15m',
    chartType: 'candles',
    indicators: {
      ema: true,
      bb: false,
      vwap: false,
      sr: true,
      vol: true,
      rsi: false,
      macd: false
    },
    activeTool: 'crosshair',
    drawingsByPair: {},
    pendingDrawing: null,
    visibleCount: 68,
    panOffset: 0,
    hoverX: null,
    hoverY: null,
    data: null,
    posX: 90,
    posY: 85,
    zIndex: 1300
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const zIndexCounterRef = useRef(1350);
  const wasJustDraggingRef = useRef(false);
  const chartStateRef = useRef(chartState);
  chartStateRef.current = chartState;
  const windowsRegistryRef = useRef(windowsRegistry);
  windowsRegistryRef.current = windowsRegistry;
  const topMenuOpenRef = useRef(topMenuOpen);
  topMenuOpenRef.current = topMenuOpen;
  const topMenuSizeRef = useRef(topMenuSize);
  topMenuSizeRef.current = topMenuSize;
  const lastSessionSyncTsRef = useRef(0);

  // Synchronize AI Chat, AI Strategies, and Executed Session Transactions across Desktop & Mobile Phone
  useEffect(() => {
    const sync = appState?.sessionSync;
    if (!sync || !sync.updatedAt) return;
    if (sync.updatedAt <= lastSessionSyncTsRef.current) return;
    lastSessionSyncTsRef.current = sync.updatedAt;

    if (Array.isArray(sync.chatMessages) && sync.chatMessages.length > 0) {
      setChatMessages((prev) => {
        if (sync.chatMessages.length >= prev.length) {
          return sync.chatMessages;
        }
        return prev;
      });
    }
    if (sync.currentAiStrategyAnalysis) {
      setCurrentAiStrategyAnalysis(sync.currentAiStrategyAnalysis);
    }
    if (Array.isArray(sync.executedSessionTransactions) && sync.executedSessionTransactions.length > 0) {
      setExecutedSessionTransactions(sync.executedSessionTransactions);
    }
    if (sync.lastExchangeFeedback) {
      setLastExchangeFeedback(sync.lastExchangeFeedback);
    }
  }, [appState?.sessionSync]);

  const nextZIndex = useCallback((bonus = 0) => {
    zIndexCounterRef.current += 1;
    return zIndexCounterRef.current + bonus;
  }, []);

  const showToast = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const appendChatMessage = useCallback((role, text, options = {}) => {
    const id = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    setChatMessages((prev) => [
      ...prev,
      {
        id,
        role,
        text,
        orderId: options.orderId || null,
        isPendingTx: Boolean(options.isPendingTx),
        isExecutedTx: Boolean(options.isExecutedTx)
      }
    ]);
  }, []);

  const fetchChartCandles = useCallback(async (instId, bar) => {
    const targetPair = instId || chartStateRef.current.instId || 'BTC-USDC';
    const targetBar = bar || chartStateRef.current.bar || '15m';
    const data = await apiRequest(
      `/api/candles?instId=${encodeURIComponent(targetPair)}&bar=${encodeURIComponent(
        targetBar
      )}&limit=180`
    );
    setChartState((prev) => ({
      ...prev,
      data
    }));
  }, []);

  const openAssetChart = useCallback(
    async (instId = 'BTC-USDC', size = null) => {
      const targetSize = size || chartStateRef.current.size || 'medium';
      const z = nextZIndex(20);
      setChartState((prev) => {
        const pairChanged = prev.instId !== instId;
        const maxX = Math.max(10, window.innerWidth - 360);
        const maxY = Math.max(10, window.innerHeight - 240);
        return {
          ...prev,
          instId,
          size: targetSize,
          isOpen: true,
          isMinimized: false,
          panOffset: pairChanged ? 0 : prev.panOffset,
          pendingDrawing: pairChanged ? null : prev.pendingDrawing,
          posX: targetSize !== 'full' ? Math.min(Math.max(8, prev.posX), maxX) : prev.posX,
          posY: targetSize !== 'full' ? Math.min(Math.max(8, prev.posY), maxY) : prev.posY,
          zIndex: z
        };
      });

      const winMode =
        targetSize === 'full'
          ? 'fullscreen'
          : targetSize === 'small'
          ? 'floating-small'
          : 'floating-medium';
      setWindowsRegistry((prev) =>
        prev.map((w) =>
          w.id === 'win-chart' ? { ...w, mode: winMode, prevActiveMode: winMode } : w
        )
      );

      await fetchChartCandles(instId, chartStateRef.current.bar);
    },
    [fetchChartCandles, nextZIndex]
  );

  const setWindowMode = useCallback(
    (winId, requestedMode, customCoords = null) => {
      if (winId === 'win-chart') {
        if (requestedMode === 'docked-top' || requestedMode === 'docked-sidebar') {
          setChartState((prev) => ({ ...prev, isOpen: false, isMinimized: false }));
          setWindowsRegistry((prev) =>
            prev.map((w) => (w.id === 'win-chart' ? { ...w, mode: requestedMode } : w))
          );
          return;
        }
        const sz =
          requestedMode === 'fullscreen'
            ? 'full'
            : requestedMode === 'floating-small'
            ? 'small'
            : 'medium';
        openAssetChart(chartStateRef.current.instId, sz);
        return;
      }

      const z = nextZIndex(requestedMode === 'fullscreen' ? 500 : 0);
      setWindowsRegistry((prev) =>
        prev.map((w) => {
          if (w.id !== winId) return w;
          let newMode = requestedMode;
          if (
            requestedMode === 'minimized-inline' &&
            w.mode === 'minimized-inline'
          ) {
            newMode = 'grid';
          }
          const updated = { ...w, mode: newMode };
          if (newMode !== 'docked-top' && newMode !== 'docked-sidebar') {
            updated.prevActiveMode = newMode;
          }
          if (newMode === 'floating-small' || newMode === 'floating-medium') {
            const targetW = newMode === 'floating-small' ? 450 : 720;
            const targetH = newMode === 'floating-small' ? 360 : 500;
            if (customCoords) {
              updated.posX = customCoords.x;
              updated.posY = customCoords.y;
              updated.hasCustomPos = true;
            } else if (!w.hasCustomPos) {
              updated.posX = Math.max(16, Math.round((window.innerWidth - targetW) / 2));
              updated.posY = Math.max(55, Math.round((window.innerHeight - targetH) / 2));
              updated.hasCustomPos = true;
            } else {
              const maxX = Math.max(12, window.innerWidth - 120);
              const maxY = Math.max(40, window.innerHeight - 80);
              updated.posX = Math.min(Math.max(12, w.posX), maxX);
              updated.posY = Math.min(Math.max(40, w.posY), maxY);
            }
            updated.zIndex = z;
          } else if (newMode === 'fullscreen') {
            updated.zIndex = z;
          }
          return updated;
        })
      );

      if (requestedMode === 'grid') {
        setTimeout(() => {
          const domEl = document.getElementById(winId);
          if (domEl) {
            const headerEl = document.getElementById('appHeader');
            const headerH = headerEl ? headerEl.offsetHeight : 38;
            const rect = domEl.getBoundingClientRect();
            const targetTop = Math.max(0, window.scrollY + rect.top - headerH - 10);
            window.scrollTo({ top: targetTop, behavior: 'smooth' });
          }
        }, 40);
      }
    },
    [nextZIndex, openAssetChart]
  );

  const handleCloseWindow = useCallback(
    (winId) => {
      const winMeta = windowsRegistryRef.current.find((w) => w.id === winId);
      setWindowMode(winId, 'docked-top');
      if (winMeta) {
        showToast(
          `🔼 Zamknięto „${winMeta.title}” — okno trafiło do Menu (kliknij je na górze, aby przywrócić).`
        );
      }
    },
    [setWindowMode, showToast]
  );

  const handleBringToFront = useCallback(
    (winId) => {
      const z = nextZIndex();
      setWindowsRegistry((prev) =>
        prev.map((w) => (w.id === winId ? { ...w, zIndex: z } : w))
      );
    },
    [nextZIndex]
  );

  // Sync body classes for single-window-grid layout
  const allGridWindows = windowsRegistry.filter(
    (w) => !w.isChart && (w.mode === 'grid' || w.mode === 'minimized-inline')
  );
  const isSingleGridWindow = allGridWindows.length === 1;
  const soloWindow = isSingleGridWindow ? allGridWindows[0] : null;
  const isSoloMinimized =
    isSingleGridWindow && soloWindow && soloWindow.mode === 'minimized-inline';

  useEffect(() => {
    if (document.body) {
      document.body.classList.toggle(
        'has-single-window-grid',
        isSingleGridWindow && !isSoloMinimized
      );
      document.body.classList.toggle('single-window-minimized', isSoloMinimized);
    }
  }, [isSingleGridWindow, isSoloMinimized]);

  // Sync manual trade form price when MARKET mode and appState updates
  useEffect(() => {
    if (!appState) return;
    const markets = appState.markets || appState.tickers || DEFAULT_STANDALONE_MARKETS;
    const m = markets.find((x) => x.instId === tradePair) || markets[0];
    if (m && tradeOrderType === 'MARKET') {
      setTradePrice(m.price);
    }
  }, [appState, tradePair, tradeOrderType]);

  // Unified Drag & Drop for all windows, chart, and top menu
  useEffect(() => {
    let dragState = null;

    const handlePointerDown = (clientX, clientY, target, rawEvent) => {
      const titlebar = target.closest('[data-drag-window]');
      if (titlebar) {
        if (
          target.closest('button') ||
          target.closest('select') ||
          target.closest('input') ||
          target.closest('textarea')
        ) {
          return;
        }
        const winId = titlebar.getAttribute('data-drag-window');
        const winMeta = windowsRegistryRef.current.find((w) => w.id === winId);
        const domEl = document.getElementById(winId);
        if (!winMeta || !domEl) return;

        const isAlreadyFloating =
          winMeta.mode === 'floating-small' || winMeta.mode === 'floating-medium';
        const rect = domEl.getBoundingClientRect();

        dragState = {
          type: 'app-window',
          winId,
          winMeta,
          domEl,
          detached: isAlreadyFloating,
          startX: clientX,
          startY: clientY,
          offsetX: isAlreadyFloating
            ? clientX - rect.left
            : Math.min(Math.max(40, clientX - rect.left), 260),
          offsetY: isAlreadyFloating
            ? clientY - rect.top
            : Math.min(Math.max(12, clientY - rect.top), 28)
        };

        if (isAlreadyFloating) {
          domEl.classList.add('is-dragging');
        }
        return;
      }

      if (
        target.closest('button') ||
        target.closest('select') ||
        target.closest('input') ||
        target.closest('a')
      ) {
        return;
      }

      const chartHeader = target.closest('#chartWindowHeader');
      const chartDom = document.getElementById('floatingChartWindow');
      if (chartHeader && chartDom && !chartDom.hidden) {
        if (rawEvent && rawEvent.cancelable) rawEvent.preventDefault();
        chartDom.classList.add('is-dragging');
        const rect = chartDom.getBoundingClientRect();
        dragState = {
          type: 'chart-window',
          domEl: chartDom,
          offsetX: clientX - rect.left,
          offsetY: clientY - rect.top
        };
        if (chartStateRef.current.size === 'full') {
          setChartState((prev) => ({ ...prev, size: 'medium' }));
        }
        return;
      }

      const topMenuHeader = target.closest('#topMenuDragHeader');
      const topMenuDom = document.getElementById('topWindowMenuBar');
      if (topMenuHeader && topMenuDom && topMenuOpenRef.current) {
        if (rawEvent && rawEvent.cancelable) rawEvent.preventDefault();
        if (topMenuSizeRef.current === 'full') {
          setTopMenuSize('medium');
        }
        topMenuDom.classList.add('is-dragging');
        const rect = topMenuDom.getBoundingClientRect();
        dragState = {
          type: 'top-menu-window',
          domEl: topMenuDom,
          offsetX: clientX - rect.left,
          offsetY: clientY - rect.top
        };
      }
    };

    const handlePointerMove = (clientX, clientY, rawEvent) => {
      if (!dragState) return;
      if (rawEvent && rawEvent.cancelable) rawEvent.preventDefault();

      if (dragState.type === 'app-window') {
        const dist = Math.hypot(clientX - dragState.startX, clientY - dragState.startY);
        if (!dragState.detached) {
          if (dist < 4) return;
          dragState.detached = true;
          wasJustDraggingRef.current = true;
          const targetFloatingMode = dragState.winMeta.isTopCtrl
            ? 'floating-small'
            : 'floating-medium';
          setWindowMode(dragState.winId, targetFloatingMode, {
            x: Math.max(8, clientX - dragState.offsetX),
            y: Math.max(8, clientY - dragState.offsetY)
          });
        } else if (dist >= 4) {
          wasJustDraggingRef.current = true;
        }

        const maxX = Math.max(10, window.innerWidth - 100);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.min(Math.max(4, clientX - dragState.offsetX), maxX);
        const newY = Math.min(Math.max(4, clientY - dragState.offsetY), maxY);

        setWindowsRegistry((prev) =>
          prev.map((w) =>
            w.id === dragState.winId
              ? { ...w, posX: newX, posY: newY, hasCustomPos: true }
              : w
          )
        );
        return;
      }

      if (dragState.type === 'chart-window') {
        const maxX = Math.max(10, window.innerWidth - 100);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.min(Math.max(4, clientX - dragState.offsetX), maxX);
        const newY = Math.min(Math.max(4, clientY - dragState.offsetY), maxY);
        setChartState((prev) => ({ ...prev, posX: newX, posY: newY }));
        return;
      }

      if (dragState.type === 'top-menu-window') {
        const maxX = Math.max(10, window.innerWidth - 120);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.min(Math.max(4, clientX - dragState.offsetX), maxX);
        const newY = Math.min(Math.max(4, clientY - dragState.offsetY), maxY);
        setTopMenuPos({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      if (!dragState) return;
      if (dragState.domEl) {
        dragState.domEl.classList.remove('is-dragging');
      }
      dragState = null;
      if (wasJustDraggingRef.current) {
        setTimeout(() => {
          wasJustDraggingRef.current = false;
        }, 150);
      }
    };

    const onMouseDown = (e) => handlePointerDown(e.clientX, e.clientY, e.target, e);
    const onMouseMove = (e) => {
      if (dragState) handlePointerMove(e.clientX, e.clientY, e);
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target, e);
      }
    };
    const onTouchMove = (e) => {
      if (dragState && e.touches.length === 1) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [setWindowMode]);

  // Initial load & live OKX polling every 2.5s
  useEffect(() => {
    let mounted = true;

    async function initLoad() {
      let initialState = await apiRequest('/api/state');
      const savedLocal = getKeysFromLocalStorage();
      if (
        savedLocal.demo &&
        savedLocal.demo.apiKey &&
        !initialState?.config?.hasDemoKey
      ) {
        const syncRes = await apiRequest('/api/config', 'POST', {
          apiMode: initialState.config.apiMode,
          apiKeyConfig: {
            mode: 'demo',
            ...savedLocal.demo
          }
        });
        if (syncRes.state) initialState = syncRes.state;
      }

      if (!mounted) return;
      setAppState(initialState);
      if (
        initialState?.config?.apiConnection &&
        !initialState.config.apiConnection.connected
      ) {
        setApiAccordionOpen(true);
      }
    }

    initLoad();

    const intervalId = setInterval(async () => {
      try {
        const liveState = await apiRequest('/api/state');
        if (!mounted) return;
        setAppState(liveState);
        if (
          chartStateRef.current.isOpen &&
          !chartStateRef.current.isMinimized &&
          chartStateRef.current.engine === 'pro'
        ) {
          fetchChartCandles();
        }
      } catch (e) {}
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchChartCandles]);

  // Action handlers
  const handleSwitchApiMode = async (mode) => {
    setApiKeyProfile(mode);
    const res = await apiRequest('/api/config', 'POST', { apiMode: mode });
    if (res.state) setAppState(res.state);
    if (mode === 'demo') {
      showToast('Przełączono na Portfel Handlowy DEMO (Notowania OKX na żywo)');
    } else {
      const liveConn = res.state?.config?.apiConnection;
      if (liveConn && !liveConn.connected) {
        showToast(`⚠️ Tryb LIVE: Klucze API niepodłączone — ${liveConn.reason}`);
      } else {
        showToast('Przełączono na Portfel Handlowy LIVE');
      }
    }
  };

  const handleSubmitApiKeys = async (e) => {
    e.preventDefault();
    const mode = apiKeyProfile;
    const apiKey = inputApiKey.trim();
    const secretKey = inputSecretKey.trim();
    const passphrase = inputPassphrase.trim();

    if (apiKey && secretKey && passphrase) {
      saveKeysToLocalStorage(mode, apiKey, secretKey, passphrase);
    }

    showToast(`⏳ Łączenie z OKX API (${mode.toUpperCase()}) i pobieranie portfela...`);
    const res = await apiRequest('/api/config', 'POST', {
      apiMode: mode,
      apiKeyConfig: { mode, apiKey, secretKey, passphrase }
    });
    if (res.state) setAppState(res.state);
    const conn = res.state?.config?.apiConnections?.[mode];
    if (conn?.connected) {
      showToast(
        `✅ Połączono z OKX (${mode.toUpperCase()})! Pobrano prawdziwe dane Twojego portfela.`
      );
    } else {
      showToast(
        `🔴 Błąd połączenia z OKX (${mode.toUpperCase()}): ${conn?.reason || 'Błąd'}`
      );
    }
  };

  const handleManualSyncOkx = async () => {
    const mode = appState?.config?.apiMode || 'demo';
    showToast(`🔄 Pobieranie salda i zleceń z konta OKX (${mode.toUpperCase()})...`);
    const res = await apiRequest('/api/portfolio/sync', 'POST', { mode });
    if (res.state) setAppState(res.state);
    if (res.ok) {
      showToast(`✅ Portfel ${mode.toUpperCase()} zsynchronizowany z Twoim kontem OKX!`);
    } else {
      setApiAccordionOpen(true);
      showToast(
        `⚠️ ${
          res.error ||
          'Wklej klucze API z konta Demo OKX w Oknie 1, aby pobrać swój portfel.'
        }`
      );
    }
  };

  const handleDisconnectApiKeys = async () => {
    const mode = apiKeyProfile;
    const res = await apiRequest('/api/config', 'POST', {
      apiMode: mode,
      apiKeyConfig: { mode, action: 'disconnect' }
    });
    if (res.state) setAppState(res.state);
    showToast(`🔌 Rozłączono klucze API (${mode.toUpperCase()}).`);
  };

  const handleClearApiKeys = async () => {
    const mode = apiKeyProfile;
    setInputApiKey('');
    setInputSecretKey('');
    setInputPassphrase('');
    clearKeysFromLocalStorage(mode);
    const res = await apiRequest('/api/config', 'POST', {
      apiMode: mode,
      apiKeyConfig: { mode, action: 'clear' }
    });
    if (res.state) setAppState(res.state);
    showToast(
      `🗑️ Wyczyszczono klucze API (${mode.toUpperCase()}) — status: Niepodłączone.`
    );
  };

  const handleSwitchAiStatus = async (status) => {
    const res = await apiRequest('/api/config', 'POST', { aiStatus: status });
    if (res.state) setAppState(res.state);
    showToast(
      status === 'active'
        ? 'Agent AI jest teraz AKTYWNY!'
        : 'Agent AI został DEZAKTYWOWANY.'
    );
  };

  const handleOpenAuthPopup = () => {
    setWindowMode('win-ai-chat', 'grid');
    setTimeout(() => {
      const container = document.getElementById('aiInlineOrderContainer');
      if (container) container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleStopTrading = async () => {
    setLastExchangeFeedback(null);
    const res = await apiRequest('/api/trade/stop', 'POST');
    if (res.ok) {
      if (res.state) setAppState(res.state);
      showToast(`⏹ ${res.message || 'Zatrzymano zlecenie.'}`);
    }
  };

  const handleConfirmOrder = async () => {
    if (!appState || !appState.activeTradeOrder || isConfirmingOrder) return;
    setIsConfirmingOrder(true);
    try {
      const pendingOrder = appState.activeTradeOrder;
      const res = await apiRequest('/api/trade/authorize', 'POST', {
        orderId: pendingOrder.id
      });
      if (!res.ok) {
        showToast(`⚠️ Błąd: ${res.error}`);
        return;
      }
      const execOrd = res.executedOrder || pendingOrder;
      const fb =
        res.exchangeFeedback ||
        buildExchangeFeedbackForItem(execOrd, appState.config?.apiMode);
      setLastExchangeFeedback(fb);
      setExecutedSessionTransactions((prev) => {
        if (prev.some((t) => t.orderId === fb.orderId)) return prev;
        return [fb, ...prev];
      });
      if (res.state) setAppState(res.state);
      showToast(`✅ ${fb.exchangeMessage}`);
      appendChatMessage(
        'assistant',
        [
          `✅ **KOMUNIKAT ZWROTNY Z GIEŁDY OKX EUROPE (EXCHANGE FEEDBACK) — #${fb.orderId}:**`,
          `- **Założenie strategii i proces:** ${fb.strategyMessage}`,
          `- **Potwierdzenie z giełdy:** ${fb.exchangeMessage}`,
          `- **Szczegóły rozliczenia:** ID \`${fb.orderId}\` • Data: \`${fb.date} ${fb.time}\` • Ilość: **${formatQty(
            fb.amount
          )} ${fb.asset}** • Kurs: **${formatUnitPrice(
            fb.price
          )}** • Przeliczenie: **${formatUsdc(fb.usdcValue)}** • Fee (${
            fb.feeRate
          }): **${formatUsdc(fb.feeUsdc)}** (${fb.feeAsset} ${
            fb.asset
          }) • Razem z Fee: **${formatUsdc(fb.totalUsdcWithFee)}**`,
          `- 💾 *Rezultat został zapisany w historii transakcji i historii portfela — dostępny po naciśnięciu klawisza **Szczegóły transakcji (Exchange Feedback)**.*`
        ].join('\n'),
        { orderId: fb.orderId, isExecutedTx: true }
      );
      if (chartStateRef.current.isOpen && !chartStateRef.current.isMinimized) {
        fetchChartCandles();
      }
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  const handleSubmitAiChat = async (e) => {
    e.preventDefault();
    const promptText = aiChatInput.trim();
    if (!promptText) return;
    setLastExchangeFeedback(null);
    appendChatMessage('user', promptText);
    setAiChatInput('');

    const res = await apiRequest('/api/agent/chat', 'POST', { message: promptText });
    if (res.reply) {
      appendChatMessage('assistant', res.reply, {
        orderId: res.activeTradeOrder?.id,
        isPendingTx: true
      });
    }
    if (res.state) {
      setAppState(res.state);
    }
  };

  const runAiStrategyQuery = useCallback(
    async (queryText) => {
      const q = (queryText || '').trim() || 'Strategia kupna dla BTC';
      setLastExchangeFeedback(null);
      setAiStrategyInput(q);

      const res = await apiRequest('/api/agent/strategy', 'POST', { query: q });
      if (res.analysis) {
        setCurrentAiStrategyAnalysis(res.analysis);
      }
      if (res.reply) {
        appendChatMessage('user', `[AI Strategies] ${q}`);
        appendChatMessage('assistant', res.reply, {
          orderId: res.activeTradeOrder?.id,
          isPendingTx: true
        });
      }
      if (res.state) {
        setAppState(res.state);
      }
      setTimeout(() => {
        const box = document.getElementById('aiStrategyResultContainer');
        if (box) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
      showToast(
        `🧠 Wygenerowano analizę i strategię kupna Agenta AI z OKX dla: ${
          res.analysis?.instId || q
        }`
      );
    },
    [appendChatMessage, showToast]
  );

  const handleSubmitAiStrategy = (e) => {
    e.preventDefault();
    runAiStrategyQuery(aiStrategyInput || 'BTC');
  };

  const handleOpenAiStrategies = () => {
    const stratWinMeta = windowsRegistryRef.current.find(
      (w) => w.id === 'win-ai-strategies'
    );
    if (stratWinMeta) {
      if (
        stratWinMeta.mode === 'docked-top' ||
        stratWinMeta.mode === 'docked-sidebar' ||
        stratWinMeta.mode === 'minimized-inline'
      ) {
        setWindowMode('win-ai-strategies', 'floating-medium');
      } else {
        handleBringToFront('win-ai-strategies');
      }
    }
    setTimeout(() => {
      const inp = document.getElementById('aiStrategyInput');
      if (inp) inp.focus();
    }, 60);
    if (!currentAiStrategyAnalysis) {
      runAiStrategyQuery('Strategia kupna dla BTC za 1500 USDC');
    }
  };

  const handleToggleAiExecutedTx = (txKey) => {
    setCollapsedAiTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(txKey)) next.delete(txKey);
      else next.add(txKey);
      return next;
    });
  };

  const handleToggleAllAiExecutedTx = () => {
    const txList =
      executedSessionTransactions.length > 0
        ? executedSessionTransactions
        : lastExchangeFeedback
        ? [lastExchangeFeedback]
        : [];
    const allCollapsed = txList.every((fb) =>
      collapsedAiTxIds.has(String(fb.orderId || 'LATEST'))
    );
    if (allCollapsed) {
      setCollapsedAiTxIds(new Set());
      setCollapsedBubbleIds(new Set());
    } else {
      const nextTx = new Set(txList.map((fb) => String(fb.orderId || 'LATEST')));
      setCollapsedAiTxIds(nextTx);
      const nextBubbles = new Set(
        chatMessages.filter((m) => m.role === 'assistant').map((m) => m.id)
      );
      setCollapsedBubbleIds(nextBubbles);
    }
  };

  const handleToggleChatBubble = (msgId) => {
    setCollapsedBubbleIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleToggleFeedbackRow = (rowKey) => {
    setExpandedFeedbackIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  // Manual trade form handlers
  const getMarketPriceForPair = (pairStr) => {
    const markets = appState?.markets || appState?.tickers || DEFAULT_STANDALONE_MARKETS;
    const market = markets.find((m) => m.instId === pairStr) || markets[0];
    return market ? market.price : 76682.30;
  };

  const handleChangeTradePair = (newPair) => {
    setTradePair(newPair);
    const mPrice = getMarketPriceForPair(newPair);
    const effPrice = tradeOrderType === 'LIMIT' ? Number(tradePrice || mPrice) : mPrice;
    if (tradeOrderType === 'MARKET') setTradePrice(mPrice);
    const amt = Number(tradeAmount || 0);
    setTradeUsdc((amt * effPrice).toFixed(2));
  };

  const handleChangeTradeOrderType = (newType) => {
    setTradeOrderType(newType);
    const mPrice = getMarketPriceForPair(tradePair);
    const effPrice = newType === 'LIMIT' ? Number(tradePrice || mPrice) : mPrice;
    if (newType === 'MARKET') setTradePrice(mPrice);
    const amt = Number(tradeAmount || 0);
    setTradeUsdc((amt * effPrice).toFixed(2));
  };

  const handleChangeTradePrice = (newPriceVal) => {
    setTradePrice(newPriceVal);
    const px = Number(newPriceVal || 0);
    const amt = Number(tradeAmount || 0);
    if (px > 0) setTradeUsdc((amt * px).toFixed(2));
  };

  const handleChangeTradeAmount = (newAmtVal) => {
    setTradeAmount(newAmtVal);
    const mPrice = getMarketPriceForPair(tradePair);
    const px = tradeOrderType === 'LIMIT' ? Number(tradePrice || mPrice) : mPrice;
    const amt = Number(newAmtVal || 0);
    setTradeUsdc((amt * px).toFixed(2));
  };

  const handleChangeTradeUsdc = (newUsdcVal) => {
    setTradeUsdc(newUsdcVal);
    const mPrice = getMarketPriceForPair(tradePair);
    const px = tradeOrderType === 'LIMIT' ? Number(tradePrice || mPrice) : mPrice;
    const usdc = Number(newUsdcVal || 0);
    if (px > 0) setTradeAmount((usdc / px).toFixed(6));
  };

  const handleSubmitManualTrade = async (e) => {
    e.preventDefault();
    setLastExchangeFeedback(null);
    const res = await apiRequest('/api/trade/propose', 'POST', {
      instId: tradePair,
      side: orderSide,
      orderType: tradeOrderType,
      amount: Number(tradeAmount),
      usdcAmount: Number(tradeUsdc),
      limitPrice: Number(tradePrice),
      strategyName: tradeStrategy,
      source: 'Kreator Zlecenia OKX EEA'
    });
    if (res.ok) {
      if (res.state) setAppState(res.state);
      handleOpenAuthPopup();
    }
  };

  const handleActivateOpenOrder = async (orderId) => {
    const res = await apiRequest('/api/orders/activate', 'POST', { orderId });
    if (res.ok) {
      setLastExchangeFeedback(null);
      if (res.state) setAppState(res.state);
      handleOpenAuthPopup();
    }
  };

  const handleCancelOpenOrder = async (orderId) => {
    const res = await apiRequest('/api/orders/cancel', 'POST', { orderId });
    if (res.ok) {
      if (res.state) setAppState(res.state);
      showToast(res.message || 'Zlecenie anulowane.');
    }
  };

  // Top Menu & Global Window Management handlers
  const handleTopMenuPillClick = (winId) => {
    const winMeta = windowsRegistryRef.current.find((w) => w.id === winId);
    if (!winMeta) return;

    // Zamknij okno Menu
    setTopMenuOpen(false);

    if (winId === 'win-chart') {
      openAssetChart(chartStateRef.current.instId || 'BTC-USDC', 'full');
      setWindowsRegistry((prev) =>
        prev.map((w) => ({
          ...w,
          mode: w.id === 'win-chart' ? 'fullscreen' : 'docked-top'
        }))
      );
      showToast(`🗔 Otwarto okno „${winMeta.title}” (pozostałe okna zwinięte do Menu).`);
      return;
    }

    // Zamknij wykres, jeśli był otwarty
    setChartState((prev) => ({ ...prev, isOpen: false, isMinimized: false }));

    const z = nextZIndex();
    setWindowsRegistry((prev) =>
      prev.map((w) => {
        if (w.id === winId) {
          return {
            ...w,
            mode: 'grid',
            prevActiveMode: 'grid',
            zIndex: z
          };
        }
        return {
          ...w,
          mode: 'docked-top'
        };
      })
    );

    if (winId === 'win-ctrl-api') {
      setApiAccordionOpen(true);
    } else if (winId === 'win-ctrl-trade') {
      setTradeAccordionOpen(true);
    }

    showToast(`🗔 Otwarto okno „${winMeta.title}” (pozostałe okna zwinięte do Menu).`);

    setTimeout(() => {
      const domEl = document.getElementById(winId);
      if (domEl) {
        const headerEl = document.getElementById('appHeader');
        const headerH = headerEl ? headerEl.offsetHeight : 38;
        const rect = domEl.getBoundingClientRect();
        const targetTop = Math.max(0, window.scrollY + rect.top - headerH - 10);
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleToggleTopControls = () => {
    const topWins = windowsRegistryRef.current.filter((w) => w.isTopCtrl);
    const anyVisible = topWins.some(
      (w) => w.mode !== 'docked-top' && w.mode !== 'docked-sidebar'
    );
    if (anyVisible) {
      setWindowsRegistry((prev) =>
        prev.map((w) => (w.isTopCtrl ? { ...w, mode: 'docked-top' } : w))
      );
      showToast('Ukryto górne okna 1–3 (dostępne w Menu Górnym i Sidebarze).');
    } else {
      setWindowsRegistry((prev) =>
        prev.map((w) => (w.isTopCtrl ? { ...w, mode: 'grid' } : w))
      );
      showToast('Przywrócono górne okna sterowania 1–3.');
    }
  };

  const handleResetAllWindowsGrid = () => {
    setTopMenuOpen(false);
    setWindowsRegistry((prev) =>
      prev.map((w) => (w.isChart ? w : { ...w, mode: 'grid' }))
    );
    showToast('⊞ Przywrócono wszystkie okna do układu siatki.');
  };

  const handleDockAllTop = () => {
    setTopMenuOpen(false);
    setChartState((prev) => ({ ...prev, isOpen: false, isMinimized: false }));
    setWindowsRegistry((prev) => prev.map((w) => ({ ...w, mode: 'docked-top' })));
    showToast('🔼 Wszystkie okna zostały zwinięte do Menu Górnego.');
  };

  const handleDockAllSidebar = () => {
    setTopMenuOpen(false);
    setChartState((prev) => ({ ...prev, isOpen: false, isMinimized: false }));
    setWindowsRegistry((prev) => prev.map((w) => ({ ...w, mode: 'docked-sidebar' })));
    setLeftSidebarCollapsed(false);
    showToast('◀ Wszystkie okna zostały zwinięte do Sidebaru z lewej.');
  };

  // Chart callbacks
  const handleUpdateChartState = useCallback(
    (updates, shouldFetchCandles = false) => {
      setChartState((prev) => {
        const next = { ...prev, ...updates };
        if (shouldFetchCandles) {
          fetchChartCandles(next.instId, next.bar);
        }
        return next;
      });
    },
    [fetchChartCandles]
  );

  const handleApplyChartSize = (size) => {
    setChartState((prev) => ({ ...prev, size }));
    const mode =
      size === 'full'
        ? 'fullscreen'
        : size === 'small'
        ? 'floating-small'
        : 'floating-medium';
    setWindowsRegistry((prev) =>
      prev.map((w) => (w.id === 'win-chart' ? { ...w, mode } : w))
    );
  };

  const handleMinimizeChart = () => {
    setChartState((prev) => ({ ...prev, isMinimized: true }));
    setWindowsRegistry((prev) =>
      prev.map((w) => (w.id === 'win-chart' ? { ...w, mode: 'docked-top' } : w))
    );
  };

  const handleCloseChart = () => {
    setChartState((prev) => ({ ...prev, isOpen: false, isMinimized: false }));
    setWindowsRegistry((prev) =>
      prev.map((w) => (w.id === 'win-chart' ? { ...w, mode: 'docked-top' } : w))
    );
  };

  const handleQuickTradeFromChart = () => {
    const instId = chartStateRef.current.instId || 'BTC-USDC';
    handleChangeTradePair(instId);
    setWindowMode('win-quick-trade', 'grid');
    showToast(`Wybrano parę ${instId} w Kreatorze Zlecenia.`);
  };

  // Workspace row classes
  const agentOrderWinsInGrid = windowsRegistry.filter(
    (w) =>
      (w.id === 'win-ai-chat' ||
        w.id === 'win-ai-strategies' ||
        w.id === 'win-quick-trade') &&
      (w.mode === 'grid' || w.mode === 'minimized-inline')
  );
  const rowAgentOrderClass = [
    'workspace-row row-agent-and-order',
    agentOrderWinsInGrid.length === 0 ? 'grid-collapsed' : '',
    agentOrderWinsInGrid.length === 1 ? 'solo-child-row' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const mainWsClass = [
    'main-container',
    allGridWindows.length === 0 ? 'workspace-empty' : '',
    isSingleGridWindow ? 'single-window-grid' : '',
    isSoloMinimized ? 'single-window-minimized' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const markets = appState?.markets || appState?.tickers || DEFAULT_STANDALONE_MARKETS;
  const soloWindowId = soloWindow ? soloWindow.id : null;

  return (
    <>
      <HeaderBar
        cfg={appState?.config}
        markets={markets}
        windowsRegistry={windowsRegistry}
        topMenuOpen={topMenuOpen}
        topMenuSize={topMenuSize}
        topMenuPos={topMenuPos}
        topMenuZIndex={topMenuZIndex}
        onToggleLeftSidebar={() => setLeftSidebarCollapsed((c) => !c)}
        onOpenApiKeysWindow={() => {
          setWindowMode('win-ctrl-api', 'grid');
          setApiAccordionOpen(true);
        }}
        onSwitchAiStatus={handleSwitchAiStatus}
        onToggleTopWindowMenu={(e) => {
          e.stopPropagation();
          setTopMenuOpen((o) => {
            if (!o) setTopMenuZIndex(nextZIndex(30));
            return !o;
          });
        }}
        onSetTopMenuSize={(sz) => setTopMenuSize(sz)}
        onCloseTopWindowMenu={() => setTopMenuOpen(false)}
        onTopMenuPillClick={handleTopMenuPillClick}
        onToggleTopControls={handleToggleTopControls}
        onResetAllWindowsGrid={handleResetAllWindowsGrid}
        onDockAllTop={handleDockAllTop}
        onDockAllSidebar={handleDockAllSidebar}
        onOpenAssetChart={(instId) =>
          openAssetChart(instId, chartState.isOpen ? chartState.size : 'medium')
        }
      />

      <div className="app-shell" id="appShell">
        <LeftSidebar
          collapsed={leftSidebarCollapsed}
          cfg={appState?.config}
          windowsRegistry={windowsRegistry}
          onCloseMobile={() => setLeftSidebarCollapsed(true)}
          onSetWindowMode={setWindowMode}
          onCloseWindow={handleCloseWindow}
        />

        <main className={mainWsClass} id="mainWorkspace">
          <ControlWindows
            windowsRegistry={windowsRegistry}
            soloWindowId={soloWindowId}
            cfg={appState?.config}
            activeTradeOrder={appState?.activeTradeOrder}
            apiAccordionOpen={apiAccordionOpen}
            tradeAccordionOpen={tradeAccordionOpen}
            apiKeyProfile={apiKeyProfile}
            inputApiKey={inputApiKey}
            inputSecretKey={inputSecretKey}
            inputPassphrase={inputPassphrase}
            onSetApiAccordionOpen={setApiAccordionOpen}
            onSetTradeAccordionOpen={setTradeAccordionOpen}
            onSetApiKeyProfile={setApiKeyProfile}
            onSetInputApiKey={setInputApiKey}
            onSetInputSecretKey={setInputSecretKey}
            onSetInputPassphrase={setInputPassphrase}
            onSwitchApiMode={handleSwitchApiMode}
            onSubmitApiKeys={handleSubmitApiKeys}
            onManualSyncOkx={handleManualSyncOkx}
            onDisconnectApiKeys={handleDisconnectApiKeys}
            onClearApiKeys={handleClearApiKeys}
            onOpenAuthPopup={handleOpenAuthPopup}
            onStopTrading={handleStopTrading}
            onSetWindowMode={setWindowMode}
            onCloseWindow={handleCloseWindow}
            onBringToFront={handleBringToFront}
          />

          <section className={rowAgentOrderClass}>
            <AiChatWindow
              winMeta={windowsRegistry.find((w) => w.id === 'win-ai-chat')}
              isSoloGridWindow={soloWindowId === 'win-ai-chat'}
              activeTradeOrder={appState?.activeTradeOrder}
              apiMode={appState?.config?.apiMode}
              aiChatInput={aiChatInput}
              chatMessages={chatMessages}
              executedSessionTransactions={executedSessionTransactions}
              lastExchangeFeedback={lastExchangeFeedback}
              collapsedAiTxIds={collapsedAiTxIds}
              collapsedBubbleIds={collapsedBubbleIds}
              isConfirmingOrder={isConfirmingOrder}
              onSetAiChatInput={setAiChatInput}
              onSubmitAiChat={handleSubmitAiChat}
              onConfirmOrder={handleConfirmOrder}
              onOpenAiStrategies={handleOpenAiStrategies}
              onToggleAiExecutedTx={handleToggleAiExecutedTx}
              onToggleAllAiExecutedTx={handleToggleAllAiExecutedTx}
              onToggleChatBubble={handleToggleChatBubble}
              onSetWindowMode={setWindowMode}
              onCloseWindow={handleCloseWindow}
              onBringToFront={handleBringToFront}
            />

            <AiStrategiesWindow
              winMeta={windowsRegistry.find((w) => w.id === 'win-ai-strategies')}
              isSoloGridWindow={soloWindowId === 'win-ai-strategies'}
              aiStrategyInput={aiStrategyInput}
              currentAiStrategyAnalysis={currentAiStrategyAnalysis}
              activeTradeOrder={appState?.activeTradeOrder}
              lastExchangeFeedback={lastExchangeFeedback}
              collapsedAiTxIds={collapsedAiTxIds}
              isConfirmingOrder={isConfirmingOrder}
              onSetAiStrategyInput={setAiStrategyInput}
              onSubmitAiStrategy={handleSubmitAiStrategy}
              onRunAiStrategyQuery={runAiStrategyQuery}
              onConfirmOrder={handleConfirmOrder}
              onToggleAiExecutedTx={handleToggleAiExecutedTx}
              onOpenAssetChart={(instId) =>
                openAssetChart(instId, chartState.isOpen ? chartState.size : 'medium')
              }
              onSetWindowMode={setWindowMode}
              onCloseWindow={handleCloseWindow}
              onBringToFront={handleBringToFront}
            />

            <QuickTradeWindow
              winMeta={windowsRegistry.find((w) => w.id === 'win-quick-trade')}
              isSoloGridWindow={soloWindowId === 'win-quick-trade'}
              markets={markets}
              holdings={appState?.portfolio?.holdings}
              orderSide={orderSide}
              tradePair={tradePair}
              tradeOrderType={tradeOrderType}
              tradePrice={tradePrice}
              tradeAmount={tradeAmount}
              tradeUsdc={tradeUsdc}
              tradeStrategy={tradeStrategy}
              onSetOrderSide={setOrderSide}
              onChangeTradePair={handleChangeTradePair}
              onChangeTradeOrderType={handleChangeTradeOrderType}
              onChangeTradePrice={handleChangeTradePrice}
              onChangeTradeAmount={handleChangeTradeAmount}
              onChangeTradeUsdc={handleChangeTradeUsdc}
              onSetTradeStrategy={setTradeStrategy}
              onSubmitManualTrade={handleSubmitManualTrade}
              onOpenChartFromForm={() => openAssetChart(tradePair, 'medium')}
              onSetWindowMode={setWindowMode}
              onCloseWindow={handleCloseWindow}
              onBringToFront={handleBringToFront}
            />
          </section>

          <PortfoliosRow
            windowsRegistry={windowsRegistry}
            soloWindowId={soloWindowId}
            portfolio={appState?.portfolio}
            onManualSyncOkx={handleManualSyncOkx}
            onOpenAssetChart={(instId) =>
              openAssetChart(instId, chartState.isOpen ? chartState.size : 'medium')
            }
            onSetWindowMode={setWindowMode}
            onCloseWindow={handleCloseWindow}
            onBringToFront={handleBringToFront}
          />

          <PortfolioHistoryWindow
            winMeta={windowsRegistry.find((w) => w.id === 'win-portfolio-history')}
            isSoloGridWindow={soloWindowId === 'win-portfolio-history'}
            historyList={appState?.portfolio?.portfolioHistory}
            apiMode={appState?.config?.apiMode}
            expandedFeedbackIds={expandedFeedbackIds}
            onToggleFeedbackRow={handleToggleFeedbackRow}
            onSetWindowMode={setWindowMode}
            onCloseWindow={handleCloseWindow}
            onBringToFront={handleBringToFront}
          />

          <OrdersHistoryWindow
            winMeta={windowsRegistry.find((w) => w.id === 'win-orders-history')}
            isSoloGridWindow={soloWindowId === 'win-orders-history'}
            orders={appState?.portfolio?.orders}
            apiMode={appState?.config?.apiMode}
            orderFilter={orderFilter}
            expandedFeedbackIds={expandedFeedbackIds}
            onSetOrderFilter={setOrderFilter}
            onToggleFeedbackRow={handleToggleFeedbackRow}
            onOpenAssetChart={(instId) =>
              openAssetChart(instId, chartState.isOpen ? chartState.size : 'medium')
            }
            onActivateOpenOrder={handleActivateOpenOrder}
            onCancelOpenOrder={handleCancelOpenOrder}
            onSetWindowMode={setWindowMode}
            onCloseWindow={handleCloseWindow}
            onBringToFront={handleBringToFront}
          />
        </main>
      </div>

      <TradingViewChartWindow
        chartState={chartState}
        markets={markets}
        onUpdateChartState={handleUpdateChartState}
        onApplyChartSize={handleApplyChartSize}
        onDockChartTop={() => setWindowMode('win-chart', 'docked-top')}
        onDockChartSidebar={() => setWindowMode('win-chart', 'docked-sidebar')}
        onMinimizeChart={handleMinimizeChart}
        onCloseChart={handleCloseChart}
        onRestoreChart={(sz) => openAssetChart(chartState.instId, sz)}
        onQuickTradeFromChart={handleQuickTradeFromChart}
        onClearDrawingsToast={(instId) =>
          showToast(`🗑️ Wyczyszczono rysunki na wykresie ${instId}.`)
        }
      />

      <div id="toastContainer" className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>

      {/* MOBILE BOTTOM QUICK-NAVIGATION BAR FOR SMARTPHONES & RESPONSIVE SYNC */}
      <nav
        id="mobileQuickNav"
        className="mobile-bottom-nav"
        aria-label="Szybka nawigacja mobilna"
      >
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => setWindowMode('win-ai-chat', 'grid')}
        >
          <span className="mobile-nav-icon">💬</span>
          <span className="mobile-nav-label">Agent AI</span>
        </button>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={handleOpenAiStrategies}
        >
          <span className="mobile-nav-icon">🧠</span>
          <span className="mobile-nav-label">Strategie</span>
        </button>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => setWindowMode('win-quick-trade', 'grid')}
        >
          <span className="mobile-nav-icon">⚡</span>
          <span className="mobile-nav-label">Handel</span>
        </button>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => {
            setWindowMode('win-portfolio', 'grid');
            setWindowMode('win-bought-sold', 'grid');
          }}
        >
          <span className="mobile-nav-icon">💼</span>
          <span className="mobile-nav-label">Portfel</span>
        </button>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => {
            setWindowMode('win-portfolio-history', 'grid');
            setWindowMode('win-orders-history', 'grid');
          }}
        >
          <span className="mobile-nav-icon">📜</span>
          <span className="mobile-nav-label">Historia</span>
        </button>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => openAssetChart(chartState.instId || 'BTC-USDC', 'full')}
        >
          <span className="mobile-nav-icon">🕯️</span>
          <span className="mobile-nav-label">Wykres</span>
        </button>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => {
            setWindowMode('win-ctrl-api', 'grid');
            setApiAccordionOpen(true);
          }}
        >
          <span className="mobile-nav-icon">🔑</span>
          <span className="mobile-nav-label">IP / API</span>
        </button>
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={handleResetAllWindowsGrid}
        >
          <span className="mobile-nav-icon">⊞</span>
          <span className="mobile-nav-label">Wszystkie</span>
        </button>
      </nav>
    </>
  );
}
