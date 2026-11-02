import React from 'react';
import { getModeLabelPl } from './WindowContainer';
import { formatUnitPrice, formatRawPrice, getGatewayConnectionInfo } from '../engine/okxClientEngine';

export function HeaderBar({
  cfg,
  markets,
  windowsRegistry,
  topMenuOpen,
  topMenuSize,
  topMenuPos,
  topMenuZIndex,
  onToggleLeftSidebar,
  onOpenApiKeysWindow,
  onSwitchAiStatus,
  onToggleTopWindowMenu,
  onSetTopMenuSize,
  onCloseTopWindowMenu,
  onTopMenuPillClick,
  onToggleTopControls,
  onResetAllWindowsGrid,
  onDockAllTop,
  onDockAllSidebar,
  onOpenAssetChart
}) {
  const isDemo = (cfg?.apiMode || 'demo') === 'demo';
  const activeConn = cfg?.apiConnection || { mode: 'demo', connected: true };
  const isAiActive = cfg?.aiStatus === 'active';
  const gwInfo = getGatewayConnectionInfo();
  const remoteGw = cfg?.remoteGateway || {};
  const isGatewayReady = Boolean(remoteGw.active || gwInfo.gatewayConnected);

  const dockedTopCount = windowsRegistry.filter((w) => w.mode === 'docked-top').length;
  const dockedSidebarCount = windowsRegistry.filter((w) => w.mode === 'docked-sidebar').length;
  const topWins = windowsRegistry.filter((w) => w.isTopCtrl);
  const anyTopCtrlVisible = topWins.some(
    (w) => w.mode !== 'docked-top' && w.mode !== 'docked-sidebar'
  );

  const topMenuStyle = {};
  if (topMenuZIndex) {
    topMenuStyle.zIndex = String(topMenuZIndex);
  }
  if (topMenuPos && topMenuSize !== 'full') {
    topMenuStyle.left = `${Math.round(topMenuPos.x)}px`;
    topMenuStyle.top = `${Math.round(topMenuPos.y)}px`;
    topMenuStyle.right = 'auto';
  }

  return (
    <>
      <header className="app-header" id="appHeader">
        <div className="brand-row">
          <button
            type="button"
            id="toggleLeftSidebarBtn"
            className="btn-sidebar-toggle"
            title="Pokaż / Ukryj lewy Sidebar Okien"
            onClick={onToggleLeftSidebar}
          >
            ☰ Sidebar{' '}
            <span id="sidebarDockedBadge" className="dock-count-badge">
              {dockedSidebarCount}
            </span>
          </button>
          <div className="header-quick-badges">
            <span
              id="headerModeBadge"
              className={`status-pill ${isDemo ? 'mode-demo' : 'mode-live'}`}
            >
              {isDemo ? 'TRYB: DEMO (DOMYŚLNY)' : 'TRYB: LIVE'}
            </span>
            <span
              id="headerApiConnBadge"
              className={`status-pill ${activeConn.connected ? 'api-connected' : 'api-disconnected'}`}
              title="Kliknij, aby otworzyć okno Kluczy API"
              onClick={onOpenApiKeysWindow}
            >
              {activeConn.connected
                ? `🔑 KLUCZE API (${activeConn.mode.toUpperCase()}): PODŁĄCZONE`
                : `⚠️ KLUCZE API (${activeConn.mode.toUpperCase()}): NIEPODŁĄCZONE`}
            </span>
            <span
              id="headerMobileGatewayBadge"
              className={`status-pill ${isGatewayReady ? 'api-connected' : 'mode-demo'}`}
              style={{ cursor: 'pointer' }}
              title="Brama Domowa IP (OKX Whitelist) — zapewnia działanie kluczy API na telefonie poza domem (LTE/5G) oraz pełną synchronizację Desktop ⇄ Telefon. Kliknij po szczegóły i kod QR."
              onClick={onOpenApiKeysWindow}
            >
              {isGatewayReady
                ? `📱 BRAMA IP (WHITELIST): AKTYWNA${remoteGw.homePublicIp && remoteGw.homePublicIp !== 'Wykrywanie IP...' ? ` (${remoteGw.homePublicIp})` : ''}`
                : '📱 BRAMA IP: TRYB MOBILNY'}
            </span>

            <div className="header-ai-status-group" id="headerAiStatusGroup">
              <span className="header-ai-label">AGENT AI</span>
              <span
                id="headerAiBadge"
                className={`status-pill ${isAiActive ? 'ai-on' : 'ai-off'}`}
                title="Stan Agenta AI"
              >
                <span
                  id="headerAiStatusDot"
                  className={`indicator-dot ${isAiActive ? 'dot-on' : 'dot-off'}`}
                ></span>
                <span id="headerAiStatusText">
                  {isAiActive ? 'Aktywny' : 'Dezaktywowany (Domyślnie)'}
                </span>
              </span>
              <div
                className="segmented-switch header-ai-switch"
                role="group"
                aria-label="Status Agenta AI w górnej linii"
              >
                <button
                  type="button"
                  id="headerBtnAiDeactivated"
                  className={`seg-btn ${!isAiActive ? 'active-danger' : ''}`}
                  title="Dezaktywuj Agenta AI"
                  onClick={() => onSwitchAiStatus('deactivated')}
                >
                  Dezaktywowany
                </button>
                <button
                  type="button"
                  id="headerBtnAiActive"
                  className={`seg-btn ${isAiActive ? 'active' : ''}`}
                  title="Aktywuj Agenta AI"
                  onClick={() => onSwitchAiStatus('active')}
                >
                  Aktywny
                </button>
              </div>
            </div>

            <div className="top-menu-dropdown-wrap">
              <button
                type="button"
                id="toggleTopWindowMenuBtn"
                className="btn-top-window-menu"
                aria-expanded={topMenuOpen ? 'true' : 'false'}
                title="Kliknij, aby otworzyć lub zamknąć okno Menu Górne Okien"
                onClick={onToggleTopWindowMenu}
              >
                🗔 Menu Górne Okien{' '}
                <span id="topMenuDockedCount" className="dock-count-badge">
                  {dockedTopCount}
                </span>{' '}
                <span className="chevron">▼</span>
              </button>

              <nav
                className={`top-window-menu-bar top-menu-size-${topMenuSize}`}
                id="topWindowMenuBar"
                aria-label="Górne menu zarządzania oknami"
                hidden={!topMenuOpen}
                style={topMenuStyle}
              >
                <div
                  className="top-menu-dropdown-header"
                  id="topMenuDragHeader"
                  title="Przeciągnij myszką, aby przesunąć okno w dowolne miejsce"
                >
                  <span className="top-menu-title">
                    ⠿ 🗔 Wywołaj lub schowaj okna z Menu Górnego
                  </span>
                  <div
                    className="top-menu-win-controls"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={`win-ctrl-btn topmenu-size-btn ${topMenuSize === 'min' ? 'active' : ''}`}
                      data-topmenu-size="min"
                      title="Wersja minimalna (kompaktowa przesuwna)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetTopMenuSize('min');
                      }}
                    >
                      🗕 Min
                    </button>
                    <button
                      type="button"
                      className={`win-ctrl-btn topmenu-size-btn ${topMenuSize === 'medium' ? 'active' : ''}`}
                      data-topmenu-size="medium"
                      title="Wersja średnia (Medium przesuwna)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetTopMenuSize('medium');
                      }}
                    >
                      🗗 Medium
                    </button>
                    <button
                      type="button"
                      className={`win-ctrl-btn topmenu-size-btn ${topMenuSize === 'full' ? 'active' : ''}`}
                      data-topmenu-size="full"
                      title="Wersja na cały ekran (Full)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetTopMenuSize('full');
                      }}
                    >
                      ⛶ Full
                    </button>
                    <button
                      type="button"
                      id="closeTopWindowMenuBtn"
                      className="win-ctrl-btn close-win-btn"
                      title="Zamknij okno Menu Górnego"
                      onClick={onCloseTopWindowMenu}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="top-menu-body" id="topMenuBody">
                  <div id="topWindowPillsContainer" className="top-window-pills">
                    {windowsRegistry.map((w) => {
                      const isDockedTop = w.mode === 'docked-top';
                      const isDockedSidebar = w.mode === 'docked-sidebar';
                      const isFloating =
                        w.mode === 'floating-small' || w.mode === 'floating-medium';
                      const isFull = w.mode === 'fullscreen';
                      const pillClasses = [
                        'top-win-pill',
                        isDockedTop || isDockedSidebar ? 'is-docked-top' : '',
                        isFloating ? 'is-floating' : '',
                        isFull ? 'is-fullscreen' : ''
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <button
                          key={w.id}
                          type="button"
                          className={pillClasses}
                          data-top-menu-win={w.id}
                          title={`Kliknij, aby otworzyć / przywrócić okno: ${w.title}`}
                          onClick={() => onTopMenuPillClick(w.id)}
                        >
                          <span>
                            {w.icon} {w.title}
                          </span>
                          <span className="top-pill-state">
                            {isDockedTop || isDockedSidebar
                              ? '▶ Otwórz'
                              : getModeLabelPl(w.mode)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="top-menu-actions">
                    <button
                      type="button"
                      id="btnToggleTopControls"
                      className="btn btn-outline-sm"
                      title="Zwiń lub pokaż okna sterowania 1-3, aby odsłonić cały ekran"
                      onClick={onToggleTopControls}
                    >
                      {anyTopCtrlVisible
                        ? '👁️ Ukryj okna 1–3 (do Menu Górnego)'
                        : '👁️ Pokaż okna 1–3 (z Menu Górnego)'}
                    </button>
                    <button
                      type="button"
                      id="btnResetAllWindowsGrid"
                      className="btn btn-outline-sm"
                      title="Przywróć wszystkie okna do domyślnego układu siatki"
                      onClick={onResetAllWindowsGrid}
                    >
                      ⊞ Wszystkie w siatce
                    </button>
                    <button
                      type="button"
                      id="btnDockAllTop"
                      className="btn btn-outline-sm"
                      title="Zwróć wszystkie okna do menu na górze"
                      onClick={onDockAllTop}
                    >
                      🔼 Zwiń wszystkie na górę
                    </button>
                    <button
                      type="button"
                      id="btnDockAllSidebar"
                      className="btn btn-outline-sm"
                      title="Zwróć wszystkie okna do sidebaru z lewej"
                      onClick={onDockAllSidebar}
                    >
                      ◀ Zwiń wszystkie do Sidebaru
                    </button>
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <section
        className="market-ticker-strip"
        id="marketTickerStrip"
        aria-label="Kursy kryptowalut na żywo w USDC"
        hidden
        style={{ display: 'none' }}
      >
        {(markets || []).map((m) => {
          const isPos = m.change24hPct >= 0;
          return (
            <div
              key={m.instId}
              className="ticker-item"
              data-chart-pair={m.instId}
              title={`Kliknij, aby otworzyć wykres TradingView ${m.instId} (24h Max: ${formatRawPrice(
                m.high24h
              )} | 24h Min: ${formatRawPrice(m.low24h)})`}
              onClick={() => onOpenAssetChart(m.instId)}
            >
              <span className="ticker-pair">{m.instId}</span>
              <span className="ticker-price">{formatUnitPrice(m.price)}</span>
              <span className={`ticker-change ${isPos ? 'pos' : 'neg'}`}>
                {isPos ? '+' : ''}
                {m.change24hPct}%
              </span>
            </div>
          );
        })}
      </section>
    </>
  );
}
