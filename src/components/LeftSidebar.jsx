import React from 'react';
import { getModeLabelPl } from './WindowContainer';

export function LeftSidebar({
  collapsed,
  cfg,
  windowsRegistry,
  onCloseMobile,
  onSetWindowMode,
  onCloseWindow
}) {
  const activeConn = cfg?.apiConnection || {
    mode: 'demo',
    connected: true,
    reason: 'Połączono prawidłowo (x-simulated-trading: 1)'
  };
  const dockedSidebarWins = windowsRegistry.filter((w) => w.mode === 'docked-sidebar');

  return (
    <aside
      className={`left-window-sidebar ${collapsed ? 'collapsed' : ''}`}
      id="leftWindowSidebar"
      aria-label="Lewy panel boczny okien"
    >
      <div className="sidebar-header">
        <div>
          <h3>◀ Sidebar Okien</h3>
          <p className="small-muted">
            Kliknij okno, aby je otworzyć w siatce, zmniejszyć (przesuwne) lub otworzyć na cały
            ekran
          </p>
        </div>
        <button
          type="button"
          id="closeLeftSidebarMobileBtn"
          className="chart-ctrl-btn"
          title="Ukryj sidebar"
          onClick={onCloseMobile}
        >
          ✕
        </button>
      </div>

      <div className="sidebar-api-box" id="sidebarApiBox">
        <div className="sidebar-section-label">STATUS KLUCZY API</div>
        <div
          id="sidebarApiStatusBadge"
          className={`sidebar-api-badge ${activeConn.connected ? 'ok' : 'err'}`}
        >
          {activeConn.connected
            ? `🟢 ${activeConn.mode.toUpperCase()} API: PODŁĄCZONE`
            : `🔴 ${activeConn.mode.toUpperCase()} API: NIEPODŁĄCZONE`}
        </div>
        <p id="sidebarApiReason" className="sidebar-api-reason">
          {activeConn.connected ? activeConn.reason : `Powód: ${activeConn.reason}`}
        </p>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">
          ZWRÓCONE DO SIDEBARU (
          <span id="sidebarDockedCountText">{dockedSidebarWins.length}</span>)
        </div>
        <div id="sidebarDockedList" className="sidebar-docked-list">
          {dockedSidebarWins.length === 0 ? (
            <div className="sidebar-empty-hint">
              Brak okien odłożonych do sidebaru. Kliknij „◀” na dowolnym oknie, aby je tutaj
              zwinąć.
            </div>
          ) : (
            dockedSidebarWins.map((w) => (
              <div key={w.id} className="sidebar-win-card docked-here">
                <div className="sidebar-win-top">
                  <span className="sidebar-win-title">
                    {w.icon} {w.title}
                  </span>
                  <span className="sidebar-win-state">W Sidebarze</span>
                </div>
                <div className="sidebar-win-actions">
                  <button
                    type="button"
                    className="sidebar-mini-btn restore-highlight"
                    data-win-id={w.id}
                    data-win-action={w.isChart ? 'floating-medium' : 'grid'}
                    onClick={() =>
                      onSetWindowMode(w.id, w.isChart ? 'floating-medium' : 'grid')
                    }
                  >
                    ▶ Przywróć
                  </button>
                  <button
                    type="button"
                    className="sidebar-mini-btn"
                    data-win-id={w.id}
                    data-win-action="floating-medium"
                    onClick={() => onSetWindowMode(w.id, 'floating-medium')}
                  >
                    🗗 Przesuwne
                  </button>
                  <button
                    type="button"
                    className="sidebar-mini-btn"
                    data-win-id={w.id}
                    data-win-action="fullscreen"
                    onClick={() => onSetWindowMode(w.id, 'fullscreen')}
                  >
                    ⛶ Full
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">WSZYSTKIE OKNA APLIKACJI (11)</div>
        <div id="sidebarAllWindowsList" className="sidebar-windows-list">
          {windowsRegistry.map((w) => (
            <div
              key={w.id}
              className={`sidebar-win-card ${
                w.mode === 'docked-sidebar' || w.mode === 'docked-top' ? 'docked-here' : ''
              }`}
            >
              <div className="sidebar-win-top">
                <span className="sidebar-win-title">
                  {w.icon} {w.title}
                </span>
                <span className="sidebar-win-state">{getModeLabelPl(w.mode)}</span>
              </div>
              <div className="sidebar-win-actions">
                {w.isChart ? (
                  <button
                    type="button"
                    className="sidebar-mini-btn"
                    data-win-id={w.id}
                    data-win-action="floating-small"
                    onClick={() => onSetWindowMode(w.id, 'floating-small')}
                  >
                    🗗 Małe
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="sidebar-mini-btn"
                      data-win-id={w.id}
                      data-win-action="grid"
                      onClick={() => onSetWindowMode(w.id, 'grid')}
                    >
                      ⊞ Siatka
                    </button>
                    <button
                      type="button"
                      className="sidebar-mini-btn"
                      data-win-id={w.id}
                      data-win-action="minimized-inline"
                      onClick={() => onSetWindowMode(w.id, 'minimized-inline')}
                    >
                      — Min
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="sidebar-mini-btn"
                  data-win-id={w.id}
                  data-win-action="floating-medium"
                  onClick={() => onSetWindowMode(w.id, 'floating-medium')}
                >
                  🗗 Przesuwne
                </button>
                <button
                  type="button"
                  className="sidebar-mini-btn"
                  data-win-id={w.id}
                  data-win-action="fullscreen"
                  onClick={() => onSetWindowMode(w.id, 'fullscreen')}
                >
                  ⛶ Cały ekran
                </button>
                <button
                  type="button"
                  className="sidebar-mini-btn"
                  data-win-id={w.id}
                  data-win-action="docked-top"
                  onClick={() => onCloseWindow(w.id)}
                >
                  ✕ Zamknij
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
