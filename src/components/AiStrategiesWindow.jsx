import React, { useState, useEffect, useRef } from 'react';
import { WindowContainer } from './WindowContainer';
import { InlineOrderConfirmCard, ExchangeFeedbackDetails } from './ExchangeFeedbackBox';
import { formatUsdc, formatUnitPrice, formatQty } from '../engine/okxClientEngine';

const QUICK_ASSETS = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'WLD',
  'ETC',
  'OKB',
  'ADA',
  'DOGE',
  'AVAX',
  'LINK',
  'SUI'
];

function getStrategyTiming(ord) {
  if (!ord) return { openDate: '', openTime: '', execDate: '', execTime: '', isFilled: false };
  const openDate = ord.createdAtDate || ord.date || '';
  const openTime = ord.createdAtTime || ord.time || '';
  const isFilled =
    ord.status === 'CLOSED' ||
    ord.status === 'FILLED' ||
    ord.rawState === 'filled' ||
    Boolean(ord.exchangeFeedback && ord.exchangeFeedback.status && ord.exchangeFeedback.status.includes('FILLED'));
  const execDate = ord.date || openDate;
  const execTime = ord.time || openTime;

  return {
    openDate,
    openTime,
    execDate,
    execTime,
    isFilled
  };
}

export function AiStrategiesWindow({
  winMeta,
  isSoloGridWindow,
  aiStrategyInput,
  currentAiStrategyAnalysis,
  activeTradeOrder,
  lastExchangeFeedback,
  collapsedAiTxIds,
  isConfirmingOrder,
  orders = [],
  executedSessionTransactions = [],
  onSetAiStrategyInput,
  onSubmitAiStrategy,
  onRunAiStrategyQuery,
  onConfirmOrder,
  onRejectOrder,
  onToggleAiExecutedTx,
  onOpenAssetChart,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  // Stany kontrolek górnej belki:
  const [showInstruction, setShowInstruction] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Strategia wygenerowana w BIEŻĄCYM otwarciu okna — domyślnie po otwarciu okna jest ZAMKNIĘTA/CZYSTA (null)
  const [activeSessionAnalysis, setActiveSessionAnalysis] = useState(null);
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);

  // Rozwinięte szczegóły giełdowe w panelu historii
  const [expandedHistoryTxIds, setExpandedHistoryTxIds] = useState(new Set());

  // Zapamiętujemy timestamp ostatniej analizy z momentu startu komponentu —
  // dzięki temu stara analiza z poprzedniej sesji NIE pojawi się automatycznie na ekranie!
  const prevAnalysisTsRef = useRef(currentAiStrategyAnalysis?.timestamp || 0);

  // Resetowanie po zamknięciu i ponownym otwarciu okna:
  // Okno po ponownym otwarciu ma być CZYSTE — nie pokazuje starej wykonanej strategii!
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
      // Okno zostało ponownie otwarte — czyścimy widok ostatniej strategii z głównego ekranu oraz pole promptu
      setActiveSessionAnalysis(null);
      setIsRecommendationOpen(false);
      setShowInstruction(false);
      setShowHistory(false);
      setShowExamples(false);
      if (onSetAiStrategyInput) onSetAiStrategyInput('');
    }
  }, [winMeta?.mode, onSetAiStrategyInput]);

  // TYLKO gdy użytkownik W TEJ CHWILI zada nowe zapytanie i powstanie NOWY timestamp — wtedy pokazujemy rekomendację
  useEffect(() => {
    if (
      currentAiStrategyAnalysis?.timestamp &&
      currentAiStrategyAnalysis.timestamp !== prevAnalysisTsRef.current
    ) {
      prevAnalysisTsRef.current = currentAiStrategyAnalysis.timestamp;
      setActiveSessionAnalysis(currentAiStrategyAnalysis);
      setIsRecommendationOpen(true);
    }
  }, [currentAiStrategyAnalysis]);

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    if (onSubmitAiStrategy) onSubmitAiStrategy(e);
    if (onSetAiStrategyInput) onSetAiStrategyInput('');
  };

  const handleRunQuery = (queryText) => {
    if (onRunAiStrategyQuery) onRunAiStrategyQuery(queryText);
    if (onSetAiStrategyInput) onSetAiStrategyInput('');
  };

  const handleConfirmOrderWrapped = () => {
    if (onSetAiStrategyInput) onSetAiStrategyInput('');
    if (onConfirmOrder) onConfirmOrder();
  };

  const handleRejectOrderWrapped = () => {
    if (onSetAiStrategyInput) onSetAiStrategyInput('');
    if (onRejectOrder) onRejectOrder();
  };

  const toggleHistoryItemDetails = (id) => {
    setExpandedHistoryTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Budujemy listę WSZYSTKICH strategii, które są W TRAKCIE REALIZACJI lub ZOSTAŁY ZREALIZOWANE:
  // Tylko takie mają być pokazywane pod przyciskiem Historia z dokładnymi czasami otwarcia i realizacji!
  const candidateStrategies = [];
  const seenOrderIds = new Set();

  // 1. Zlecenie w trakcie realizacji (activeTradeOrder)
  if (activeTradeOrder && activeTradeOrder.id) {
    seenOrderIds.add(String(activeTradeOrder.id));
    candidateStrategies.push({
      ...activeTradeOrder,
      isCurrentlyActive: true,
      status: activeTradeOrder.status || 'waiting_for_start',
      statusLabel: 'W trakcie realizacji (Oczekuje na potwierdzenie)'
    });
  }

  // 2. Strategie z bazy zleceń
  const allRawOrders = [...(orders || [])];
  for (const o of allRawOrders) {
    if (!o || !o.id) continue;
    const idStr = String(o.id);
    if (seenOrderIds.has(idStr)) continue;
    const isAiSource =
      idStr.startsWith('OKX-EEA-') ||
      (o.source && (o.source.includes('AI') || o.source.includes('Strategia') || o.source.includes('Agent'))) ||
      (o.strategyName && (o.strategyName.includes('AI') || o.strategyName.includes('Strategia')));

    if (isAiSource) {
      seenOrderIds.add(idStr);
      candidateStrategies.push(o);
    }
  }

  // 3. Strategie z transakcji sesji
  for (const fb of executedSessionTransactions || []) {
    if (!fb) continue;
    const ordId = String(fb.orderId || fb.id || '');
    if (ordId && !seenOrderIds.has(ordId)) {
      seenOrderIds.add(ordId);
      candidateStrategies.push({
        id: ordId,
        instId: fb.instId,
        asset: fb.asset,
        side: fb.side,
        orderType: fb.orderType || 'MARKET',
        amount: fb.amount,
        price: fb.price,
        usdcValue: fb.usdcValue,
        feeRate: fb.feeRate || '0.10%',
        feeUsdc: fb.feeUsdc,
        feeAsset: fb.feeAsset,
        totalUsdcWithFee: fb.totalUsdcWithFee,
        status: 'CLOSED',
        statusLabel: 'Zamknięte (Zrealizowane na OKX)',
        source: 'Agent AI MCP (okx/agent-trade-kit)',
        strategyName: fb.strategyName || `Strategia AI (${fb.instId})`,
        date: fb.date,
        time: fb.time,
        createdAtDate: fb.createdAtDate || fb.date,
        createdAtTime: fb.createdAtTime || fb.time,
        timestamp: fb.timestamp || Date.now(),
        exchangeFeedback: fb
      });
    }
  }

  // Sortujemy strategie chronologicznie od najnowszych
  candidateStrategies.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Belka kontrolek w nagłówku okna pomiędzy "W siatce" a "Siatka"
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
        title="Instrukcja: Wygeneruj Konkretną Strategię Kupna — Analiza Agenta AI z OKX"
        onClick={(e) => {
          e.stopPropagation();
          setShowInstruction((prev) => !prev);
          setShowHistory(false);
          setShowExamples(false);
        }}
      >
        <span>ℹ️</span> <span className="ai-pill-btn-label">Instrukcja</span>
      </button>

      <button
        type="button"
        className={`win-ctrl-btn ai-titlebar-pill ${showHistory ? 'active' : ''}`}
        style={
          showHistory
            ? { background: '#a855f7', color: '#ffffff', borderColor: '#a855f7', fontWeight: 700 }
            : { color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.45)' }
        }
        title="Wyświetl strategie wykonane i zrealizowane lub w trakcie realizacji z dokładnym czasem otwarcia i realizacji"
        onClick={(e) => {
          e.stopPropagation();
          setShowHistory((prev) => !prev);
          setShowInstruction(false);
          setShowExamples(false);
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
        title="Przykłady strategii i możliwości Agenta AI z OKX"
        onClick={(e) => {
          e.stopPropagation();
          setShowExamples((prev) => !prev);
          setShowInstruction(false);
          setShowHistory(false);
        }}
      >
        <span>💡</span> <span className="ai-pill-btn-label">Przykłady strategii</span>
      </button>
    </div>
  );

  const a = activeSessionAnalysis;

  return (
    <WindowContainer
      winMeta={winMeta}
      isSoloGridWindow={isSoloGridWindow}
      baseClassName="panel-card panel-ai-strategies"
      titlebarTitle="🧠 AI Strategies — Analiza Strategii Kupna OKX"
      extraTitlebarControls={extraTitlebarControls}
      onSetWindowMode={onSetWindowMode}
      onCloseWindow={onCloseWindow}
      onBringToFront={onBringToFront}
    >
      {/* DODATKOWY WEWNĘTRZNY PASEK NARZĘDZIOWY (Gwarantuje dostęp do przycisków na telefonach i we wszystkich trybach okna) */}
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
          Narzędzia Agenta AI:
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
          }}
        >
          ℹ️ Instrukcja {showInstruction ? '▲' : '▼'}
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
          }}
        >
          📜 Historia strategii ({candidateStrategies.length}) {showHistory ? '▲' : '▼'}
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
          }}
        >
          💡 Przykłady strategii {showExamples ? '▲' : '▼'}
        </button>
      </div>

      {/* 1. TOOLTIP / TOAST INSTRUKCJA (pojawia się po kliknięciu przycisku Instrukcja) */}
      {showInstruction && (
        <div className="ai-strat-instruction-banner">
          <div className="instruction-banner-top">
            <div className="instruction-banner-title">
              <span className="inst-badge-icon">ℹ️</span>
              <h4>
                Wygeneruj Konkretną Strategię Kupna — Analiza Agenta AI z OKX (<code>eea.okx.com</code>)
              </h4>
            </div>
            <button
              type="button"
              className="btn-close-sm"
              title="Zamknij instrukcję"
              onClick={() => setShowInstruction(false)}
            >
              ✕
            </button>
          </div>
          <p className="instruction-banner-desc">
            Wpisz nazwę waloru lub swoje zapytanie — Agent AI pobierze bieżące dane rynkowe z
            OKX (kurs Spot, zmienność 24h, RSI, EMA, VWAP, wsparcia S1/S2) i opracuje
            kompletną strategię kupna (Spot, DCA 3-transzowe, Grid, TP/SL) wraz z gotowym
            zleceniem.
          </p>
          <div className="instruction-banner-foot">
            <span className="ai-strat-engine-badge">@okx_ai/okx-trade-mcp v5</span>
            <button
              type="button"
              className="btn btn-outline-sm"
              onClick={() => setShowInstruction(false)}
            >
              Rozumiem / Zamknij ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. PANEL HISTORII: POKAZUJE STRATEGIE WYKONANE I ZREALIZOWANE ORAZ W TRAKCIE REALIZACJI Z DOKŁADNYM CZASEM OTWARCIA I REALIZACJI */}
      {showHistory && (
        <div className="ai-strat-history-container">
          <div className="history-container-header">
            <div className="history-title-group">
              <span className="hist-icon">📜</span>
              <h4>Strategie Agenta AI — Wykonane, Zrealizowane i w Trakcie Realizacji</h4>
            </div>
            <button
              type="button"
              className="btn-close-sm"
              title="Zamknij historię"
              onClick={() => setShowHistory(false)}
            >
              ✕
            </button>
          </div>

          <p className="panel-subtitle" style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Poniżej znajduje się pełna historia strategii z dokładną datą i czasem otworzenia strategii oraz momentem jej zrealizowania na giełdzie OKX.
          </p>

          <div className="history-strategies-full-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {candidateStrategies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                Brak zarejestrowanych strategii w tej sesji. Wpisz zapytanie w polu poniżej, aby wygenerować nową strategię.
              </div>
            ) : (
              candidateStrategies.map((ord) => {
                const timing = getStrategyTiming(ord);
                const isBuy = ord.side === 'BUY';
                const isPending = !timing.isFilled;
                const isExpanded = expandedHistoryTxIds.has(ord.id);
                const fb = ord.exchangeFeedback;

                return (
                  <div
                    key={ord.id}
                    className="history-strategy-card"
                    style={{
                      background: isPending ? 'rgba(245, 158, 11, 0.08)' : 'rgba(17, 24, 39, 0.75)',
                      border: isPending ? '1.5px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          className={`side-badge ${isBuy ? 'side-buy' : 'side-sell'}`}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            background: isBuy ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: isBuy ? '#34d399' : '#f87171'
                          }}
                        >
                          {isBuy ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)'}
                        </span>
                        <strong>{ord.amount} {ord.asset}</strong>
                        <span>@ {formatUnitPrice(ord.price)} USDC</span>
                        <strong style={{ color: 'var(--accent-okx)' }}>({formatUsdc(ord.usdcValue)})</strong>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: isPending ? '#fbbf24' : '#34d399',
                            fontWeight: 700
                          }}
                        >
                          {isPending ? '⏳ W TRAKCIE REALIZACJI' : '✅ ZREALIZOWANA NA OKX'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {onOpenAssetChart && (
                          <button
                            type="button"
                            className="btn btn-outline-sm"
                            title="Otwórz wykres tego waloru"
                            onClick={() => onOpenAssetChart(ord.instId || `${ord.asset}-USDC`)}
                          >
                            📈 Wykres
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline-sm"
                          onClick={() => toggleHistoryItemDetails(ord.id)}
                        >
                          {isExpanded ? '▲ Zwiń szczegóły' : '▼ Szczegóły giełdowe'}
                        </button>
                      </div>
                    </div>

                    {/* DOKŁADNY CZAS OTWARCIA I REALIZACJI STRATEGII */}
                    <div
                      className="history-strategy-timing-bar"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '11.5px',
                        marginBottom: '6px'
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>🕒 Data i czas otwarcia strategii: </span>
                        <strong style={{ color: '#60a5fa' }}>
                          {timing.openDate} {timing.openTime}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {isPending ? '⏳ Stan realizacji: ' : '🏁 Data i czas zrealizowania: '}
                        </span>
                        <strong style={{ color: isPending ? '#fbbf24' : '#34d399' }}>
                          {isPending ? 'Oczekuje na realizację' : `${timing.execDate} ${timing.execTime}`}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>📋 Strategia / ID: </span>
                        <strong>
                          {ord.strategyName || ord.instId} <code>(#{ord.id})</code>
                        </strong>
                      </div>
                    </div>

                    {/* JEŚLI ZLECENIE W TRAKCIE REALIZACJI — POKAZUJEMY PRZYCISKI POTWIERDŹ ORAZ ODRZUĆ TRANSAKCJĘ */}
                    {isPending && ord.isCurrentlyActive && (
                      <InlineOrderConfirmCard
                        active={ord}
                        modeLabel="DEMO"
                        onConfirm={onConfirmOrder}
                        onReject={onRejectOrder}
                        isConfirming={isConfirmingOrder}
                        style={{ marginTop: '8px' }}
                      />
                    )}

                    {isExpanded && fb && (
                      <div style={{ marginTop: '10px' }}>
                        <ExchangeFeedbackDetails fb={fb} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. CZYSTE POLE INPUT DO GENEROWANIA NOWEJ STRATEGII KUPNA */}
      <div className="ai-strat-generator-box">
        <form id="aiStrategyForm" className="ai-strat-input-row" onSubmit={handleFormSubmit}>
          <input
            type="text"
            id="aiStrategyInput"
            placeholder="Wpisz walor lub zapytanie, np. 'BTC', 'Kup ETH za 2500 USDC', 'Strategia kupna SOL DCA', 'Analiza kupna XRP'..."
            autoComplete="off"
            value={aiStrategyInput}
            onChange={(e) => onSetAiStrategyInput(e.target.value)}
          />
          <button
            type="submit"
            id="btnGenerateAiStrategy"
            className="btn btn-primary btn-generate-strat"
          >
            🧠 Stwórz strategię kupna OKX AI ➤
          </button>
        </form>

        <div className="ai-strat-asset-pills">
          <span className="asset-pills-label">Szybka analiza waloru OKX:</span>
          {QUICK_ASSETS.map((sym) => (
            <button
              key={sym}
              type="button"
              className="strat-asset-chip"
              data-strat-asset={sym}
              onClick={() => handleRunQuery(`Analiza agenta AI z OKX i strategia kupna dla ${sym}`)}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* 4. AKTYWNE ZLECENIE OCZEKUJĄCE NA REALIZACJĘ W BIEŻĄCEJ SESJI (Z PRZYCISKIEM POTWIERDŹ ORAZ ODRZUĆ TRANSAKCJĘ) */}
      {activeTradeOrder && (
        <div style={{ marginBottom: '14px' }}>
          <InlineOrderConfirmCard
            active={activeTradeOrder}
            modeLabel="DEMO"
            badgeTitle={`📋 ZLECENIE KUPNA STRATEGII AI GOTOWE DO REALIZACJI • OKX EUROPE`}
            onConfirm={handleConfirmOrderWrapped}
            onReject={handleRejectOrderWrapped}
            isConfirming={isConfirmingOrder}
          />
        </div>
      )}

      {/* 5. WYNIK ŚWIEŻO WYGENEROWANEJ STRATEGII W BIEŻĄCEJ SESJI */}
      {a && (
        <div className="ai-strat-recommendation-wrapper">
          <div
            className={`ai-strat-recommendation-bar ${isRecommendationOpen ? 'is-expanded' : 'is-collapsed'}`}
            onClick={() => setIsRecommendationOpen((prev) => !prev)}
            title="Kliknij, aby rozwinąć lub zwinąć rekomendację bieżącej strategii"
          >
            <div className="rec-bar-left">
              <span className="okx-ai-signal-pill">{a.technicals?.signalBadge || 'SYGNAŁ AI'}</span>
              <span className="rec-bar-title">
                📊 Świeża Rekomendacja Strategii: <strong>{a.asset} ({a.instId})</strong> — {a.recommendedStrategy?.strategyName}
              </span>
              <span className="rec-bar-meta">
                Kurs: <strong>{formatUnitPrice(a.market?.price)} USDC</strong> • {a.date} {a.time}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline-sm btn-rec-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setIsRecommendationOpen((prev) => !prev);
              }}
            >
              {isRecommendationOpen ? '▲ Zwiń' : '▼ Otwórz'}
            </button>
          </div>

          {isRecommendationOpen && (
            <div id="aiStrategyResultContainer" className="ai-strategy-result-container">
              <div className="okx-ai-analysis-report">
                <div className="okx-ai-report-header">
                  <div className="okx-ai-report-title-group">
                    <span className="okx-ai-signal-pill">{a.technicals?.signalBadge}</span>
                    <h4>
                      📊 Analiza Agenta AI z OKX dla waloru{' '}
                      <strong>
                        {a.asset} ({a.instId})
                      </strong>{' '}
                      — {a.recommendedStrategy?.strategyName}
                    </h4>
                  </div>
                  <div className="okx-ai-report-meta">
                    <span>
                      Silnik: <code>{a.engine}</code>
                    </span>
                    <span>
                      📅 {a.date} ⏰ {a.time}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline-sm open-asset-chart-btn"
                      data-instid={a.instId}
                      onClick={() => onOpenAssetChart && onOpenAssetChart(a.instId)}
                    >
                      📈 Wykres {a.asset}
                    </button>
                  </div>
                </div>

                <div className="okx-ai-rationale-banner">
                  <strong>
                    🧠 Wnioski z analizy Agenta AI OKX (Zapytanie: „{a.query}”):
                  </strong>
                  <p>{a.recommendedStrategy?.rationale}</p>
                </div>

                <div className="okx-ai-metrics-grid">
                  <div className="okx-ai-metric-card">
                    <span>Kurs Spot OKX ({a.instId}):</span>
                    <strong>
                      {formatUnitPrice(a.market?.price)}{' '}
                      <em className={a.market?.change24hPct >= 0 ? 'pos' : 'neg'}>
                        ({a.market?.change24hPct >= 0 ? '+' : ''}
                        {a.market?.change24hPct}%)
                      </em>
                    </strong>
                  </div>
                  <div className="okx-ai-metric-card">
                    <span>Zakres 24h (Min – Max):</span>
                    <strong>
                      {formatUnitPrice(a.market?.low24h)} – {formatUnitPrice(a.market?.high24h)}
                    </strong>
                  </div>
                  <div className="okx-ai-metric-card">
                    <span>Trend &amp; Zmienność 24h:</span>
                    <strong>
                      {a.technicals?.trendLabel} ({a.market?.volatility24hPct}%)
                    </strong>
                  </div>
                  <div className="okx-ai-metric-card">
                    <span>RSI (14) &amp; Momentum:</span>
                    <strong>
                      RSI: {a.technicals?.rsi14} — {a.technicals?.rsiStatus}
                    </strong>
                  </div>
                  <div className="okx-ai-metric-card">
                    <span>Średnie OKX (EMA 20 / EMA 50 / VWAP):</span>
                    <strong>
                      EMA20: {formatUnitPrice(a.technicals?.ema20)} • VWAP:{' '}
                      {formatUnitPrice(a.technicals?.vwap)}
                    </strong>
                  </div>
                  <div className="okx-ai-metric-card">
                    <span>Poziomy Wsparcia (Strefy Dokupienia):</span>
                    <strong style={{ color: 'var(--accent-blue)' }}>
                      S1: {formatUnitPrice(a.technicals?.support1)} • S2:{' '}
                      {formatUnitPrice(a.technicals?.support2)}
                    </strong>
                  </div>
                  <div className="okx-ai-metric-card">
                    <span>Cele Zysku (Take-Profit 1 / 2 / 3):</span>
                    <strong style={{ color: 'var(--buy-green)' }}>
                      TP1: {formatUnitPrice(a.technicals?.takeProfit1)} • TP2:{' '}
                      {formatUnitPrice(a.technicals?.takeProfit2)} • TP3:{' '}
                      {formatUnitPrice(a.technicals?.takeProfit3)}
                    </strong>
                  </div>
                  <div className="okx-ai-metric-card">
                    <span>Obrona (Stop-Loss &amp; Risk/Reward):</span>
                    <strong style={{ color: 'var(--sell-red)' }}>
                      SL: {formatUnitPrice(a.technicals?.stopLoss)} (-3.2%) • R:R{' '}
                      {a.technicals?.riskReward}
                    </strong>
                  </div>
                </div>

                <div className="okx-ai-plans-grid">
                  <div className="okx-ai-plan-box">
                    <h5>
                      🎯 Plan Akumulacji OKX Spot DCA (3 Transze Kupna dla {a.asset})
                    </h5>
                    <table className="data-table compact-strat-table">
                      <thead>
                        <tr>
                          <th>Transza strategii</th>
                          <th>Cena wejścia (USDC)</th>
                          <th>Ilość {a.asset}</th>
                          <th>Kwota (USDC)</th>
                          <th>Warunek aktywacji na OKX</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(a.recommendedStrategy?.dcaTranches || []).map((tr, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{tr.step}</strong>
                            </td>
                            <td>{formatUnitPrice(tr.price)}</td>
                            <td>
                              <strong>
                                {formatQty(tr.amount)} {a.asset}
                              </strong>
                            </td>
                            <td>{formatUsdc(tr.usdcValue)}</td>
                            <td className="small-muted">{tr.condition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="okx-ai-plan-summary-line">
                      <span>
                        Łącznie po wykonaniu 3 transz DCA:{' '}
                        <strong>
                          {formatQty(a.recommendedStrategy?.totalDcaAmt)} {a.asset}
                        </strong>
                      </span>
                      <span>
                        Uśredniona cena zakupu DCA:{' '}
                        <strong>{formatUnitPrice(a.recommendedStrategy?.avgDcaPrice)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="okx-ai-plan-box">
                    <h5>
                      🤖 Parametry Bota OKX Spot Grid &amp; Kontekst Twojego Portfela
                    </h5>
                    <div className="okx-ai-side-kv-list">
                      <div className="kv-row">
                        <span>Dolne pasmo siatki (Lower Grid):</span>
                        <strong>
                          {formatUnitPrice(a.recommendedStrategy?.gridPlan?.lowerPrice)}
                        </strong>
                      </div>
                      <div className="kv-row">
                        <span>Górne pasmo siatki (Upper Grid):</span>
                        <strong>
                          {formatUnitPrice(a.recommendedStrategy?.gridPlan?.upperPrice)}
                        </strong>
                      </div>
                      <div className="kv-row">
                        <span>Liczba poziomów siatki (Grids):</span>
                        <strong>
                          {a.recommendedStrategy?.gridPlan?.gridLevels} poziomów zleceń
                        </strong>
                      </div>
                      <div className="kv-row">
                        <span>Zysk na pojedynczej siatce:</span>
                        <strong style={{ color: 'var(--buy-green)' }}>
                          {a.recommendedStrategy?.gridPlan?.profitPerGrid}
                        </strong>
                      </div>
                      <div className="kv-row">
                        <span>Dostępne USDC w Twoim portfelu OKX:</span>
                        <strong>{formatUsdc(a.portfolioContext?.availUsdc)}</strong>
                      </div>
                      <div className="kv-row">
                        <span>Obecnie posiadane {a.asset} w portfelu:</span>
                        <strong>
                          {formatQty(a.portfolioContext?.currentAssetAmount)} {a.asset}
                        </strong>
                      </div>
                      <div className="kv-row">
                        <span>Stan {a.asset} po realizacji zakupu:</span>
                        <strong style={{ color: 'var(--accent-okx)' }}>
                          {formatQty(a.portfolioContext?.newTotalAssetAmount)} {a.asset}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. OKNO NA DOLE: PRZYKŁADY STRATEGII I MOŻLIWOŚCI (wywoływane przyciskiem Przykłady strategii) */}
      {showExamples && (
        <div className="ai-strat-capabilities-grid">
          <div className="ai-strat-info-card">
            <h4>
              🤖 Co potrafi Agent AI z OKX (<code>okx/agent-trade-kit</code>)?
            </h4>
            <ul className="ai-capabilities-list">
              <li>
                <strong>
                  📊 Analiza Rynkowa i Techniczna OKX Spot (<code>okx-cex-market</code>):
                </strong>{' '}
                Analizuje na żywo kursy Spot z <code>eea.okx.com</code>, zmienność dobową 24h
                (High / Low / Volume), spread Bid/Ask, położenie ceny względem{' '}
                <strong>VWAP</strong>, średnich kroczących <strong>EMA 20 / EMA 50</strong> oraz
                oscylatora <strong>RSI (14)</strong>.
              </li>
              <li>
                <strong>
                  🧠 Budowa Konkretnych Strategii Kupna (<code>okx-cex-bot</code>):
                </strong>{' '}
                Tworzy spersonalizowane strategie zakupu:
                <br />• <strong>Spot DCA (3 transze uśredniające)</strong> — wejście 40% po cenie
                rynkowej + 35% na wsparciu S1 (-2.0%) + 25% na wsparciu S2 (-4.5%),
                <br />• <strong>OKX Spot Grid Bot</strong> — wyznacza dolne i górne pasmo siatki
                oraz gęstość poziomów,
                <br />• <strong>Momentum Breakout &amp; Dip Buy</strong> — wyznacza dokładne cele{' '}
                <strong>Take-Profit (TP1, TP2, TP3)</strong> oraz poziom obronny{' '}
                <strong>Stop-Loss (SL)</strong>.
              </li>
              <li>
                <strong>
                  💼 Audyt Portfela i Kontrola Ryzyka (<code>okx-cex-portfolio</code>):
                </strong>{' '}
                Sprawdza Twoje dostępne środki <code>USDC</code> w portfelu OKX Demo/Live,
                dotychczasową ilość i średnią cenę zakupu danego waloru oraz oblicza stosunek
                Zysk/Ryzyko (<code>Risk/Reward Ratio</code>).
              </li>
              <li>
                <strong>
                  ⚡ Kalkulacja Kosztów, Fee (0.10%) i Realizacja 1-Klawiszem (
                  <code>okx-cex-trade</code>):
                </strong>{' '}
                Każdą wygenerowaną strategię kupna od razu przelicza na <code>USDC</code> z
                uwzględnieniem prowizji giełdowej <code>Fee 0.10%</code> i udostępnia przycisk{' '}
                <strong>Potwierdź</strong>, który realizuje transakcję na giełdzie i zapisuje{' '}
                <em>Exchange Feedback</em> w historii.
              </li>
            </ul>
          </div>

          <div className="ai-strat-info-card">
            <h4>
              💬 Jakie zapytania obsługuje i o co można pytać?{' '}
              <span className="small-muted">(Kliknij zapytanie, aby uruchomić analizę)</span>
            </h4>

            <div className="ai-query-category">
              <div className="ai-query-cat-title">
                1. Konkretna strategia kupna dla wybranego waloru i kwoty:
              </div>
              <div className="ai-query-examples">
                {[
                  'Stwórz strategię kupna dla BTC za 2500 USDC',
                  'Zrób analizę i strategię kupna DCA dla ETH za 1800 USDC',
                  'Strategia kupna SOL za 1200 USDC z poziomami Take-Profit i Stop-Loss'
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="ai-sample-query-btn"
                    data-strat-query={q}
                    onClick={() => handleRunQuery(q)}
                  >
                    „{q}”
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-query-category">
              <div className="ai-query-cat-title">
                2. Analiza techniczna OKX, wsparcia S1/S2 oraz cele cenowe:
              </div>
              <div className="ai-query-examples">
                {[
                  'Przeanalizuj XRP na giełdzie OKX i przygotuj strategię akumulacji za 1500 USDC',
                  'Analiza agenta AI z OKX dla WLD — strategia kupna 1000 WLD',
                  'Zbuduj strategię Spot Grid dla AVAX za 1000 USDC'
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="ai-sample-query-btn"
                    data-strat-query={q}
                    onClick={() => handleRunQuery(q)}
                  >
                    „{q}”
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-query-category">
              <div className="ai-query-cat-title">
                3. Szybkie zlecenia kupna na określoną ilość waloru:
              </div>
              <div className="ai-query-examples">
                {[
                  'Strategia kupna 0.05 BTC po kursie rynkowym OKX',
                  'Strategia kupna 50 LINK za USDC z analizą wsparcia i oporu',
                  'Strategia kupna 500 SUI w oparciu o analizę OKX Momentum'
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="ai-sample-query-btn"
                    data-strat-query={q}
                    onClick={() => handleRunQuery(q)}
                  >
                    „{q}”
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </WindowContainer>
  );
}
