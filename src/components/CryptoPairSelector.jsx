import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  formatRawPrice,
  formatPriceWithQuote,
  formatPctChange,
  getMarketIntervalChanges,
  DEFAULT_STANDALONE_MARKETS
} from '../engine/okxClientEngine';

const TOP_FAVORITES_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'SUI',
  'AVAX',
  'LINK',
  'WLD',
  'OKB',
  'ADA',
  'ETC',
  'USDG'
];

export function CryptoPairSelector({
  selectedPair,
  onSelectPair,
  markets
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'FAVORITES' | 'USDC' | 'USDT' | 'EUR'
  const [openSections, setOpenSections] = useState({
    FAVORITES: true,
    USDC: true,
    USDT: false,
    EUR: false,
    OTHERS: false
  });

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const mList = useMemo(() => {
    return Array.isArray(markets) && markets.length > 0 ? markets : DEFAULT_STANDALONE_MARKETS;
  }, [markets]);

  // Znajdź bieżący rynek dla aktywnej pary
  const currentMarket = useMemo(() => {
    const found = mList.find((m) => m.instId === selectedPair);
    if (found) return found;
    return (
      DEFAULT_STANDALONE_MARKETS.find((m) => m.instId === selectedPair) || {
        instId: selectedPair || 'BTC-USDC',
        base: (selectedPair || 'BTC-USDC').split('-')[0],
        quote: (selectedPair || 'BTC-USDC').split('-')[1] || 'USDC',
        name: (selectedPair || 'BTC-USDC').split('-')[0],
        price: 0,
        change24hPct: 0
      }
    );
  }, [mList, selectedPair]);

  const currentChanges = useMemo(() => {
    return getMarketIntervalChanges(currentMarket);
  }, [currentMarket]);

  // Zamknij po kliknięciu poza komponentem
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Podział na grupy
  const groupedMarkets = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    const filterFn = (m) => {
      if (!q) return true;
      const inst = (m.instId || '').toUpperCase();
      const base = (m.base || '').toUpperCase();
      const name = (m.name || '').toUpperCase();
      return inst.includes(q) || base.includes(q) || name.includes(q);
    };

    const filtered = mList.filter(filterFn);

    const favorites = filtered.filter(
      (m) => TOP_FAVORITES_SYMBOLS.includes(m.base) && (m.quote === 'USDC' || m.quote === 'USDT')
    );
    const usdc = filtered.filter((m) => m.quote === 'USDC');
    const usdt = filtered.filter((m) => m.quote === 'USDT');
    const eur = filtered.filter((m) => m.quote === 'EUR');
    const others = filtered.filter((m) => !['USDC', 'USDT', 'EUR'].includes(m.quote));

    return {
      all: filtered,
      favorites,
      usdc,
      usdt,
      eur,
      others,
      totalCount: filtered.length
    };
  }, [mList, searchQuery]);

  const handlePairChoose = (instId) => {
    onSelectPair(instId);
    setIsOpen(false);
  };

  const renderBadge = (label, val) => {
    const num = Number(val || 0);
    const colorClass =
      num > 0 ? 'pct-positive' : num < 0 ? 'pct-negative' : 'pct-neutral';
    return (
      <span className={`interval-badge ${colorClass}`} title={`Zmiana ${label}: ${formatPctChange(num)}`}>
        <span className="interval-label">{label}:</span>
        <strong className="interval-val">{formatPctChange(num)}</strong>
      </span>
    );
  };

  const renderMarketRow = (m) => {
    const changes = getMarketIntervalChanges(m);
    const isSelected = m.instId === selectedPair;
    return (
      <div
        key={m.instId}
        className={`pair-picker-row ${isSelected ? 'is-selected' : ''}`}
        onClick={() => handlePairChoose(m.instId)}
        role="button"
        tabIndex={0}
      >
        <div className="pair-picker-col-asset">
          <div className="pair-picker-symbol-box">
            <span className="pair-picker-instid">{m.instId}</span>
            {isSelected && <span className="pair-picker-selected-tag">✓ Wybrana</span>}
          </div>
          <span className="pair-picker-name">{m.name || m.base}</span>
        </div>

        <div className="pair-picker-col-price">
          <span className="pair-picker-price-val">
            {formatPriceWithQuote(m.price, m.quote)}
          </span>
          <span className="pair-picker-vol">
            Obrót 24h: {Number(m.volCcy24h || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} {m.quote}
          </span>
        </div>

        <div className="pair-picker-col-changes">
          {renderBadge('15m', changes.change15m)}
          {renderBadge('1h', changes.change1h)}
          {renderBadge('4h', changes.change4h)}
          {renderBadge('1D', changes.change1d)}
          {renderBadge('1W', changes.change1w)}
        </div>
      </div>
    );
  };

  const renderAccordionSection = (key, title, icon, list) => {
    if (activeTab !== 'ALL' && activeTab !== key) return null;
    if (list.length === 0) return null;
    const isExpanded = searchQuery.trim().length > 0 || openSections[key];

    return (
      <div key={key} className="pair-accordion-section">
        <button
          type="button"
          className={`pair-accordion-header ${isExpanded ? 'is-expanded' : ''}`}
          onClick={() => toggleSection(key)}
        >
          <span className="pair-accordion-title">
            <span className="pair-accordion-icon">{icon}</span>
            {title}
            <span className="pair-accordion-count">({list.length} par)</span>
          </span>
          <span className="pair-accordion-arrow">{isExpanded ? '▲' : '▼'}</span>
        </button>

        {isExpanded && (
          <div className="pair-accordion-body">
            {list.slice(0, 80).map((m) => renderMarketRow(m))}
            {list.length > 80 && (
              <div className="pair-accordion-more-hint">
                ... i jeszcze {list.length - 80} par (użyj lupy 🔍 powyżej, aby przefiltrować)
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="crypto-pair-selector-wrap" ref={containerRef}>
      {/* 1. AKTYWNA KARTA WYBRANEJ PARY (TRIGGER COMPONENT) */}
      <div
        className={`pair-selected-card ${isOpen ? 'active-dropdown' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        title="Kliknij, aby wyszukać i zmienić parę kryptowalutową"
      >
        <div className="pair-card-left">
          <div className="pair-card-symbol-line">
            <span className="pair-card-icon">⚡</span>
            <strong className="pair-card-instid">{currentMarket.instId}</strong>
            <span className="pair-card-name">({currentMarket.name || currentMarket.base})</span>
          </div>
          <div className="pair-card-price-line">
            <span className="pair-card-label">Kurs bieżący:</span>
            <strong className="pair-card-price">
              {formatPriceWithQuote(currentMarket.price, currentMarket.quote)}
            </strong>
          </div>
        </div>

        <div className="pair-card-right">
          <div className="pair-card-intervals-grid">
            {renderBadge('15m', currentChanges.change15m)}
            {renderBadge('1h', currentChanges.change1h)}
            {renderBadge('4h', currentChanges.change4h)}
            {renderBadge('1D', currentChanges.change1d)}
            {renderBadge('1W', currentChanges.change1w)}
          </div>
          <button
            type="button"
            className="btn btn-outline-sm pair-dropdown-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
          >
            {isOpen ? 'Zwiń listę ▲' : 'Zmień parę 🔍 ▼'}
          </button>
        </div>
      </div>

      {/* 2. ROZWIJANY KATALOG Z LUPĄ, ACCORDIONEM I ZAKŁADKAMI */}
      {isOpen && (
        <div className="pair-dropdown-panel">
          {/* PASEK Z LUPĄ DO WYSZUKIWANIA */}
          <div className="pair-search-bar">
            <div className="pair-search-input-wrapper">
              <span className="pair-search-lens" aria-hidden="true">
                🔍
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="pair-search-field"
                placeholder="🔍 Szukaj symbolu lub waluty (np. BTC, SOL, PEPE, SUI, DOGE, EUR)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="pair-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Wyczyść wyszukiwanie"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="pair-search-count-badge">
              Znaleziono: <strong>{groupedMarkets.totalCount}</strong> par
            </div>
          </div>

          {/* FILTRY KATEGORII (PIGUŁKI ZAKŁADEK) */}
          <div className="pair-category-pills">
            <button
              type="button"
              className={`pair-pill-btn ${activeTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveTab('ALL')}
            >
              🌐 Wszystkie ({groupedMarkets.totalCount})
            </button>
            <button
              type="button"
              className={`pair-pill-btn ${activeTab === 'FAVORITES' ? 'active' : ''}`}
              onClick={() => setActiveTab('FAVORITES')}
            >
              ⭐ Główne ({groupedMarkets.favorites.length})
            </button>
            <button
              type="button"
              className={`pair-pill-btn ${activeTab === 'USDC' ? 'active' : ''}`}
              onClick={() => setActiveTab('USDC')}
            >
              🪙 Rynki USDC ({groupedMarkets.usdc.length})
            </button>
            <button
              type="button"
              className={`pair-pill-btn ${activeTab === 'USDT' ? 'active' : ''}`}
              onClick={() => setActiveTab('USDT')}
            >
              💵 Rynki USDT ({groupedMarkets.usdt.length})
            </button>
            <button
              type="button"
              className={`pair-pill-btn ${activeTab === 'EUR' ? 'active' : ''}`}
              onClick={() => setActiveTab('EUR')}
            >
              💶 Rynki EUR ({groupedMarkets.eur.length})
            </button>
          </div>

          {/* ACCORDION Z LISTAMI PAR */}
          <div className="pair-accordion-container">
            {groupedMarkets.totalCount === 0 ? (
              <div className="pair-empty-results">
                Nie znaleziono par kryptowalutowych pasujących do frazy &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <>
                {renderAccordionSection(
                  'FAVORITES',
                  'Główne i Ulubione Kryptowaluty (Spot)',
                  '⭐',
                  groupedMarkets.favorites
                )}
                {renderAccordionSection(
                  'USDC',
                  'Kryptowaluty z rozliczeniem w USDC (Konto OKX EEA)',
                  '🪙',
                  groupedMarkets.usdc
                )}
                {renderAccordionSection(
                  'USDT',
                  'Kryptowaluty z rozliczeniem w USDT',
                  '💵',
                  groupedMarkets.usdt
                )}
                {renderAccordionSection(
                  'EUR',
                  'Kryptowaluty z rozliczeniem w EUR (Euro)',
                  '💶',
                  groupedMarkets.eur
                )}
                {renderAccordionSection(
                  'OTHERS',
                  'Pozostałe rynki kryptowalutowe Spot',
                  '🌐',
                  groupedMarkets.others
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
