import React from 'react';
import { formatUsdc, formatUnitPrice, formatQty } from '../engine/okxClientEngine';

export function ExchangeFeedbackDetails({ fb }) {
  if (!fb) return null;
  const isBuy = fb.side === 'BUY';
  const isRejected =
    Boolean(fb.systemError) ||
    Boolean(fb.status && (fb.status.includes('REJECTED') || fb.status.includes('odrzucona')));
  const isRejectedSystem =
    Boolean(fb.systemError) ||
    Boolean(fb.status && (fb.status.includes('REJECTED_SYSTEM') || fb.status.includes('odrzucona przez System')));

  return (
    <div className="exchange-feedback-box">
      <div className="ef-header">
        <span
          className={isRejected ? 'ef-badge-rejected' : 'ef-badge-ok'}
          style={
            isRejected
              ? {
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderColor: '#ef4444',
                  color: '#f87171'
                }
              : {}
          }
        >
          {isRejectedSystem
            ? `⚠️ TRANSAKCJA ODRZUCONA PRZEZ SYSTEM • OKX EUROPE • sCode: ${fb.code || 'ERR_SYSTEM'}`
            : isRejected
            ? `🚫 TRANSAKCJA ODRZUCONA PRZEZ UŻYTKOWNIKA • OKX EUROPE`
            : `✅ EXCHANGE FEEDBACK • OKX EUROPE (eea.okx.com) • sCode: ${fb.code || '0'}`}
        </span>
        <span className="ef-timestamp">
          📅 {fb.date} ⏰ {fb.time}
        </span>
      </div>
      <div className="ef-messages">
        <p>
          <strong>🎯 Założenie strategii i proces:</strong> {fb.strategyMessage}
        </p>
        <p>
          <strong>🏛️ Komunikat zwrotny z giełdy:</strong> {fb.exchangeMessage}
        </p>
        {isRejectedSystem && fb.systemError && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              fontSize: '12px'
            }}
          >
            <div style={{ color: '#f87171', fontWeight: 800, marginBottom: '2px' }}>
              ⚠️ Dlaczego system odrzucił transakcję:
            </div>
            <div style={{ color: '#fca5a5' }}>
              {fb.systemError.message || fb.systemError}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px', fontSize: '11px', color: '#fecaca' }}>
              {fb.systemError.type && <span><strong>Rodzaj błędu:</strong> {fb.systemError.type}</span>}
              {fb.systemError.code && <span><strong>Kod błędu:</strong> <code>{fb.systemError.code}</code></span>}
            </div>
          </div>
        )}
      </div>
      <div className="ef-grid">
        <div className="ef-cell">
          <span>ID Transakcji OKX:</span>
          <strong>
            <code>{fb.orderId}</code>
          </strong>
        </div>
        <div className="ef-cell">
          <span>Status Giełdowy:</span>
          <strong style={{ color: isRejected ? '#f87171' : 'var(--buy-green)' }}>
            {fb.status}
          </strong>
        </div>
        <div className="ef-cell">
          <span>Para / Tryb:</span>
          <strong>
            {fb.instId} ({fb.mode})
          </strong>
        </div>
        <div className="ef-cell">
          <span>Proces / Kierunek:</span>
          <strong style={{ color: isBuy ? 'var(--buy-green)' : 'var(--sell-red)' }}>
            {isBuy ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)'} ({fb.orderType})
          </strong>
        </div>
        <div className="ef-cell">
          <span>Ilość aktywa:</span>
          <strong>
            {formatQty(fb.amount)} {fb.asset}
          </strong>
        </div>
        <div className="ef-cell">
          <span>Cena wykonania (Kurs OKX):</span>
          <strong>{formatUnitPrice(fb.price)}</strong>
        </div>
        <div className="ef-cell">
          <span>Przeliczenie na USDC:</span>
          <strong>{formatUsdc(fb.usdcValue)}</strong>
        </div>
        <div className="ef-cell">
          <span>Prowizja giełdowa (Fee {fb.feeRate || '0.10%'}):</span>
          <strong>
            {formatUsdc(fb.feeUsdc)} ({fb.feeAsset} {fb.asset})
          </strong>
        </div>
        <div className="ef-cell ef-cell-highlight">
          <span>Całkowite rozliczenie w USDC (z Fee):</span>
          <strong>{formatUsdc(fb.totalUsdcWithFee)}</strong>
        </div>
      </div>
    </div>
  );
}

