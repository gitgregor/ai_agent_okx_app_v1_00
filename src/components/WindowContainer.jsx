import React from 'react';
import { createPortal } from 'react-dom';

export function getModeLabelPl(mode) {
  switch (mode) {
    case 'grid':
      return 'W siatce';
    case 'minimized-inline':
      return 'Zminimalizowane';
    case 'floating-small':
      return 'Małe przesuwne';
    case 'floating-medium':
      return 'Przesuwne';
    case 'fullscreen':
      return 'Cały ekran';
    case 'docked-top':
      return 'W Menu Górnym';
    case 'docked-sidebar':
      return 'W Sidebarze';
    default:
      return mode;
  }
}

export function WindowTitlebar({
  winId,
  title,
  mode,
  extraControls = null,
  onSetWindowMode,
  onCloseWindow
}) {
  const handleActionClick = (e, action, isClose = false) => {
    e.stopPropagation();
    if (isClose && onCloseWindow) {
      onCloseWindow(winId);
    } else if (onSetWindowMode) {
      onSetWindowMode(winId, action);
    }
  };

  return (
    <div
      className="window-titlebar"
      data-drag-window={winId}
      title="Przeciągnij myszką lub palcem, aby przesunąć okno"
    >
      <div className="window-titlebar-left">
        <span className="window-drag-grip">⠿</span>
        <span className="window-titlebar-name">{title}</span>
        <span className="window-mode-badge" data-mode-badge={winId}>
          {getModeLabelPl(mode)}
        </span>
      </div>
      <div className="window-titlebar-controls">
        {extraControls}
        <button
          type="button"
          className={`win-ctrl-btn ${mode === 'grid' ? 'active' : ''}`}
          data-win-id={winId}
          data-win-action="grid"
          title="Osadź w siatce"
          onClick={(e) => handleActionClick(e, 'grid')}
        >
          ⊞ Siatka
        </button>
        <button
          type="button"
          className={`win-ctrl-btn ${mode === 'minimized-inline' ? 'active' : ''}`}
          data-win-id={winId}
          data-win-action="minimized-inline"
          title="Minimalizuj okno w miejscu"
          onClick={(e) => handleActionClick(e, 'minimized-inline')}
        >
          —
        </button>
        <button
          type="button"
          className={`win-ctrl-btn ${mode === 'floating-small' ? 'active' : ''}`}
          data-win-id={winId}
          data-win-action="floating-small"
          title="Zmniejsz do małego okna przesuwnego"
          onClick={(e) => handleActionClick(e, 'floating-small')}
        >
          🗗 Małe
        </button>
        <button
          type="button"
          className={`win-ctrl-btn ${mode === 'floating-medium' ? 'active' : ''}`}
          data-win-id={winId}
          data-win-action="floating-medium"
          title="Zmniejsz do średniego okna przesuwnego"
          onClick={(e) => handleActionClick(e, 'floating-medium')}
        >
          🗗 Średnie
        </button>
        <button
          type="button"
          className={`win-ctrl-btn ${mode === 'fullscreen' ? 'active' : ''}`}
          data-win-id={winId}
          data-win-action="fullscreen"
          title="Otwórz na cały ekran"
          onClick={(e) => handleActionClick(e, 'fullscreen')}
        >
          ⛶ Cały ekran
        </button>
        <button
          type="button"
          className={`win-ctrl-btn dock-btn ${mode === 'docked-top' ? 'active' : ''}`}
          data-win-id={winId}
          data-win-action="docked-top"
          title="Zwróć do Menu Górnego"
          onClick={(e) => handleActionClick(e, 'docked-top')}
        >
          🔼 Menu
        </button>
        <button
          type="button"
          className={`win-ctrl-btn dock-btn ${mode === 'docked-sidebar' ? 'active' : ''}`}
          data-win-id={winId}
          data-win-action="docked-sidebar"
          title="Zwróć do Sidebaru z lewej"
          onClick={(e) => handleActionClick(e, 'docked-sidebar')}
        >
          ◀ Sidebar
        </button>
        <button
          type="button"
          className="win-ctrl-btn close-win-btn"
          data-win-id={winId}
          data-win-action="docked-top"
          title="Zamknij okno"
          onClick={(e) => handleActionClick(e, 'docked-top', true)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function WindowContainer({
  tag = 'div',
  winMeta,
  isSoloGridWindow = false,
  baseClassName = '',
  titlebarTitle,
  extraTitlebarControls = null,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront,
  children
}) {
  if (!winMeta) return null;
  const { id, title, icon, mode, posX, posY, zIndex } = winMeta;

  const modeClasses = [];
  if (mode === 'grid') modeClasses.push('win-mode-grid');
  else if (mode === 'minimized-inline') modeClasses.push('win-mode-minimized');
  else if (mode === 'floating-small') modeClasses.push('win-mode-floating', 'win-size-small');
  else if (mode === 'floating-medium') modeClasses.push('win-mode-floating', 'win-size-medium');
  else if (mode === 'fullscreen') modeClasses.push('win-mode-fullscreen');
  else modeClasses.push('win-mode-docked');

  if (isSoloGridWindow) {
    modeClasses.push('solo-grid-window');
  }

  const combinedClassName = `${baseClassName} app-window ${modeClasses.join(' ')}`.trim();

  const style = {};
  if (mode === 'floating-small' || mode === 'floating-medium') {
    style.left = `${Math.round(posX || 90)}px`;
    style.top = `${Math.round(posY || 90)}px`;
    if (zIndex) style.zIndex = String(zIndex);
  } else if (mode === 'fullscreen') {
    style.left = '8px';
    style.top = '8px';
    if (zIndex) style.zIndex = String(zIndex);
  }

  const Tag = tag;
  const isFloatingOrFull =
    mode === 'floating-small' || mode === 'floating-medium' || mode === 'fullscreen';

  const element = (
    <Tag
      className={combinedClassName}
      id={id}
      data-window-id={id}
      data-window-title={title}
      data-window-icon={icon}
      style={style}
      onMouseDown={() => {
        if ((mode === 'floating-small' || mode === 'floating-medium') && onBringToFront) {
          onBringToFront(id);
        }
      }}
    >
      <WindowTitlebar
        winId={id}
        title={titlebarTitle || title}
        mode={mode}
        extraControls={extraTitlebarControls}
        onSetWindowMode={onSetWindowMode}
        onCloseWindow={onCloseWindow}
      />
      <div className="window-content-body">{children}</div>
    </Tag>
  );

  if (isFloatingOrFull && typeof document !== 'undefined') {
    return (
      <>
        <div id={`grid-ph-${id}`} className="window-grid-placeholder" style={{ display: 'none' }} />
        {createPortal(element, document.body)}
      </>
    );
  }

  return element;
}
