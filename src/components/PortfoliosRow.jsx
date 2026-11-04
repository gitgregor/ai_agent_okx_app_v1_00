import React from 'react';
import { WindowContainer } from './WindowContainer';
import { formatUsdc, formatUnitPrice, formatQty } from '../engine/okxClientEngine';

export function PortfoliosRow({
  windowsRegistry,
  soloWindowId,
  portfolio,
  onManualSyncOkx,
  onOpenAssetChart,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const portfoliosWinsInGrid = windowsRegistry.filter(
    (w) =>
      (w.id === 'win-portfolio' || w.id === 'win-bought-sold') &&
      (w.mode === 'grid' || w.mode === 'minimized-inline')
  );
  const rowClass = [
    'workspace-row row-portfolios',
    portfoliosWinsInGrid.length === 0 ? 'grid-collapsed' : '',
    portfoliosWinsInGrid.length === 1 ? 'solo-child-row' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const winPortfolio = windowsRegistry.find((w) => w.id === 'win-portfolio');
  const winBoughtSold = windowsRegistry.find((w) => w.id === 'win-bought-sold');

  const p = portfolio || {
    mode: 'demo',
    syncedFromOkx: true,
    accountSourceLabel: 'Aktualny stan posiadanych aktywów i gotówki z Twojego konta OKX (aktualizowany na żywo)',
    totalValueUsdc: 0,
    cashUsdc: 0,
    cryptoValueUsdc: 0,
    holdings: [],
    ledger: { items: [], totalBoughtUsdc: 0, totalSoldUsdc: 0 }
  };
  const ledger = p.ledger || { items: [], totalBoughtUsdc: 0, totalSoldUsdc: 0 };

  return (
    <section
      className={rowClass}
      aria-label="Portfel Handlowy oraz Bilans Kupiono i Sprzedano"
    >
      {/* OKNO 6: PANEL 1: PORTFEL HANDLOWY (DEMO / LIVE) */}
      <WindowContainer
        winMeta={winPortfolio}
        isSoloGridWindow={soloWindowId === 'win-portfolio'}
        baseClassName="panel-card panel-portfolio"
        titlebarTitle="💼 Panel 1: Portfel Handlowy"
        onSetWindowMode={onSetWindowMode}
        onCloseWindow={onCloseWindow}
        onBringToFront={onBringToFront}
      >
        <div className="panel-header">
          <div>
            <h2>
              💼 Panel 1: Portfel Handlowy (
              <span id="portfolioModeTitle">{(p.mode || 'demo').toUpperCase()}</span>)
            </h2>
            <p
              className="panel-subtitle"
              id="portfolioSourceSubtitle"
              style={{
                color: p.accountSourceLabel
                  ? p.syncedFromOkx
                    ? 'var(--buy-green)'
                    : 'var(--warn-amber)'
                  : undefined
              }}
            >
              {p.accountSourceLabel ||
                'Aktualny stan posiadanych aktywów i gotówki z Twojego konta OKX (aktualizowany na żywo)'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="btnSyncPortfolioPanel"
              className="btn btn-outline-sm"
              title="Pobierz najnowsze saldo bezpośrednio z konta OKX"
              onClick={onManualSyncOkx}
            >
              🔄 Synchronizuj z OKX
            </button>
            <div className="portfolio-total-box">
              <span className="total-label">Wartość całkowita portfela:</span>
              <strong className="total-value" id="portfolioTotalUsdc">
                {formatUsdc(p.totalValueUsdc)}
              </strong>
            </div>
          </div>
        </div>

        <div className="portfolio-kpi-row">
          <div className="kpi-item">
            <span>Gotówka rozliczeniowa (USDC):</span>
            <strong id="portfolioCashUsdc">{formatUsdc(p.cashUsdc)}</strong>
          </div>
          <div className="kpi-item">
            <span>Wartość kryptowalut w USDC:</span>
            <strong id="portfolioCryptoUsdc">{formatUsdc(p.cryptoValueUsdc)}</strong>
          </div>
        </div>

        <div className="mobile-table-scroll-hint">
          <span>👉 Przesuń tabelę w poziomie, aby zobaczyć wszystkie kolumny</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Aktywo</th>
                <th>Ilość w portfelu</th>
                <th>Kurs bieżący (USDC)</th>
                <th>Wartość w USDC</th>
                <th>Śr. cena zakupu</th>
                <th>Udział %</th>
                <th>Wykres</th>
              </tr>
            </thead>
            <tbody id="portfolioHoldingsTbody">
              {(p.holdings || []).map((h) => {
                const isCash =
                  h.asset === 'USDC' ||
                  h.asset === 'USDT' ||
                  h.asset === 'USD' ||
                  h.asset === 'USDG';
                const pair = isCash ? 'BTC-USDC' : `${h.asset}-USDC`;
                return (
                  <tr key={h.asset}>
                    <td>
                      <strong>{h.asset}</strong> <span className="small-muted">{h.name}</span>
                    </td>
                    <td>
                      <strong>
                        {formatQty(h.amount)} {h.asset}
                      </strong>
                    </td>
                    <td>
                      {isCash
                        ? h.asset === 'USD'
                          ? '1,00 USD'
                          : formatUsdc(h.priceUsdc)
                        : formatUnitPrice(h.priceUsdc)}
                    </td>
                    <td>
                      <strong>{formatUsdc(h.usdcValue)}</strong>
                    </td>
                    <td>
                      {isCash
                        ? h.asset === 'USD'
                          ? '1,00 USD'
                          : '1,00 USDC'
                        : formatUnitPrice(h.avgBuyPrice)}
                    </td>
                    <td>{h.allocationPct}%</td>
                    <td>
                      {isCash ? (
                        <span className="small-muted">Gotówka / Rozliczeniowa</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline-sm open-asset-chart-btn"
                          data-instid={pair}
                          onClick={() => onOpenAssetChart(pair)}
                        >
                          📈 Wykres {h.asset}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WindowContainer>

      {/* OKNO 7: PANEL 2: ILE KUPIONO, ILE SPRZEDANO */}
      <WindowContainer
        winMeta={winBoughtSold}
        isSoloGridWindow={soloWindowId === 'win-bought-sold'}
        baseClassName="panel-card panel-bought-sold"
        titlebarTitle="📊 Panel 2: Bilans Kupiono / Sprzedano"
        onSetWindowMode={onSetWindowMode}
        onCloseWindow={onCloseWindow}
        onBringToFront={onBringToFront}
      >
        <div className="panel-header">
          <div>
            <h2>
              📊 Panel 2: Bilans Operacji — Ile Kupiono i Ile Sprzedano (w ilości aktywa i w
              USDC)
            </h2>
            <p className="panel-subtitle">
              Szczegółowe zestawienie czego, w jakiej ilości aktywa oraz za ile USDC kupiono i
              sprzedano
            </p>
          </div>
        </div>

        <div className="ledger-summary-cards">
          <div className="ledger-kpi buy-kpi">
            <span>Łącznie KUPIONO (w przeliczeniu na USDC):</span>
            <strong id="totalBoughtUsdcVal">{formatUsdc(ledger.totalBoughtUsdc)}</strong>
          </div>
          <div className="ledger-kpi sell-kpi">
            <span>Łącznie SPRZEDANO (w przeliczeniu na USDC):</span>
            <strong id="totalSoldUsdcVal">{formatUsdc(ledger.totalSoldUsdc)}</strong>
          </div>
        </div>

        <div className="mobile-table-scroll-hint">
          <span>👉 Przesuń tabelę w poziomie, aby zobaczyć bilans i wykres</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Czego (Aktywo)</th>
                <th>Ile KUPIONO (Ilość aktywa)</th>
                <th>Kupiono w przeliczeniu na USDC</th>
                <th>Ile SPRZEDANO (Ilość aktywa)</th>
                <th>Sprzedano w przeliczeniu na USDC</th>
                <th>Bilans netto aktywa</th>
                <th>Wykres</th>
              </tr>
            </thead>
            <tbody id="boughtSoldLedgerTbody">
              {(ledger.items || []).map((item) => (
                <tr key={item.asset}>
                  <td>
                    <strong>{item.asset}</strong>{' '}
                    <span className="small-muted">({item.instId})</span>
                  </td>
                  <td>
                    <span className="badge-buy">
                      KUPIONO: {formatQty(item.boughtAmount)} {item.asset}
                    </span>{' '}
                    <span className="small-muted">({item.buyCount}x)</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--buy-green)' }}>
                      {formatUsdc(item.boughtUsdc)}
                    </strong>
                  </td>
                  <td>
                    <span className="badge-sell">
                      SPRZEDANO: {formatQty(item.soldAmount)} {item.asset}
                    </span>{' '}
                    <span className="small-muted">({item.sellCount}x)</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--sell-red)' }}>
                      {formatUsdc(item.soldUsdc)}
                    </strong>
                  </td>
                  <td>
                    <strong>
                      {formatQty(item.netAmount)} {item.asset}
                    </strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-sm open-asset-chart-btn"
                      data-instid={item.instId}
                      onClick={() => onOpenAssetChart(item.instId)}
                    >
                      📈 Wykres
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WindowContainer>
    </section>
  );
}
