import React, { useState, useEffect, useRef } from 'react';
import { WindowContainer } from './WindowContainer';
import { InlineOrderConfirmCard, ExchangeFeedbackDetails } from './ExchangeFeedbackBox';
import { formatUsdc, formatUnitPrice, formatQty, loadSavedAiExecutedOrders } from '../engine/okxClientEngine';

const QUICK_FUTURES_ASSETS = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'SUI',
  'AVAX',
  'LINK',
  'WLD',
  'OKB'
];

const LEVERAGE_PRESETS = [1, 2, 3, 5, 10, 20, 50, 75, 100];

function getStrategyTiming(ord) {
  if (!ord) {
    return {
      openDate: '',
      openTime: '',
      execDate: '',
      execTime: '',
      isFilled: false,
      isPendingApproval: false,
      isInProgress: false,
      isRejectedUser: false,
      isRejectedSystem: false,
      badgeText: '',
      badgeColor: '',
      badgeBg: '',
      statusText: ''
    };
  }

  const openDate = ord.createdAtDate || ord.date || '';
  const openTime = ord.createdAtTime || ord.time || '';
  const execDate = ord.date || openDate;
  const execTime = ord.time || openTime;

  const rawStatus = (ord.status || '').toUpperCase();
  const label = (ord.statusLabel || '').toLowerCase();
  const rejBy = (ord.rejectedBy || '').toUpperCase();

  const isRejectedSystem =
    rawStatus === 'REJECTED_SYSTEM' ||
    rejBy === 'SYSTEM' ||
    label.includes('odrzucona przez system') ||
    Boolean(ord.systemError);

  const isRejectedUser =
    !isRejectedSystem &&
    (rawStatus === 'REJECTED_USER' ||
      rawStatus === 'CANCELED' ||
      rejBy === 'USER' ||
      label.includes('odrzucona przez użytkownika') ||
      label.includes('anulowane przez stop handlu') ||
      label.includes('anulowane'));

  const isPendingApproval =
    !isRejectedSystem &&
    !isRejectedUser &&
    (ord.isCurrentlyActive || rawStatus === 'WAITING_FOR_START' || rawStatus === 'PENDING_APPROVAL');

  const isInProgress =
    !isRejectedSystem &&
    !isRejectedUser &&
    !isPendingApproval &&
    (rawStatus === 'IN_PROGRESS' ||
      Boolean(ord.isStrategyInProgress) ||
      (label.includes('w trakcie realizacji') && !label.includes('zrealizowana')));

  const isFilled =
    !isRejectedSystem &&
    !isRejectedUser &&
    !isPendingApproval &&
    !isInProgress &&
    (rawStatus === 'CLOSED' ||
      rawStatus === 'FILLED' ||
      ord.rawState === 'filled' ||
      Boolean(ord.exchangeFeedback && ord.exchangeFeedback.status && ord.exchangeFeedback.status.includes('FILLED')) ||
      label.includes('zrealizowan'));

  let badgeText = '⏳ OCZEKUJE NA REALIZACJĘ';
  let badgeColor = '#fbbf24';
  let badgeBg = 'rgba(245, 158, 11, 0.2)';
  let statusText = 'Oczekuje na realizację';

  if (isRejectedUser) {
    badgeText = '🚫 ODRZUCONA PRZEZ UŻYTKOWNIKA';
    badgeColor = '#f87171';
    badgeBg = 'rgba(239, 68, 68, 0.18)';
    statusText = 'Transakcja odrzucona przez użytkownika';
  } else if (isRejectedSystem) {
    badgeText = '⚠️ ODRZUCONA PRZEZ SYSTEM';
    badgeColor = '#f87171';
    badgeBg = 'rgba(239, 68, 68, 0.25)';
    statusText = 'Transakcja odrzucona przez System';
  } else if (isInProgress) {
    badgeText = '⚙️ W TRAKCIE REALIZACJI';
    badgeColor = '#38bdf8';
    badgeBg = 'rgba(56, 189, 248, 0.2)';
    statusText = 'W trakcie realizacji (OKX)';
  } else if (isFilled) {
    badgeText = '✅ ZREALIZOWANA NA OKX';
    badgeColor = '#34d399';
    badgeBg = 'rgba(16, 185, 129, 0.2)';
    statusText = `${execDate} ${execTime}`;
  }

  return {
    openDate,
    openTime,
    execDate,
    execTime,
    isFilled,
    isPendingApproval,
    isInProgress,
    isRejectedUser,
    isRejectedSystem,
    badgeText,
    badgeColor,
    badgeBg,
    statusText
  };
}