export function CollapsibleExecutedTx({ fb, isCollapsed, onToggle }) {
  if (!fb) return null;
  const txKey = String(fb.orderId || 'LATEST');
  const isBuy = fb.side === 'BUY';

  return (
    <div
      className={`ai-order-executed-feedback-wrap ${isCollapsed ? 'is-collapsed' : ''}`}
      data-executed-tx-id={txKey}
    >
      <div className="ai-executed-tx-collapse-header">
        <div className="ai-executed-tx-summary">
          <span className="ai-executed-status-pill">✅ ZREALIZOWANO</span>
          <code>#{fb.orderId}</code>
          <span className={isBuy ? 'badge-buy' : 'badge-sell'}>
            {isBuy ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)'}
          </span>
          <strong>
            {formatQty(fb.amount)} {fb.asset}
          </strong>
          <span>@ {formatUnitPrice(fb.price)}</span>
          <strong style={{ color: 'var(--accent-okx)' }}>({formatUsdc(fb.usdcValue)})</strong>
          <span className="small-muted">
            📅 {fb.date} ⏰ {fb.time}
          </span>
        </div>
        <div className="ai-executed-tx-actions">
          <button
            type="button"
            className={`btn btn-collapse-ai-tx toggle-ai-executed-tx-btn ${isCollapsed ? 'collapsed' : ''}`}
            data-toggle-ai-tx={txKey}
            title={
              isCollapsed
                ? 'Rozwiń szczegóły zrealizowanej transakcji'
                : 'Zwiń pokazane szczegóły zrealizowanej transakcji'
            }
            onClick={() => onToggle && onToggle(txKey)}
          >
            {isCollapsed ? '🔽 Rozwiń transakcję' : '🔼 Zwiń transakcję'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="ai-executed-tx-body">
          <ExchangeFeedbackDetails fb={fb} />
          <div className="ef-saved-footer">
            <span>
              💾 Rezultat został zapisany w historii — dostępny po naciśnięciu klawisza{' '}
              <strong>„Szczegóły transakcji (Exchange Feedback)”</strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function InlineOrderConfirmCard({
  active,
  modeLabel = 'DEMO',
  badgeTitle,
  onConfirm,
  onReject,
  isConfirming = false,
  style = null
}) {
  if (!active) return null;
  const isBuy = active.side === 'BUY';
  const dateStr = active.date || active.createdAtDate || new Date().toISOString().slice(0, 10);
  const timeStr = active.time || active.createdAtTime || new Date().toTimeString().slice(0, 8);
  const feeUsdc = Number(active.feeUsdc ?? (active.usdcValue * 0.001).toFixed(2));
  const feeAsset = Number(active.feeAsset ?? (active.amount * 0.001).toFixed(6));
  const totalUsdcWithFee = Number(
    active.totalUsdcWithFee ??
      (isBuy ? (active.usdcValue + feeUsdc).toFixed(2) : (active.usdcValue - feeUsdc).toFixed(2))
  );

  return (
    <div className="ai-order-confirm-card" style={style || undefined}>
      <div className="ai-order-confirm-header">
        <span className="ai-order-badge">
          {badgeTitle || `📋 ZLECENIE PRZYGOTOWANE DO REALIZACJI • OKX EUROPE (${modeLabel})`}
        </span>
        <span className="ai-order-datetime">
          📅 Data: <strong>{dateStr}</strong> ⏰ Czas: <strong>{timeStr}</strong>
        </span>
      </div>
      <div className="ai-order-details-grid">
        <div className="ai-order-item">
          <span>ID Zlecenia:</span>
          <strong>
            <code>{active.id}</code>
          </strong>
        </div>
        <div className="ai-order-item">
          <span>Strategia / Proces:</span>
          <strong>{active.strategyName || 'Strategia Spot AI'}</strong>
        </div>
        <div className="ai-order-item">
          <span>Para handlowa / Typ:</span>
          <strong>
            {active.instId} ({(active.orderType || 'MARKET').toUpperCase()})
          </strong>
        </div>
        <div className="ai-order-item">
          <span>Kierunek operacji:</span>
          <strong style={{ color: isBuy ? 'var(--buy-green)' : 'var(--sell-red)' }}>
            {isBuy ? 'KUPNO (BUY)' : 'SPRZEDAŻ (SELL)'}
          </strong>
        </div>
        <div className="ai-order-item">
          <span>Ilość aktywa:</span>
          <strong>
            {formatQty(active.amount)} {active.asset}
          </strong>
        </div>
        <div className="ai-order-item">
          <span>Cena jednostkowa (Kurs OKX):</span>
          <strong>{formatUnitPrice(active.price)}</strong>
        </div>
        <div className="ai-order-item">
          <span>Wartość w przeliczeniu na USDC:</span>
          <strong>{formatUsdc(active.usdcValue)}</strong>
        </div>
        <div className="ai-order-item">
          <span>Opłata giełdowa (Fee {active.feeRate || '0.10%'}):</span>
          <strong>
            {formatUsdc(feeUsdc)} ({feeAsset} {active.asset})
          </strong>
        </div>
        <div className="ai-order-item ai-order-item-total">
          <span>Całkowite przeliczenie w USDC (z Fee):</span>
          <strong>{formatUsdc(totalUsdcWithFee)}</strong>
        </div>
      </div>
      <div className="ai-order-confirm-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          id="btnSimpleConfirmOrder"
          className="btn-simple-confirm btn-confirm-order-action"
          disabled={isConfirming}
          onClick={onConfirm}
        >
          {isConfirming ? '⏳ Realizacja transakcji na giełdzie...' : 'Potwierdź'}
        </button>

        {onReject && (
          <button
            type="button"
            id="btnRejectTradeOrder"
            className="btn btn-outline-danger btn-reject-order-action"
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid #ef4444',
              color: '#f87171',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={isConfirming}
            onClick={onReject}
          >
            ✕ Odrzuć transakcję
          </button>
        )}
      </div>
    </div>
  );
}
