import React, { useRef, useEffect } from 'react';
import { WindowContainer } from './WindowContainer';
import { ExchangeFeedbackDetails } from './ExchangeFeedbackBox';
import {
  formatUsdc,
  formatQty,
  buildExchangeFeedbackForItem
} from '../engine/okxClientEngine';

export function PortfolioHistoryWindow({
  winMeta,
  isSoloGridWindow,
  historyList,
  apiMode,
  expandedFeedbackIds,
  onToggleFeedbackRow,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const canvasRef = useRef(null);
  const executedTradesOnly = (historyList || []).filter(
    (snap) => snap.side === 'BUY' || snap.side === 'SELL'
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const chronologicalSnapshots = executedTradesOnly.slice().reverse();
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
      const x =
        padL +
        (chronologicalSnapshots.length === 1
          ? plotW / 2
          : (idx / (chronologicalSnapshots.length - 1)) * plotW);
      const y =
        padT + plotH - ((pt.totalValueUsdc - minVal) / (maxVal - minVal || 1)) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#bcff2f';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    chronologicalSnapshots.forEach((pt, idx) => {
      const x =
        padL +
        (chronologicalSnapshots.length === 1
          ? plotW / 2
          : (idx / (chronologicalSnapshots.length - 1)) * plotW);
      const y =
        padT + plotH - ((pt.totalValueUsdc - minVal) / (maxVal - minVal || 1)) * plotH;
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
  }, [executedTradesOnly, winMeta?.mode]);

  return (
    <WindowContainer
      tag="section"
      winMeta={winMeta}
      isSoloGridWindow={isSoloGridWindow}
      baseClassName="panel-card panel-portfolio-history"
      titlebarTitle="📈 Historia Portfela Handlowego"
      onSetWindowMode={onSetWindowMode}
      onCloseWindow={onCloseWindow}
      onBringToFront={onBringToFront}
    >
      <div className="panel-header">
        <div>
          <h2>
            📈 Historia Portfela Handlowego (Snapshoty po każdej transakcji kupna lub
            sprzedaży)
          </h2>
          <p className="panel-subtitle">
            Każda autoryzowana transakcja zapisuje stan portfela w czasie wraz z wykresem
            zmiany wartości w USDC
          </p>
        </div>
      </div>

      <div className="portfolio-history-layout">
        <div className="portfolio-curve-box">
          <canvas
            id="portfolioEquityCanvas"
            ref={canvasRef}
            width={500}
            height={190}
          ></canvas>
        </div>
        <div className="table-responsive history-snapshots-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data i Czas</th>
                <th>Wykonana operacja</th>
                <th>Typ</th>
                <th>Ilość aktywa</th>
                <th>Kwota operacji (USDC)</th>
                <th>Wartość Portfela po transakcji (USDC)</th>
                <th>Exchange Feedback</th>
              </tr>
            </thead>
            <tbody id="portfolioHistoryTbody">
              {executedTradesOnly.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      padding: '14px'
                    }}
                  >
                    Brak zrealizowanych zleceń kupna/sprzedaży w historii tego portfela.
                  </td>
                </tr>
              ) : (
                executedTradesOnly.map((snap) => {
                  const badgeClass = snap.side === 'BUY' ? 'badge-buy' : 'badge-sell';
                  const sideLabel =
                    snap.side === 'BUY' ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)';
                  const usdcVal = snap.usdcValue ?? snap.usdcAmount ?? 0;
                  const rowKey = `hist-${snap.id}`;
                  const isExpanded = expandedFeedbackIds.has(rowKey);
                  const fb = buildExchangeFeedbackForItem(snap, apiMode);

                  return (
                    <React.Fragment key={snap.id}>
                      <tr>
                        <td>
                          <strong>{snap.date}</strong> <code>{snap.time}</code>
                        </td>
                        <td>{snap.action}</td>
                        <td>
                          <span className={badgeClass}>{sideLabel}</span>
                        </td>
                        <td>
                          <strong>
                            {formatQty(snap.amount)} {snap.asset}
                          </strong>
                        </td>
                        <td>{formatUsdc(usdcVal)}</td>
                        <td>
                          <strong style={{ color: 'var(--accent-okx)' }}>
                            {formatUsdc(snap.totalValueUsdc)}
                          </strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn btn-feedback-details toggle-exchange-feedback-btn ${
                              isExpanded ? 'active' : ''
                            }`}
                            data-feedback-key={rowKey}
                            onClick={() => onToggleFeedbackRow(rowKey)}
                          >
                            📋 Szczegóły transakcji (Exchange Feedback)
                          </button>
                        </td>
                      </tr>
                      <tr
                        className="exchange-feedback-detail-row"
                        id={`ef-row-${rowKey}`}
                        hidden={!isExpanded}
                      >
                        <td colSpan={7}>
                          <ExchangeFeedbackDetails fb={fb} />
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WindowContainer>
  );
}