export function resolveFuturesBreakdown(ord, timing) {
  if (!ord) return null;
  const price = Number(ord.price) || 0;
  const amount = Number(ord.amount) || 0;
  const notionalUsdc = Number(ord.usdcValue) || price * amount;
  const leverage = Number(ord.leverage) || 10;
  const marginUsdc = Number(ord.marginUsdc) || Number((notionalUsdc / leverage).toFixed(2));
  const asset = ord.asset || 'BTC';
  const name = ord.strategyName || '';
  const direction = (ord.posSide || (name.includes('SHORT') ? 'short' : 'long')).toUpperCase();
  const marginMode = (ord.marginMode || (name.includes('CROSS') ? 'cross' : 'isolated')).toUpperCase();

  const mmr = 0.005;
  const dropRatio = Math.max(0.005, (1 / leverage) - mmr);
  const liquidationPrice = direction === 'LONG'
    ? Number((price * (1 - dropRatio)).toFixed(price > 100 ? 2 : 4))
    : Number((price * (1 + dropRatio)).toFixed(price > 100 ? 2 : 4));
  const liqDistancePct = Number((dropRatio * 100).toFixed(2));

  const tp1Dist = 0.022;
  const tp2Dist = 0.052;
  const tp3Dist = 0.088;
  const slDist = Number(Math.min(0.035, Math.max(0.012, 0.65 / leverage)).toFixed(4));

  const tp1Price = direction === 'LONG' ? Number((price * (1 + tp1Dist)).toFixed(2)) : Number((price * (1 - tp1Dist)).toFixed(2));
  const tp2Price = direction === 'LONG' ? Number((price * (1 + tp2Dist)).toFixed(2)) : Number((price * (1 - tp2Dist)).toFixed(2));
  const tp3Price = direction === 'LONG' ? Number((price * (1 + tp3Dist)).toFixed(2)) : Number((price * (1 - tp3Dist)).toFixed(2));
  const slPrice = direction === 'LONG' ? Number((price * (1 - slDist)).toFixed(2)) : Number((price * (1 + slDist)).toFixed(2));

  const openedPosition = {
    title: `Otwarta Pozycja Kontraktu ${direction} ${leverage}x (${marginMode})`,
    date: timing.execDate || ord.date || '',
    time: timing.execTime || ord.time || '',
    status: timing.isFilled
      ? '✅ Pozycja Otwarta na Giełdzie OKX Futures'
      : timing.isInProgress
      ? '⚙️ Pozycja Aktywna w Trakcie Realizacji'
      : timing.isPendingApproval
      ? '⏳ Oczekuje na potwierdzenie zlecenia'
      : '🚫 Anulowane',
    direction,
    leverage,
    marginMode,
    asset,
    instId: ord.instId || `${asset}-USDC-SWAP`,
    entryPrice: price,
    marginUsdc,
    notionalUsdc,
    amount,
    liquidationPrice,
    liqDistancePct,
    feeRate: '0.05% (Taker)',
    feeUsdc: Number((notionalUsdc * 0.0005).toFixed(2))
  };

  const takeProfits = [
    {
      level: 'Take-Profit 1 (TP1)',
      targetPrice: tp1Price,
      movePct: `${direction === 'LONG' ? '+' : '-'}${(tp1Dist * 100).toFixed(1)}%`,
      roiPct: `+${(tp1Dist * leverage * 100).toFixed(1)}% ROI`,
      profitUsdc: `+${(marginUsdc * (tp1Dist * leverage)).toFixed(2)} USDC`,
      status: timing.isFilled ? 'Aktywny TP na serwerze OKX' : 'Zaplanowany w strategii'
    },
    {
      level: 'Take-Profit 2 (TP2)',
      targetPrice: tp2Price,
      movePct: `${direction === 'LONG' ? '+' : '-'}${(tp2Dist * 100).toFixed(1)}%`,
      roiPct: `+${(tp2Dist * leverage * 100).toFixed(1)}% ROI`,
      profitUsdc: `+${(marginUsdc * (tp2Dist * leverage)).toFixed(2)} USDC`,
      status: timing.isFilled ? 'Aktywny TP na serwerze OKX' : 'Zaplanowany w strategii'
    },
    {
      level: 'Take-Profit 3 (TP3)',
      targetPrice: tp3Price,
      movePct: `${direction === 'LONG' ? '+' : '-'}${(tp3Dist * 100).toFixed(1)}%`,
      roiPct: `+${(tp3Dist * leverage * 100).toFixed(1)}% ROI`,
      profitUsdc: `+${(marginUsdc * (tp3Dist * leverage)).toFixed(2)} USDC`,
      status: 'Zlecenie docelowe Runner'
    }
  ];

  const stopLossPlan = {
    level: 'Stop-Loss (Zabezpieczenie przed Likwidacją)',
    price: slPrice,
    movePct: `${direction === 'LONG' ? '-' : '+'}${(slDist * 100).toFixed(1)}%`,
    roiPct: `-${(slDist * leverage * 100).toFixed(1)}% ROI`,
    lossUsdc: `-${(marginUsdc * (slDist * leverage)).toFixed(2)} USDC`,
    bufferToLiqPct: `${(liqDistancePct - (slDist * 100)).toFixed(1)}% przed ceną likwidacji`,
    status: 'Aktywne zlecenie zabezpieczające'
  };

  return {
    openedPosition,
    takeProfits,
    stopLossPlan
  };
}

