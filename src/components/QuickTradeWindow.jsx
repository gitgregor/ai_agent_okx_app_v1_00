import React from 'react';
import { WindowContainer } from './WindowContainer';
import { formatUsdc, formatQty, DEFAULT_STANDALONE_MARKETS } from '../engine/okxClientEngine';
import { CryptoPairSelector } from './CryptoPairSelector';

export function QuickTradeWindow({
  winMeta,
  isSoloGridWindow,
  markets,
  holdings,
  orderSide,
  tradePair,
  tradeOrderType,
  tradePrice,
  tradeAmount,
  tradeUsdc,
  tradeStrategy,
  onSetOrderSide,
  onChangeTradePair,
  onChangeTradeOrderType,
  onChangeTradePrice,
  onChangeTradeAmount,
  onChangeTradeUsdc,
  onSetTradeStrategy,
  onSubmitManualTrade,
  onOpenChartFromForm,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const [pairFilter, setPairFilter] = React.useState('');
  const mList = Array.isArray(markets) && markets.length > 0 ? markets : DEFAULT_STANDALONE_MARKETS;
  const asset = (tradePair || 'BTC-USDC').split('-')[0];
  const hList = holdings || [];
  const cashHolding = hList.find((h) => h.asset === 'USDC');
  const usdtHolding = hList.find((h) => h.asset === 'USDT');
  const assetHolding = hList.find((h) => h.asset === asset);
  const totalAvailCash = (cashHolding ? cashHolding.amount : 0) + (usdtHolding ? usdtHolding.amount : 0);

  const filteredMarkets = React.useMemo(() => {
    if (!pairFilter.trim()) return mList;
    const q = pairFilter.trim().toUpperCase();
    return mList.filter(
      (m) =>
        m.instId.toUpperCase().includes(q) ||
        (m.base && m.base.toUpperCase().includes(q)) ||
        (m.name && m.name.toUpperCase().includes(q))
    );
  }, [mList, pairFilter]);

  return (
    <WindowContainer
      winMeta={winMeta}
      isSoloGridWindow={isSoloGridWindow}
      baseClassName="panel-card panel-quick-trade"
      titlebarTitle="⚡ Kreator Zlecenia OKX EEA"
      onSetWindowMode={onSetWindowMode}
      onCloseWindow={onCloseWindow}
      onBringToFront={onBringToFront}
    >
      <div className="panel-header">
        <div>
          <h2>⚡ Kreator Zlecenia (USDC)</h2>
          <p className="panel-subtitle">
            Przygotuj zlecenie Kupna lub Sprzedaży — realizacja nastąpi po autoryzacji w oknie
            Agenta AI
          </p>
        </div>
        <button
          type="button"
          id="openChartFromFormBtn"
          className="btn btn-outline-sm"
          onClick={onOpenChartFromForm}
        >
          📈 Wykres pary
        </button>
      </div>

      <form id="manualTradeForm" className="trade-form" onSubmit={onSubmitManualTrade}>
        <div className="side-tabs">
          <button
            type="button"
            id="tabSideBuy"
            className={`side-tab ${orderSide === 'BUY' ? 'active-buy' : ''}`}
            data-side="BUY"
            onClick={() => onSetOrderSide('BUY')}
          >
            KUPNO (BUY)
          </button>
          <button
            type="button"
            id="tabSideSell"
            className={`side-tab ${orderSide === 'SELL' ? 'active-sell' : ''}`}
            data-side="SELL"
            onClick={() => onSetOrderSide('SELL')}
          >
            SPRZEDAŻ (SELL)
          </button>
        </div>

        <div className="form-group form-group-pair-select">
          <label htmlFor="tradePairSelect">
            Wybór pary kryptowalutowej Spot (Katalog rynków OKX — {mList.length} par):
          </label>
          <CryptoPairSelector
            selectedPair={tradePair}
            onSelectPair={(newPair) => onChangeTradePair(newPair)}
            markets={mList}
          />
          {/* Kompatybilność z elementem id=tradePairSelect dla skryptów testowych */}
          <input type="hidden" id="tradePairSelect" value={tradePair} readOnly />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="tradeOrderType">Typ zlecenia:</label>
            <select
              id="tradeOrderType"
              value={tradeOrderType}
              onChange={(e) => onChangeTradeOrderType(e.target.value)}
            >
              <option value="MARKET">Rynkowe (Market)</option>
              <option value="LIMIT">Limit (Cena docelowa)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="tradePriceInput">Cena wykonania (USDC):</label>
            <input
              type="number"
              id="tradePriceInput"
              step="any"
              readOnly={tradeOrderType === 'MARKET'}
              value={tradePrice}
              onChange={(e) => onChangeTradePrice(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="tradeAmountInput">
              Ilość aktywa (<span id="tradeAssetUnit">{asset}</span>):
            </label>
            <input
              type="number"
              id="tradeAmountInput"
              step="any"
              min="0.0001"
              value={tradeAmount}
              onChange={(e) => onChangeTradeAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="tradeUsdcInput">Wartość w przeliczeniu na USDC:</label>
            <input
              type="number"
              id="tradeUsdcInput"
              step="any"
              min="1"
              value={tradeUsdc}
              onChange={(e) => onChangeTradeUsdc(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tradeStrategyInput">Opis / Nazwa strategii:</label>
          <input
            type="text"
            id="tradeStrategyInput"
            value={tradeStrategy}
            onChange={(e) => onSetTradeStrategy(e.target.value)}
          />
        </div>

        <div className="available-balance-row">
          <span>
            Dostępne USDC: <strong id="formAvailUsdc">{formatUsdc(totalAvailCash)}</strong>
          </span>
          <span>
            Posiadane <span id="formAvailAssetName">{asset}</span>:{' '}
            <strong id="formAvailAssetAmt">
              {formatQty(assetHolding ? assetHolding.amount : 0)} {asset}
            </strong>
          </span>
        </div>

        <button type="submit" id="submitTradeProposalBtn" className="btn btn-authorize-order">
          🔒 Przygotuj zlecenie i otwórz Autoryzację Handlu
        </button>
      </form>
    </WindowContainer>
  );
}
