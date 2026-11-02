import React from 'react';
import { WindowContainer } from './WindowContainer';
import { formatUsdc } from '../engine/okxClientEngine';

export function ControlWindows({
  windowsRegistry,
  soloWindowId,
  cfg,
  activeTradeOrder,
  apiAccordionOpen,
  tradeAccordionOpen,
  apiKeyProfile,
  inputApiKey,
  inputSecretKey,
  inputPassphrase,
  onSetApiAccordionOpen,
  onSetTradeAccordionOpen,
  onSetApiKeyProfile,
  onSetInputApiKey,
  onSetInputSecretKey,
  onSetInputPassphrase,
  onSwitchApiMode,
  onSubmitApiKeys,
  onManualSyncOkx,
  onDisconnectApiKeys,
  onClearApiKeys,
  onOpenAuthPopup,
  onStopTrading,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const topWinsInGrid = windowsRegistry.filter(
    (w) => w.isTopCtrl && (w.mode === 'grid' || w.mode === 'minimized-inline')
  );
  const gridClass = [
    'top-controls-grid',
    topWinsInGrid.length === 0 ? 'grid-collapsed' : '',
    topWinsInGrid.length === 1 ? 'solo-child-row' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const winApi = windowsRegistry.find((w) => w.id === 'win-ctrl-api');
  const winTrade = windowsRegistry.find((w) => w.id === 'win-ctrl-trade');
  const winAi = windowsRegistry.find((w) => w.id === 'win-ctrl-ai');

  const isDemo = (cfg?.apiMode || 'demo') === 'demo';
  const activeConn = cfg?.apiConnection || {
    mode: 'demo',
    connected: true,
    statusLabel: 'PODŁĄCZONE (OKX EEA DEMO)',
    lastCheckedAt: 'teraz',
    reason: 'Połączono prawidłowo z serwerem symulacyjnym OKX Europe.'
  };
  const demoConn = cfg?.apiConnections?.demo || activeConn;
  const liveConn = cfg?.apiConnections?.live || {
    mode: 'live',
    connected: false,
    reasonCode: 'MISSING_ALL_KEYS',
    reason:
      'Nie wprowadzono kluczy API dla konta LIVE (pola API Key, Secret Key i Passphrase są puste).'
  };

  let tradeDotClass = 'indicator-dot dot-idle';
  let topTradeText = 'Gotowy — brak oczekującego zlecenia';
  let startBtnPulse = false;
  let startBtnSubtext = 'Status: Czekam na start zlecenia (kliknij po podgląd pop-up)';

  if (activeTradeOrder && activeTradeOrder.status === 'waiting_for_start') {
    tradeDotClass = 'indicator-dot dot-waiting';
    topTradeText = `Czekam na start zlecenia (${
      activeTradeOrder.side === 'BUY' ? 'KUPNO' : 'SPRZEDAŻ'
    } ${activeTradeOrder.amount} ${activeTradeOrder.asset})`;
    startBtnPulse = true;
    startBtnSubtext = `⏳ Status: Czekam na start zlecenia (${activeTradeOrder.instId} • ${formatUsdc(
      activeTradeOrder.usdcValue
    )})`;
  } else if (activeTradeOrder && activeTradeOrder.status === 'in_progress') {
    tradeDotClass = 'indicator-dot dot-on';
    topTradeText = `Zlecenie w realizacji (${activeTradeOrder.instId} • ${formatUsdc(
      activeTradeOrder.usdcValue
    )})`;
    startBtnSubtext = `✅ Status: Zlecenie w realizacji / wykonane (${activeTradeOrder.instId})`;
  } else if (cfg?.tradingStatus === 'stopped') {
    tradeDotClass = 'indicator-dot dot-off';
    topTradeText = 'Handel zatrzymany (Stop handlu)';
    startBtnSubtext = 'Status: Handel zatrzymany — kliknij, aby sprawdzić status';
  }

  return (
    <section
      className={gridClass}
      id="topControlsGrid"
      aria-label="Główne okna sterowania 1-3"
    >
      {/* OKNO STEROWANIA 1: TRYB GIEŁDY I STATUS KLUCZY API */}
      <WindowContainer
        winMeta={winApi}
        isSoloGridWindow={soloWindowId === 'win-ctrl-api'}
        baseClassName="control-card"
        titlebarTitle="1. Tryb Giełdy i Status Kluczy API (eea.okx.com)"
        onSetWindowMode={onSetWindowMode}
        onCloseWindow={onCloseWindow}
        onBringToFront={onBringToFront}
      >
        <div className="control-card-top">
          <div className="control-info">
            <div className="control-value-row">
              <span
                id="apiModeIndicator"
                className={`indicator-dot ${isDemo ? 'dot-demo' : 'dot-live'}`}
              ></span>
              <strong id="apiModeText">
                {isDemo
                  ? 'Handel DEMO (Symulowany)'
                  : 'Handel LIVE (Prawdziwy Kapitał)'}
              </strong>
            </div>
          </div>
          <div className="control-actions">
            <div
              className="segmented-switch"
              role="group"
              aria-label="Przełącznik Demo lub Live"
            >
              <button
                type="button"
                id="btnModeDemo"
                className={`seg-btn ${isDemo ? 'active' : ''}`}
                onClick={() => onSwitchApiMode('demo')}
              >
                DEMO
              </button>
              <button
                type="button"
                id="btnModeLive"
                className={`seg-btn ${!isDemo ? 'active' : ''}`}
                onClick={() => onSwitchApiMode('live')}
              >
                LIVE
              </button>
            </div>
            <button
              type="button"
              className="accordion-toggle"
              id="apiAccordionToggleBtn"
              data-target="accordionApiBody"
              aria-expanded={apiAccordionOpen ? 'true' : 'false'}
              onClick={() => onSetApiAccordionOpen(!apiAccordionOpen)}
            >
              <span>Klucze API</span>
              <span className="chevron">▼</span>
            </button>
          </div>
        </div>

        <div
          id="apiConnStatusBanner"
          className={`api-conn-banner ${activeConn.connected ? 'conn-ok' : 'conn-err'}`}
        >
          <div className="api-conn-main-row">
            <span id="apiConnStateIcon" className="api-conn-icon">
              {activeConn.connected ? '🟢' : '🔴'}
            </span>
            <div className="api-conn-texts">
              <div className="api-conn-title-line">
                <strong id="apiConnStatusLabel">{activeConn.statusLabel}</strong>
                <span id="apiConnCheckedTime" className="api-conn-time">
                  Sprawdzono: {activeConn.lastCheckedAt || 'teraz'}
                </span>
              </div>
              <p id="apiConnReasonText" className="api-conn-reason">
                {activeConn.connected
                  ? `Status: ${activeConn.reason}`
                  : `Powód braku połączenia: ${activeConn.reason}`}
              </p>
            </div>
          </div>
          <div className="api-dual-pills-row">
            <span
              id="pillStatusDemoKey"
              className={`mini-conn-pill ${demoConn.connected ? 'ok' : 'err'}`}
            >
              {demoConn.connected
                ? `DEMO API: 🟢 Podłączone (${demoConn.keyPreview || 'a6d12884-c...'})`
                : `DEMO API: 🔴 Niepodłączone (${demoConn.reasonCode || 'DISCONNECTED'})`}
            </span>
            <span
              id="pillStatusLiveKey"
              className={`mini-conn-pill ${liveConn.connected ? 'ok' : 'err'}`}
            >
              {liveConn.connected
                ? `LIVE API: 🟢 Podłączone (${liveConn.keyPreview || '***'})`
                : `LIVE API: 🔴 Niepodłączone (${
                    liveConn.reasonCode === 'MISSING_ALL_KEYS'
                      ? 'Brak kluczy Live'
                      : liveConn.reasonCode || 'Brak kluczy'
                  })`}
            </span>
          </div>
        </div>

        <div id="accordionApiBody" className="accordion-body" hidden={!apiAccordionOpen}>
          <div className="api-diagnostics-grid">
            <div
              id="diagBoxDemo"
              className={`api-diag-box ${demoConn.connected ? 'diag-ok' : 'diag-err'}`}
            >
              <div className="diag-header">
                <strong>Profil DEMO (x-simulated-trading: 1)</strong>
                <span
                  id="diagBadgeDemo"
                  className={`diag-badge ${demoConn.connected ? 'ok' : 'err'}`}
                >
                  {demoConn.connected ? 'PODŁĄCZONE' : 'NIEPODŁĄCZONE'}
                </span>
              </div>
              <p id="diagReasonDemo" className="diag-reason">
                {demoConn.connected ? demoConn.reason : `Powód: ${demoConn.reason}`}
              </p>
            </div>
            <div
              id="diagBoxLive"
              className={`api-diag-box ${liveConn.connected ? 'diag-ok' : 'diag-err'}`}
            >
              <div className="diag-header">
                <strong>Profil LIVE (eea.okx.com Production)</strong>
                <span
                  id="diagBadgeLive"
                  className={`diag-badge ${liveConn.connected ? 'ok' : 'err'}`}
                >
                  {liveConn.connected ? 'PODŁĄCZONE' : 'NIEPODŁĄCZONE'}
                </span>
              </div>
              <p id="diagReasonLive" className="diag-reason">
                {liveConn.connected ? liveConn.reason : `Powód: ${liveConn.reason}`}
              </p>
            </div>
          </div>

          <form id="apiKeyForm" className="accordion-form" onSubmit={onSubmitApiKeys}>
            <div className="form-row-inline">
              <label>
                <span>Wybierz profil klucza do edycji / testu:</span>
                <select
                  id="apiKeyProfileSelect"
                  value={apiKeyProfile}
                  onChange={(e) => onSetApiKeyProfile(e.target.value)}
                >
                  <option value="demo">Klucz API Demo (x-simulated-trading: 1)</option>
                  <option value="live">Klucz API Live (eea.okx.com Production)</option>
                </select>
              </label>
              <label>
                <span>Endpoint regionalny:</span>
                <input type="text" value="https://eea.okx.com" readOnly />
              </label>
            </div>
            <div className="form-row-3">
              <label>
                <span>OKX API Key (min. 8 zn.):</span>
                <input
                  type="text"
                  id="inputApiKey"
                  placeholder="Wklej klucz API..."
                  value={inputApiKey}
                  onChange={(e) => onSetInputApiKey(e.target.value)}
                />
              </label>
              <label>
                <span>OKX Secret Key (min. 8 zn.):</span>
                <input
                  type="password"
                  id="inputSecretKey"
                  placeholder="Wklej Secret Key..."
                  value={inputSecretKey}
                  onChange={(e) => onSetInputSecretKey(e.target.value)}
                />
              </label>
              <label>
                <span>Passphrase (min. 4 zn.):</span>
                <input
                  type="password"
                  id="inputPassphrase"
                  placeholder="Hasło API..."
                  value={inputPassphrase}
                  onChange={(e) => onSetInputPassphrase(e.target.value)}
                />
              </label>
            </div>
            <div className="accordion-footer api-actions-footer">
              <span className="hint-text" id="apiSavedStatus">
                {isDemo
                  ? `Aktywny profil: Demo (${cfg?.demoKeyPreview || 'a6d12884-c...'})`
                  : `Aktywny profil: Live (${cfg?.liveKeyPreview || 'Nie skonfigurowano'})`}
              </span>
              <div className="api-btn-group">
                <button
                  type="button"
                  id="btnSyncOkxPortfolio"
                  className="btn btn-outline-sm"
                  title="Pobierz aktualne saldo i zlecenia ze swojego konta OKX"
                  onClick={onManualSyncOkx}
                >
                  🔄 Pobierz Portfel z OKX
                </button>
                <button
                  type="button"
                  id="btnDisconnectApiKeys"
                  className="btn btn-outline-sm"
                  title="Rozłącz bieżący profil API"
                  onClick={onDisconnectApiKeys}
                >
                  🔌 Rozłącz API
                </button>
                <button
                  type="button"
                  id="btnClearApiKeys"
                  className="btn btn-outline-sm"
                  title="Wyczyść klucze w wybranym profilu"
                  onClick={onClearApiKeys}
                >
                  🗑️ Wyczyść
                </button>
                <button type="submit" className="btn btn-primary-sm">
                  🔗 Zapisz i Pobierz Portfel z OKX
                </button>
              </div>
            </div>
          </form>
        </div>
      </WindowContainer>

      {/* OKNO STEROWANIA 2: STEROWANIE HANDLEM I AUTORYZACJA ZLECEŃ */}
      <WindowContainer
        winMeta={winTrade}
        isSoloGridWindow={soloWindowId === 'win-ctrl-trade'}
        baseClassName="control-card control-card-trade"
        titlebarTitle="2. Sterowanie Handlem i Autoryzacja Zleceń"
        onSetWindowMode={onSetWindowMode}
        onCloseWindow={onCloseWindow}
        onBringToFront={onBringToFront}
      >
        <div className="control-card-top">
          <div className="control-info">
            <div className="control-value-row">
              <span id="tradeStatusDot" className={tradeDotClass}></span>
              <strong id="topTradeStatusText">{topTradeText}</strong>
            </div>
          </div>
          <div className="control-actions">
            <button
              type="button"
              className="accordion-toggle"
              data-target="accordionTradeBody"
              aria-expanded={tradeAccordionOpen ? 'true' : 'false'}
              onClick={() => onSetTradeAccordionOpen(!tradeAccordionOpen)}
            >
              <span>Szczegóły</span>
              <span className="chevron">▼</span>
            </button>
          </div>
        </div>
        <div className="trade-buttons-bar">
          <button
            type="button"
            id="mainStartTradingBtn"
            className={`btn-start-trading ${startBtnPulse ? 'waiting-pulse' : ''}`}
            onClick={onOpenAuthPopup}
          >
            <span className="btn-start-title">▶ START HANDLU (Autoryzacja Pop-up)</span>
            <span className="btn-start-status" id="mainStartBtnSubtext">
              {startBtnSubtext}
            </span>
          </button>
          <button
            type="button"
            id="mainStopTradingBtn"
            className="btn-stop-trading"
            title="Zatrzymaj handel i anuluj oczekujące zlecenie"
            onClick={onStopTrading}
          >
            ⏹ STOP HANDLU
          </button>
        </div>
        <div id="accordionTradeBody" className="accordion-body" hidden={!tradeAccordionOpen}>
          <div className="accordion-info-box">
            <p>
              <strong>Autoryzacja zleceń:</strong> Każda transakcja utworzona przez Agenta AI
              lub formularz trafia do stanu <em>„Czekam na start zlecenia”</em>. Dopiero
              wciśnięcie przycisku <strong>Potwierdź / START</strong> rozpoczyna i realizuje
              handel.
            </p>
            <div className="accordion-footer">
              <button
                type="button"
                id="openPopupFromAccordionBtn"
                className="btn btn-outline-sm"
                onClick={onOpenAuthPopup}
              >
                Otwórz Karcie Zlecenia i Autoryzacji
              </button>
            </div>
          </div>
        </div>
      </WindowContainer>

      {/* OKNO STEROWANIA 3: STATUS AGENTA AI */}
      <WindowContainer
        winMeta={winAi}
        isSoloGridWindow={soloWindowId === 'win-ctrl-ai'}
        baseClassName="control-card"
        titlebarTitle="3. Status Agenta AI (okx/agent-trade-kit)"
        onSetWindowMode={onSetWindowMode}
        onCloseWindow={onCloseWindow}
        onBringToFront={onBringToFront}
      >
        <div className="control-card-top">
          <div className="control-info">
            <div className="control-value-row">
              <span className="indicator-dot dot-demo"></span>
              <strong>Silnik Agenta AI: @okx_ai/okx-trade-mcp (v5 EEA)</strong>
            </div>
            <p className="small-muted" style={{ marginTop: '4px' }}>
              Narzędzia MCP: rynek spot, zlecenia, portfel handlowy i boty OKX. Sterowanie
              statusem i przełącznik Agenta AI znajdują się w pierwszej górnej linii.
            </p>
          </div>
        </div>
      </WindowContainer>
    </section>
  );
}