export function AiFuturesStrategiesWindow({
  winMeta,
  isSoloGridWindow,
  aiFuturesInput,
  currentAiFuturesAnalysis,
  isGenerating,
  activeTradeOrder,
  lastExchangeFeedback,
  collapsedAiTxIds,
  isConfirmingOrder,
  orders,
  executedSessionTransactions,
  onSetAiFuturesInput,
  onSubmitAiFuturesStrategy,
  onRunAiFuturesStrategyQuery,
  onConfirmOrder,
  onRejectOrder,
  onCompleteStrategy,
  onToggleAiExecutedTx,
  onOpenAssetChart,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const [showInstruction, setShowInstruction] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [expandedBreakdownId, setExpandedBreakdownId] = useState(null);

  // Futures Settings Control Panel State
  const [selectedDirection, setSelectedDirection] = useState('AUTO'); // 'AUTO' | 'LONG' | 'SHORT'
  const [selectedLeverage, setSelectedLeverage] = useState(10);
  const [selectedMarginMode, setSelectedMarginMode] = useState('isolated'); // 'isolated' | 'cross'
  const [customMarginUsdc, setCustomMarginUsdc] = useState('500');

  // Calculator Modal State
  const [calcEntryPrice, setCalcEntryPrice] = useState('76000');
  const [calcLeverage, setCalcLeverage] = useState(10);
  const [calcMargin, setCalcMargin] = useState('500');
  const [calcDirection, setCalcDirection] = useState('LONG');

  // Flaga, czy w bieżącym otwarciu okna zażądano nowej strategii futures
  const [hasRequestedNewStrategy, setHasRequestedNewStrategy] = useState(false);
  const [activeSessionAnalysis, setActiveSessionAnalysis] = useState(null);

  // Zapamiętujemy timestamp ostatniej analizy z momentu startu komponentu —
  // dzięki temu stara analiza z poprzedniej sesji NIE pojawi się automatycznie na ekranie po ponownym otwarciu!
  const prevAnalysisTsRef = useRef(currentAiFuturesAnalysis?.timestamp || 0);

  // Resetowanie po zamknięciu i ponownym otwarciu okna:
  const prevModeRef = useRef(winMeta?.mode);
  useEffect(() => {
    const prev = prevModeRef.current;
    const curr = winMeta?.mode;
    prevModeRef.current = curr;

    const wasClosed = prev === 'docked-top' || prev === 'docked-sidebar' || !prev;
    const isNowOpen =
      curr === 'grid' ||
      curr === 'floating-small' ||
      curr === 'floating-medium' ||
      curr === 'fullscreen';

    if (wasClosed && isNowOpen) {
      setHasRequestedNewStrategy(false);
      setActiveSessionAnalysis(null);
      setShowInstruction(false);
      setShowHistory(false);
      setShowExamples(false);
      setShowCalculator(false);
      if (onSetAiFuturesInput) onSetAiFuturesInput('');
    } else if (curr === 'docked-top' || curr === 'docked-sidebar') {
      setHasRequestedNewStrategy(false);
      setActiveSessionAnalysis(null);
    }
  }, [winMeta?.mode, onSetAiFuturesInput]);

  // Gdy użytkownik zażąda nowej strategii futures w oknie, aktywujemy analizę
  useEffect(() => {
    if (currentAiFuturesAnalysis && hasRequestedNewStrategy) {
      setActiveSessionAnalysis(currentAiFuturesAnalysis);
    }
  }, [currentAiFuturesAnalysis, hasRequestedNewStrategy]);

  // Sprawdzamy czy aktywne zlecenie dotyczy futures
  const isFuturesOrder =
    activeTradeOrder &&
    (activeTradeOrder.instId?.includes('SWAP') ||
      activeTradeOrder.source?.includes('Futures') ||
      activeTradeOrder.strategyName?.includes('Futures') ||
      Boolean(activeTradeOrder.leverage));

  // Zbierz strategie futures z historii
  const candidateStrategies = [];
  const seenOrderIds = new Set();

  if (activeTradeOrder && isFuturesOrder) {
    seenOrderIds.add(String(activeTradeOrder.id));
    candidateStrategies.push({
      ...activeTradeOrder,
      isCurrentlyActive: true,
      status: activeTradeOrder.status || 'waiting_for_start',
      statusLabel: 'Oczekuje na realizację'
    });
  }

  for (const o of orders || []) {
    if (!o || !o.id) continue;
    const idStr = String(o.id);
    if (seenOrderIds.has(idStr)) continue;
    const isFutures =
      idStr.startsWith('OKX-FUT-') ||
      o.marketType === 'FUTURES' ||
      Boolean(o.instId && o.instId.includes('SWAP')) ||
      Boolean(o.source && o.source.includes('Futures')) ||
      Boolean(o.strategyName && o.strategyName.includes('Futures')) ||
      Boolean(o.leverage);

    if (isFutures) {
      seenOrderIds.add(idStr);
      candidateStrategies.push(o);
    }
  }

  for (const fb of executedSessionTransactions || []) {
    if (!fb) continue;
    const ordId = String(fb.orderId || fb.id || '');
    const isFutures =
      ordId.startsWith('OKX-FUT-') ||
      fb.marketType === 'FUTURES' ||
      Boolean(fb.instId && fb.instId.includes('SWAP')) ||
      Boolean(fb.strategyName && fb.strategyName.includes('Futures')) ||
      Boolean(fb.leverage);

    if (isFutures && ordId && !seenOrderIds.has(ordId)) {
      seenOrderIds.add(ordId);
      candidateStrategies.push({
        id: ordId,
        instId: fb.instId,
        asset: fb.asset,
        side: fb.side,
        posSide: fb.posSide || (fb.side === 'BUY' ? 'long' : 'short'),
        orderType: fb.orderType || 'MARKET',
        amount: fb.amount,
        price: fb.price,
        usdcValue: fb.usdcValue,
        leverage: fb.leverage || 10,
        marginMode: fb.marginMode || 'isolated',
        status: 'CLOSED',
        statusLabel: 'Zrealizowana na OKX',
        source: 'Agent AI Futures (okx/agent-trade-kit)',
        strategyName: fb.strategyName || `Strategia Futures AI (${fb.instId})`,
        date: fb.date,
        time: fb.time,
        createdAtDate: fb.createdAtDate || fb.date,
        createdAtTime: fb.createdAtTime || fb.time,
        timestamp: fb.timestamp || Date.now(),
        exchangeFeedback: fb
      });
    }
  }

  // Trwała historia zleceń z pamięci podręcznej i synchronizacji między urządzeniami
  try {
    const savedLocalOrders = loadSavedAiExecutedOrders();
    for (const so of savedLocalOrders || []) {
      if (!so || !so.id) continue;
      const sId = String(so.id);
      if (seenOrderIds.has(sId)) continue;
      const isFutures =
        sId.startsWith('OKX-FUT-') ||
        so.marketType === 'FUTURES' ||
        Boolean(so.instId && so.instId.includes('SWAP')) ||
        Boolean(so.source && so.source.includes('Futures')) ||
        Boolean(so.strategyName && so.strategyName.includes('Futures')) ||
        Boolean(so.leverage);
      if (isFutures) {
        seenOrderIds.add(sId);
        candidateStrategies.push(so);
      }
    }
  } catch (e) {}

  candidateStrategies.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Wyliczenia kalkulatora podręcznego
  const calcP = Number(calcEntryPrice) || 76000;
  const calcM = Number(calcMargin) || 500;
  const calcL = Number(calcLeverage) || 10;
  const calcNotional = calcM * calcL;
  const calcDrop = Math.max(0.005, (1 / calcL) - 0.005);
  const calcLiq = calcDirection === 'LONG' ? calcP * (1 - calcDrop) : calcP * (1 + calcDrop);
  const calcLiqDist = (calcDrop * 100).toFixed(2);

  // Titlebar buttons
  const extraTitlebarControls = (
    <div
      className="ai-strat-titlebar-btn-group"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        margin: '0 4px'
      }}
    >
      <button
        type="button"
        className={`win-ctrl-btn ai-titlebar-pill ${showInstruction ? 'active' : ''}`}
        style={
          showInstruction
            ? { background: 'var(--accent-blue)', color: '#090b10', borderColor: 'var(--accent-blue)', fontWeight: 700 }
            : { color: 'var(--accent-blue)', borderColor: 'rgba(56, 189, 248, 0.45)' }
        }
        title="Instrukcja: Rynek Futures, Dźwignia, Likwidacja, Cross vs Isolated na OKX"
        onClick={(e) => {
          e.stopPropagation();
          setShowInstruction((prev) => !prev);
          setShowHistory(false);
          setShowExamples(false);
          setShowCalculator(false);
        }}
      >
        <span>ℹ️</span> <span className="ai-pill-btn-label">Instrukcja Futures</span>
      </button>

      <button
        type="button"
        className={`win-ctrl-btn ai-titlebar-pill ${showHistory ? 'active' : ''}`}
        style={
          showHistory
            ? { background: '#a855f7', color: '#ffffff', borderColor: '#a855f7', fontWeight: 700 }
            : { color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.45)' }
        }
        title="Historia pozycji i strategii futures"
        onClick={(e) => {
          e.stopPropagation();
          setShowHistory((prev) => !prev);
          setShowInstruction(false);
          setShowExamples(false);
          setShowCalculator(false);
        }}
      >
        <span>📜</span> <span className="ai-pill-btn-label">Historia ({candidateStrategies.length})</span>
      </button>

      <button
        type="button"
        className={`win-ctrl-btn ai-titlebar-pill ${showExamples ? 'active' : ''}`}
        style={
          showExamples
            ? { background: 'var(--warn-amber)', color: '#090b10', borderColor: 'var(--warn-amber)', fontWeight: 700 }
            : { color: 'var(--warn-amber)', borderColor: 'rgba(245, 158, 11, 0.45)' }
        }
        title="Przykłady strategii futures (Scalp Long/Short, Funding Arbitrage, Hedging)"
        onClick={(e) => {
          e.stopPropagation();
          setShowExamples((prev) => !prev);
          setShowInstruction(false);
          setShowHistory(false);
          setShowCalculator(false);
        }}
      >
        <span>💡</span> <span className="ai-pill-btn-label">Przykłady strategii</span>
      </button>

      <button
        type="button"
        className={`win-ctrl-btn ai-titlebar-pill ${showCalculator ? 'active' : ''}`}
        style={
          showCalculator
            ? { background: '#10b981', color: '#090b10', borderColor: '#10b981', fontWeight: 700 }
            : { color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.45)' }
        }
        title="Szybki kalkulator PnL, Margin i Ceny Likwidacji Futures"
        onClick={(e) => {
          e.stopPropagation();
          setShowCalculator((prev) => !prev);
          setShowInstruction(false);
          setShowHistory(false);
          setShowExamples(false);
        }}
      >
        <span>🧮</span> <span className="ai-pill-btn-label">Kalkulator Ryzyka</span>
      </button>
    </div>
  );

  const handleConfirmOrderWrapped = () => {
    setHasRequestedNewStrategy(false);
    setActiveSessionAnalysis(null);
    if (onSetAiFuturesInput) onSetAiFuturesInput('');
    if (onConfirmOrder) onConfirmOrder();
  };

  const handleRejectOrderWrapped = () => {
    setHasRequestedNewStrategy(false);
    setActiveSessionAnalysis(null);
    if (onSetAiFuturesInput) onSetAiFuturesInput('');
    if (onRejectOrder) onRejectOrder();
  };

  const handleApplyQuickQuery = (asset) => {
    setHasRequestedNewStrategy(true);
    setShowExamples(false);
    setShowHistory(false);
    setShowInstruction(false);
    setShowCalculator(false);
    const dirTxt = selectedDirection === 'AUTO' ? '' : selectedDirection === 'SHORT' ? ' SHORT' : ' LONG';
    const query = `${asset}-USDC-SWAP${dirTxt} ${selectedLeverage}x za ${customMarginUsdc}$`;
    if (onRunAiFuturesStrategyQuery) {
      onRunAiFuturesStrategyQuery(query, {
        direction: selectedDirection === 'AUTO' ? undefined : selectedDirection,
        leverage: selectedLeverage,
        marginMode: selectedMarginMode,
        marginUsdc: Number(customMarginUsdc) || 500
      });
    }
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    setHasRequestedNewStrategy(true);
    setShowExamples(false);
    setShowHistory(false);
    setShowInstruction(false);
    setShowCalculator(false);
    const dirTxt = selectedDirection === 'AUTO' ? '' : selectedDirection === 'SHORT' ? ' SHORT' : ' LONG';
    const q = (aiFuturesInput || '').trim() || `BTC-USDC-SWAP${dirTxt} ${selectedLeverage}x za ${customMarginUsdc}$`;
    if (onRunAiFuturesStrategyQuery) {
      onRunAiFuturesStrategyQuery(q, {
        direction: selectedDirection === 'AUTO' ? undefined : selectedDirection,
        leverage: selectedLeverage,
        marginMode: selectedMarginMode,
        marginUsdc: Number(customMarginUsdc) || 500
      });
    }
    if (onSetAiFuturesInput) onSetAiFuturesInput('');
  };

  const a = hasRequestedNewStrategy ? (activeSessionAnalysis || currentAiFuturesAnalysis) : null;

  return (
    <WindowContainer
      winMeta={winMeta}
      isSoloGridWindow={isSoloGridWindow}
      baseClassName="panel-card panel-ai-strategies panel-ai-futures"
      titlebarTitle="⚡ Strategia OKX ai: FUTURES — Dźwignia, Long/Short i Likwidacja OKX"
      extraTitlebarControls={extraTitlebarControls}
      onSetWindowMode={onSetWindowMode}
      onCloseWindow={onCloseWindow}
      onBringToFront={onBringToFront}
    >
      {/* Pasek narzędziowy wewnętrzny */}
      <div
        className="ai-strat-inner-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '8px 12px',
          marginBottom: '12px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Narzędzia Futures:
        </span>

        <button
          type="button"
          className={`btn btn-outline-sm ${showInstruction ? 'btn-active-tool' : ''}`}
          style={{
            borderColor: showInstruction ? 'var(--accent-blue)' : 'rgba(56, 189, 248, 0.4)',
            color: showInstruction ? '#ffffff' : '#38bdf8',
            background: showInstruction ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.08)',
            fontWeight: 700
          }}
          onClick={() => {
            setShowInstruction((prev) => !prev);
            setShowHistory(false);
            setShowExamples(false);
            setShowCalculator(false);
          }}
        >
          ℹ️ Instrukcja Futures {showInstruction ? '▲' : '▼'}
        </button>

        <button
          type="button"
          className={`btn btn-outline-sm ${showHistory ? 'btn-active-tool' : ''}`}
          style={{
            borderColor: showHistory ? '#a855f7' : 'rgba(168, 85, 247, 0.4)',
            color: showHistory ? '#ffffff' : '#c084fc',
            background: showHistory ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.08)',
            fontWeight: 700
          }}
          onClick={() => {
            setShowHistory((prev) => !prev);
            setShowInstruction(false);
            setShowExamples(false);
            setShowCalculator(false);
          }}
        >
          📜 Historia pozycji ({candidateStrategies.length}) {showHistory ? '▲' : '▼'}
        </button>

        <button
          type="button"
          className={`btn btn-outline-sm ${showExamples ? 'btn-active-tool' : ''}`}
          style={{
            borderColor: showExamples ? 'var(--warn-amber)' : 'rgba(245, 158, 11, 0.4)',
            color: showExamples ? '#ffffff' : '#fbbf24',
            background: showExamples ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.08)',
            fontWeight: 700
          }}
          onClick={() => {
            setShowExamples((prev) => !prev);
            setShowInstruction(false);
            setShowHistory(false);
            setShowCalculator(false);
          }}
        >
          💡 Przykłady strategii {showExamples ? '▲' : '▼'}
        </button>

        <button
          type="button"
          className={`btn btn-outline-sm ${showCalculator ? 'btn-active-tool' : ''}`}
          style={{
            borderColor: showCalculator ? '#10b981' : 'rgba(16, 185, 129, 0.4)',
            color: showCalculator ? '#ffffff' : '#34d399',
            background: showCalculator ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.08)',
            fontWeight: 700
          }}
          onClick={() => {
            setShowCalculator((prev) => !prev);
            setShowInstruction(false);
            setShowHistory(false);
            setShowExamples(false);
          }}
        >
          🧮 Kalkulator Likwidacji {showCalculator ? '▲' : '▼'}
        </button>
      </div>

      {/* MODAL 1: INSTRUKCJA RYNKU FUTURES */}
      {showInstruction && (
        <div
          className="ai-strat-instruction-modal"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(24, 34, 58, 0.98))',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '15px', fontWeight: 800 }}>
              ℹ️ Instrukcja: Strategie Rynku Futures & Kontraktów Perpetual Swap na OKX (eea.okx.com)
            </h4>
            <button
              type="button"
              className="win-ctrl-btn"
              style={{ fontSize: '14px', padding: '2px 8px' }}
              onClick={() => setShowInstruction(false)}
            >
              ✕ Zamknij
            </button>
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            <p style={{ margin: '0 0 10px 0' }}>
              <strong>Rynek Kontraktów Futures (Perpetual Swap)</strong> umożliwia handel z dźwignią finansową w obu kierunkach: zarówno na wzrosty cen (<strong>LONG</strong>), jak i na spadki (<strong>SHORT</strong>).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #34d399' }}>
                <strong style={{ color: '#34d399' }}>🟢 Pozycja LONG (Długa)</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Zarabiasz, gdy cena instrumentu rośnie. Każdy 1% wzrostu ceny przy dźwigni 10x daje +10% zysku (ROI) z włożonego depozytu.
                </p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #f87171' }}>
                <strong style={{ color: '#f87171' }}>🔴 Pozycja SHORT (Krótka)</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Zarabiasz, gdy rynek spada! Pozwala zabezpieczyć portfel spot (hedging) lub zarabiać na dynamicznych spadkach i korektach.
                </p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                <strong style={{ color: '#38bdf8' }}>🛡️ Isolated Margin (Depozyt Izolowany)</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Maksymalna strata jest ograniczona wyłącznie do kwoty przydzielonego depozytu na daną pozycję. Reszta Twoich środków w portfelu jest w 100% bezpieczna.
                </p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #fbbf24' }}>
                <strong style={{ color: '#fbbf24' }}>⚠️ Cena Likwidacji (Liquidation Price)</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Poziom ceny, przy którym strata wyczerpuje depozyt. Agent AI zawsze ustawia bufor Stop-Loss na długo przed ceną likwidacji, aby chronić Twój kapitał.
                </p>
              </div>
            </div>
            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', fontSize: '12px' }}>
              <strong>🔄 Funding Rate (Stopa Finansowania OKX):</strong> Rozliczana co 8 godzin między posiadaczami pozycji Long i Short w celu utrzymania kursu kontraktu blisko rynku spot.
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KALKULATOR RYZYKA I LIKWIDACJI */}
      {showCalculator && (
        <div
          className="ai-strat-calc-modal"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(20, 36, 48, 0.98))',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#34d399', fontSize: '15px', fontWeight: 800 }}>
              🧮 Szybki Kalkulator Futures: Depozyt Margin, Ekspozycja & Cena Likwidacji
            </h4>
            <button
              type="button"
              className="win-ctrl-btn"
              style={{ fontSize: '14px', padding: '2px 8px' }}
              onClick={() => setShowCalculator(false)}
            >
              ✕ Zamknij
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Kierunek Pozycji:
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: calcDirection === 'LONG' ? '#34d399' : 'rgba(255,255,255,0.1)',
                    background: calcDirection === 'LONG' ? 'rgba(52, 211, 153, 0.25)' : 'transparent',
                    color: calcDirection === 'LONG' ? '#34d399' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  onClick={() => setCalcDirection('LONG')}
                >
                  🟢 LONG
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: calcDirection === 'SHORT' ? '#f87171' : 'rgba(255,255,255,0.1)',
                    background: calcDirection === 'SHORT' ? 'rgba(248, 113, 113, 0.25)' : 'transparent',
                    color: calcDirection === 'SHORT' ? '#f87171' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  onClick={() => setCalcDirection('SHORT')}
                >
                  🔴 SHORT
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Kurs wejścia (USDC):
              </label>
              <input
                type="number"
                className="input-field"
                style={{ width: '100%', padding: '6px 8px' }}
                value={calcEntryPrice}
                onChange={(e) => setCalcEntryPrice(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Dźwignia (Leverage): {calcLeverage}x
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={calcLeverage}
                onChange={(e) => setCalcLeverage(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Własny Depozyt Margin (USDC):
              </label>
              <input
                type="number"
                className="input-field"
                style={{ width: '100%', padding: '6px 8px' }}
                value={calcMargin}
                onChange={(e) => setCalcMargin(e.target.value)}
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Ekspozycja (Notional):</span>
              <strong style={{ fontSize: '15px', color: '#ffffff' }}>${formatUsdc(calcNotional)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Szacowana Likwidacja:</span>
              <strong style={{ fontSize: '15px', color: '#f87171' }}>${formatUsdc(calcLiq)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Dystans do likwidacji:</span>
              <strong style={{ fontSize: '15px', color: '#fbbf24' }}>{calcLiqDist}%</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>1% ruchu ceny daje:</span>
              <strong style={{ fontSize: '15px', color: '#34d399' }}>{calcLeverage}% ROI (${(calcM * (calcLeverage / 100)).toFixed(2)})</strong>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRZYKŁADY STRATEGII FUTURES */}
      {showExamples && (
        <div
          className="ai-strat-examples-modal"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 27, 45, 0.98))',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: 'var(--warn-amber)', fontSize: '15px', fontWeight: 800 }}>
              💡 Gotowe Przykłady Strategii Rynku Futures dla Agenta AI
            </h4>
            <button
              type="button"
              className="win-ctrl-btn"
              style={{ fontSize: '14px', padding: '2px 8px' }}
              onClick={() => setShowExamples(false)}
            >
              ✕ Zamknij
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {[
              {
                title: '⚡ Scalp LONG 10x na Wybicie VWAP',
                prompt: 'Zbuduj strategię LONG dla BTC 10x z ciasnym Stop-Loss',
                desc: 'Szybkie wejście na momentum z zabezpieczeniem SL i 3 poziomami realizacji zysku TP.'
              },
              {
                title: '🔴 SHORT 5x po Wykupionym RSI na ETH',
                prompt: 'Otwórz pozycję SHORT na ETH z dźwignią 5x po oporze R1',
                desc: 'Gra na korektę zysków ze szczytu kanału dobowego pod oporem.'
              },
              {
                title: '🛡️ Delta-Neutral Hedging Portfela',
                prompt: 'Zabezpiecz portfel pozycją SHORT na BTC 3x',
                desc: 'Neutralizacja ryzyka spadku wartości posiadanych kryptowalut bez ich sprzedaży.'
              },
              {
                title: '📊 Funding Rate Arbitrage 2x',
                prompt: 'Strategia Arbitrażu Funding Rate na SOL 2x',
                desc: 'Pobieranie stóp finansowania co 8h przy minimalnym ryzyku rynkowym.'
              }
            ].map((ex, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const isShort = ex.prompt.includes('SHORT') || ex.title.includes('SHORT') || ex.title.includes('Hedging');
                  const dir = isShort ? 'SHORT' : 'LONG';
                  const lev = ex.prompt.includes('10x') ? 10 : ex.prompt.includes('5x') ? 5 : ex.prompt.includes('3x') ? 3 : 2;
                  setSelectedDirection(dir);
                  setSelectedLeverage(lev);
                  setHasRequestedNewStrategy(true);
                  setShowExamples(false);
                  setShowHistory(false);
                  setShowInstruction(false);
                  setShowCalculator(false);
                  if (onRunAiFuturesStrategyQuery) {
                    onRunAiFuturesStrategyQuery(ex.prompt, {
                      direction: dir,
                      leverage: lev,
                      marginMode: selectedMarginMode || 'isolated',
                      marginUsdc: Number(customMarginUsdc) || 500
                    });
                  }
                }}
              >
                <strong style={{ color: 'var(--warn-amber)', display: 'block', marginBottom: '4px' }}>
                  {ex.title}
                </strong>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {ex.desc}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                  ▶ Kliknij, aby wygenerować tę strategię
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 4: HISTORIA STRATEGII FUTURES */}
      {showHistory && (
        <div
          className="ai-strat-history-modal"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(28, 20, 48, 0.98))',
            border: '1px solid rgba(168, 85, 247, 0.45)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, color: '#c084fc', fontSize: '15px', fontWeight: 800 }}>
              📜 Historia Strategii i Zleceń Futures na OKX ({candidateStrategies.length})
            </h4>
            <button
              type="button"
              className="win-ctrl-btn"
              style={{ fontSize: '14px', padding: '2px 8px' }}
              onClick={() => setShowHistory(false)}
            >
              ✕ Zamknij
            </button>
          </div>

          {candidateStrategies.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Brak zrealizowanych pozycji futures w bieżącej sesji. Wygeneruj i potwierdź strategię poniżej, aby pojawiła się w historii.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {candidateStrategies.map((ord) => {
                const timing = getStrategyTiming(ord);
                const breakdown = resolveFuturesBreakdown(ord, timing);
                const isExpanded = expandedBreakdownId === ord.id;
                const posSide = (ord.posSide || (ord.strategyName?.includes('SHORT') ? 'short' : 'long')).toUpperCase();
                const lev = ord.leverage || 10;

                return (
                  <div
                    key={ord.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: posSide === 'LONG' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                              color: posSide === 'LONG' ? '#34d399' : '#f87171',
                              border: `1px solid ${posSide === 'LONG' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`
                            }}
                          >
                            {posSide === 'LONG' ? '🟢 LONG' : '🔴 SHORT'} {lev}x
                          </span>
                          <strong style={{ fontSize: '13px', color: '#ffffff' }}>
                            {ord.instId || `${ord.asset}-USDC-SWAP`}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            #{ord.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Kurs: <strong>${formatUnitPrice(ord.price)}</strong> • Wielkość: <strong>{ord.amount} {ord.asset}</strong> • Ekspozycja: <strong>${formatUsdc(ord.usdcValue)}</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Utworzono: <strong>{timing.openDate} {timing.openTime}</strong>
                          {timing.isFilled && (
                            <span> • Zrealizowano: <strong style={{ color: '#34d399' }}>{timing.execDate} {timing.execTime}</strong></span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: timing.badgeBg,
                            color: timing.badgeColor,
                            border: `1px solid ${timing.badgeColor}`
                          }}
                        >
                          {timing.badgeText}
                        </span>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline-sm"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => setExpandedBreakdownId(isExpanded ? null : ord.id)}
                          >
                            📊 Szczegóły futures {isExpanded ? '▲' : '▼'}
                          </button>
                          {timing.isInProgress && onCompleteStrategy && (
                            <button
                              type="button"
                              className="btn btn-primary-sm"
                              style={{ fontSize: '11px', padding: '3px 8px', background: '#10b981' }}
                              onClick={() => onCompleteStrategy(ord.id)}
                            >
                              ✅ Oznacz jako zrealizowaną
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Akordeon szczegółów futures */}
                    {isExpanded && breakdown && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          fontSize: '12px'
                        }}
                      >
                        <h5 style={{ margin: '0 0 8px 0', color: 'var(--accent-blue)', fontSize: '12px' }}>
                          🛡️ Parametry Pozycji & Zabezpieczenia na OKX:
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                          <div>Cena Likwidacji: <strong style={{ color: '#f87171' }}>${formatUsdc(breakdown.openedPosition.liquidationPrice)}</strong></div>
                          <div>Dystans do Likwidacji: <strong style={{ color: '#fbbf24' }}>{breakdown.openedPosition.liqDistancePct}%</strong></div>
                          <div>Własny Margin: <strong>${formatUsdc(breakdown.openedPosition.marginUsdc)}</strong></div>
                          <div>Prowizja Taker (0.05%): <strong>${formatUsdc(breakdown.openedPosition.feeUsdc)}</strong></div>
                        </div>

                        <h5 style={{ margin: '8px 0 6px 0', color: '#34d399', fontSize: '12px' }}>
                          🎯 Cele Take-Profit (TP):
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', marginBottom: '10px' }}>
                          {breakdown.takeProfits.map((tp, idx) => (
                            <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
                              <strong>{tp.level}:</strong> ${formatUnitPrice(tp.targetPrice)} ({tp.roiPct} / {tp.profitUsdc})
                            </div>
                          ))}
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #ef4444' }}>
                          <strong style={{ color: '#f87171' }}>🛑 Stop-Loss:</strong> ${formatUnitPrice(breakdown.stopLossPlan.price)} ({breakdown.stopLossPlan.roiPct} / {breakdown.stopLossPlan.lossUsdc})
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            ({breakdown.stopLossPlan.bufferToLiqPct})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* GŁÓWNY PANEL KONTROLNY USTAWIEŃ FUTURES */}
      <div
        className="futures-control-panel"
        style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(24, 34, 58, 0.85))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
            ⚙️ Panel Ustawień Zlecenia Futures (Dźwignia, Kierunek & Tryb Margin)
          </span>
          <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600 }}>
            OKX Perpetual Swap v5 (eea.okx.com)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {/* 1. KIERUNEK POZYCJI */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              1. KIERUNEK (DIRECTION):
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedDirection === 'LONG' ? '#34d399' : 'rgba(255,255,255,0.1)',
                  background: selectedDirection === 'LONG' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(0,0,0,0.2)',
                  color: selectedDirection === 'LONG' ? '#34d399' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedDirection('LONG')}
              >
                🟢 LONG
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedDirection === 'SHORT' ? '#f87171' : 'rgba(255,255,255,0.1)',
                  background: selectedDirection === 'SHORT' ? 'rgba(248, 113, 113, 0.25)' : 'rgba(0,0,0,0.2)',
                  color: selectedDirection === 'SHORT' ? '#f87171' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedDirection('SHORT')}
              >
                🔴 SHORT
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedDirection === 'AUTO' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                  background: selectedDirection === 'AUTO' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0,0,0,0.2)',
                  color: selectedDirection === 'AUTO' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedDirection('AUTO')}
                title="Agent AI sam dobierze kierunek na podstawie RSI i wskaźników trendu"
              >
                🤖 AUTO AI
              </button>
            </div>
          </div>

          {/* 2. DŹWIGNIA (LEVERAGE) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                2. DŹWIGNIA (LEVERAGE):
              </label>
              <span style={{ fontSize: '12px', fontWeight: 800, color: selectedLeverage > 25 ? '#ef4444' : selectedLeverage > 10 ? '#fbbf24' : '#34d399' }}>
                {selectedLeverage}x
              </span>
            </div>
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {LEVERAGE_PRESETS.map((lev) => (
                <button
                  key={lev}
                  type="button"
                  style={{
                    padding: '3px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: selectedLeverage === lev ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                    background: selectedLeverage === lev ? 'rgba(56, 189, 248, 0.3)' : 'rgba(0,0,0,0.2)',
                    color: selectedLeverage === lev ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedLeverage(lev)}
                >
                  {lev}x
                </button>
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={selectedLeverage}
              onChange={(e) => setSelectedLeverage(Number(e.target.value))}
              style={{ width: '100%', height: '5px' }}
            />
          </div>

          {/* 3. TRYB MARGIN */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              3. TRYB DEPOZYTU (MARGIN MODE):
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedMarginMode === 'isolated' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                  background: selectedMarginMode === 'isolated' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0,0,0,0.2)',
                  color: selectedMarginMode === 'isolated' ? '#38bdf8' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedMarginMode('isolated')}
                title="Ryzyko ograniczone wyłącznie do danej pozycji"
              >
                🛡️ ISOLATED (Zalecany)
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedMarginMode === 'cross' ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                  background: selectedMarginMode === 'cross' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0,0,0,0.2)',
                  color: selectedMarginMode === 'cross' ? '#fbbf24' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedMarginMode('cross')}
                title="Współdzielenie depozytu przez całe konto"
              >
                ⚡ CROSS
              </button>
            </div>
          </div>

          {/* 4. BUDŻET DEPOZYTU MARGIN */}
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              4. DEPOZYT POCZĄTKOWY (USDC):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                className="input-field"
                style={{ flex: 1, padding: '7px 10px', fontSize: '12px', fontWeight: 700 }}
                value={customMarginUsdc}
                onChange={(e) => setCustomMarginUsdc(e.target.value)}
                placeholder="np. 500"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Ekspozycja: <strong style={{ color: '#38bdf8' }}>${formatUsdc((Number(customMarginUsdc) || 500) * selectedLeverage)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SZYBKIE AKTYWA FUTURES (SWAP) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
          Popularne Kontrakty Swap:
        </span>
        {QUICK_FUTURES_ASSETS.map((asset) => (
          <button
            key={asset}
            type="button"
            className="btn btn-outline-sm"
            style={{ fontSize: '11px', padding: '3px 8px' }}
            onClick={() => handleApplyQuickQuery(asset)}
          >
            {asset}-SWAP
          </button>
        ))}
      </div>

      {/* FORMULARZ PROMPTU / WYSZUKIWANIA STRATEGII FUTURES */}
      <form onSubmit={handleFormSubmit} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '14px',
                pointerEvents: 'none'
              }}
            >
              🔍
            </span>
            <input
              id="aiFuturesStrategyInput"
              type="text"
              className="input-field"
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: '12px',
                paddingTop: '10px',
                paddingBottom: '10px',
                fontSize: '13px'
              }}
              placeholder="Wpisz kontrakt lub zapytanie, np. BTC-SWAP LONG 10x, Short ETH za 1000$..."
              value={aiFuturesInput}
              onChange={(e) => onSetAiFuturesInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              whiteSpace: 'nowrap'
            }}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Generowanie...' : '⚡ Stwórz Strategię Futures OKX AI'}
          </button>
        </div>
      </form>

      {/* WSKAŹNIK GENEROWANIA STRATEGII */}
      {isGenerating && (
        <div
          style={{
            padding: '16px 20px',
            marginBottom: '16px',
            background: 'rgba(2, 132, 199, 0.18)',
            border: '1.5px solid rgba(56, 189, 248, 0.5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: 700
          }}
        >
          <span style={{ fontSize: '22px' }}>⚙️</span>
          <div>
            <div>Agent AI z OKX analizuje rynek futures, wskaźniki RSI/VWAP, poziomy likwidacji i generuje strategię...</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, marginTop: '2px' }}>
              Trwa dobieranie dźwigni, bufora Stop-Loss i celów Take-Profit na OKX Europe (eea.okx.com)
            </div>
          </div>
        </div>
      )}

      {/* KARTA WYNIKU ANALIZY AGENTA AI FUTURES */}
      {hasRequestedNewStrategy && a && (
        <div
          id="aiFuturesResultContainer"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(20, 30, 52, 0.95))',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            marginBottom: '16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* NAGŁÓWEK KONTRAKTU I FUNDING RATE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: a.direction === 'LONG' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(248, 113, 113, 0.25)',
                    color: a.direction === 'LONG' ? '#34d399' : '#f87171',
                    border: `1px solid ${a.direction === 'LONG' ? '#34d399' : '#f87171'}`
                  }}
                >
                  {a.direction === 'LONG' ? '🟢 LONG (DŁUGA)' : '🔴 SHORT (KRÓTKA)'} {a.leverage}x
                </span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {a.instId}
                </h3>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  ${formatUnitPrice(a.market.price)}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Silnik: {a.engine} • Data: {a.date} {a.time}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                  Funding Rate (OKX 8h):
                </span>
                <strong style={{ fontSize: '12px', color: a.market.fundingRatePct >= 0 ? '#34d399' : '#f87171' }}>
                  {a.market.fundingRate} (za {a.market.nextFundingCountdown})
                </strong>
              </div>
              {onOpenAssetChart && (
                <button
                  type="button"
                  className="btn btn-outline-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => onOpenAssetChart(a.asset + '-USDC')}
                  title="Otwórz wykres TradingView dla tego aktywa"
                >
                  🕯️ Wykres
                </button>
              )}
            </div>
          </div>

          {/* 4 KLUCZOWE METRYKI FUTURES W KAFELKACH */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px',
              marginBottom: '14px'
            }}
          >
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Dźwignia & Tryb:</span>
              <strong style={{ fontSize: '14px', color: '#ffffff' }}>{a.leverage}x • {a.marginMode.toUpperCase()}</strong>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Własny Depozyt Margin:</span>
              <strong style={{ fontSize: '14px', color: 'var(--accent-blue)' }}>${formatUsdc(a.futuresParameters.initialMarginUsdc)}</strong>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                Ekspozycja: ${formatUsdc(a.futuresParameters.notionalValueUsdc)}
              </span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Szacowana Likwidacja:</span>
              <strong style={{ fontSize: '14px', color: '#f87171' }}>${formatUnitPrice(a.futuresParameters.liquidationPrice)}</strong>
              <span style={{ fontSize: '10px', color: '#fbbf24', display: 'block' }}>
                Bufor: {a.futuresParameters.liquidationDistancePct}%
              </span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Poziom Ryzyka:</span>
              <strong style={{ fontSize: '13px', color: a.futuresParameters.riskBadgeColor }}>
                {a.futuresParameters.riskLevel}
              </strong>
            </div>
          </div>

          {/* RACJONALIZACJA STRATEGII */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '8px',
              borderLeft: '4px solid var(--accent-blue)',
              marginBottom: '14px',
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'var(--text-primary)'
            }}
          >
            <strong>🧠 Uzasadnienie Strategii Agenta AI:</strong> {a.recommendedStrategy.rationale}
          </div>

          {/* CELE TAKE-PROFIT & OCHRONA STOP-LOSS */}
          <div style={{ marginBottom: '14px' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>
              🎯 PLAN REALIZACJI ZYSKU & ZABEZPIECZENIA PRZED LIKWIDACJĄ:
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700, display: 'block' }}>TP1 (Take-Profit 1):</span>
                <strong style={{ fontSize: '13px', color: '#ffffff' }}>${formatUnitPrice(a.technicals.takeProfit1)}</strong>
                <span style={{ fontSize: '11px', color: '#34d399', display: 'block', marginTop: '2px' }}>
                  +{a.technicals.takeProfit1RoiPct}% ROI (+${a.technicals.takeProfit1PnlUsdc})
                </span>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.16)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700, display: 'block' }}>TP2 (Take-Profit 2):</span>
                <strong style={{ fontSize: '13px', color: '#ffffff' }}>${formatUnitPrice(a.technicals.takeProfit2)}</strong>
                <span style={{ fontSize: '11px', color: '#34d399', display: 'block', marginTop: '2px' }}>
                  +{a.technicals.takeProfit2RoiPct}% ROI (+${a.technicals.takeProfit2PnlUsdc})
                </span>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700, display: 'block' }}>TP3 (Runner Target):</span>
                <strong style={{ fontSize: '13px', color: '#ffffff' }}>${formatUnitPrice(a.technicals.takeProfit3)}</strong>
                <span style={{ fontSize: '11px', color: '#34d399', display: 'block', marginTop: '2px' }}>
                  +{a.technicals.takeProfit3RoiPct}% ROI (+${a.technicals.takeProfit3PnlUsdc})
                </span>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 700, display: 'block' }}>SL (Bezpieczny Stop-Loss):</span>
                <strong style={{ fontSize: '13px', color: '#ffffff' }}>${formatUnitPrice(a.technicals.stopLoss)}</strong>
                <span style={{ fontSize: '11px', color: '#f87171', display: 'block', marginTop: '2px' }}>
                  {a.technicals.stopLossRoiPct}% ROI (${a.technicals.stopLossPnlUsdc})
                </span>
              </div>
            </div>
          </div>

          {/* AKCJE POTWIERDZENIA / ODRZUCENIA ZLECENIA FUTURES */}
          {hasRequestedNewStrategy && activeTradeOrder && isFuturesOrder && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px',
                background: 'rgba(2, 132, 199, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <strong style={{ color: '#ffffff', fontSize: '13px', display: 'block' }}>
                  ⚡ Gotowe zlecenie kontraktu futures: {activeTradeOrder.strategyName}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Depozyt Margin: <strong>${formatUsdc(activeTradeOrder.marginUsdc || a.futuresParameters.initialMarginUsdc)}</strong> • Prowizja Taker 0.05%
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-success"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  disabled={isConfirmingOrder}
                  onClick={handleConfirmOrderWrapped}
                >
                  {isConfirmingOrder ? '⏳ Otwieranie pozycji...' : '✅ Potwierdź zlecenie Futures'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  disabled={isConfirmingOrder}
                  onClick={handleRejectOrderWrapped}
                >
                  🚫 Odrzuć transakcję
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CZYSTY STAN OCZEKIWANIA NA NOWĄ STRATEGIĘ FUTURES PO PONOWNYM OTWARCIU */}
      {(!hasRequestedNewStrategy || (!a && !activeTradeOrder)) && !showHistory && !showInstruction && !showExamples && !showCalculator && (
        <div
          className="ai-strat-idle-card"
          style={{
            padding: '28px 20px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(30, 41, 59, 0.3) 100%)',
            border: '1px dashed rgba(56, 189, 248, 0.25)',
            borderRadius: '12px',
            marginTop: '12px',
            marginBottom: '16px',
            color: 'var(--text-secondary, #94a3b8)'
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
            Agent AI OKX Futures gotowy do stworzenia nowej strategii kontraktów SWAP
          </div>
          <div style={{ fontSize: '13px', maxWidth: '640px', margin: '0 auto', lineHeight: '1.5' }}>
            Ustaw parametry w powyższym panelu (dźwignia 1x–100x, kierunek LONG/SHORT, depozyt) i wpisz polecenie lub kliknij jeden z szybkich walorów, aby wygenerować nową strategię futures.
            Wszystkie otwarte, trwające i zrealizowane pozycje znajdziesz pod przyciskiem <strong>📜 Historia strategii</strong>.
          </div>
        </div>
      )}
    </WindowContainer>
  );
}
