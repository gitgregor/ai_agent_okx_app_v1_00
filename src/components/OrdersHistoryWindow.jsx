import React from 'react';
import { WindowContainer } from './WindowContainer';
import { ExchangeFeedbackDetails } from './ExchangeFeedbackBox';
import {
  formatUsdc,
  formatUnitPrice,
  formatQty,
  buildExchangeFeedbackForItem
} from '../engine/okxClientEngine';

export function OrdersHistoryWindow({
  winMeta,
  isSoloGridWindow,
  orders,
  apiMode,
  orderFilter,
  expandedFeedbackIds,
  onSetOrderFilter,
  onToggleFeedbackRow,
  onOpenAssetChart,
  onActivateOpenOrder,
  onCancelOpenOrder,
  onForceDeviceSync,
  onExportSyncData,
  onImportSyncData,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const allOrders = orders || [];
  const openOrders = allOrders.filter((o) => o.status === 'OPEN');
  const closedOrders = allOrders.filter((o) => o.status !== 'OPEN');

  let filtered = allOrders;
  if (orderFilter === 'OPEN') filtered = openOrders;
  else if (orderFilter === 'CLOSED') filtered = closedOrders;

  return (
    <WindowContainer
      tag="section"
      winMeta={winMeta}
      isSoloGridWindow={isSoloGridWindow}
      baseClassName="panel-card panel-orders-history"
      titlebarTitle="📜 Historia Transakcji — Otwarte i Zamknięte Zlecenia"
      onSetWindowMode={onSetWindowMode}
      onCloseWindow={onCloseWindow}
      onBringToFront={onBringToFront}
    >
      <div className="panel-header">
        <div>
          <h2>📜 Historia Transakcji — Otwarte Zlecenia i Zamknięte Zlecenia</h2>
          <p className="panel-subtitle">
            Pełna lista zleceń z datą, czasem oraz przyciskiem otwierającym przesuwny wykres
            danego aktywa (Mały / Średni / Full)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline-sm"
            style={{ background: 'rgba(59, 130, 246, 0.12)', borderColor: '#3b82f6', color: '#60a5fa' }}
            title="Wymuś synchronizację zleceń między telefonem a laptopem przez Bramę Domową"
            onClick={onForceDeviceSync}
          >
            🔄 Synchronizuj Telefon ⇄ Laptop
          </button>
          <button
            type="button"
            className="btn btn-outline-sm"
            title="Kopiuj do schowka zlecenia wykonane na tym urządzeniu"
            onClick={onExportSyncData}
          >
            📋 Kopiuj z tego urządzenia
          </button>
          <button
            type="button"
            className="btn btn-outline-sm"
            title="Wklej zlecenia z drugiego urządzenia"
            onClick={onImportSyncData}
          >
            📥 Wklej z drugiego urządzenia
          </button>
        </div>
        <div className="orders-filter-tabs" role="tablist">
          <button
            type="button"
            className={`filter-tab ${orderFilter === 'ALL' ? 'active' : ''}`}
            data-filter="ALL"
            onClick={() => onSetOrderFilter('ALL')}
          >
            Wszystkie (<span id="countAllOrders">{allOrders.length}</span>)
          </button>
          <button
            type="button"
            className={`filter-tab ${orderFilter === 'OPEN' ? 'active' : ''}`}
            data-filter="OPEN"
            onClick={() => onSetOrderFilter('OPEN')}
          >
            Otwarte zlecenia (<span id="countOpenOrders">{openOrders.length}</span>)
          </button>
          <button
            type="button"
            className={`filter-tab ${orderFilter === 'CLOSED' ? 'active' : ''}`}
            data-filter="CLOSED"
            onClick={() => onSetOrderFilter('CLOSED')}
          >
            Zamknięte zlecenia (<span id="countClosedOrders">{closedOrders.length}</span>)
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Zlecenia</th>
              <th>Data</th>
              <th>Czas</th>
              <th>Para / Aktywo</th>
              <th>Kierunek</th>
              <th>Ilość aktywa</th>
              <th>Cena (USDC)</th>
              <th>Wartość (USDC)</th>
              <th>Strategia / Źródło</th>
              <th>Status zlecenia</th>
              <th>Szczegóły Transakcji (Exchange Feedback) &amp; Wykres</th>
            </tr>
          </thead>
          <tbody id="ordersHistoryTbody">
            {filtered.map((o) => {
              const isBuy = o.side === 'BUY';
              const isOpen = o.status === 'OPEN';
              const rowKey = `ord-${o.id}`;
              const isExpanded = expandedFeedbackIds.has(rowKey);
              const fb = buildExchangeFeedbackForItem(o, apiMode);

              return (
                <React.Fragment key={o.id}>
                  <tr>
                    <td>
                      <code>{o.id}</code>
                    </td>
                    <td>
                      <strong>{o.date}</strong>
                    </td>
                    <td>
                      <code>{o.time}</code>
                    </td>
                    <td>
                      <strong>{o.instId}</strong>
                    </td>
                    <td>
                      <span className={isBuy ? 'badge-buy' : 'badge-sell'}>
                        {isBuy ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)'}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {formatQty(o.amount)} {o.asset}
                      </strong>
                    </td>
                    <td>{formatUnitPrice(o.price)}</td>
                    <td>
                      <strong>{formatUsdc(o.usdcValue)}</strong>
                    </td>
                    <td>{o.strategyName || o.source}</td>
                    <td>
                      <span className={isOpen ? 'badge-status-open' : 'badge-status-closed'}>
                        {o.statusLabel}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}
                      >
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
                        <button
                          type="button"
                          className="btn btn-outline-sm open-asset-chart-btn"
                          data-instid={o.instId}
                          onClick={() => onOpenAssetChart(o.instId)}
                        >
                          📈 Wykres {o.asset}
                        </button>
                        {isOpen && (
                          <>
                            <button
                              type="button"
                              className="btn btn-accent-sm activate-open-order-btn"
                              data-orderid={o.id}
                              onClick={() => onActivateOpenOrder(o.id)}
                            >
                              ▶ Do potwierdzenia
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-sm cancel-open-order-btn"
                              data-orderid={o.id}
                              onClick={() => onCancelOpenOrder(o.id)}
                            >
                              ✕ Anuluj
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr
                    className="exchange-feedback-detail-row"
                    id={`ef-row-${rowKey}`}
                    hidden={!isExpanded}
                  >
                    <td colSpan={11}>
                      <ExchangeFeedbackDetails fb={fb} />
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </WindowContainer>
  );
}
