(() => {
  let appState = null;
  let currentOrderSide = 'BUY';
  let currentOrderFilter = 'ALL';
  let topWindowZIndex = 1250;
  let wasJustDragging = false;

  // Chart Window State (Requirement 9 + TradingView Superchart + Window Manager)
  const chartState = {
    isOpen: false,
    isMinimized: false,
    dockLocation: 'top',
    size: 'medium', // 'small' | 'medium' | 'full'
    engine: 'pro', // 'pro' (Interactive TradingView Pro Canvas) | 'widget' (Official TradingView.com Widget)
    instId: 'BTC-USDC',
    bar: '15m',
    chartType: 'candles', // 'candles' | 'hollow' | 'heikin' | 'area' | 'line' | 'bars'
    indicators: {
      ema: true,
      bb: false,
      vwap: false,
      sr: true,
      vol: true,
      rsi: false,
      macd: false
    },
    activeTool: 'crosshair', // 'crosshair' | 'trendline' | 'hline' | 'fib' | 'measure'
    drawingsByPair: {}, // instId -> array of drawings
    pendingDrawing: null,
    visibleCount: 68, // zoom level (number of visible candles)
    panOffset: 0, // number of candles scrolled back in history
    hoverX: null,
    hoverY: null,
    hoveredCandleIdx: null,
    data: null,
    posX: 90,
    posY: 85
  };

  // Universal Window Manager Registry for all 10 Windows (including top windows 1, 2, 3)
  const WINDOWS_REGISTRY = [
    { id: 'win-ctrl-api', title: '1. Tryb i Klucze API', icon: '🔑', mode: 'docked-top', prevActiveMode: 'grid', posX: 40, posY: 90, isTopCtrl: true },
    { id: 'win-ctrl-trade', title: '2. Sterowanie Handlem', icon: '▶️', mode: 'docked-top', prevActiveMode: 'grid', posX: 80, posY: 110, isTopCtrl: true },
    { id: 'win-ctrl-ai', title: '3. Status Agenta AI', icon: '🤖', mode: 'docked-top', prevActiveMode: 'grid', posX: 120, posY: 130, isTopCtrl: true },
    { id: 'win-ai-chat', title: 'Agent AI Handlu', icon: '💬', mode: 'docked-top', prevActiveMode: 'grid', posX: 70, posY: 100 },
    { id: 'win-quick-trade', title: 'Kreator Zlecenia', icon: '⚡', mode: 'docked-top', prevActiveMode: 'grid', posX: 130, posY: 120 },
    { id: 'win-portfolio', title: 'Portfel Handlowy', icon: '💼', mode: 'docked-top', prevActiveMode: 'grid', posX: 160, posY: 140 },
    { id: 'win-bought-sold', title: 'Kupiono / Sprzedano', icon: '📊', mode: 'docked-top', prevActiveMode: 'grid', posX: 190, posY: 160 },
    { id: 'win-portfolio-history', title: 'Historia Portfela', icon: '📈', mode: 'docked-top', prevActiveMode: 'grid', posX: 210, posY: 145 },
    { id: 'win-orders-history', title: 'Historia Transakcji', icon: '📜', mode: 'docked-top', prevActiveMode: 'grid', posX: 140, posY: 130 },
    { id: 'win-chart', title: 'Wykres Aktywa', icon: '🕯️', mode: 'docked-top', prevActiveMode: 'floating-medium', posX: 110, posY: 130, isChart: true }
  ];

  // DOM Elements
  const el = {
    toggleLeftSidebarBtn: document.getElementById('toggleLeftSidebarBtn'),
    sidebarDockedBadge: document.getElementById('sidebarDockedBadge'),
    leftWindowSidebar: document.getElementById('leftWindowSidebar'),
    closeLeftSidebarMobileBtn: document.getElementById('closeLeftSidebarMobileBtn'),
    topControlsGrid: document.getElementById('topControlsGrid'),

    headerModeBadge: document.getElementById('headerModeBadge'),
    headerApiConnBadge: document.getElementById('headerApiConnBadge'),
    headerAiBadge: document.getElementById('headerAiBadge'),
    headerAiStatusDot: document.getElementById('headerAiStatusDot'),
    headerAiStatusText: document.getElementById('headerAiStatusText'),
    headerBtnAiDeactivated: document.getElementById('headerBtnAiDeactivated'),
    headerBtnAiActive: document.getElementById('headerBtnAiActive'),

    apiAccordionToggleBtn: document.getElementById('apiAccordionToggleBtn'),
    accordionApiBody: document.getElementById('accordionApiBody'),
    apiModeIndicator: document.getElementById('apiModeIndicator'),
    apiModeText: document.getElementById('apiModeText'),
    btnModeDemo: document.getElementById('btnModeDemo'),
    btnModeLive: document.getElementById('btnModeLive'),

    // API Connection Banner & Diagnostics Elements
    apiConnStatusBanner: document.getElementById('apiConnStatusBanner'),
    apiConnStateIcon: document.getElementById('apiConnStateIcon'),
    apiConnStatusLabel: document.getElementById('apiConnStatusLabel'),
    apiConnCheckedTime: document.getElementById('apiConnCheckedTime'),
    apiConnReasonText: document.getElementById('apiConnReasonText'),
    pillStatusDemoKey: document.getElementById('pillStatusDemoKey'),
    pillStatusLiveKey: document.getElementById('pillStatusLiveKey'),
    diagBoxDemo: document.getElementById('diagBoxDemo'),
    diagBadgeDemo: document.getElementById('diagBadgeDemo'),
    diagReasonDemo: document.getElementById('diagReasonDemo'),
    diagBoxLive: document.getElementById('diagBoxLive'),
    diagBadgeLive: document.getElementById('diagBadgeLive'),
    diagReasonLive: document.getElementById('diagReasonLive'),

    apiKeyForm: document.getElementById('apiKeyForm'),
    apiKeyProfileSelect: document.getElementById('apiKeyProfileSelect'),
    inputApiKey: document.getElementById('inputApiKey'),
    inputSecretKey: document.getElementById('inputSecretKey'),
    inputPassphrase: document.getElementById('inputPassphrase'),
    apiSavedStatus: document.getElementById('apiSavedStatus'),
    btnSyncOkxPortfolio: document.getElementById('btnSyncOkxPortfolio'),
    btnDisconnectApiKeys: document.getElementById('btnDisconnectApiKeys'),
    btnClearApiKeys: document.getElementById('btnClearApiKeys'),

    // Top Window Menu & Left Sidebar Elements
    toggleTopWindowMenuBtn: document.getElementById('toggleTopWindowMenuBtn'),
    topWindowMenuBar: document.getElementById('topWindowMenuBar'),
    closeTopWindowMenuBtn: document.getElementById('closeTopWindowMenuBtn'),
    topMenuDockedCount: document.getElementById('topMenuDockedCount'),
    topWindowPillsContainer: document.getElementById('topWindowPillsContainer'),
    btnToggleTopControls: document.getElementById('btnToggleTopControls'),
    btnResetAllWindowsGrid: document.getElementById('btnResetAllWindowsGrid'),
    btnDockAllTop: document.getElementById('btnDockAllTop'),
    btnDockAllSidebar: document.getElementById('btnDockAllSidebar'),

    sidebarApiStatusBadge: document.getElementById('sidebarApiStatusBadge'),
    sidebarApiReason: document.getElementById('sidebarApiReason'),
    sidebarDockedCountText: document.getElementById('sidebarDockedCountText'),
    sidebarDockedList: document.getElementById('sidebarDockedList'),
    sidebarAllWindowsList: document.getElementById('sidebarAllWindowsList'),

    tradeStatusDot: document.getElementById('tradeStatusDot'),
    topTradeStatusText: document.getElementById('topTradeStatusText'),
    mainStartTradingBtn: document.getElementById('mainStartTradingBtn'),
    mainStartBtnSubtext: document.getElementById('mainStartBtnSubtext'),
    mainStopTradingBtn: document.getElementById('mainStopTradingBtn'),
    openPopupFromAccordionBtn: document.getElementById('openPopupFromAccordionBtn'),

    aiStatusDot: document.getElementById('aiStatusDot'),
    aiStatusText: document.getElementById('aiStatusText'),
    btnAiDeactivated: document.getElementById('btnAiDeactivated'),
    btnAiActive: document.getElementById('btnAiActive'),
    aiDeactivatedBanner: document.getElementById('aiDeactivatedBanner'),
    quickActivateAiBtn: document.getElementById('quickActivateAiBtn'),

    marketTickerStrip: document.getElementById('marketTickerStrip'),
    chatMessages: document.getElementById('chatMessages'),
    aiChatForm: document.getElementById('aiChatForm'),
    aiChatInput: document.getElementById('aiChatInput'),

    manualTradeForm: document.getElementById('manualTradeForm'),
    tabSideBuy: document.getElementById('tabSideBuy'),
    tabSideSell: document.getElementById('tabSideSell'),
    tradePairSelect: document.getElementById('tradePairSelect'),
    tradeOrderType: document.getElementById('tradeOrderType'),
    tradePriceInput: document.getElementById('tradePriceInput'),
    tradeAmountInput: document.getElementById('tradeAmountInput'),
    tradeUsdcInput: document.getElementById('tradeUsdcInput'),
    tradeAssetUnit: document.getElementById('tradeAssetUnit'),
    tradeStrategyInput: document.getElementById('tradeStrategyInput'),
    formAvailUsdc: document.getElementById('formAvailUsdc'),
    formAvailAssetName: document.getElementById('formAvailAssetName'),
    formAvailAssetAmt: document.getElementById('formAvailAssetAmt'),
    openChartFromFormBtn: document.getElementById('openChartFromFormBtn'),

    portfolioModeTitle: document.getElementById('portfolioModeTitle'),
    portfolioSourceSubtitle: document.getElementById('portfolioSourceSubtitle'),
    btnSyncPortfolioPanel: document.getElementById('btnSyncPortfolioPanel'),
    portfolioTotalUsdc: document.getElementById('portfolioTotalUsdc'),
    portfolioCashUsdc: document.getElementById('portfolioCashUsdc'),
    portfolioCryptoUsdc: document.getElementById('portfolioCryptoUsdc'),
    portfolioHoldingsTbody: document.getElementById('portfolioHoldingsTbody'),

    totalBoughtUsdcVal: document.getElementById('totalBoughtUsdcVal'),
    totalSoldUsdcVal: document.getElementById('totalSoldUsdcVal'),
    boughtSoldLedgerTbody: document.getElementById('boughtSoldLedgerTbody'),

    portfolioEquityCanvas: document.getElementById('portfolioEquityCanvas'),
    portfolioHistoryTbody: document.getElementById('portfolioHistoryTbody'),

    countAllOrders: document.getElementById('countAllOrders'),
    countOpenOrders: document.getElementById('countOpenOrders'),
    countClosedOrders: document.getElementById('countClosedOrders'),
    ordersHistoryTbody: document.getElementById('ordersHistoryTbody'),

    // Auth Pop-up (Requirement 4)
    tradeAuthModalOverlay: document.getElementById('tradeAuthModalOverlay'),
    authPopupDialog: document.getElementById('authPopupDialog'),
    authPopupDragHeader: document.getElementById('authPopupDragHeader'),
    btnPopupToggleFullscreen: document.getElementById('btnPopupToggleFullscreen'),
    closeAuthPopupBtn: document.getElementById('closeAuthPopupBtn'),
    popupModeBadge: document.getElementById('popupModeBadge'),
    popupStatusBanner: document.getElementById('popupStatusBanner'),
    popupStatusIcon: document.getElementById('popupStatusIcon'),
    popupStatusMainText: document.getElementById('popupStatusMainText'),
    popupOrderId: document.getElementById('popupOrderId'),
    popupOrderStrategy: document.getElementById('popupOrderStrategy'),
    popupOrderPair: document.getElementById('popupOrderPair'),
    popupOrderSide: document.getElementById('popupOrderSide'),
    popupOrderAmount: document.getElementById('popupOrderAmount'),
    popupOrderPrice: document.getElementById('popupOrderPrice'),
    popupOrderUsdc: document.getElementById('popupOrderUsdc'),
    popupInstructionText: document.getElementById('popupInstructionText'),
    popupConfirmStartBtn: document.getElementById('popupConfirmStartBtn'),
    popupStopCancelBtn: document.getElementById('popupStopCancelBtn'),

    // Chart Window (Requirement 9 + TradingView Pro)
    floatingChartWindow: document.getElementById('floatingChartWindow'),
    chartWindowHeader: document.getElementById('chartWindowHeader'),
    chartPairTitle: document.getElementById('chartPairTitle'),
    chartLivePriceBadge: document.getElementById('chartLivePriceBadge'),
    chartChangeBadge: document.getElementById('chartChangeBadge'),
    chartAssetSelect: document.getElementById('chartAssetSelect'),
    tvChartTypeSelect: document.getElementById('tvChartTypeSelect'),
    tvZoomInBtn: document.getElementById('tvZoomInBtn'),
    tvZoomOutBtn: document.getElementById('tvZoomOutBtn'),
    tvResetViewBtn: document.getElementById('tvResetViewBtn'),
    tvClearDrawingsBtn: document.getElementById('tvClearDrawingsBtn'),
    tvChartStage: document.getElementById('tvChartStage'),
    tvOhlcLegend: document.getElementById('tvOhlcLegend'),
    tvLegendMainRow: document.getElementById('tvLegendMainRow'),
    tvLegendIndicatorsRow: document.getElementById('tvLegendIndicatorsRow'),
    tvOfficialWidgetContainer: document.getElementById('tvOfficialWidgetContainer'),
    chartHigh24h: document.getElementById('chartHigh24h'),
    chartLow24h: document.getElementById('chartLow24h'),
    chartVol24h: document.getElementById('chartVol24h'),
    assetChartCanvas: document.getElementById('assetChartCanvas'),
    dockChartTopBtn: document.getElementById('dockChartTopBtn'),
    dockChartSidebarBtn: document.getElementById('dockChartSidebarBtn'),
    minimizeChartBtn: document.getElementById('minimizeChartBtn'),
    closeChartBtn: document.getElementById('closeChartBtn'),
    quickTradeFromChartBtn: document.getElementById('quickTradeFromChartBtn'),

    minimizedChartBar: document.getElementById('minimizedChartBar'),
    minBarPair: document.getElementById('minBarPair'),
    minBarPrice: document.getElementById('minBarPrice'),
    closeMinimizedChartBtn: document.getElementById('closeMinimizedChartBtn'),

    toastContainer: document.getElementById('toastContainer')
  };

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    el.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  function formatUsdc(num) {
    return Number(num || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDC';
  }

  function formatUnitPrice(num) {
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
    return val.toLocaleString('pl-PL', { minimumFractionDigits: minDec, maximumFractionDigits: maxDec }) + ' USDC';
  }

  function formatRawPrice(num) {
    const val = Number(num || 0);
    const abs = Math.abs(val);
    if (abs > 0 && abs < 0.1) return val.toFixed(5);
    if (abs > 0 && abs < 2) return val.toFixed(4);
    if (abs > 0 && abs < 25) return val.toFixed(3);
    return val.toFixed(2);
  }

  function formatQty(num) {
    return Number(num || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  async function apiRequest(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res.json();
  }

  // ============================================================================
  // API KEY CONNECTION STATUS & REASON RENDERING
  // ============================================================================
  function renderApiConnectionStatus(cfg) {
    const activeConn = cfg.apiConnection;
    const demoConn = cfg.apiConnections?.demo || activeConn;
    const liveConn = cfg.apiConnections?.live || activeConn;

    if (!activeConn) return;

    // 1. Header Pill
    if (activeConn.connected) {
      el.headerApiConnBadge.textContent = `🔑 KLUCZE API (${activeConn.mode.toUpperCase()}): PODŁĄCZONE`;
      el.headerApiConnBadge.className = 'status-pill api-connected';
    } else {
      el.headerApiConnBadge.textContent = `⚠️ KLUCZE API (${activeConn.mode.toUpperCase()}): NIEPODŁĄCZONE`;
      el.headerApiConnBadge.className = 'status-pill api-disconnected';
    }

    // 2. Banner in Window 1
    el.apiConnStatusBanner.className = `api-conn-banner ${activeConn.connected ? 'conn-ok' : 'conn-err'}`;
    el.apiConnStateIcon.textContent = activeConn.connected ? '🟢' : '🔴';
    el.apiConnStatusLabel.textContent = activeConn.statusLabel;
    el.apiConnCheckedTime.textContent = `Sprawdzono: ${activeConn.lastCheckedAt || 'teraz'}`;
    el.apiConnReasonText.textContent = activeConn.connected
      ? `Status: ${activeConn.reason}`
      : `Powód braku połączenia: ${activeConn.reason}`;

    // 3. Dual summary pills (Demo & Live)
    el.pillStatusDemoKey.className = `mini-conn-pill ${demoConn.connected ? 'ok' : 'err'}`;
    el.pillStatusDemoKey.textContent = demoConn.connected
      ? `DEMO API: 🟢 Podłączone (${demoConn.keyPreview})`
      : `DEMO API: 🔴 Niepodłączone (${demoConn.reasonCode})`;

    el.pillStatusLiveKey.className = `mini-conn-pill ${liveConn.connected ? 'ok' : 'err'}`;
    el.pillStatusLiveKey.textContent = liveConn.connected
      ? `LIVE API: 🟢 Podłączone (${liveConn.keyPreview})`
      : `LIVE API: 🔴 Niepodłączone (${liveConn.reasonCode === 'MISSING_ALL_KEYS' ? 'Brak kluczy Live' : liveConn.reasonCode})`;

    // 4. Detailed boxes inside Accordion
    if (el.diagBoxDemo) {
      el.diagBoxDemo.className = `api-diag-box ${demoConn.connected ? 'diag-ok' : 'diag-err'}`;
      el.diagBadgeDemo.className = `diag-badge ${demoConn.connected ? 'ok' : 'err'}`;
      el.diagBadgeDemo.textContent = demoConn.connected ? 'PODŁĄCZONE' : 'NIEPODŁĄCZONE';
      el.diagReasonDemo.textContent = demoConn.connected ? demoConn.reason : `Powód: ${demoConn.reason}`;
    }

    if (el.diagBoxLive) {
      el.diagBoxLive.className = `api-diag-box ${liveConn.connected ? 'diag-ok' : 'diag-err'}`;
      el.diagBadgeLive.className = `diag-badge ${liveConn.connected ? 'ok' : 'err'}`;
      el.diagBadgeLive.textContent = liveConn.connected ? 'PODŁĄCZONE' : 'NIEPODŁĄCZONE';
      el.diagReasonLive.textContent = liveConn.connected ? liveConn.reason : `Powód: ${liveConn.reason}`;
    }

    // 5. Left Sidebar API status box
    if (el.sidebarApiStatusBadge) {
      el.sidebarApiStatusBadge.className = `sidebar-api-badge ${activeConn.connected ? 'ok' : 'err'}`;
      el.sidebarApiStatusBadge.textContent = activeConn.connected
        ? `🟢 ${activeConn.mode.toUpperCase()} API: PODŁĄCZONE`
        : `🔴 ${activeConn.mode.toUpperCase()} API: NIEPODŁĄCZONE`;
      el.sidebarApiReason.textContent = activeConn.connected
        ? activeConn.reason
        : `Powód: ${activeConn.reason}`;
    }
  }

  // ============================================================================
  // UNIVERSAL WINDOW MANAGER (FULLSCREEN, DRAGGABLE REDUCED, MINIMIZE, CLOSE)
  // ============================================================================
  function getModeLabelPl(mode) {
    switch (mode) {
      case 'grid':
        return 'W siatce';
      case 'minimized-inline':
        return 'Zminimalizowane';
      case 'floating-small':
        return 'Małe przesuwne';
      case 'floating-medium':
        return 'Przesuwne';
      case 'fullscreen':
        return 'Cały ekran';
      case 'docked-top':
        return 'W Menu Górnym';
      case 'docked-sidebar':
        return 'W Sidebarze';
      default:
        return mode;
    }
  }

  function updateTopControlsGridVisibility() {
    // 1. Sprawdź okna w górnych kontrolkach (1-3)
    const topWinsInGrid = WINDOWS_REGISTRY.filter(
      (w) => w.isTopCtrl && (w.mode === 'grid' || w.mode === 'minimized-inline')
    );
    if (el.topControlsGrid) {
      el.topControlsGrid.classList.toggle('grid-collapsed', topWinsInGrid.length === 0);
      el.topControlsGrid.classList.toggle('solo-child-row', topWinsInGrid.length === 1);
    }

    // 2. Sprawdź wiersz agenta i zlecenia (4-5)
    const rowAgentOrder = document.querySelector('.row-agent-and-order');
    const agentOrderWinsInGrid = WINDOWS_REGISTRY.filter(
      (w) => (w.id === 'win-ai-chat' || w.id === 'win-quick-trade') && (w.mode === 'grid' || w.mode === 'minimized-inline')
    );
    if (rowAgentOrder) {
      rowAgentOrder.classList.toggle('grid-collapsed', agentOrderWinsInGrid.length === 0);
      rowAgentOrder.classList.toggle('solo-child-row', agentOrderWinsInGrid.length === 1);
    }

    // 3. Sprawdź wiersz portfeli (6-7)
    const rowPortfolios = document.querySelector('.row-portfolios');
    const portfoliosWinsInGrid = WINDOWS_REGISTRY.filter(
      (w) => (w.id === 'win-portfolio' || w.id === 'win-bought-sold') && (w.mode === 'grid' || w.mode === 'minimized-inline')
    );
    if (rowPortfolios) {
      rowPortfolios.classList.toggle('grid-collapsed', portfoliosWinsInGrid.length === 0);
      rowPortfolios.classList.toggle('solo-child-row', portfoliosWinsInGrid.length === 1);
    }

    // 4. Zbierz WSZYSTKIE okna w siatce roboczej (oprócz okna wykresu pływającego)
    const allGridWindows = WINDOWS_REGISTRY.filter(
      (w) => !w.isChart && (w.mode === 'grid' || w.mode === 'minimized-inline')
    );
    const isSingleGridWindow = allGridWindows.length === 1;
    const soloWindow = isSingleGridWindow ? allGridWindows[0] : null;
    const isSoloMinimized = isSingleGridWindow && soloWindow && soloWindow.mode === 'minimized-inline';

    const mainWs = document.getElementById('mainWorkspace');
    if (mainWs) {
      mainWs.classList.toggle('workspace-empty', allGridWindows.length === 0);
      mainWs.classList.toggle('single-window-grid', isSingleGridWindow);
      mainWs.classList.toggle('single-window-minimized', isSoloMinimized);
    }
    if (document.body) {
      document.body.classList.toggle('has-single-window-grid', isSingleGridWindow && !isSoloMinimized);
      document.body.classList.toggle('single-window-minimized', isSoloMinimized);
    }

    // Oznacz aktywne okno solo specjalną klasą 'solo-grid-window'
    WINDOWS_REGISTRY.forEach((w) => {
      if (w.isChart) return;
      const dom = document.getElementById(w.id);
      if (dom) {
        dom.classList.toggle('solo-grid-window', isSingleGridWindow && soloWindow && soloWindow.id === w.id);
      }
    });

    if (el.btnToggleTopControls) {
      const topWins = WINDOWS_REGISTRY.filter((w) => w.isTopCtrl);
      const anyVisible = topWins.some((w) => w.mode !== 'docked-top' && w.mode !== 'docked-sidebar');
      el.btnToggleTopControls.textContent = anyVisible
        ? '👁️ Ukryj okna 1–3 (do Menu Górnego)'
        : '👁️ Pokaż okna 1–3 (z Menu Górnego)';
    }
  }

  // Synchronize DOM attachment: floating and fullscreen windows are attached to document.body
  // so that parent flexbox/grid containers or collapsed rows never clip, hide or compress them.
  // Grid and minimized windows are attached back to their original placeholder in the grid.
  function syncWindowDomAttachment(domEl, winId, mode) {
    if (!domEl) return;
    const isFloatingOrFull = mode === 'floating-small' || mode === 'floating-medium' || mode === 'fullscreen';

    if (isFloatingOrFull) {
      if (domEl.parentElement !== document.body) {
        let ph = document.getElementById(`grid-ph-${winId}`);
        if (!ph) {
          ph = document.createElement('div');
          ph.id = `grid-ph-${winId}`;
          ph.className = 'window-grid-placeholder';
          ph.style.display = 'none';
          domEl.parentNode.insertBefore(ph, domEl);
        }
        document.body.appendChild(domEl);
      }
    } else {
      if (domEl.parentElement === document.body) {
        const ph = document.getElementById(`grid-ph-${winId}`);
        if (ph && ph.parentNode) {
          ph.parentNode.insertBefore(domEl, ph);
          ph.remove();
        } else {
          const ws = document.getElementById('mainWorkspace');
          if (ws) ws.appendChild(domEl);
        }
      }
    }
  }

  function setWindowMode(winId, requestedMode, customCoords = null) {
    const winMeta = WINDOWS_REGISTRY.find((w) => w.id === winId);
    if (!winMeta) return;

    // Toggle behavior if clicking "minimized-inline" when already minimized-inline
    let newMode = requestedMode;
    if (requestedMode === 'minimized-inline' && winMeta.mode === 'minimized-inline') {
      newMode = 'grid';
    }

    // Special handling for the Chart Window (#floatingChartWindow)
    if (winMeta.isChart) {
      if (newMode === 'docked-top') {
        winMeta.mode = 'docked-top';
        chartState.isOpen = false;
        chartState.isMinimized = false;
        el.floatingChartWindow.hidden = true;
        el.minimizedChartBar.hidden = true;
        renderWindowMenus();
        return;
      }
      if (newMode === 'docked-sidebar') {
        winMeta.mode = 'docked-sidebar';
        chartState.isOpen = false;
        chartState.isMinimized = false;
        el.floatingChartWindow.hidden = true;
        el.minimizedChartBar.hidden = true;
        renderWindowMenus();
        return;
      }
      if (newMode === 'fullscreen') {
        winMeta.mode = 'fullscreen';
        winMeta.prevActiveMode = 'fullscreen';
        openAssetChart(chartState.instId, 'full');
        renderWindowMenus();
        return;
      }
      if (newMode === 'floating-small') {
        winMeta.mode = 'floating-small';
        winMeta.prevActiveMode = 'floating-small';
        openAssetChart(chartState.instId, 'small');
        renderWindowMenus();
        return;
      }
      winMeta.mode = 'floating-medium';
      winMeta.prevActiveMode = 'floating-medium';
      openAssetChart(chartState.instId, 'medium');
      renderWindowMenus();
      return;
    }

    const domEl = document.getElementById(winId);
    if (!domEl) return;

    if (newMode !== 'docked-top' && newMode !== 'docked-sidebar') {
      winMeta.prevActiveMode = newMode;
    }
    winMeta.mode = newMode;

    // Synchronize DOM attachment between grid and body
    syncWindowDomAttachment(domEl, winId, newMode);

    domEl.classList.remove(
      'win-mode-grid',
      'win-mode-minimized',
      'win-mode-floating',
      'win-size-small',
      'win-size-medium',
      'win-mode-fullscreen',
      'win-mode-docked'
    );

    if (newMode === 'grid') {
      domEl.classList.add('win-mode-grid');
      domEl.style.left = '';
      domEl.style.top = '';
      domEl.style.width = '';
      domEl.style.height = '';
      domEl.style.zIndex = '';
    } else if (newMode === 'minimized-inline') {
      domEl.classList.add('win-mode-minimized');
      domEl.style.left = '';
      domEl.style.top = '';
      domEl.style.width = '';
      domEl.style.height = '';
      domEl.style.zIndex = '';
    } else if (newMode === 'floating-small' || newMode === 'floating-medium') {
      domEl.classList.add('win-mode-floating');
      domEl.classList.add(newMode === 'floating-small' ? 'win-size-small' : 'win-size-medium');

      const targetW = newMode === 'floating-small' ? 450 : 720;
      const targetH = newMode === 'floating-small' ? 360 : 500;

      if (customCoords) {
        winMeta.posX = customCoords.x;
        winMeta.posY = customCoords.y;
        winMeta.hasCustomPos = true;
      } else if (!winMeta.hasCustomPos) {
        // Center on screen nicely when opened from grid
        winMeta.posX = Math.max(16, Math.round((window.innerWidth - targetW) / 2));
        winMeta.posY = Math.max(55, Math.round((window.innerHeight - targetH) / 2));
        winMeta.hasCustomPos = true;
      } else {
        const maxX = Math.max(12, window.innerWidth - 120);
        const maxY = Math.max(40, window.innerHeight - 80);
        winMeta.posX = Math.min(Math.max(12, winMeta.posX), maxX);
        winMeta.posY = Math.min(Math.max(40, winMeta.posY), maxY);
      }
      domEl.style.left = `${Math.round(winMeta.posX)}px`;
      domEl.style.top = `${Math.round(winMeta.posY)}px`;
      domEl.style.zIndex = String(++topWindowZIndex);
    } else if (newMode === 'fullscreen') {
      domEl.classList.add('win-mode-fullscreen');
      domEl.style.left = '8px';
      domEl.style.top = '8px';
      domEl.style.zIndex = String(++topWindowZIndex + 500);
    } else if (newMode === 'docked-top' || newMode === 'docked-sidebar') {
      domEl.classList.add('win-mode-docked');
    }

    const badge = domEl.querySelector(`[data-mode-badge="${winId}"]`);
    if (badge) badge.textContent = getModeLabelPl(newMode);

    domEl.querySelectorAll(`.win-ctrl-btn[data-win-id="${winId}"]`).forEach((btn) => {
      if (btn.classList.contains('close-win-btn')) return;
      btn.classList.toggle('active', btn.getAttribute('data-win-action') === newMode);
    });

    updateTopControlsGridVisibility();

    if (winId === 'win-portfolio-history' && appState) {
      setTimeout(() => {
        drawPortfolioEquityCurve(appState.portfolio.portfolioHistory.slice().reverse());
      }, 60);
    }

    renderWindowMenus();
  }

  function restoreWindowFromDock(winId, preferredMode = null) {
    const winMeta = WINDOWS_REGISTRY.find((w) => w.id === winId);
    if (!winMeta) return;
    const targetMode = preferredMode || (winMeta.isChart ? 'floating-medium' : 'grid');
    setWindowMode(winId, targetMode);
    const domEl = document.getElementById(winId);
    if (domEl && targetMode === 'grid') {
      domEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function renderWindowMenus() {
    const dockedTopCount = WINDOWS_REGISTRY.filter((w) => w.mode === 'docked-top').length;
    const dockedSidebarCount = WINDOWS_REGISTRY.filter((w) => w.mode === 'docked-sidebar').length;

    if (el.topMenuDockedCount) el.topMenuDockedCount.textContent = String(dockedTopCount);
    if (el.sidebarDockedBadge) el.sidebarDockedBadge.textContent = String(dockedSidebarCount);
    if (el.sidebarDockedCountText) el.sidebarDockedCountText.textContent = String(dockedSidebarCount);

    // 1. Top Window Menu Bar (#topWindowPillsContainer)
    if (el.topWindowPillsContainer) {
      el.topWindowPillsContainer.innerHTML = WINDOWS_REGISTRY.map((w) => {
        const isDockedTop = w.mode === 'docked-top';
        const isDockedSidebar = w.mode === 'docked-sidebar';
        const isFloating = w.mode === 'floating-small' || w.mode === 'floating-medium';
        const isFull = w.mode === 'fullscreen';
        const pillClasses = [
          'top-win-pill',
          isDockedTop || isDockedSidebar ? 'is-docked-top' : '',
          isFloating ? 'is-floating' : '',
          isFull ? 'is-fullscreen' : ''
        ]
          .filter(Boolean)
          .join(' ');

        return `
          <button
            type="button"
            class="${pillClasses}"
            data-top-menu-win="${w.id}"
            title="Kliknij, aby otworzyć / przywrócić okno: ${w.title}"
          >
            <span>${w.icon} ${w.title}</span>
            <span class="top-pill-state">${
              isDockedTop || isDockedSidebar ? '▶ Otwórz' : getModeLabelPl(w.mode)
            }</span>
          </button>
        `;
      }).join('');
    }

    // 2. Left Sidebar Docked List (#sidebarDockedList)
    if (el.sidebarDockedList) {
      const dockedSidebarWins = WINDOWS_REGISTRY.filter((w) => w.mode === 'docked-sidebar');
      if (dockedSidebarWins.length === 0) {
        el.sidebarDockedList.innerHTML = `<div class="sidebar-empty-hint">Brak okien odłożonych do sidebaru. Kliknij „◀” na dowolnym oknie, aby je tutaj zwinąć.</div>`;
      } else {
        el.sidebarDockedList.innerHTML = dockedSidebarWins
          .map(
            (w) => `
            <div class="sidebar-win-card docked-here">
              <div class="sidebar-win-top">
                <span class="sidebar-win-title">${w.icon} ${w.title}</span>
                <span class="sidebar-win-state">W Sidebarze</span>
              </div>
              <div class="sidebar-win-actions">
                <button type="button" class="sidebar-mini-btn restore-highlight" data-win-id="${w.id}" data-win-action="${w.isChart ? 'floating-medium' : 'grid'}">
                  ▶ Przywróć
                </button>
                <button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="floating-medium">
                  🗗 Przesuwne
                </button>
                <button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="fullscreen">
                  ⛶ Full
                </button>
              </div>
            </div>
          `
          )
          .join('');
      }
    }

    // 3. Left Sidebar All Windows List (#sidebarAllWindowsList)
    if (el.sidebarAllWindowsList) {
      el.sidebarAllWindowsList.innerHTML = WINDOWS_REGISTRY.map((w) => {
        return `
          <div class="sidebar-win-card ${w.mode === 'docked-sidebar' || w.mode === 'docked-top' ? 'docked-here' : ''}">
            <div class="sidebar-win-top">
              <span class="sidebar-win-title">${w.icon} ${w.title}</span>
              <span class="sidebar-win-state">${getModeLabelPl(w.mode)}</span>
            </div>
            <div class="sidebar-win-actions">
              ${
                w.isChart
                  ? `<button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="floating-small">🗗 Małe</button>`
                  : `<button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="grid">⊞ Siatka</button>
                     <button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="minimized-inline">— Min</button>`
              }
              <button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="floating-medium">🗗 Przesuwne</button>
              <button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="fullscreen">⛶ Cały ekran</button>
              <button type="button" class="sidebar-mini-btn" data-win-id="${w.id}" data-win-action="docked-top">✕ Zamknij</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function applyTopMenuWindowSize(size) {
    if (!el.topWindowMenuBar) return;
    el.topWindowMenuBar.classList.remove('top-menu-size-min', 'top-menu-size-medium', 'top-menu-size-full');
    const validSize = size === 'min' || size === 'full' ? size : 'medium';
    el.topWindowMenuBar.classList.add(`top-menu-size-${validSize}`);
    document.querySelectorAll('[data-topmenu-size]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-topmenu-size') === validSize);
    });
  }

  // ============================================================================
  // UNIFIED ROCK-SOLID DRAG & DROP FOR ALL WINDOWS, CHART & POP-UPS
  // ============================================================================
  function initUniversalWindowDragging() {
    let dragState = null;

    const handlePointerDown = (clientX, clientY, target, rawEvent) => {
      // Case 1: Dragging one of the 9 .app-window panels by its .window-titlebar
      const titlebar = target.closest('[data-drag-window]');
      if (titlebar) {
        // Do not drag if clicked form inputs, selects, or textareas
        if (target.closest('select') || target.closest('input') || target.closest('textarea')) {
          return;
        }

        const winId = titlebar.getAttribute('data-drag-window');
        const winMeta = WINDOWS_REGISTRY.find((w) => w.id === winId);
        const domEl = document.getElementById(winId);
        if (!winMeta || !domEl) return;

        const isAlreadyFloating = winMeta.mode === 'floating-small' || winMeta.mode === 'floating-medium';
        const rect = domEl.getBoundingClientRect();

        dragState = {
          type: 'app-window',
          winId,
          winMeta,
          domEl,
          detached: isAlreadyFloating,
          startX: clientX,
          startY: clientY,
          offsetX: isAlreadyFloating ? (clientX - rect.left) : Math.min(Math.max(40, clientX - rect.left), 260),
          offsetY: isAlreadyFloating ? (clientY - rect.top) : Math.min(Math.max(12, clientY - rect.top), 28)
        };

        if (isAlreadyFloating) {
          domEl.style.zIndex = String(++topWindowZIndex);
          domEl.classList.add('is-dragging');
        }
        return;
      }

      // Do not start dragging if user clicked a button, input, or select on other elements
      if (target.closest('button') || target.closest('select') || target.closest('input') || target.closest('a')) {
        return;
      }

      // Case 2: Dragging the Chart Window (#floatingChartWindow) by #chartWindowHeader
      const chartHeader = target.closest('#chartWindowHeader');
      if (chartHeader && !el.floatingChartWindow.hidden) {
        if (rawEvent && rawEvent.cancelable) rawEvent.preventDefault();
        if (chartState.size === 'full') {
          applyChartWindowSize('medium');
        }
        el.floatingChartWindow.style.zIndex = String(++topWindowZIndex + 20);
        el.floatingChartWindow.classList.add('is-dragging');
        const rect = el.floatingChartWindow.getBoundingClientRect();
        dragState = {
          type: 'chart-window',
          domEl: el.floatingChartWindow,
          offsetX: clientX - rect.left,
          offsetY: clientY - rect.top
        };
        return;
      }

      // Case 3: Dragging Pop-up Modal (#authPopupDialog) by .popup-window-bar
      const popupBar = target.closest('.popup-window-bar');
      if (popupBar) {
        const dialog = popupBar.closest('.modal-dialog');
        if (!dialog) return;
        if (rawEvent && rawEvent.cancelable) rawEvent.preventDefault();
        if (dialog.classList.contains('modal-fullscreen')) {
          dialog.classList.remove('modal-fullscreen');
          if (el.btnPopupToggleFullscreen) el.btnPopupToggleFullscreen.textContent = '⛶ Cały ekran';
        }
        const rect = dialog.getBoundingClientRect();
        dialog.style.position = 'fixed';
        dialog.style.margin = '0';
        dialog.style.left = `${rect.left}px`;
        dialog.style.top = `${rect.top}px`;
        dialog.classList.add('is-dragging');
        dragState = {
          type: 'modal',
          domEl: dialog,
          offsetX: clientX - rect.left,
          offsetY: clientY - rect.top
        };
        return;
      }

      // Case 4: Dragging Top Window Menu (#topWindowMenuBar) by #topMenuDragHeader
      const topMenuHeader = target.closest('#topMenuDragHeader');
      if (topMenuHeader && el.topWindowMenuBar && !el.topWindowMenuBar.hasAttribute('hidden')) {
        if (rawEvent && rawEvent.cancelable) rawEvent.preventDefault();
        if (el.topWindowMenuBar.classList.contains('top-menu-size-full')) {
          applyTopMenuWindowSize('medium');
        }
        el.topWindowMenuBar.style.zIndex = String(++topWindowZIndex + 30);
        el.topWindowMenuBar.classList.add('is-dragging');
        const rect = el.topWindowMenuBar.getBoundingClientRect();
        dragState = {
          type: 'top-menu-window',
          domEl: el.topWindowMenuBar,
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
          wasJustDragging = true;
          dragState.winMeta.hasCustomPos = true;
          const targetFloatingMode = dragState.winMeta.isTopCtrl ? 'floating-small' : 'floating-medium';
          setWindowMode(dragState.winId, targetFloatingMode, {
            x: Math.max(8, clientX - dragState.offsetX),
            y: Math.max(8, clientY - dragState.offsetY)
          });
          dragState.domEl.classList.add('is-dragging');
        } else if (dist >= 4) {
          wasJustDragging = true;
        }

        const maxX = Math.max(10, window.innerWidth - 100);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.min(Math.max(4, clientX - dragState.offsetX), maxX);
        const newY = Math.min(Math.max(4, clientY - dragState.offsetY), maxY);

        dragState.winMeta.posX = newX;
        dragState.winMeta.posY = newY;
        dragState.domEl.style.left = `${Math.round(newX)}px`;
        dragState.domEl.style.top = `${Math.round(newY)}px`;
        return;
      }

      if (dragState.type === 'chart-window') {
        const maxX = Math.max(10, window.innerWidth - 100);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.min(Math.max(4, clientX - dragState.offsetX), maxX);
        const newY = Math.min(Math.max(4, clientY - dragState.offsetY), maxY);
        chartState.posX = newX;
        chartState.posY = newY;
        dragState.domEl.style.left = `${Math.round(newX)}px`;
        dragState.domEl.style.top = `${Math.round(newY)}px`;
        return;
      }

      if (dragState.type === 'modal') {
        const maxX = Math.max(10, window.innerWidth - 100);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.min(Math.max(4, clientX - dragState.offsetX), maxX);
        const newY = Math.min(Math.max(4, clientY - dragState.offsetY), maxY);
        dragState.domEl.style.left = `${Math.round(newX)}px`;
        dragState.domEl.style.top = `${Math.round(newY)}px`;
        return;
      }

      if (dragState.type === 'top-menu-window') {
        const maxX = Math.max(10, window.innerWidth - 120);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.min(Math.max(4, clientX - dragState.offsetX), maxX);
        const newY = Math.min(Math.max(4, clientY - dragState.offsetY), maxY);
        dragState.domEl.style.left = `${Math.round(newX)}px`;
        dragState.domEl.style.top = `${Math.round(newY)}px`;
        dragState.domEl.style.right = 'auto';
      }
    };

    const handlePointerUp = () => {
      if (!dragState) return;
      if (dragState.domEl) {
        dragState.domEl.classList.remove('is-dragging');
      }
      dragState = null;
      if (wasJustDragging) {
        setTimeout(() => {
          wasJustDragging = false;
        }, 150);
      }
    };

    window.addEventListener('mousedown', (e) => {
      const clickedFloating = e.target.closest('.app-window.win-mode-floating');
      if (clickedFloating) {
        clickedFloating.style.zIndex = String(++topWindowZIndex);
      }
      handlePointerDown(e.clientX, e.clientY, e.target, e);
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragState) return;
      handlePointerMove(e.clientX, e.clientY, e);
    });

    window.addEventListener('mouseup', handlePointerUp);

    window.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target, e);
        }
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (dragState && e.touches.length === 1) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
        }
      },
      { passive: false }
    );

    window.addEventListener('touchend', handlePointerUp);
  }

  // ============================================================================
  // RENDER FULL APPLICATION STATE
  // ============================================================================
  function renderApp(state) {
    if (!state) return;
    appState = state;
    const cfg = state.config;
    const portfolio = state.portfolio;

    // 1. Render Top Controls: Demo / Live API Mode (Default Demo)
    const isDemo = cfg.apiMode === 'demo';
    el.headerModeBadge.textContent = isDemo ? 'TRYB: DEMO (DOMYŚLNY)' : 'TRYB: LIVE';
    el.headerModeBadge.className = `status-pill ${isDemo ? 'mode-demo' : 'mode-live'}`;
    el.apiModeIndicator.className = `indicator-dot ${isDemo ? 'dot-demo' : 'dot-live'}`;
    el.apiModeText.textContent = isDemo ? 'Handel DEMO (Symulowany)' : 'Handel LIVE (Prawdziwy Kapitał)';
    el.btnModeDemo.classList.toggle('active', isDemo);
    el.btnModeLive.classList.toggle('active', !isDemo);
    el.apiSavedStatus.textContent = isDemo
      ? `Aktywny profil: Demo (${cfg.demoKeyPreview})`
      : `Aktywny profil: Live (${cfg.liveKeyPreview})`;

    // 1B. Render API Key Connection Status & Reasons
    renderApiConnectionStatus(cfg);

    // 2. Render Top Controls: AI Agent Status (Default Deactivated)
    const isAiActive = cfg.aiStatus === 'active';
    if (el.headerAiBadge) {
      el.headerAiBadge.className = `status-pill ${isAiActive ? 'ai-on' : 'ai-off'}`;
    }
    if (el.headerAiStatusDot) {
      el.headerAiStatusDot.className = `indicator-dot ${isAiActive ? 'dot-on' : 'dot-off'}`;
    }
    if (el.headerAiStatusText) {
      el.headerAiStatusText.textContent = isAiActive ? 'Aktywny' : 'Dezaktywowany (Domyślnie)';
    }
    if (el.headerBtnAiDeactivated) {
      el.headerBtnAiDeactivated.classList.toggle('active-danger', !isAiActive);
      el.headerBtnAiDeactivated.classList.toggle('active', false);
    }
    if (el.headerBtnAiActive) {
      el.headerBtnAiActive.classList.toggle('active', isAiActive);
      el.headerBtnAiActive.classList.toggle('active-danger', false);
    }

    // Synchronize window 3 (win-ctrl-ai) and warning banner
    if (el.aiStatusDot) el.aiStatusDot.className = `indicator-dot ${isAiActive ? 'dot-on' : 'dot-off'}`;
    if (el.aiStatusText) el.aiStatusText.textContent = isAiActive ? 'Aktywny' : 'Dezaktywowany (Domyślnie)';
    if (el.btnAiDeactivated) el.btnAiDeactivated.classList.toggle('active-danger', !isAiActive);
    if (el.btnAiActive) el.btnAiActive.classList.toggle('active', isAiActive);
    if (el.aiDeactivatedBanner) el.aiDeactivatedBanner.hidden = isAiActive;

    // 3. Render Top Controls: Trading Status & Start Button (Requirement 1 & 4)
    const activeOrder = state.activeTradeOrder;
    if (activeOrder && activeOrder.status === 'waiting_for_start') {
      el.tradeStatusDot.className = 'indicator-dot dot-waiting';
      el.topTradeStatusText.textContent = `Czekam na start zlecenia (${activeOrder.side === 'BUY' ? 'KUPNO' : 'SPRZEDAŻ'} ${activeOrder.amount} ${activeOrder.asset})`;
      el.mainStartTradingBtn.classList.add('waiting-pulse');
      el.mainStartBtnSubtext.textContent = `⏳ Status: Czekam na start zlecenia (${activeOrder.instId} • ${formatUsdc(activeOrder.usdcValue)})`;
    } else if (activeOrder && activeOrder.status === 'in_progress') {
      el.tradeStatusDot.className = 'indicator-dot dot-on';
      el.topTradeStatusText.textContent = `Zlecenie w realizacji (${activeOrder.instId} • ${formatUsdc(activeOrder.usdcValue)})`;
      el.mainStartTradingBtn.classList.remove('waiting-pulse');
      el.mainStartBtnSubtext.textContent = `✅ Status: Zlecenie w realizacji / wykonane (${activeOrder.instId})`;
    } else if (cfg.tradingStatus === 'stopped') {
      el.tradeStatusDot.className = 'indicator-dot dot-off';
      el.topTradeStatusText.textContent = 'Handel zatrzymany (Stop handlu)';
      el.mainStartTradingBtn.classList.remove('waiting-pulse');
      el.mainStartBtnSubtext.textContent = 'Status: Handel zatrzymany — kliknij, aby sprawdzić status';
    } else {
      el.tradeStatusDot.className = 'indicator-dot dot-idle';
      el.topTradeStatusText.textContent = 'Gotowy — brak oczekującego zlecenia';
      el.mainStartTradingBtn.classList.remove('waiting-pulse');
      el.mainStartBtnSubtext.textContent = 'Status: Czekam na start zlecenia (kliknij po podgląd pop-up)';
    }

    renderAuthPopupContent(state);
    renderMarketTickerStrip(state.markets);
    updateOrderFormBalances(state);
    renderTradingPortfolio(portfolio);
    renderBoughtSoldLedger(portfolio.ledger);
    renderPortfolioHistory(portfolio.portfolioHistory);
    renderOrdersHistory(portfolio.orders);
    renderWindowMenus();
  }

  function ensurePairOptionExists(instId, labelText) {
    if (!instId) return;
    if (el.tradePairSelect && !el.tradePairSelect.querySelector(`option[value="${instId}"]`)) {
      const opt = document.createElement('option');
      opt.value = instId;
      opt.textContent = labelText || instId;
      el.tradePairSelect.appendChild(opt);
    }
    if (el.chartAssetSelect && !el.chartAssetSelect.querySelector(`option[value="${instId}"]`)) {
      const opt = document.createElement('option');
      opt.value = instId;
      opt.textContent = instId;
      el.chartAssetSelect.appendChild(opt);
    }
  }

  function renderMarketTickerStrip(markets) {
    markets.forEach((m) => ensurePairOptionExists(m.instId, `${m.instId} (${m.name} / USD Coin)`));

    el.marketTickerStrip.innerHTML = markets
      .map((m) => {
        const isPos = m.change24hPct >= 0;
        const formattedPrice = formatUnitPrice(m.price);
        return `
          <div class="ticker-item" data-chart-pair="${m.instId}" title="Kliknij, aby otworzyć wykres TradingView ${m.instId} (24h Max: ${formatRawPrice(m.high24h)} | 24h Min: ${formatRawPrice(m.low24h)})">
            <span class="ticker-pair">${m.instId}</span>
            <span class="ticker-price">${formattedPrice}</span>
            <span class="ticker-change ${isPos ? 'pos' : 'neg'}">${isPos ? '+' : ''}${m.change24hPct}%</span>
          </div>
        `;
      })
      .join('');
  }

  function updateOrderFormBalances(state) {
    const selectedPair = el.tradePairSelect.value || 'BTC-USDC';
    const [asset] = selectedPair.split('-');
    const market = state.markets.find((m) => m.instId === selectedPair) || state.markets[0];
    el.tradeAssetUnit.textContent = asset;
    el.formAvailAssetName.textContent = asset;

    if (el.tradeOrderType.value === 'MARKET') {
      el.tradePriceInput.value = market.price;
      el.tradePriceInput.readOnly = true;
    } else {
      el.tradePriceInput.readOnly = false;
      if (!el.tradePriceInput.value) el.tradePriceInput.value = market.price;
    }

    const cashHolding = state.portfolio.holdings.find((h) => h.asset === 'USDC');
    const usdtHolding = state.portfolio.holdings.find((h) => h.asset === 'USDT');
    const assetHolding = state.portfolio.holdings.find((h) => h.asset === asset);
    const totalAvailCash = (cashHolding ? cashHolding.amount : 0) + (usdtHolding ? usdtHolding.amount : 0);
    el.formAvailUsdc.textContent = formatUsdc(totalAvailCash);
    el.formAvailAssetAmt.textContent = `${formatQty(assetHolding ? assetHolding.amount : 0)} ${asset}`;
  }

  // ============================================================================
  // PANEL 1: PORTFEL HANDLOWY (DEMO / LIVE) (Requirement 6)
  // ============================================================================
  function renderTradingPortfolio(portfolio) {
    el.portfolioModeTitle.textContent = portfolio.mode.toUpperCase();
    if (el.portfolioSourceSubtitle && portfolio.accountSourceLabel) {
      el.portfolioSourceSubtitle.textContent = portfolio.accountSourceLabel;
      el.portfolioSourceSubtitle.style.color = portfolio.syncedFromOkx ? 'var(--buy-green)' : 'var(--warn-amber)';
    }
    el.portfolioTotalUsdc.textContent = formatUsdc(portfolio.totalValueUsdc);
    el.portfolioCashUsdc.textContent = formatUsdc(portfolio.cashUsdc);
    el.portfolioCryptoUsdc.textContent = formatUsdc(portfolio.cryptoValueUsdc);

    el.portfolioHoldingsTbody.innerHTML = portfolio.holdings
      .map((h) => {
        const isCash = h.asset === 'USDC' || h.asset === 'USDT';
        const pair = isCash ? 'BTC-USDC' : `${h.asset}-USDC`;
        if (!isCash) ensurePairOptionExists(pair, `${pair} (${h.name})`);
        return `
          <tr>
            <td><strong>${h.asset}</strong> <span class="small-muted">${h.name}</span></td>
            <td><strong>${formatQty(h.amount)} ${h.asset}</strong></td>
            <td>${isCash ? formatUsdc(h.priceUsdc) : formatUnitPrice(h.priceUsdc)}</td>
            <td><strong>${formatUsdc(h.usdcValue)}</strong></td>
            <td>${isCash ? '1,00 USDC' : formatUnitPrice(h.avgBuyPrice)}</td>
            <td>${h.allocationPct}%</td>
            <td>
              ${
                isCash
                  ? '<span class="small-muted">Waluta rozliczeniowa</span>'
                  : `<button type="button" class="btn btn-outline-sm open-asset-chart-btn" data-instid="${pair}">📈 Wykres ${h.asset}</button>`
              }
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // ============================================================================
  // PANEL 2: ILE KUPIONO, ILE SPRZEDANO, CZEGO, W ILOŚCI AKTYWA I W USDC (Req 6)
  // ============================================================================
  function renderBoughtSoldLedger(ledger) {
    el.totalBoughtUsdcVal.textContent = formatUsdc(ledger.totalBoughtUsdc);
    el.totalSoldUsdcVal.textContent = formatUsdc(ledger.totalSoldUsdc);

    el.boughtSoldLedgerTbody.innerHTML = ledger.items
      .map((item) => {
        return `
          <tr>
            <td><strong>${item.asset}</strong> <span class="small-muted">(${item.instId})</span></td>
            <td>
              <span class="badge-buy">KUPIONO: ${formatQty(item.boughtAmount)} ${item.asset}</span>
              <span class="small-muted">(${item.buyCount}x)</span>
            </td>
            <td><strong style="color: var(--buy-green);">${formatUsdc(item.boughtUsdc)}</strong></td>
            <td>
              <span class="badge-sell">SPRZEDANO: ${formatQty(item.soldAmount)} ${item.asset}</span>
              <span class="small-muted">(${item.sellCount}x)</span>
            </td>
            <td><strong style="color: var(--sell-red);">${formatUsdc(item.soldUsdc)}</strong></td>
            <td><strong>${formatQty(item.netAmount)} ${item.asset}</strong></td>
            <td>
              <button type="button" class="btn btn-outline-sm open-asset-chart-btn" data-instid="${item.instId}">
                📈 Wykres
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // ============================================================================
  // HISTORIA PORTFELA + EQUITY CURVE CANVAS (Requirement 8)
  // ============================================================================
  function renderPortfolioHistory(historyList) {
    const executedTradesOnly = (historyList || []).filter((snap) => snap.side === 'BUY' || snap.side === 'SELL');

    if (executedTradesOnly.length === 0) {
      el.portfolioHistoryTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 14px;">
            Brak zrealizowanych zleceń kupna/sprzedaży w historii tego portfela.
          </td>
        </tr>
      `;
      drawPortfolioEquityCurve([]);
      return;
    }

    el.portfolioHistoryTbody.innerHTML = executedTradesOnly
      .map((snap) => {
        const badgeClass = snap.side === 'BUY' ? 'badge-buy' : 'badge-sell';
        const sideLabel = snap.side === 'BUY' ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)';
        return `
          <tr>
            <td><strong>${snap.date}</strong> <code>${snap.time}</code></td>
            <td>${snap.action}</td>
            <td><span class="${badgeClass}">${sideLabel}</span></td>
            <td><strong>${formatQty(snap.amount)} ${snap.asset}</strong></td>
            <td>${formatUsdc(snap.usdcAmount)}</td>
            <td><strong style="color: var(--accent-okx);">${formatUsdc(snap.totalValueUsdc)}</strong></td>
          </tr>
        `;
      })
      .join('');

    drawPortfolioEquityCurve(executedTradesOnly.slice().reverse());
  }

  function drawPortfolioEquityCurve(chronologicalSnapshots) {
    const canvas = el.portfolioEquityCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!chronologicalSnapshots || chronologicalSnapshots.length === 0) return;

    const values = chronologicalSnapshots.map((s) => s.totalValueUsdc);
    const minVal = Math.min(...values) * 0.995;
    const maxVal = Math.max(...values) * 1.005 || 1;
    const padL = 16;
    const padR = 16;
    const padT = 24;
    const padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padT + (plotH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    ctx.beginPath();
    chronologicalSnapshots.forEach((pt, idx) => {
      const x = padL + (chronologicalSnapshots.length === 1 ? plotW / 2 : (idx / (chronologicalSnapshots.length - 1)) * plotW);
      const y = padT + plotH - ((pt.totalValueUsdc - minVal) / (maxVal - minVal || 1)) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#bcff2f';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    chronologicalSnapshots.forEach((pt, idx) => {
      const x = padL + (chronologicalSnapshots.length === 1 ? plotW / 2 : (idx / (chronologicalSnapshots.length - 1)) * plotW);
      const y = padT + plotH - ((pt.totalValueUsdc - minVal) / (maxVal - minVal || 1)) * plotH;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Krzywa wartości Portfela Handlowego (USDC)', padL, 15);
    const latest = values[values.length - 1];
    ctx.fillStyle = '#bcff2f';
    ctx.fillText(`Aktualnie: ${formatUsdc(latest)}`, w - 185, 15);
  }

  // ============================================================================
  // HISTORIA TRANSAKCJI: OTWARTE I ZAMKNIĘTE ZLECENIA + WYKRES (Requirement 9)
  // ============================================================================
  function renderOrdersHistory(orders) {
    const openOrders = orders.filter((o) => o.status === 'OPEN');
    const closedOrders = orders.filter((o) => o.status !== 'OPEN');

    el.countAllOrders.textContent = orders.length;
    el.countOpenOrders.textContent = openOrders.length;
    el.countClosedOrders.textContent = closedOrders.length;

    let filtered = orders;
    if (currentOrderFilter === 'OPEN') filtered = openOrders;
    else if (currentOrderFilter === 'CLOSED') filtered = closedOrders;

    el.ordersHistoryTbody.innerHTML = filtered
      .map((o) => {
        const isBuy = o.side === 'BUY';
        const isOpen = o.status === 'OPEN';
        return `
          <tr>
            <td><code>${o.id}</code></td>
            <td><strong>${o.date}</strong></td>
            <td><code>${o.time}</code></td>
            <td><strong>${o.instId}</strong></td>
            <td><span class="${isBuy ? 'badge-buy' : 'badge-sell'}">${isBuy ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)'}</span></td>
            <td><strong>${formatQty(o.amount)} ${o.asset}</strong></td>
            <td>${formatUsdc(o.price)}</td>
            <td><strong>${formatUsdc(o.usdcValue)}</strong></td>
            <td>${o.strategyName || o.source}</td>
            <td>
              <span class="${isOpen ? 'badge-status-open' : 'badge-status-closed'}">
                ${o.statusLabel}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" class="btn btn-outline-sm open-asset-chart-btn" data-instid="${o.instId}">
                  📈 Wykres ${o.asset}
                </button>
                ${
                  isOpen
                    ? `<button type="button" class="btn btn-accent-sm activate-open-order-btn" data-orderid="${o.id}">▶ Do Startu</button>
                       <button type="button" class="btn btn-outline-sm cancel-open-order-btn" data-orderid="${o.id}">✕ Anuluj</button>`
                    : ''
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // ============================================================================
  // POP-UP AUTORYZACJI I STATUSU HANDLU (Requirement 4)
  // ============================================================================
  function renderAuthPopupContent(state) {
    const active = state.activeTradeOrder;
    const modeLabel = state.config.apiMode.toUpperCase();
    el.popupModeBadge.textContent = `OKX EUROPE • TRYB ${modeLabel}`;

    if (!active) {
      el.popupStatusBanner.className = 'popup-status-banner status-idle';
      el.popupStatusIcon.textContent = 'ℹ️';
      el.popupStatusMainText.textContent = 'Czekam na utworzenie zlecenia (Brak aktywnego zlecenia w kolejce)';
      el.popupOrderId.textContent = 'Brak oczekującego zlecenia';
      el.popupOrderStrategy.textContent = 'Napisz do Agenta AI lub użyj Kreatora Zlecenia';
      el.popupOrderPair.textContent = '—';
      el.popupOrderSide.textContent = '—';
      el.popupOrderAmount.textContent = '—';
      el.popupOrderPrice.textContent = '—';
      el.popupOrderUsdc.textContent = '0,00 USDC';
      el.popupInstructionText.innerHTML =
        'Aby rozpocząć autoryzowany handel, wydaj polecenie Agentowi AI (np. <em>„Kup 0.05 BTC”</em>) lub kliknij przycisk w Kreatorze Zlecenia — wtedy przycisk <strong>START</strong> tutaj stanie się aktywny.';
      el.popupConfirmStartBtn.disabled = true;
      el.popupConfirmStartBtn.textContent = '⏳ Czekam na zlecenie do uruchomienia...';
      return;
    }

    el.popupOrderId.textContent = active.id;
    el.popupOrderStrategy.textContent = active.strategyName;
    el.popupOrderPair.textContent = active.instId;
    el.popupOrderSide.textContent = active.side === 'BUY' ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)';
    el.popupOrderSide.style.color = active.side === 'BUY' ? 'var(--buy-green)' : 'var(--sell-red)';
    el.popupOrderAmount.textContent = `${formatQty(active.amount)} ${active.asset}`;
    el.popupOrderPrice.textContent = formatUsdc(active.price);
    el.popupOrderUsdc.textContent = formatUsdc(active.usdcValue);

    if (active.status === 'waiting_for_start') {
      el.popupStatusBanner.className = 'popup-status-banner status-waiting';
      el.popupStatusIcon.textContent = '⏳';
      el.popupStatusMainText.textContent = 'Czekam na start zlecenia (Oczekuje na wciśnięcie START)';
      el.popupInstructionText.innerHTML =
        'Zlecenie jest gotowe i autoryzowane do uruchomienia. Wciśnij poniższy przycisk <strong>START</strong>, aby rozpocząć i zrealizować transakcję.';
      el.popupConfirmStartBtn.disabled = false;
      el.popupConfirmStartBtn.textContent = `🚀 START — Rozpocznij handel (${active.side === 'BUY' ? 'KUP' : 'SPRZEDAJ'} ${active.amount} ${active.asset})`;
    } else {
      el.popupStatusBanner.className = 'popup-status-banner status-executing';
      el.popupStatusIcon.textContent = '✅';
      el.popupStatusMainText.textContent = 'Zlecenie jest już w realizacji / Handel zrealizowany!';
      el.popupInstructionText.innerHTML =
        `Przycisk <strong>START</strong> został wciśnięty (${active.executedAtTime || ''}). Transakcja została zrealizowana, a Portfel Handlowy, Bilans Kupiono/Sprzedano oraz Historia Portfela zostały zaktualizowane.`;
      el.popupConfirmStartBtn.disabled = true;
      el.popupConfirmStartBtn.textContent = '✅ Zlecenie w realizacji / Handel dokonany';
    }
  }

  function openAuthPopup() {
    if (appState) renderAuthPopupContent(appState);
    el.tradeAuthModalOverlay.hidden = false;
  }

  function closeAuthPopup() {
    el.tradeAuthModalOverlay.hidden = true;
  }

  // ============================================================================
  // TRADINGVIEW PRO SUPERCHART (SMALL / MEDIUM / FULL + OFFICIAL WIDGET + TOOLS)
  // ============================================================================
  async function openAssetChart(instId = 'BTC-USDC', size = chartState.size) {
    const pairChanged = chartState.instId !== instId;
    chartState.instId = instId;
    chartState.size = size || 'medium';
    chartState.isOpen = true;
    chartState.isMinimized = false;
    if (pairChanged) {
      chartState.panOffset = 0;
      chartState.pendingDrawing = null;
    }

    ensurePairOptionExists(instId, instId);

    const chartWinMeta = WINDOWS_REGISTRY.find((w) => w.id === 'win-chart');
    if (chartWinMeta) {
      chartWinMeta.mode = size === 'full' ? 'fullscreen' : size === 'small' ? 'floating-small' : 'floating-medium';
    }

    el.chartAssetSelect.value = instId;
    el.minimizedChartBar.hidden = true;
    el.floatingChartWindow.hidden = false;
    el.floatingChartWindow.style.zIndex = String(++topWindowZIndex + 20);
    applyChartWindowSize(chartState.size);
    renderWindowMenus();

    await fetchAndDrawCandles();
    if (chartState.engine === 'widget') {
      mountOfficialTradingViewWidget();
    }
  }

  function applyChartWindowSize(size) {
    chartState.size = size;
    el.floatingChartWindow.classList.remove('size-small', 'size-medium', 'size-full');
    el.floatingChartWindow.classList.add(`size-${size}`);

    const chartWinMeta = WINDOWS_REGISTRY.find((w) => w.id === 'win-chart');
    if (chartWinMeta) {
      chartWinMeta.mode = size === 'full' ? 'fullscreen' : size === 'small' ? 'floating-small' : 'floating-medium';
    }

    document.querySelectorAll('.chart-size-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });

    if (size !== 'full') {
      const maxX = Math.max(10, window.innerWidth - 360);
      const maxY = Math.max(10, window.innerHeight - 240);
      chartState.posX = Math.min(Math.max(8, chartState.posX), maxX);
      chartState.posY = Math.min(Math.max(8, chartState.posY), maxY);
      el.floatingChartWindow.style.left = `${Math.round(chartState.posX)}px`;
      el.floatingChartWindow.style.top = `${Math.round(chartState.posY)}px`;
    }

    renderWindowMenus();
    setTimeout(() => renderCandlestickCanvas(), 40);
  }

  function minimizeChartWindow() {
    chartState.isMinimized = true;
    el.floatingChartWindow.hidden = true;
    el.minimizedChartBar.hidden = false;
    el.minBarPair.textContent = chartState.instId;
    if (chartState.data) {
      el.minBarPrice.textContent = formatUnitPrice(chartState.data.currentPrice);
    }
    const chartWinMeta = WINDOWS_REGISTRY.find((w) => w.id === 'win-chart');
    if (chartWinMeta) chartWinMeta.mode = 'docked-top';
    renderWindowMenus();
  }

  function closeChartWindow() {
    chartState.isOpen = false;
    chartState.isMinimized = false;
    el.floatingChartWindow.hidden = true;
    el.minimizedChartBar.hidden = true;
    const chartWinMeta = WINDOWS_REGISTRY.find((w) => w.id === 'win-chart');
    if (chartWinMeta) chartWinMeta.mode = 'docked-top';
    renderWindowMenus();
  }

  function setChartEngine(engineMode) {
    chartState.engine = engineMode === 'widget' ? 'widget' : 'pro';
    document.querySelectorAll('.tv-engine-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-engine') === chartState.engine);
    });

    const isWidget = chartState.engine === 'widget';
    if (el.tvOfficialWidgetContainer) el.tvOfficialWidgetContainer.hidden = !isWidget;
    if (el.tvOhlcLegend) el.tvOhlcLegend.style.display = isWidget ? 'none' : 'flex';
    const drawToolbar = document.getElementById('tvDrawingToolbar');
    if (drawToolbar) drawToolbar.style.display = isWidget ? 'none' : '';

    if (isWidget) {
      mountOfficialTradingViewWidget();
    } else {
      renderCandlestickCanvas();
    }
  }

  function mountOfficialTradingViewWidget() {
    if (!el.tvOfficialWidgetContainer || chartState.engine !== 'widget') return;
    const [base] = (chartState.instId || 'BTC-USDC').split('-');
    const tvSymbol = `OKX:${base}USDC`;
    const tvIntervalMap = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1H': '60',
      '4H': '240',
      '1D': 'D',
      '1W': 'W'
    };
    const tvInt = tvIntervalMap[chartState.bar] || '15';

    const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tv_embed_okx&symbol=${encodeURIComponent(
      tvSymbol
    )}&interval=${tvInt}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=131722&studies=MASimple%40tv-basicstudies%1FRSI%40tv-basicstudies&theme=dark&style=1&timezone=Europe%2FWarsaw&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=pl`;

    el.tvOfficialWidgetContainer.innerHTML = `
      <iframe
        src="${iframeUrl}"
        style="width: 100%; height: 100%; border: none;"
        allowtransparency="true"
        allowfullscreen="true"
        title="TradingView Official Chart ${tvSymbol}"
      ></iframe>
    `;
  }

  async function fetchAndDrawCandles() {
    if (!chartState.isOpen) return;
    const data = await apiRequest(
      `/api/candles?instId=${encodeURIComponent(chartState.instId)}&bar=${encodeURIComponent(chartState.bar)}&limit=180`
    );
    chartState.data = data;

    el.chartPairTitle.textContent = data.instId;
    el.chartLivePriceBadge.textContent = formatUnitPrice(data.currentPrice);
    const isPos = data.change24hPct >= 0;
    el.chartChangeBadge.textContent = `${isPos ? '+' : ''}${data.change24hPct}%`;
    el.chartChangeBadge.className = `chart-change-badge ${isPos ? 'pos' : 'neg'}`;
    el.chartHigh24h.textContent = formatUnitPrice(data.high24h);
    el.chartLow24h.textContent = formatUnitPrice(data.low24h);
    if (el.chartVol24h) {
      el.chartVol24h.textContent = `${Number(data.vol24h || 0).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} ${data.base}`;
    }
    el.minBarPair.textContent = data.instId;
    el.minBarPrice.textContent = formatUnitPrice(data.currentPrice);

    renderCandlestickCanvas();
  }

  // ============================================================================
  // TECHNICAL INDICATOR CALCULATIONS FOR TRADINGVIEW PRO ENGINE
  // ============================================================================
  function computeEMA(values, period) {
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

  function computeBollinger(values, period = 20, mult = 2) {
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

  function computeVWAP(candles) {
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

  function computeRSI(values, period = 14) {
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

  function computeMACD(values) {
    const ema12 = computeEMA(values, 12);
    const ema26 = computeEMA(values, 26);
    const macdLine = values.map((_, i) => (ema12[i] !== null && ema26[i] !== null ? ema12[i] - ema26[i] : 0));
    const signalLine = computeEMA(macdLine, 9);
    const hist = macdLine.map((m, i) => m - (signalLine[i] || 0));
    return { macdLine, signalLine, hist };
  }

  function computeHeikinAshi(candles) {
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

  function formatCandleTime(ts, bar) {
    const d = new Date(Number(ts));
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    if (bar === '1D' || bar === '1W') return `${dd}.${mm}`;
    return `${dd}.${mm} ${hh}:${min}`;
  }

  function getCandleCountdown(bar) {
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

  // Last computed geometry for interactive mouse coordinate mapping
  let lastChartGeom = null;

  function renderCandlestickCanvas() {
    if (!chartState.data || !chartState.isOpen || chartState.isMinimized || chartState.engine === 'widget') return;
    const canvas = el.assetChartCanvas;
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(280, Math.floor(rect.width));
    const cssH = Math.max(160, Math.floor(rect.height));

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const w = cssW;
    const h = cssH;

    // 1. TradingView Dark Pro Background (#131722)
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, w, h);

    const allCandles = chartState.data.candles || [];
    if (allCandles.length === 0) {
      ctx.restore();
      return;
    }

    // Compute technical indicators across full history so values at slice edges are accurate
    const closes = allCandles.map((c) => c.close);
    const ema9All = computeEMA(closes, 9);
    const ema21All = computeEMA(closes, 21);
    const ema50All = computeEMA(closes, 50);
    const bbAll = computeBollinger(closes, 20, 2);
    const vwapAll = computeVWAP(allCandles);
    const rsiAll = computeRSI(closes, 14);
    const macdAll = computeMACD(closes);
    const plotSourceAll = chartState.chartType === 'heikin' ? computeHeikinAshi(allCandles) : allCandles;

    // Determine visible window based on zoom (visibleCount) & pan (panOffset)
    const visCount = Math.min(allCandles.length, Math.max(16, chartState.visibleCount));
    const maxPan = Math.max(0, allCandles.length - visCount);
    chartState.panOffset = Math.min(Math.max(0, chartState.panOffset), maxPan);

    const endIdx = allCandles.length - chartState.panOffset;
    const startIdx = Math.max(0, endIdx - visCount);
    const candles = plotSourceAll.slice(startIdx, endIdx);
    const rawCandles = allCandles.slice(startIdx, endIdx);

    if (candles.length === 0) {
      ctx.restore();
      return;
    }

    // Layout dimensions: Main Price Pane + Optional Sub-pane (RSI or MACD)
    const hasSubPane = (chartState.indicators.rsi || chartState.indicators.macd) && h >= 260;
    const padLeft = 8;
    const padRight = 76;
    const padTop = 30;
    const padBottom = 24;
    const totalPlotH = h - padTop - padBottom;
    const mainH = hasSubPane ? Math.floor(totalPlotH * 0.72) : totalPlotH;
    const subGap = hasSubPane ? 10 : 0;
    const subTop = padTop + mainH + subGap;
    const subH = hasSubPane ? totalPlotH - mainH - subGap : 0;
    const chartW = w - padLeft - padRight;

    // Subtle Watermark in center of chart (TradingView style)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
    ctx.font = `800 ${Math.max(22, Math.min(48, Math.floor(w * 0.055)))}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${chartState.data.instId} • ${chartState.bar}`, padLeft + chartW / 2, padTop + mainH * 0.48);
    ctx.font = `600 ${Math.max(11, Math.min(16, Math.floor(w * 0.02)))}px Inter, sans-serif`;
    ctx.fillText('OKX EUROPE SPOT (LIVE)', padLeft + chartW / 2, padTop + mainH * 0.48 + 22);
    ctx.restore();

    // Calculate Min/Max price in visible range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    candles.forEach((c, localIdx) => {
      const gIdx = startIdx + localIdx;
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
      if (chartState.indicators.bb && bbAll.upper[gIdx] !== null) {
        if (bbAll.upper[gIdx] > maxPrice) maxPrice = bbAll.upper[gIdx];
        if (bbAll.lower[gIdx] < minPrice) minPrice = bbAll.lower[gIdx];
      }
    });

    // Include Avg Buy Price in scale if close (within 12% of current price range)
    const avgBuyPx = Number(chartState.data.avgBuyPrice || 0);
    if (avgBuyPx > 0 && avgBuyPx >= minPrice * 0.9 && avgBuyPx <= maxPrice * 1.1) {
      if (avgBuyPx < minPrice) minPrice = avgBuyPx;
      if (avgBuyPx > maxPrice) maxPrice = avgBuyPx;
    }

    const rawRange = Math.max(0.00001, maxPrice - minPrice);
    minPrice -= rawRange * 0.06;
    maxPrice += rawRange * 0.06;
    const priceRange = Math.max(0.00001, maxPrice - minPrice);

    const priceToY = (p) => padTop + ((maxPrice - p) / priceRange) * mainH;
    const yToPrice = (y) => maxPrice - ((y - padTop) / mainH) * priceRange;
    const stepX = chartW / candles.length;
    const idxToX = (localIdx) => padLeft + localIdx * stepX + stepX / 2;

    lastChartGeom = {
      padLeft,
      padRight,
      padTop,
      padBottom,
      chartW,
      mainH,
      subTop,
      subH,
      w,
      h,
      minPrice,
      maxPrice,
      priceRange,
      stepX,
      startIdx,
      endIdx,
      candles,
      rawCandles,
      priceToY,
      yToPrice,
      idxToX
    };

    // 2. TradingView Horizontal & Vertical Grid Lines (#1e222d) + Right Price Axis Labels
    ctx.strokeStyle = '#1e222d';
    ctx.fillStyle = '#787b86';
    ctx.font = '10.5px JetBrains Mono, monospace';
    ctx.lineWidth = 1;

    const hSteps = Math.max(4, Math.min(8, Math.floor(mainH / 48)));
    for (let i = 0; i <= hSteps; i++) {
      const y = Math.round(padTop + (mainH / hSteps) * i) + 0.5;
      const pVal = maxPrice - (priceRange / hSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(formatRawPrice(pVal), w - padRight + 6, y + 3);
    }

    // Vertical time grid + Bottom Time Axis Labels
    const vStepInterval = Math.max(5, Math.floor(candles.length / 6));
    for (let i = 0; i < candles.length; i += vStepInterval) {
      const x = Math.round(idxToX(i)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + totalPlotH);
      ctx.stroke();

      const tLabel = formatCandleTime(candles[i].time, chartState.bar);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillText(tLabel, x, h - 7);
      ctx.restore();
    }

    // Right Axis Border & Bottom Axis Border
    ctx.strokeStyle = '#2a2e39';
    ctx.beginPath();
    ctx.moveTo(w - padRight + 0.5, padTop);
    ctx.lineTo(w - padRight + 0.5, h - padBottom);
    ctx.moveTo(padLeft, h - padBottom + 0.5);
    ctx.lineTo(w - padRight, h - padBottom + 0.5);
    ctx.stroke();

    // 3. Volume Histogram + Volume MA20 at bottom of Main Pane
    if (chartState.indicators.vol && maxVol > 0) {
      const volMaxH = mainH * 0.2;
      const bodyW = Math.max(2, Math.min(14, stepX * 0.72));
      candles.forEach((c, idx) => {
        const x = idxToX(idx);
        const isBull = c.close >= c.open;
        const vH = (c.volume / maxVol) * volMaxH;
        ctx.fillStyle = isBull ? 'rgba(8, 153, 129, 0.22)' : 'rgba(242, 54, 69, 0.22)';
        ctx.fillRect(x - bodyW / 2, padTop + mainH - vH, bodyW, vH);
      });
    }

    // 4. Bollinger Bands (BB 20, 2)
    if (chartState.indicators.bb) {
      ctx.save();
      ctx.beginPath();
      let firstPt = null;
      const validIndices = [];
      for (let i = 0; i < candles.length; i++) {
        const gIdx = startIdx + i;
        if (bbAll.upper[gIdx] !== null) {
          validIndices.push(i);
          const x = idxToX(i);
          const y = priceToY(bbAll.upper[gIdx]);
          if (firstPt === null) {
            ctx.moveTo(x, y);
            firstPt = i;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let k = validIndices.length - 1; k >= 0; k--) {
        const i = validIndices[k];
        const gIdx = startIdx + i;
        ctx.lineTo(idxToX(i), priceToY(bbAll.lower[gIdx]));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 188, 212, 0.07)';
      ctx.fill();

      const drawBBLine = (arr, color, dashed = false) => {
        ctx.beginPath();
        if (dashed) ctx.setLineDash([3, 3]);
        else ctx.setLineDash([]);
        let st = false;
        for (let i = 0; i < candles.length; i++) {
          const val = arr[startIdx + i];
          if (val === null) continue;
          const x = idxToX(i);
          const y = priceToY(val);
          if (!st) {
            ctx.moveTo(x, y);
            st = true;
          } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };
      drawBBLine(bbAll.upper, 'rgba(0, 188, 212, 0.65)');
      drawBBLine(bbAll.mid, 'rgba(255, 152, 0, 0.65)', true);
      drawBBLine(bbAll.lower, 'rgba(0, 188, 212, 0.65)');
      ctx.restore();
    }

    // 5. Main Series: Candles / Hollow Candles / Heikin Ashi / Area / Line / Bars
    const bodyWidth = Math.max(2.5, Math.min(16, stepX * 0.72));

    if (chartState.chartType === 'area' || chartState.chartType === 'line') {
      ctx.save();
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const x = idxToX(idx);
        const y = priceToY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (chartState.chartType === 'area') {
        ctx.lineTo(idxToX(candles.length - 1), padTop + mainH);
        ctx.lineTo(idxToX(0), padTop + mainH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + mainH);
        grad.addColorStop(0, 'rgba(41, 98, 255, 0.32)');
        grad.addColorStop(1, 'rgba(41, 98, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();
    } else if (chartState.chartType === 'bars') {
      candles.forEach((c, idx) => {
        const x = idxToX(idx);
        const isBull = c.close >= c.open;
        const color = isBull ? '#089981' : '#f23645';
        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);
        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.moveTo(x - bodyWidth / 2, openY);
        ctx.lineTo(x, openY);
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + bodyWidth / 2, closeY);
        ctx.stroke();
      });
    } else {
      // Candles, Hollow Candles, or Heikin Ashi
      candles.forEach((c, idx) => {
        const xCenter = idxToX(idx);
        const isBull = c.close >= c.open;
        // Authentic TradingView Bull (#089981) and Bear (#f23645) colors
        const color = isBull ? '#089981' : '#f23645';

        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);
        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(1.5, Math.abs(closeY - openY));

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xCenter, highY);
        ctx.lineTo(xCenter, lowY);
        ctx.stroke();

        // Body
        if (chartState.chartType === 'hollow' && isBull) {
          ctx.fillStyle = '#131722';
          ctx.fillRect(xCenter - bodyWidth / 2, topY, bodyWidth, bodyH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.3;
          ctx.strokeRect(xCenter - bodyWidth / 2, topY, bodyWidth, bodyH);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(xCenter - bodyWidth / 2, topY, bodyWidth, bodyH);
        }
      });
    }

    // 6. Overlay Indicators: EMA 9 / 21 / 50 & VWAP
    const drawOverlayLine = (fullArr, color, width = 1.5) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < candles.length; i++) {
        const val = fullArr[startIdx + i];
        if (val === null || val === undefined) continue;
        const x = idxToX(i);
        const y = priceToY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    if (chartState.indicators.ema) {
      drawOverlayLine(ema9All, '#2962ff', 1.5); // EMA 9 (Blue)
      drawOverlayLine(ema21All, '#ff9800', 1.5); // EMA 21 (Orange)
      drawOverlayLine(ema50All, '#e040fb', 1.5); // EMA 50 (Purple)
    }

    if (chartState.indicators.vwap) {
      drawOverlayLine(vwapAll, '#ffeb3b', 1.6); // VWAP (Yellow)
    }

    // 7. Auto Support / Resistance Pivot Levels + User's Average Buy Price + Order Markers
    if (chartState.indicators.sr) {
      let swingHigh = -Infinity;
      let swingLow = Infinity;
      rawCandles.forEach((c) => {
        if (c.high > swingHigh) swingHigh = c.high;
        if (c.low < swingLow) swingLow = c.low;
      });

      const drawHorizontalTagLine = (priceVal, label, lineColor, bgTagColor, textColor = '#fff') => {
        if (priceVal < minPrice || priceVal > maxPrice) return;
        const y = Math.round(priceToY(priceVal)) + 0.5;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        // Label badge on left/right
        ctx.font = 'bold 9.5px JetBrains Mono, monospace';
        const tagText = `${label}: ${formatRawPrice(priceVal)}`;
        const tw = ctx.measureText(tagText).width + 10;
        ctx.fillStyle = bgTagColor;
        ctx.fillRect(padLeft + 6, y - 9, tw, 16);
        ctx.fillStyle = textColor;
        ctx.fillText(tagText, padLeft + 11, y + 2.5);
        ctx.restore();
      };

      drawHorizontalTagLine(swingHigh, 'OPÓR (MAX)', 'rgba(242, 54, 69, 0.55)', 'rgba(242, 54, 69, 0.85)');
      drawHorizontalTagLine(swingLow, 'WSPARCIE (MIN)', 'rgba(8, 153, 129, 0.55)', 'rgba(8, 153, 129, 0.85)');

      if (avgBuyPx > 0) {
        drawHorizontalTagLine(avgBuyPx, 'ŚR. CENA ZAKUPU', '#bcff2f', 'rgba(188, 255, 47, 0.92)', '#090b10');
      }
    }

    // Plot user's Buy/Sell Order Markers on chart
    const userOrders = chartState.data.userOrders || [];
    if (userOrders.length > 0) {
      userOrders.forEach((ord) => {
        if (ord.status === 'OPEN' && ord.price >= minPrice && ord.price <= maxPrice) {
          const y = Math.round(priceToY(ord.price)) + 0.5;
          ctx.save();
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = ord.side === 'BUY' ? '#089981' : '#f23645';
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(w - padRight, y);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // 8. Live Current Price Line + Glowing Right Axis Tag + Countdown Timer
    const livePrice = chartState.data.currentPrice || candles[candles.length - 1].close;
    const latestCandle = candles[candles.length - 1];
    const isLatestBull = latestCandle.close >= latestCandle.open;
    const liveColor = isLatestBull ? '#089981' : '#f23645';

    if (livePrice >= minPrice && livePrice <= maxPrice) {
      const liveY = Math.round(priceToY(livePrice)) + 0.5;
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = liveColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padLeft, liveY);
      ctx.lineTo(w - padRight, liveY);
      ctx.stroke();

      // Right axis live price tag + countdown
      ctx.fillStyle = liveColor;
      ctx.fillRect(w - padRight + 1, liveY - 14, padRight - 2, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10.5px JetBrains Mono, monospace';
      ctx.fillText(formatRawPrice(livePrice), w - padRight + 5, liveY - 1);
      ctx.font = '9.5px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillText(getCandleCountdown(chartState.bar), w - padRight + 5, liveY + 10);
      ctx.restore();
    }

    // 9. User Drawings (Trendlines, Horizontal Price Levels, Fibonacci, Measure Tool)
    const pairDrawings = (chartState.drawingsByPair[chartState.instId] || []).slice();
    if (chartState.pendingDrawing) {
      pairDrawings.push(chartState.pendingDrawing);
    }

    pairDrawings.forEach((d) => {
      ctx.save();
      if (d.type === 'hline') {
        const y = priceToY(d.price1);
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`Poziom: ${formatRawPrice(d.price1)}`, w - padRight - 105, y - 4);
      } else if (d.type === 'trendline' && d.price2 !== undefined) {
        const x1 = idxToX(d.idx1 - startIdx);
        const y1 = priceToY(d.price1);
        const x2 = idxToX(d.idx2 - startIdx);
        const y2 = priceToY(d.price2);
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
        ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'fib' && d.price2 !== undefined) {
        const x1 = Math.min(idxToX(d.idx1 - startIdx), idxToX(d.idx2 - startIdx));
        const x2 = Math.max(idxToX(d.idx1 - startIdx), idxToX(d.idx2 - startIdx));
        const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const fibColors = ['#787b86', '#f23645', '#ff9800', '#089981', '#00bcd4', '#2962ff', '#787b86'];
        const diff = d.price2 - d.price1;
        fibLevels.forEach((lvl, idx) => {
          const p = d.price2 - diff * lvl;
          const y = priceToY(p);
          ctx.strokeStyle = fibColors[idx];
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(w - padRight, y);
          ctx.stroke();
          ctx.fillStyle = fibColors[idx];
          ctx.font = '9.5px JetBrains Mono, monospace';
          ctx.fillText(`Fib ${(lvl * 100).toFixed(1)}% (${formatRawPrice(p)})`, x1 + 4, y - 3);
        });
      } else if (d.type === 'measure' && d.price2 !== undefined) {
        const x1 = idxToX(d.idx1 - startIdx);
        const y1 = priceToY(d.price1);
        const x2 = idxToX(d.idx2 - startIdx);
        const y2 = priceToY(d.price2);
        const delta = d.price2 - d.price1;
        const pct = d.price1 > 0 ? ((delta / d.price1) * 100).toFixed(2) : '0.00';
        const barsCount = Math.abs(d.idx2 - d.idx1);
        const isUp = delta >= 0;

        ctx.fillStyle = isUp ? 'rgba(8, 153, 129, 0.2)' : 'rgba(242, 54, 69, 0.2)';
        ctx.strokeStyle = isUp ? '#089981' : '#f23645';
        ctx.lineWidth = 1.3;
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));

        const badgeText = `${isUp ? '+' : ''}${formatRawPrice(delta)} (${isUp ? '+' : ''}${pct}%) • ${barsCount} świec`;
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        const bw = ctx.measureText(badgeText).width + 12;
        const bx = (x1 + x2) / 2 - bw / 2;
        const by = Math.min(y1, y2) - 22;
        ctx.fillStyle = isUp ? '#089981' : '#f23645';
        ctx.fillRect(bx, Math.max(padTop + 2, by), bw, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, bx + 6, Math.max(padTop + 2, by) + 12);
      }
      ctx.restore();
    });

    // 10. Sub-pane Oscillator: RSI (14) or MACD (12, 26, 9)
    if (hasSubPane) {
      ctx.save();
      // Separator bar
      ctx.strokeStyle = '#2a2e39';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, subTop - 4);
      ctx.lineTo(w, subTop - 4);
      ctx.stroke();

      if (chartState.indicators.rsi) {
        const rsiToY = (v) => subTop + ((100 - v) / 100) * subH;
        const y70 = rsiToY(70);
        const y30 = rsiToY(30);
        ctx.fillStyle = 'rgba(179, 136, 255, 0.06)';
        ctx.fillRect(padLeft, y70, chartW, y30 - y70);

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(179, 136, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y70);
        ctx.lineTo(w - padRight, y70);
        ctx.moveTo(padLeft, y30);
        ctx.lineTo(w - padRight, y30);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#787b86';
        ctx.font = '9.5px JetBrains Mono, monospace';
        ctx.fillText('70', w - padRight + 6, y70 + 3);
        ctx.fillText('30', w - padRight + 6, y30 + 3);

        ctx.beginPath();
        let st = false;
        for (let i = 0; i < candles.length; i++) {
          const val = rsiAll[startIdx + i];
          if (val === null) continue;
          const x = idxToX(i);
          const y = rsiToY(val);
          if (!st) {
            ctx.moveTo(x, y);
            st = true;
          } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        const lastRsi = rsiAll[endIdx - 1];
        ctx.fillStyle = '#b388ff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`RSI(14): ${lastRsi ? lastRsi.toFixed(1) : '—'}`, padLeft + 6, subTop + 11);
      } else if (chartState.indicators.macd) {
        let maxAbs = 0.0001;
        for (let i = 0; i < candles.length; i++) {
          const g = startIdx + i;
          maxAbs = Math.max(
            maxAbs,
            Math.abs(macdAll.macdLine[g] || 0),
            Math.abs(macdAll.signalLine[g] || 0),
            Math.abs(macdAll.hist[g] || 0)
          );
        }
        const zeroY = subTop + subH / 2;
        const mToY = (v) => zeroY - (v / maxAbs) * (subH * 0.44);

        ctx.strokeStyle = '#1e222d';
        ctx.beginPath();
        ctx.moveTo(padLeft, zeroY);
        ctx.lineTo(w - padRight, zeroY);
        ctx.stroke();

        // Histogram
        const barW = Math.max(2, Math.min(10, stepX * 0.6));
        for (let i = 0; i < candles.length; i++) {
          const hVal = macdAll.hist[startIdx + i] || 0;
          const x = idxToX(i);
          const y = mToY(hVal);
          ctx.fillStyle = hVal >= 0 ? 'rgba(8, 153, 129, 0.65)' : 'rgba(242, 54, 69, 0.65)';
          ctx.fillRect(x - barW / 2, Math.min(zeroY, y), barW, Math.max(1, Math.abs(y - zeroY)));
        }

        // MACD & Signal lines
        const drawSubLine = (arr, col) => {
          ctx.beginPath();
          for (let i = 0; i < candles.length; i++) {
            const x = idxToX(i);
            const y = mToY(arr[startIdx + i] || 0);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        };
        drawSubLine(macdAll.macdLine, '#2962ff');
        drawSubLine(macdAll.signalLine, '#ff9800');

        ctx.fillStyle = '#2962ff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(
          `MACD(12,26,9): ${formatRawPrice(macdAll.macdLine[endIdx - 1] || 0)}`,
          padLeft + 6,
          subTop + 11
        );
      }
      ctx.restore();
    }

    // 11. Interactive Crosshair (+) & Hovered Candle Legend Update
    let activeLocalIdx = candles.length - 1;
    if (
      chartState.hoverX !== null &&
      chartState.hoverY !== null &&
      chartState.hoverX >= padLeft &&
      chartState.hoverX <= w - padRight &&
      chartState.hoverY >= padTop &&
      chartState.hoverY <= h - padBottom
    ) {
      const hoveredIdx = Math.min(
        candles.length - 1,
        Math.max(0, Math.floor((chartState.hoverX - padLeft) / stepX))
      );
      activeLocalIdx = hoveredIdx;
      const snapX = Math.round(idxToX(hoveredIdx)) + 0.5;
      const snapY = Math.round(chartState.hoverY) + 0.5;

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#9598a1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Vertical crosshair line
      ctx.moveTo(snapX, padTop);
      ctx.lineTo(snapX, h - padBottom);
      // Horizontal crosshair line
      ctx.moveTo(padLeft, snapY);
      ctx.lineTo(w - padRight, snapY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price Pill on Right Axis if cursor is inside Main Price Pane
      if (snapY <= padTop + mainH) {
        const hoveredPrice = yToPrice(snapY);
        ctx.fillStyle = '#2a2e39';
        ctx.fillRect(w - padRight + 1, snapY - 10, padRight - 2, 20);
        ctx.strokeStyle = '#5b8def';
        ctx.strokeRect(w - padRight + 1, snapY - 10, padRight - 2, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10.5px JetBrains Mono, monospace';
        ctx.fillText(formatRawPrice(hoveredPrice), w - padRight + 5, snapY + 3.5);
      }

      // Time Pill on Bottom Axis
      const hoveredTimeStr = formatCandleTime(candles[hoveredIdx].time, chartState.bar);
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      const tw = ctx.measureText(hoveredTimeStr).width + 14;
      const tx = Math.min(Math.max(padLeft, snapX - tw / 2), w - padRight - tw);
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(tx, h - padBottom + 2, tw, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hoveredTimeStr, tx + 7, h - padBottom + 14);
      ctx.restore();
    }

    // Update Top-Left Floating TradingView Legend
    const cInfo = candles[activeLocalIdx] || candles[candles.length - 1];
    const gInfoIdx = startIdx + activeLocalIdx;
    const cChange = cInfo.close - cInfo.open;
    const cChangePct = cInfo.open > 0 ? ((cChange / cInfo.open) * 100).toFixed(2) : '0.00';
    const cCol = cChange >= 0 ? '#089981' : '#f23645';

    if (el.tvLegendMainRow) {
      el.tvLegendMainRow.innerHTML = `
        <strong class="tv-leg-sym">${chartState.data.instId}</strong>
        <span class="tv-leg-sep">•</span>
        <span class="tv-leg-tf">${chartState.bar}</span>
        <span class="tv-leg-sep">•</span>
        <span class="tv-leg-exch">OKX Spot</span>
        <span class="tv-leg-ohlc">
          O<span style="color:${cCol}">${formatRawPrice(cInfo.open)}</span>
          H<span style="color:${cCol}">${formatRawPrice(cInfo.high)}</span>
          L<span style="color:${cCol}">${formatRawPrice(cInfo.low)}</span>
          C<span style="color:${cCol}">${formatRawPrice(cInfo.close)}</span>
          <span style="color:${cCol}">(${cChange >= 0 ? '+' : ''}${cChangePct}%)</span>
          Wol: <strong style="color:#d1d4dc">${Number(cInfo.volume || 0).toFixed(2)}</strong>
        </span>
      `;
    }

    if (el.tvLegendIndicatorsRow) {
      const badges = [];
      if (chartState.indicators.ema) {
        if (ema9All[gInfoIdx]) badges.push(`<span style="color:#2962ff">EMA9: ${formatRawPrice(ema9All[gInfoIdx])}</span>`);
        if (ema21All[gInfoIdx]) badges.push(`<span style="color:#ff9800">EMA21: ${formatRawPrice(ema21All[gInfoIdx])}</span>`);
        if (ema50All[gInfoIdx]) badges.push(`<span style="color:#e040fb">EMA50: ${formatRawPrice(ema50All[gInfoIdx])}</span>`);
      }
      if (chartState.indicators.bb && bbAll.mid[gInfoIdx]) {
        badges.push(`<span style="color:#00bcd4">BB(20,2): ${formatRawPrice(bbAll.lower[gInfoIdx])}–${formatRawPrice(bbAll.upper[gInfoIdx])}</span>`);
      }
      if (chartState.indicators.vwap && vwapAll[gInfoIdx]) {
        badges.push(`<span style="color:#ffeb3b">VWAP: ${formatRawPrice(vwapAll[gInfoIdx])}</span>`);
      }
      if (avgBuyPx > 0) {
        badges.push(`<span style="color:#bcff2f">Śr. zakup: ${formatRawPrice(avgBuyPx)} USDC</span>`);
      }
      el.tvLegendIndicatorsRow.innerHTML = badges.join(' • ');
      el.tvLegendIndicatorsRow.style.display = badges.length > 0 ? 'flex' : 'none';
    }

    ctx.restore();
  }

  function initTradingViewCanvasInteractions() {
    const canvas = el.assetChartCanvas;
    if (!canvas) return;

    let isPanningChart = false;
    let panStartX = 0;
    let panStartOffset = 0;

    canvas.addEventListener(
      'wheel',
      (e) => {
        if (chartState.engine !== 'pro') return;
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        const step = Math.max(4, Math.round(chartState.visibleCount * 0.14));
        if (delta > 0) {
          chartState.visibleCount = Math.min(180, chartState.visibleCount + step);
        } else {
          chartState.visibleCount = Math.max(18, chartState.visibleCount - step);
        }
        renderCandlestickCanvas();
      },
      { passive: false }
    );

    canvas.addEventListener('mousedown', (e) => {
      if (chartState.engine !== 'pro' || !lastChartGeom) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const localIdx = Math.min(
        lastChartGeom.candles.length - 1,
        Math.max(0, Math.floor((x - lastChartGeom.padLeft) / lastChartGeom.stepX))
      );
      const globalIdx = lastChartGeom.startIdx + localIdx;
      const clickedPrice = lastChartGeom.yToPrice(y);

      if (chartState.activeTool === 'hline') {
        if (!chartState.drawingsByPair[chartState.instId]) {
          chartState.drawingsByPair[chartState.instId] = [];
        }
        chartState.drawingsByPair[chartState.instId].push({
          type: 'hline',
          price1: clickedPrice
        });
        renderCandlestickCanvas();
        return;
      }

      if (
        chartState.activeTool === 'trendline' ||
        chartState.activeTool === 'fib' ||
        chartState.activeTool === 'measure'
      ) {
        if (!chartState.pendingDrawing) {
          chartState.pendingDrawing = {
            type: chartState.activeTool,
            idx1: globalIdx,
            price1: clickedPrice,
            idx2: globalIdx,
            price2: clickedPrice
          };
        } else {
          chartState.pendingDrawing.idx2 = globalIdx;
          chartState.pendingDrawing.price2 = clickedPrice;
          if (!chartState.drawingsByPair[chartState.instId]) {
            chartState.drawingsByPair[chartState.instId] = [];
          }
          chartState.drawingsByPair[chartState.instId].push(chartState.pendingDrawing);
          chartState.pendingDrawing = null;
        }
        renderCandlestickCanvas();
        return;
      }

      // Default crosshair mode: click-and-drag pans through history
      isPanningChart = true;
      panStartX = e.clientX;
      panStartOffset = chartState.panOffset;
    });

    window.addEventListener('mousemove', (e) => {
      if (!chartState.isOpen || chartState.isMinimized || chartState.engine !== 'pro') return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isPanningChart && lastChartGeom) {
        const dx = e.clientX - panStartX;
        const candlesDelta = Math.round(dx / Math.max(3, lastChartGeom.stepX));
        const total = (chartState.data?.candles || []).length;
        const maxPan = Math.max(0, total - chartState.visibleCount);
        chartState.panOffset = Math.min(Math.max(0, panStartOffset + candlesDelta), maxPan);
        renderCandlestickCanvas();
        return;
      }

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        chartState.hoverX = x;
        chartState.hoverY = y;
        if (chartState.pendingDrawing && lastChartGeom) {
          const localIdx = Math.min(
            lastChartGeom.candles.length - 1,
            Math.max(0, Math.floor((x - lastChartGeom.padLeft) / lastChartGeom.stepX))
          );
          chartState.pendingDrawing.idx2 = lastChartGeom.startIdx + localIdx;
          chartState.pendingDrawing.price2 = lastChartGeom.yToPrice(y);
        }
        renderCandlestickCanvas();
      }
    });

    window.addEventListener('mouseup', () => {
      isPanningChart = false;
    });

    canvas.addEventListener('mouseleave', () => {
      chartState.hoverX = null;
      chartState.hoverY = null;
      renderCandlestickCanvas();
    });

    canvas.addEventListener('dblclick', () => {
      chartState.panOffset = 0;
      chartState.visibleCount = 68;
      renderCandlestickCanvas();
    });
  }

  // ============================================================================
  // AI CHAT HELPER
  // ============================================================================
  function appendChatMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;

    const formattedHtml = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');

    bubble.innerHTML = `
      <div class="bubble-meta">${role === 'user' ? 'Ty' : 'OKX EEA AI Agent'}</div>
      <div class="bubble-text">${formattedHtml}</div>
    `;
    el.chatMessages.appendChild(bubble);
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  }

  // ============================================================================
  // LOCALSTORAGE KEY PERSISTENCE HELPERS
  // ============================================================================
  const LS_KEYS_STORAGE = 'okx_eea_saved_keys_v1';

  function saveKeysToLocalStorage(mode, apiKey, secretKey, passphrase) {
    try {
      const current = JSON.parse(localStorage.getItem(LS_KEYS_STORAGE) || '{}');
      current[mode] = { apiKey, secretKey, passphrase };
      localStorage.setItem(LS_KEYS_STORAGE, JSON.stringify(current));
    } catch (e) {
      // Ignore storage error
    }
  }

  function clearKeysFromLocalStorage(mode) {
    try {
      const current = JSON.parse(localStorage.getItem(LS_KEYS_STORAGE) || '{}');
      delete current[mode];
      localStorage.setItem(LS_KEYS_STORAGE, JSON.stringify(current));
    } catch (e) {
      // Ignore storage error
    }
  }

  function getKeysFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS_STORAGE) || '{}');
    } catch (e) {
      return {};
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  function bindEvents() {
    // Toggle Left Sidebar
    if (el.toggleLeftSidebarBtn) {
      el.toggleLeftSidebarBtn.addEventListener('click', () => {
        el.leftWindowSidebar.classList.toggle('collapsed');
      });
    }
    if (el.closeLeftSidebarMobileBtn) {
      el.closeLeftSidebarMobileBtn.addEventListener('click', () => {
        el.leftWindowSidebar.classList.add('collapsed');
      });
    }

    // Header API badge click opens Window 1 & expands API Keys accordion
    if (el.headerApiConnBadge) {
      el.headerApiConnBadge.addEventListener('click', () => {
        setWindowMode('win-ctrl-api', 'grid');
        el.accordionApiBody.removeAttribute('hidden');
        el.apiAccordionToggleBtn.setAttribute('aria-expanded', 'true');
        const domEl = document.getElementById('win-ctrl-api');
        if (domEl) domEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Toggle Top Window Menu Draggable Window next to Agent AI
    if (el.toggleTopWindowMenuBtn && el.topWindowMenuBar) {
      el.toggleTopWindowMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = el.topWindowMenuBar.hasAttribute('hidden');
        if (isHidden) {
          el.topWindowMenuBar.removeAttribute('hidden');
          el.topWindowMenuBar.style.zIndex = String(++topWindowZIndex + 30);
          el.toggleTopWindowMenuBtn.setAttribute('aria-expanded', 'true');
        } else {
          el.topWindowMenuBar.setAttribute('hidden', '');
          el.toggleTopWindowMenuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Size buttons (Min / Medium / Full) for Top Window Menu (#topWindowMenuBar)
    document.querySelectorAll('[data-topmenu-size]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const size = btn.getAttribute('data-topmenu-size');
        applyTopMenuWindowSize(size);
      });
    });

    if (el.closeTopWindowMenuBtn && el.topWindowMenuBar) {
      el.closeTopWindowMenuBtn.addEventListener('click', () => {
        el.topWindowMenuBar.setAttribute('hidden', '');
        if (el.toggleTopWindowMenuBtn) el.toggleTopWindowMenuBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Toggle Top Controls 1-3 visibility button
    if (el.btnToggleTopControls) {
      el.btnToggleTopControls.addEventListener('click', () => {
        const topWins = WINDOWS_REGISTRY.filter((w) => w.isTopCtrl);
        const anyVisible = topWins.some((w) => w.mode !== 'docked-top' && w.mode !== 'docked-sidebar');
        if (anyVisible) {
          topWins.forEach((w) => setWindowMode(w.id, 'docked-top'));
          showToast('Ukryto górne okna 1–3 (dostępne w Menu Górnym i Sidebarze).');
        } else {
          topWins.forEach((w) => setWindowMode(w.id, 'grid'));
          showToast('Przywrócono górne okna sterowania 1–3.');
        }
      });
    }

    // Accordions toggle (Requirement 1)
    document.querySelectorAll('.accordion-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const body = document.getElementById(targetId);
        const isHidden = body.hasAttribute('hidden');
        if (isHidden) {
          body.removeAttribute('hidden');
          btn.setAttribute('aria-expanded', 'true');
        } else {
          body.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Switch Demo / Live Mode
    el.btnModeDemo.addEventListener('click', async () => {
      el.apiKeyProfileSelect.value = 'demo';
      const res = await apiRequest('/api/config', 'POST', { apiMode: 'demo' });
      renderApp(res.state);
      showToast('Przełączono na Portfel Handlowy DEMO (Notowania OKX na żywo)');
    });

    el.btnModeLive.addEventListener('click', async () => {
      el.apiKeyProfileSelect.value = 'live';
      const res = await apiRequest('/api/config', 'POST', { apiMode: 'live' });
      renderApp(res.state);
      const liveConn = res.state.config.apiConnection;
      if (!liveConn.connected) {
        showToast(`⚠️ Tryb LIVE: Klucze API niepodłączone — ${liveConn.reason}`);
      } else {
        showToast('Przełączono na Portfel Handlowy LIVE');
      }
    });

    // Save & Validate API Keys form + Sync OKX Portfolio
    el.apiKeyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode = el.apiKeyProfileSelect.value;
      const apiKey = el.inputApiKey.value.trim();
      const secretKey = el.inputSecretKey.value.trim();
      const passphrase = el.inputPassphrase.value.trim();

      if (apiKey && secretKey && passphrase) {
        saveKeysToLocalStorage(mode, apiKey, secretKey, passphrase);
      }

      showToast(`⏳ Łączenie z OKX API (${mode.toUpperCase()}) i pobieranie portfela...`);
      const res = await apiRequest('/api/config', 'POST', {
        apiMode: mode,
        apiKeyConfig: {
          mode,
          apiKey,
          secretKey,
          passphrase
        }
      });
      renderApp(res.state);
      const conn = res.state.config.apiConnections[mode];
      if (conn.connected) {
        showToast(`✅ Połączono z OKX (${mode.toUpperCase()})! Pobrano prawdziwe dane Twojego portfela.`);
      } else {
        showToast(`🔴 Błąd połączenia z OKX (${mode.toUpperCase()}): ${conn.reason}`);
      }
    });

    // Sync Portfolio from OKX buttons (Window 1 & Panel 1)
    const handleManualSyncOkx = async () => {
      const mode = appState ? appState.config.apiMode : 'demo';
      showToast(`🔄 Pobieranie salda i zleceń z konta OKX (${mode.toUpperCase()})...`);
      const res = await apiRequest('/api/portfolio/sync', 'POST', { mode });
      if (res.state) renderApp(res.state);
      if (res.ok) {
        showToast(`✅ Portfel ${mode.toUpperCase()} zsynchronizowany z Twoim kontem OKX!`);
      } else {
        el.accordionApiBody.removeAttribute('hidden');
        el.apiAccordionToggleBtn.setAttribute('aria-expanded', 'true');
        showToast(`⚠️ ${res.error || 'Wklej klucze API z konta Demo OKX w Oknie 1, aby pobrać swój portfel.'}`);
      }
    };

    if (el.btnSyncOkxPortfolio) {
      el.btnSyncOkxPortfolio.addEventListener('click', handleManualSyncOkx);
    }
    if (el.btnSyncPortfolioPanel) {
      el.btnSyncPortfolioPanel.addEventListener('click', handleManualSyncOkx);
    }

    // Disconnect API Keys button
    if (el.btnDisconnectApiKeys) {
      el.btnDisconnectApiKeys.addEventListener('click', async () => {
        const mode = el.apiKeyProfileSelect.value;
        const res = await apiRequest('/api/config', 'POST', {
          apiMode: mode,
          apiKeyConfig: { mode, action: 'disconnect' }
        });
        renderApp(res.state);
        showToast(`🔌 Rozłączono klucze API (${mode.toUpperCase()}).`);
      });
    }

    // Clear API Keys button
    if (el.btnClearApiKeys) {
      el.btnClearApiKeys.addEventListener('click', async () => {
        const mode = el.apiKeyProfileSelect.value;
        el.inputApiKey.value = '';
        el.inputSecretKey.value = '';
        el.inputPassphrase.value = '';
        clearKeysFromLocalStorage(mode);
        const res = await apiRequest('/api/config', 'POST', {
          apiMode: mode,
          apiKeyConfig: { mode, action: 'clear' }
        });
        renderApp(res.state);
        showToast(`🗑️ Wyczyszczono klucze API (${mode.toUpperCase()}) — status: Niepodłączone.`);
      });
    }

    // Switch AI Agent Status (Deactivated / Active) - Header bar & Window 3
    async function handleDeactivateAiAgent() {
      const res = await apiRequest('/api/config', 'POST', { aiStatus: 'deactivated' });
      renderApp(res.state);
      showToast('Agent AI został DEZAKTYWOWANY.');
    }

    async function handleActivateAiAgent() {
      const res = await apiRequest('/api/config', 'POST', { aiStatus: 'active' });
      renderApp(res.state);
      showToast('Agent AI jest teraz AKTYWNY!');
    }

    if (el.headerBtnAiDeactivated) {
      el.headerBtnAiDeactivated.addEventListener('click', handleDeactivateAiAgent);
    }
    if (el.headerBtnAiActive) {
      el.headerBtnAiActive.addEventListener('click', handleActivateAiAgent);
    }
    if (el.btnAiDeactivated) {
      el.btnAiDeactivated.addEventListener('click', handleDeactivateAiAgent);
    }
    if (el.btnAiActive) {
      el.btnAiActive.addEventListener('click', handleActivateAiAgent);
    }

    el.quickActivateAiBtn.addEventListener('click', async () => {
      const res = await apiRequest('/api/config', 'POST', { aiStatus: 'active' });
      renderApp(res.state);
      showToast('Agent AI został aktywowany!');
    });

    // Requirement 4: Every click on Start Trading button opens the Pop-up showing status
    el.mainStartTradingBtn.addEventListener('click', () => {
      openAuthPopup();
    });

    el.openPopupFromAccordionBtn.addEventListener('click', () => {
      openAuthPopup();
    });

    // Close Pop-up with X in top-right corner (Requirement 4)
    el.closeAuthPopupBtn.addEventListener('click', () => {
      closeAuthPopup();
    });

    // Fullscreen toggle for Auth Pop-up
    if (el.btnPopupToggleFullscreen) {
      el.btnPopupToggleFullscreen.addEventListener('click', () => {
        const isFull = el.authPopupDialog.classList.toggle('modal-fullscreen');
        if (isFull) {
          el.authPopupDialog.style.left = '';
          el.authPopupDialog.style.top = '';
          el.btnPopupToggleFullscreen.textContent = '🗗 Zmniejsz (Przesuwne)';
        } else {
          el.btnPopupToggleFullscreen.textContent = '⛶ Cały ekran';
        }
      });
    }

    // Confirm & Execute Trade by pressing START inside Pop-up (Requirement 4 & 8)
    el.popupConfirmStartBtn.addEventListener('click', async () => {
      if (!appState || !appState.activeTradeOrder) return;
      const res = await apiRequest('/api/trade/authorize', 'POST', {
        orderId: appState.activeTradeOrder.id
      });
      if (!res.ok) {
        showToast(`⚠️ Błąd: ${res.error}`);
        return;
      }
      renderApp(res.state);
      showToast(`✅ ${res.message}`);
      appendChatMessage(
        'assistant',
        `✅ **Autoryzacja potwierdzona przyciskiem START!** Zrealizowano transakcję **${res.executedOrder.side === 'BUY' ? 'KUPNA' : 'SPRZEDAŻY'} ${res.executedOrder.amount} ${res.executedOrder.asset}** po prawdziwym kursie OKX (**${formatUnitPrice(res.executedOrder.price)}**) za **${formatUsdc(res.executedOrder.usdcValue)}**. Portfel Handlowy, bilans Kupiono/Sprzedano w USDC oraz Historia Portfela zostały zaktualizowane.`
      );
      if (chartState.isOpen && !chartState.isMinimized) {
        fetchAndDrawCandles();
      }
    });

    // Stop Trading button
    const handleStopTrading = async () => {
      const res = await apiRequest('/api/trade/stop', 'POST');
      if (res.ok) {
        renderApp(res.state);
        showToast(`⏹ ${res.message}`);
      }
    };
    el.mainStopTradingBtn.addEventListener('click', handleStopTrading);
    el.popupStopCancelBtn.addEventListener('click', async () => {
      await handleStopTrading();
      closeAuthPopup();
    });

    // AI Agent Chat Submit
    const sendAiPrompt = async (promptText) => {
      if (!promptText.trim()) return;
      appendChatMessage('user', promptText);
      el.aiChatInput.value = '';

      const res = await apiRequest('/api/agent/chat', 'POST', { message: promptText });
      appendChatMessage('assistant', res.reply);

      if (res.ok && res.state) {
        renderApp(res.state);
        openAuthPopup();
      }
    };

    el.aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendAiPrompt(el.aiChatInput.value);
    });

    document.querySelectorAll('.prompt-chip').forEach((chip) => {
      chip.addEventListener('click', async () => {
        const prompt = chip.getAttribute('data-prompt');
        if (appState && appState.config.aiStatus !== 'active') {
          const cfgRes = await apiRequest('/api/config', 'POST', { aiStatus: 'active' });
          renderApp(cfgRes.state);
          showToast('Automatycznie aktywowano Agenta AI.');
        }
        sendAiPrompt(prompt);
      });
    });

    // Manual / Quick Order Form
    el.tabSideBuy.addEventListener('click', () => {
      currentOrderSide = 'BUY';
      el.tabSideBuy.classList.add('active-buy');
      el.tabSideSell.classList.remove('active-sell');
    });

    el.tabSideSell.addEventListener('click', () => {
      currentOrderSide = 'SELL';
      el.tabSideSell.classList.add('active-sell');
      el.tabSideBuy.classList.remove('active-buy');
    });

    const recalcUsdcFromAmount = () => {
      if (!appState) return;
      const pair = el.tradePairSelect.value;
      const market = appState.markets.find((m) => m.instId === pair) || appState.markets[0];
      const price = el.tradeOrderType.value === 'LIMIT' ? Number(el.tradePriceInput.value || market.price) : market.price;
      const amt = Number(el.tradeAmountInput.value || 0);
      el.tradeUsdcInput.value = (amt * price).toFixed(2);
    };

    const recalcAmountFromUsdc = () => {
      if (!appState) return;
      const pair = el.tradePairSelect.value;
      const market = appState.markets.find((m) => m.instId === pair) || appState.markets[0];
      const price = el.tradeOrderType.value === 'LIMIT' ? Number(el.tradePriceInput.value || market.price) : market.price;
      const usdc = Number(el.tradeUsdcInput.value || 0);
      if (price > 0) el.tradeAmountInput.value = (usdc / price).toFixed(6);
    };

    el.tradePairSelect.addEventListener('change', () => {
      if (appState) updateOrderFormBalances(appState);
      recalcUsdcFromAmount();
    });

    el.tradeOrderType.addEventListener('change', () => {
      if (appState) updateOrderFormBalances(appState);
      recalcUsdcFromAmount();
    });

    el.tradeAmountInput.addEventListener('input', recalcUsdcFromAmount);
    el.tradeUsdcInput.addEventListener('input', recalcAmountFromUsdc);

    el.manualTradeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const res = await apiRequest('/api/trade/propose', 'POST', {
        instId: el.tradePairSelect.value,
        side: currentOrderSide,
        orderType: el.tradeOrderType.value,
        amount: Number(el.tradeAmountInput.value),
        usdcAmount: Number(el.tradeUsdcInput.value),
        limitPrice: Number(el.tradePriceInput.value),
        strategyName: el.tradeStrategyInput.value,
        source: 'Kreator Zlecenia OKX EEA'
      });
      if (res.ok) {
        renderApp(res.state);
        openAuthPopup();
      }
    });

    el.openChartFromFormBtn.addEventListener('click', () => {
      openAssetChart(el.tradePairSelect.value, 'medium');
    });

    // Orders Filter Tabs
    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        currentOrderFilter = tab.dataset.filter;
        document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        if (appState) renderOrdersHistory(appState.portfolio.orders);
      });
    });

    // Global Window Management Buttons
    if (el.btnResetAllWindowsGrid) {
      el.btnResetAllWindowsGrid.addEventListener('click', () => {
        WINDOWS_REGISTRY.forEach((w) => {
          if (!w.isChart) setWindowMode(w.id, 'grid');
        });
        showToast('⊞ Przywrócono wszystkie okna do układu siatki.');
      });
    }

    if (el.btnDockAllTop) {
      el.btnDockAllTop.addEventListener('click', () => {
        WINDOWS_REGISTRY.forEach((w) => setWindowMode(w.id, 'docked-top'));
        showToast('🔼 Wszystkie okna zostały zwinięte do Menu Górnego.');
      });
    }

    if (el.btnDockAllSidebar) {
      el.btnDockAllSidebar.addEventListener('click', () => {
        WINDOWS_REGISTRY.forEach((w) => setWindowMode(w.id, 'docked-sidebar'));
        el.leftWindowSidebar.classList.remove('collapsed');
        showToast('◀ Wszystkie okna zostały zwinięte do Sidebaru z lewej.');
      });
    }

    // Chart dock buttons
    if (el.dockChartTopBtn) {
      el.dockChartTopBtn.addEventListener('click', () => setWindowMode('win-chart', 'docked-top'));
    }
    if (el.dockChartSidebarBtn) {
      el.dockChartSidebarBtn.addEventListener('click', () => setWindowMode('win-chart', 'docked-sidebar'));
    }

    // Delegate clicks on Window Controls, Top Menu Pills, Sidebar Buttons, Chart buttons, Open Order actions, and Ticker bar
    document.body.addEventListener('click', async (e) => {
      // If user was just dragging/moving a window, suppress click on buttons so window doesn't close or change state accidentally
      if (wasJustDragging) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      // 1. Window Control button (inside window titlebar or left sidebar)
      const winCtrlBtn = e.target.closest('[data-win-id][data-win-action]');
      if (winCtrlBtn) {
        const winId = winCtrlBtn.getAttribute('data-win-id');
        const action = winCtrlBtn.getAttribute('data-win-action');
        const winMeta = WINDOWS_REGISTRY.find((w) => w.id === winId);
        setWindowMode(winId, action);
        if (winCtrlBtn.classList.contains('close-win-btn') && winMeta) {
          showToast(`🔼 Zamknięto „${winMeta.title}” — okno trafiło do Menu Górnego Okien (kliknij je na górze, aby przywrócić).`);
        }
        return;
      }

      // 2. Top Menu Window Pill click
      const topPill = e.target.closest('[data-top-menu-win]');
      if (topPill) {
        const winId = topPill.getAttribute('data-top-menu-win');
        const winMeta = WINDOWS_REGISTRY.find((w) => w.id === winId);
        if (winMeta) {
          if (winMeta.mode === 'docked-top' || winMeta.mode === 'docked-sidebar' || winMeta.mode === 'minimized-inline') {
            restoreWindowFromDock(winId, winMeta.isChart ? 'floating-medium' : 'grid');
            showToast(`▶ Wywołano okno „${winMeta.title}” z Menu Górnego.`);
          } else {
            setWindowMode(winId, 'docked-top');
            showToast(`🔼 Wysłano okno „${winMeta.title}” do Menu Górnego (kliknij ponownie, aby otworzyć).`);
          }
        }
        return;
      }

      // 3. Open Asset Chart button
      const chartBtn = e.target.closest('.open-asset-chart-btn');
      if (chartBtn) {
        const instId = chartBtn.getAttribute('data-instid') || 'BTC-USDC';
        openAssetChart(instId, chartState.isOpen ? chartState.size : 'medium');
        return;
      }

      // 4. Ticker Strip Item click
      const tickerItem = e.target.closest('.ticker-item');
      if (tickerItem) {
        const instId = tickerItem.getAttribute('data-chart-pair');
        openAssetChart(instId, chartState.isOpen ? chartState.size : 'medium');
        return;
      }

      // 5. Cancel Open Order
      const cancelBtn = e.target.closest('.cancel-open-order-btn');
      if (cancelBtn) {
        const orderId = cancelBtn.getAttribute('data-orderid');
        const res = await apiRequest('/api/orders/cancel', 'POST', { orderId });
        if (res.ok) {
          renderApp(res.state);
          showToast(res.message);
        }
        return;
      }

      // 6. Activate Open Order to Start Pop-up
      const activateBtn = e.target.closest('.activate-open-order-btn');
      if (activateBtn) {
        const orderId = activateBtn.getAttribute('data-orderid');
        const res = await apiRequest('/api/orders/activate', 'POST', { orderId });
        if (res.ok) {
          renderApp(res.state);
          openAuthPopup();
        }
      }
    });

    // Chart Controls (Small / Medium / Full / Minimize / Close / TradingView Pro controls)
    document.querySelectorAll('.chart-size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyChartWindowSize(btn.dataset.size);
      });
    });

    document.querySelectorAll('.tv-engine-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setChartEngine(btn.getAttribute('data-engine'));
      });
    });

    if (el.tvChartTypeSelect) {
      el.tvChartTypeSelect.addEventListener('change', () => {
        chartState.chartType = el.tvChartTypeSelect.value;
        renderCandlestickCanvas();
      });
    }

    document.querySelectorAll('.tv-ind-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ind = btn.getAttribute('data-ind');
        if (ind === 'rsi' && !chartState.indicators.rsi) {
          chartState.indicators.macd = false;
        } else if (ind === 'macd' && !chartState.indicators.macd) {
          chartState.indicators.rsi = false;
        }
        chartState.indicators[ind] = !chartState.indicators[ind];
        document.querySelectorAll('.tv-ind-btn').forEach((b) => {
          const k = b.getAttribute('data-ind');
          b.classList.toggle('active', Boolean(chartState.indicators[k]));
        });
        renderCandlestickCanvas();
      });
    });

    document.querySelectorAll('.tv-tool-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chartState.activeTool = btn.getAttribute('data-tool');
        chartState.pendingDrawing = null;
        document.querySelectorAll('.tv-tool-btn[data-tool]').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-tool') === chartState.activeTool);
        });
      });
    });

    if (el.tvClearDrawingsBtn) {
      el.tvClearDrawingsBtn.addEventListener('click', () => {
        chartState.drawingsByPair[chartState.instId] = [];
        chartState.pendingDrawing = null;
        renderCandlestickCanvas();
        showToast(`🗑️ Wyczyszczono rysunki na wykresie ${chartState.instId}.`);
      });
    }

    if (el.tvZoomInBtn) {
      el.tvZoomInBtn.addEventListener('click', () => {
        chartState.visibleCount = Math.max(18, Math.round(chartState.visibleCount * 0.8));
        renderCandlestickCanvas();
      });
    }

    if (el.tvZoomOutBtn) {
      el.tvZoomOutBtn.addEventListener('click', () => {
        chartState.visibleCount = Math.min(180, Math.round(chartState.visibleCount * 1.25));
        renderCandlestickCanvas();
      });
    }

    if (el.tvResetViewBtn) {
      el.tvResetViewBtn.addEventListener('click', () => {
        chartState.visibleCount = 68;
        chartState.panOffset = 0;
        renderCandlestickCanvas();
      });
    }

    el.minimizeChartBtn.addEventListener('click', minimizeChartWindow);
    el.closeChartBtn.addEventListener('click', closeChartWindow);
    el.closeMinimizedChartBtn.addEventListener('click', closeChartWindow);

    document.querySelectorAll('.restore-chart-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openAssetChart(chartState.instId, btn.dataset.size);
      });
    });

    el.chartAssetSelect.addEventListener('change', () => {
      chartState.instId = el.chartAssetSelect.value;
      chartState.panOffset = 0;
      fetchAndDrawCandles();
      if (chartState.engine === 'widget') mountOfficialTradingViewWidget();
    });

    document.querySelectorAll('.interval-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        chartState.bar = btn.dataset.bar;
        chartState.panOffset = 0;
        document.querySelectorAll('.interval-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        fetchAndDrawCandles();
        if (chartState.engine === 'widget') mountOfficialTradingViewWidget();
      });
    });

    el.quickTradeFromChartBtn.addEventListener('click', () => {
      el.tradePairSelect.value = chartState.instId;
      if (appState) updateOrderFormBalances(appState);
      el.tradeAmountInput.dispatchEvent(new Event('input'));
      setWindowMode('win-quick-trade', 'grid');
      el.manualTradeForm.scrollIntoView({ behavior: 'smooth' });
      showToast(`Wybrano parę ${chartState.instId} w Kreatorze Zlecenia.`);
    });

    window.addEventListener('resize', () => {
      if (chartState.isOpen && !chartState.isMinimized) {
        renderCandlestickCanvas();
      }
    });
  }

  // ============================================================================
  // INITIALIZE & POLL LIVE MARKET UPDATES FROM OKX
  // ============================================================================
  async function init() {
    bindEvents();
    initUniversalWindowDragging();
    initTradingViewCanvasInteractions();

    // Ensure all 10 windows start docked to the Top Window Menu (clean screen on start)
    WINDOWS_REGISTRY.forEach((w) => setWindowMode(w.id, 'docked-top'));
    renderWindowMenus();
    updateTopControlsGridVisibility();

    let initialState = await apiRequest('/api/state');

    // Restore saved API keys from browser localStorage if server doesn't have them yet
    const savedLocal = getKeysFromLocalStorage();
    if (
      savedLocal.demo &&
      savedLocal.demo.apiKey &&
      !initialState.config.hasDemoKey
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

    renderApp(initialState);

    // If Demo API keys are not connected yet, open the API Keys accordion in Window 1 so the user can paste their OKX Demo keys right away
    if (initialState?.config?.apiConnection && !initialState.config.apiConnection.connected) {
      el.accordionApiBody.removeAttribute('hidden');
      el.apiAccordionToggleBtn.setAttribute('aria-expanded', 'true');
    }

    // Refresh real-time OKX prices and chart every 2.5 seconds
    setInterval(async () => {
      try {
        const liveState = await apiRequest('/api/state');
        renderApp(liveState);
        if (chartState.isOpen && !chartState.isMinimized && chartState.engine === 'pro') {
          fetchAndDrawCandles();
        }
      } catch (e) {
        // Ignore transient network errors
      }
    }, 2500);
  }

  init();
})();
