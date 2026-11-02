import React from 'react';
import { WindowContainer } from './WindowContainer';
import { InlineOrderConfirmCard, CollapsibleExecutedTx } from './ExchangeFeedbackBox';
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

export function AiStrategiesWindow({
  winMeta,
  isSoloGridWindow,
  aiStrategyInput,
  currentAiStrategyAnalysis,
  activeTradeOrder,
  lastExchangeFeedback,
  collapsedAiTxIds,
  isConfirmingOrder,
  onSetAiStrategyInput,
  onSubmitAiStrategy,
  onRunAiStrategyQuery,
  onConfirmOrder,
  onToggleAiExecutedTx,
  onOpenAssetChart,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const a = currentAiStrategyAnalysis;

  return (
    <WindowContainer
      winMeta={winMeta}
      isSoloGridWindow={isSoloGridWindow}
      baseClassName="panel-card panel-ai-strategies"
      titlebarTitle="🧠 AI Strategies — Możliwości Agenta AI & Analiza Strategii Kupna OKX"
      onSetWindowMode={onSetWindowMode}
      onCloseWindow={onCloseWindow}
      onBringToFront={onBringToFront}
    >
      {/* GÓRNA SEKCJA: POLE INPUT DO GENEROWANIA KONKRETNEJ STRATEGII KUPNA I ANALIZY AGENTA AI Z OKX */}
      <div className="ai-strat-generator-box">
        <div className="ai-strat-gen-header">
          <div>
            <h3>
              🎯 Wygeneruj Konkretną Strategię Kupna — Analiza Agenta AI z OKX (
              <code>eea.okx.com</code>)
            </h3>
            <p className="panel-subtitle">
              Wpisz nazwę waloru lub swoje zapytanie — Agent AI pobierze bieżące dane rynkowe z
              OKX (kurs Spot, zmienność 24h, RSI, EMA, VWAP, wsparcia S1/S2) i opracuje
              kompletną strategię kupna (Spot, DCA 3-transzowe, Grid, TP/SL) wraz z gotowym
              zleceniem.
            </p>
          </div>
          <span className="ai-strat-engine-badge">@okx_ai/okx-trade-mcp v5</span>
        </div>

        <form id="aiStrategyForm" className="ai-strat-input-row" onSubmit={onSubmitAiStrategy}>
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
              onClick={() =>
                onRunAiStrategyQuery(`Analiza agenta AI z OKX i strategia kupna dla ${sym}`)
              }
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* KONTENER NA WYNIK ANALIZY AGENTA AI Z OKX I KONKRETNĄ STRATEGIĘ KUPNA */}
      <div
        id="aiStrategyResultContainer"
        className="ai-strategy-result-container"
        hidden={!a}
      >
        {a && (
          <div className="okx-ai-analysis-report">
            <div className="okx-ai-report-header">
              <div className="okx-ai-report-title-group">
                <span className="okx-ai-signal-pill">{a.technicals.signalBadge}</span>
                <h4>
                  📊 Analiza Agenta AI z OKX dla waloru{' '}
                  <strong>
                    {a.asset} ({a.instId})
                  </strong>{' '}
                  — {a.recommendedStrategy.strategyName}
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
                  onClick={() => onOpenAssetChart(a.instId)}
                >
                  📈 Wykres {a.asset}
                </button>
              </div>
            </div>

            <div className="okx-ai-rationale-banner">
              <strong>
                🧠 Wnioski z analizy Agenta AI OKX (Zapytanie: „{a.query}”):
              </strong>
              <p>{a.recommendedStrategy.rationale}</p>
            </div>

            <div className="okx-ai-metrics-grid">
              <div className="okx-ai-metric-card">
                <span>Kurs Spot OKX ({a.instId}):</span>
                <strong>
                  {formatUnitPrice(a.market.price)}{' '}
                  <em className={a.market.change24hPct >= 0 ? 'pos' : 'neg'}>
                    ({a.market.change24hPct >= 0 ? '+' : ''}
                    {a.market.change24hPct}%)
                  </em>
                </strong>
              </div>
              <div className="okx-ai-metric-card">
                <span>Zakres 24h (Min – Max):</span>
                <strong>
                  {formatUnitPrice(a.market.low24h)} – {formatUnitPrice(a.market.high24h)}
                </strong>
              </div>
              <div className="okx-ai-metric-card">
                <span>Trend &amp; Zmienność 24h:</span>
                <strong>
                  {a.technicals.trendLabel} ({a.market.volatility24hPct}%)
                </strong>
              </div>
              <div className="okx-ai-metric-card">
                <span>RSI (14) &amp; Momentum:</span>
                <strong>
                  RSI: {a.technicals.rsi14} — {a.technicals.rsiStatus}
                </strong>
              </div>
              <div className="okx-ai-metric-card">
                <span>Średnie OKX (EMA 20 / EMA 50 / VWAP):</span>
                <strong>
                  EMA20: {formatUnitPrice(a.technicals.ema20)} • VWAP:{' '}
                  {formatUnitPrice(a.technicals.vwap)}
                </strong>
              </div>
              <div className="okx-ai-metric-card">
                <span>Poziomy Wsparcia (Strefy Dokupienia):</span>
                <strong style={{ color: 'var(--accent-blue)' }}>
                  S1: {formatUnitPrice(a.technicals.support1)} • S2:{' '}
                  {formatUnitPrice(a.technicals.support2)}
                </strong>
              </div>
              <div className="okx-ai-metric-card">
                <span>Cele Zysku (Take-Profit 1 / 2 / 3):</span>
                <strong style={{ color: 'var(--buy-green)' }}>
                  TP1: {formatUnitPrice(a.technicals.takeProfit1)} • TP2:{' '}
                  {formatUnitPrice(a.technicals.takeProfit2)} • TP3:{' '}
                  {formatUnitPrice(a.technicals.takeProfit3)}
                </strong>
              </div>
              <div className="okx-ai-metric-card">
                <span>Obrona (Stop-Loss &amp; Risk/Reward):</span>
                <strong style={{ color: 'var(--sell-red)' }}>
                  SL: {formatUnitPrice(a.technicals.stopLoss)} (-3.2%) • R:R{' '}
                  {a.technicals.riskReward}
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
                    {a.recommendedStrategy.dcaTranches.map((tr, idx) => (
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
                      {formatQty(a.recommendedStrategy.totalDcaAmt)} {a.asset}
                    </strong>
                  </span>
                  <span>
                    Uśredniona cena zakupu DCA:{' '}
                    <strong>{formatUnitPrice(a.recommendedStrategy.avgDcaPrice)}</strong>
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
                      {formatUnitPrice(a.recommendedStrategy.gridPlan.lowerPrice)}
                    </strong>
                  </div>
                  <div className="kv-row">
                    <span>Górne pasmo siatki (Upper Grid):</span>
                    <strong>
                      {formatUnitPrice(a.recommendedStrategy.gridPlan.upperPrice)}
                    </strong>
                  </div>
                  <div className="kv-row">
                    <span>Liczba poziomów siatki (Grids):</span>
                    <strong>
                      {a.recommendedStrategy.gridPlan.gridLevels} poziomów zleceń
                    </strong>
                  </div>
                  <div className="kv-row">
                    <span>Zysk na pojedynczej siatce:</span>
                    <strong style={{ color: 'var(--buy-green)' }}>
                      {a.recommendedStrategy.gridPlan.profitPerGrid}
                    </strong>
                  </div>
                  <div className="kv-row">
                    <span>Dostępne USDC w Twoim portfelu OKX:</span>
                    <strong>{formatUsdc(a.portfolioContext.availUsdc)}</strong>
                  </div>
                  <div className="kv-row">
                    <span>Obecnie posiadane {a.asset} w portfelu:</span>
                    <strong>
                      {formatQty(a.portfolioContext.currentAssetAmount)} {a.asset}
                    </strong>
                  </div>
                  <div className="kv-row">
                    <span>Stan {a.asset} po realizacji zakupu:</span>
                    <strong style={{ color: 'var(--accent-okx)' }}>
                      {formatQty(a.portfolioContext.newTotalAssetAmount)} {a.asset}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {activeTradeOrder ? (
              <InlineOrderConfirmCard
                active={activeTradeOrder}
                modeLabel={a.mode}
                badgeTitle={`📋 ZLECENIE KUPNA STRATEGII AI GOTOWE DO REALIZACJI • OKX EUROPE (${a.mode})`}
                onConfirm={onConfirmOrder}
                isConfirming={isConfirmingOrder}
                style={{ marginTop: '12px' }}
              />
            ) : lastExchangeFeedback ? (
              <div style={{ marginTop: '12px' }}>
                <CollapsibleExecutedTx
                  fb={lastExchangeFeedback}
                  isCollapsed={collapsedAiTxIds.has(
                    String(lastExchangeFeedback.orderId || 'LATEST')
                  )}
                  onToggle={onToggleAiExecutedTx}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* SEKCJA INFORMACYJNA: CO TEN AGENT POTRAFI, JAKIE ZAPYTANIA I O CO MOŻNA PYTAĆ */}
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
                  onClick={() => onRunAiStrategyQuery(q)}
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
                  onClick={() => onRunAiStrategyQuery(q)}
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
                  onClick={() => onRunAiStrategyQuery(q)}
                >
                  „{q}”
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WindowContainer>
  );
}
