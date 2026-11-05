import React, { useState, useEffect } from 'react';
import {
  exportDeviceSyncCode,
  importDeviceSyncCode,
  syncCloudSessionOrders,
  loadSavedAiExecutedOrders
} from '../engine/okxClientEngine';

export function DeviceSyncModal({
  isOpen,
  onClose,
  cfg,
  onStateUpdate,
  showToast
}) {
  const [pasteInput, setPasteInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [previewCode, setPreviewCode] = useState('');
  const [stats, setStats] = useState({ total: 0, spot: 0, futures: 0 });

  const isMobile =
    typeof navigator !== 'undefined' && /mobile|android|iphone|ipad/i.test(navigator.userAgent);

  const refreshStats = () => {
    try {
      const orders = loadSavedAiExecutedOrders();
      const spot = orders.filter(
        (o) =>
          !(
            String(o.id || '').startsWith('OKX-FUT-') ||
            o.marketType === 'FUTURES' ||
            o.instId?.includes('SWAP') ||
            o.source?.includes('Futures') ||
            o.strategyName?.includes('Futures') ||
            Boolean(o.leverage)
          )
      ).length;
      const futures = orders.length - spot;
      setStats({ total: orders.length, spot, futures });
    } catch (e) {
      setStats({ total: 0, spot: 0, futures: 0 });
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      setSyncStatusMsg('');
      setPasteInput('');
      setShowCodePreview(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('⏳ Łączenie z Bramą Domową i Chmurą GitHub...');
    try {
      const res = await syncCloudSessionOrders();
      refreshStats();
      if (res && res.ok) {
        setSyncStatusMsg(`✅ Zsynchronizowano pomyślnie! Pobrano i połączono ${res.count || 0} strategii.`);
        if (showToast) showToast(`✅ Pomyślnie zsynchronizowano ${res.count || 0} strategii Spot i Futures!`);
      } else {
        setSyncStatusMsg('ℹ️ Pamięć lokalna jest aktualna — brak nowych zleceń w chmurze.');
        if (showToast) showToast('ℹ️ Pamięć lokalna jest aktualna.');
      }
      if (onStateUpdate) onStateUpdate();
    } catch (e) {
      setSyncStatusMsg(`⚠️ Błąd synchronizacji: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySyncCode = () => {
    try {
      const code = exportDeviceSyncCode();
      if (!code) {
        setSyncStatusMsg('⚠️ Brak zleceń w pamięci do wyeksportowania.');
        return;
      }
      setPreviewCode(code);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(
          () => {
            setSyncStatusMsg('📋 Skopiowano kod wszystkich strategii do schowka! Wklej go na drugim urządzeniu.');
            if (showToast) showToast('📋 Skopiowano kod synchronizacji do schowka!');
          },
          () => {
            setShowCodePreview(true);
            setSyncStatusMsg('ℹ️ Zaznacz i skopiuj poniższy kod ręcznie:');
          }
        );
      } else {
        setShowCodePreview(true);
        setSyncStatusMsg('ℹ️ Zaznacz i skopiuj poniższy kod ręcznie:');
      }
    } catch (e) {
      setSyncStatusMsg(`❌ Błąd eksportu: ${e.message}`);
    }
  };

  const handleImportAndMerge = async () => {
    if (!pasteInput || !pasteInput.trim()) {
      setSyncStatusMsg('⚠️ Wklej najpierw kod synchronizacji z drugiego urządzenia.');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg('⏳ Wzajemne scalanie historii strategii...');
    try {
      const res = await importDeviceSyncCode(pasteInput);
      refreshStats();
      setPasteInput('');
      setSyncStatusMsg(`✅ Sukces! Wzajemnie scalono ${res.count || 0} strategii Spot i Futures z drugim urządzeniem.`);
      if (showToast) {
        showToast(`✅ Wzajemnie scalono ${res.count || 0} strategii! Żadne transakcje nie zostały utracone.`);
      }
      if (onStateUpdate) onStateUpdate();
    } catch (e) {
      setSyncStatusMsg(`❌ Błąd scalania: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const isGatewayConnected =
    cfg?.remoteGateway?.cloudflareTunnelActive ||
    Boolean(cfg?.remoteGateway?.homePublicIp && cfg?.remoteGateway?.homePublicIp !== 'Wykrywanie IP...');

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: 'linear-gradient(180deg, #131722 0%, #0c0e14 100%)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.15)',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📲</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Dwukierunkowa Synchronizacja Strategii (Telefon ⇄ PC)
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Wzajemne uzupełnianie historii strategii Spot i Futures między urządzeniami
              </p>
            </div>
          </div>
          <button
            type="button"
            className="win-ctrl-btn"
            style={{ fontSize: '18px', padding: '4px 10px', color: '#94a3b8' }}
            onClick={onClose}
            title="Zamknij"
          >
            ✖
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Status & Device Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '8px',
              padding: '12px 16px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                To urządzenie
              </span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                {isMobile ? '📱 Smartfon (Mobile)' : '💻 Komputer (Desktop)'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Połączenie z Bramą Domową
              </span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: isGatewayConnected ? '#34d399' : '#fbbf24', marginTop: '2px' }}>
                {isGatewayConnected ? '🟢 Brama IP: Aktywna' : '🌐 Tryb Chmury / GitHub'}
              </div>
            </div>

            {/* Counts Badge */}
            <div
              style={{
                gridColumn: '1 / -1',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '8px',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '12px'
              }}
            >
              <span>
                Pamięć tego urządzenia: <strong>{stats.total} strategii</strong>
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  🟢 Spot: {stats.spot}
                </span>
                <span
                  style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  🟣 Futures: {stats.futures}
                </span>
              </div>
            </div>
          </div>

          {/* Status Message Alert */}
          {syncStatusMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                background: syncStatusMsg.startsWith('✅')
                  ? 'rgba(16, 185, 129, 0.15)'
                  : syncStatusMsg.startsWith('⚠️')
                  ? 'rgba(245, 158, 11, 0.15)'
                  : syncStatusMsg.startsWith('❌')
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(56, 189, 248, 0.15)',
                border: syncStatusMsg.startsWith('✅')
                  ? '1px solid #10b981'
                  : syncStatusMsg.startsWith('⚠️')
                  ? '1px solid #f59e0b'
                  : syncStatusMsg.startsWith('❌')
                  ? '1px solid #ef4444'
                  : '1px solid #38bdf8',
                color: syncStatusMsg.startsWith('✅')
                  ? '#6ee7b7'
                  : syncStatusMsg.startsWith('⚠️')
                  ? '#fde68a'
                  : syncStatusMsg.startsWith('❌')
                  ? '#fca5a5'
                  : '#bae6fd'
              }}
            >
              {syncStatusMsg}
            </div>
          )}

          {/* Section 1: Auto Sync via Gateway / Cloud */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>1. Szybka synchronizacja (Brama / Chmura)</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                  Pobiera i scala najnowsze zlecenia z Bramy Domowej lub chmury GitHub Pages.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '12px'
                }}
                disabled={isSyncing}
                onClick={handleCloudSync}
              >
                {isSyncing ? '⏳ Synchronizuję...' : '⚡ Pobierz i scal z Chmury / Bramy'}
              </button>
            </div>
          </div>

          {/* Section 2: Copy to other device */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>2. Wyślij na drugie urządzenie</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                  Kopiuje pełny pakiet strategii Spot i Futures do schowka, aby wkleić go na drugim urządzeniu.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                style={{
                  background: 'rgba(168, 85, 247, 0.2)',
                  borderColor: '#a855f7',
                  color: '#c084fc',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '12px'
                }}
                onClick={handleCopySyncCode}
              >
                📋 Kopiuj kod do schowka
              </button>
            </div>

            {showCodePreview && (
              <div style={{ marginTop: '8px' }}>
                <textarea
                  readOnly
                  value={previewCode}
                  style={{
                    width: '100%',
                    height: '90px',
                    background: '#090b10',
                    color: '#a5b4fc',
                    border: '1px solid #4338ca',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    padding: '8px',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}
          </div>

          {/* Section 3: Paste and Merge from other device */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div>
              <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>3. Odbierz z drugiego urządzenia (Wzajemne uzupełnienie)</strong>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Wklej poniżej kod skopiowany z telefonu lub komputera. Transakcje zostaną <strong>bezpiecznie połączone i uzupełnione bez duplikatów</strong>.
              </p>
            </div>

            <textarea
              placeholder="Wklej tutaj dane synchronizacji (kod JSON z telefonu / komputera)..."
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              style={{
                width: '100%',
                height: '80px',
                background: '#090b10',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '8px',
                boxSizing: 'border-box'
              }}
            />

            <button
              type="button"
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '12px',
                padding: '8px 18px',
                border: 'none',
                borderRadius: '6px'
              }}
              disabled={isSyncing || !pasteInput.trim()}
              onClick={handleImportAndMerge}
            >
              📥 Wklej i scal z historią tego urządzenia
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
            fontSize: '11px',
            color: '#64748b'
          }}
        >
          <span>Wszystkie strategie Spot i Futures są synchronizowane dwukierunkowo i trwale przechowywane.</span>
          <button
            type="button"
            className="btn btn-outline-sm"
            style={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: '#cbd5e1' }}
            onClick={onClose}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
export default DeviceSyncModal;
