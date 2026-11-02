import React from 'react';
import { WindowContainer } from './WindowContainer';
import { ExchangeFeedbackDetails } from './ExchangeFeedbackBox';
import {
  formatUsdc,
  formatUnitPrice,
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
  const executedTradesOnly = (historyList || []).filter(
    (snap) => snap.side === 'BUY' || snap.side === 'SELL'
  );

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
            📈 Historia Portfela Handlowego (Wszystkie transakcje portfela — Kupno i Sprzedaż)
          </h2>
          <p className="panel-subtitle">
            Pełna historia transakcji portfela z datą, czasem, kursem wykonania, prowizją (Fee) oraz wartością portfela w USDC ({executedTradesOnly.length} transakcji)
          </p>
        </div>
      </div>

      <div className="portfolio-history-layout">
        <div className="table-responsive history-snapshots-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data i Czas</th>
                <th>Wykonana operacja</th>
                <th>Typ</th>
                <th>Ilość aktywa</th>
                <th>Cena jedn. (USDC)</th>
                <th>Kwota operacji (USDC)</th>
                <th>Wartość Portfela po transakcji (USDC)</th>
                <th>Exchange Feedback</th>
              </tr>
            </thead>
            <tbody id="portfolioHistoryTbody">
              {executedTradesOnly.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
                        <td>{formatUnitPrice(snap.price || (snap.amount > 0 ? usdcVal / snap.amount : 1))}</td>
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
                        <td colSpan={8}>
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
