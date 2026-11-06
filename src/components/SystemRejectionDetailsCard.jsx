import React, { useState } from 'react';
import { formatUsdc, formatUnitPrice, formatQty } from '../engine/okxClientEngine';

/**
 * Rozpoznaje i kategoryzuje przyczynę odrzucenia zlecenia przez system:
 * - Brak środków (niewystarczające saldo, brak depozytu margin)
 * - Odpowiedź / błąd z giełdy OKX API v5 (np. 51008, All operations failed, itp.)
 * - Błąd walidacji parametrów lub błąd systemowy
 */
export function resolveSystemRejectionDiagnostics(ord) {
  if (!ord) return null;
  const sysErr = ord.systemError || {};
  const rawMsg = sysErr.message || ord.error || ord.rejectionReason || '';
  const rawCode = sysErr.code || ord.errorCode || '';
  const rawType = sysErr.type || ord.errorType || '';

  // 1. Sprawdzenie czy powód dotyczy braku środków / salda
  const textToScan = `${rawMsg} ${rawCode} ${rawType}`.toLowerCase();
  const isFundsRelated =
    textToScan.includes('niewystarczając') ||
    textToScan.includes('brak środk') ||
    textToScan.includes('saldo') ||
    textToScan.includes('balance') ||
    textToScan.includes('insufficient') ||
    textToScan.includes('depozyt') ||
    textToScan.includes('margin') ||
    rawCode.includes('51000') ||
    rawCode.includes('51008') ||
    rawCode.includes('51001');

  // 2. Wyodrębnienie komunikatu zwrotnego bezpośrednio z giełdy OKX
  let exchangeMsg = sysErr.exchangeMsg || ord.exchangeFeedback?.exchangeMessage || '';
  if (!exchangeMsg && rawMsg) {
    const apiMatch =
      rawMsg.match(/\(Status OKX API:\s*([^)]+)\)/i) ||
      rawMsg.match(/komunikat giełdy:\s*([^;.]+)/i) ||
      rawMsg.match(/okx api:\s*([^;.]+)/i) ||
      rawMsg.match(/status okx:\s*([^;.]+)/i);
    if (apiMatch) {
      exchangeMsg = apiMatch[1].trim();
    }
  }

  // 3. Wyodrębnienie kwot (wymagane vs dostępne)
  let availableStr = sysErr.availableAmount ? String(sysErr.availableAmount) : '';
  let requiredStr = sysErr.requiredAmount ? String(sysErr.requiredAmount) : '';
  let currency = sysErr.currency || '';

  if (!availableStr || !requiredStr) {
    // Np. "Niewystarczające środki USDC w portfelu (66857.05 USDC < 67891903.67 USDC)"
    const matchCmp = rawMsg.match(/\(?\s*([\d.,\s]+)\s*([A-Z]+)?\s*<\s*([\d.,\s]+)\s*([A-Z]+)?\s*\)?/i);
    if (matchCmp) {
      availableStr = matchCmp[1].replace(/\s+/g, '');
      currency = matchCmp[2] || matchCmp[4] || currency;
      requiredStr = matchCmp[3].replace(/\s+/g, '');
    }
  }

  const isFutures =
    Boolean(ord.instId?.includes('SWAP')) ||
    Boolean(ord.leverage) ||
    Boolean(ord.source?.includes('Futures')) ||
    Boolean(ord.strategyName?.includes('Futures'));

  if (!currency) {
    currency = isFutures ? 'USDC' : (ord.side === 'BUY' ? 'USDC' : (ord.asset || 'USDC'));
  }

  const availNum = parseFloat(availableStr.replace(/,/g, ''));
  const reqNum = parseFloat(requiredStr.replace(/,/g, ''));
  const hasComparison = !isNaN(availNum) && !isNaN(reqNum);
  const shortfallNum = hasComparison ? Math.max(0, reqNum - availNum) : null;

  // 4. Kategoryzacja przyczyny
  let categoryBadge = '⚙️ BŁĄD SYSTEMOWY';
  let categoryColor = '#f87171';
  let categoryBg = 'rgba(239, 68, 68, 0.2)';
  let categoryTitle = 'Błąd walidacji lub wykonania systemu';

  if (isFundsRelated) {
    categoryBadge = '🪙 BRAK WYSTARCZAJĄCYCH ŚRODKÓW';
    categoryColor = '#fbbf24';
    categoryBg = 'rgba(245, 158, 11, 0.2)';
    categoryTitle = isFutures
      ? 'Brak środków na pokrycie depozytu zabezpieczającego (Initial Margin)'
      : 'Niewystarczające saldo rachunku na pokrycie wartości zlecenia';
  } else if (exchangeMsg || rawCode.startsWith('5') || rawCode.includes('OKX_API')) {
    categoryBadge = '🌐 ODPOWIEDŹ / ODRZUCENIE Z GIEŁDY OKX';
    categoryColor = '#f43f5e';
    categoryBg = 'rgba(244, 63, 94, 0.2)';
    categoryTitle = 'Odrzucenie zapytania przez API giełdy OKX v5';
  }

  // 5. Opis dlaczego nie doszło do transakcji
  let whyDescription = rawMsg;
  if (!whyDescription) {
    if (isFundsRelated) {
      whyDescription = isFutures
        ? 'Rachunek handlowy nie posiadał wystarczającej ilości wolnych środków (Free Margin) na otwarcie wymaganej pozycji futures z wybraną dźwignią.'
        : `Rachunek handlowy nie posiadał wystarczającego salda ${currency} na pokrycie całkowitego kosztu zakupu.`;
    } else {
      whyDescription = 'Transakcja została odrzucona przez system przed egzekucją na giełdzie z przyczyn walidacyjnych.';
    }
  }

  // 6. Rekomendacja jak rozwiązać
  let recommendation = '';
  if (isFundsRelated) {
    if (shortfallNum && shortfallNum > 0) {
      recommendation = `Doładuj konto o co najmniej ${formatUsdc(shortfallNum)} ${currency} lub zmniejsz wolumen zlecenia / dźwignię finansową przed ponowieniem strategii.`;
    } else {
      recommendation = `Zasil konto walutą ${currency} lub zmniejsz wielkość pozycji, aby zlecenie mieściło się w dostępnym saldzie portfela.`;
    }
  } else if (exchangeMsg) {
    recommendation =
      'Sprawdź uprawnienia kluczy API na OKX (wymagane uprawnienie Trade), status weryfikacji tożsamości oraz czy dany instrument jest aktywny w Twoim regionie (OKX Europe eea.okx.com).';
  } else {
    recommendation =
      'Zweryfikuj parametry strategii (kurs limit, wolumen, tryb konta) i upewnij się, że rynek jest otwarty do handlu.';
  }

  return {
    isFundsRelated,
    isFutures,
    categoryBadge,
    categoryColor,
    categoryBg,
    categoryTitle,
    whyDescription,
    exchangeMsg,
    errorCode: rawCode || (isFundsRelated ? 'ERR_OKX_BALANCE_51000' : 'ERR_SYSTEM_REJECTED'),
    errorType: rawType || (isFundsRelated ? 'Błąd salda rachunku OKX Europe' : 'Walidacja giełdowa OKX Europe'),
    availableStr: hasComparison ? formatUsdc(availNum) : (availableStr || null),
    requiredStr: hasComparison ? formatUsdc(reqNum) : (requiredStr || null),
    shortfallStr: shortfallNum !== null ? formatUsdc(shortfallNum) : null,
    currency,
    recommendation,
    rawDetails: {
      orderId: ord.id,
      instId: ord.instId,
      amount: ord.amount,
      price: ord.price,
      usdcValue: ord.usdcValue,
      strategyName: ord.strategyName,
      date: ord.date,
      time: ord.time,
      systemError: ord.systemError
    }
  };
}

/**
 * Komponent prezentujący szczegółowe informacje diagnostyczne, dlaczego transakcja została
 * odrzucona przez system w strategii Spot lub Futures:
 * - Dokładny powód i kategoria
 * - Czy to brak środków (porównanie wymaganych vs dostępnych środków)
 * - Czy to błąd (rodzaj błędu, kod błędu)
 * - Czy odpowiedź z giełdy OKX (komunikat API OKX)
 * - Rekomendacja i surowe szczegóły JSON
 */
export function SystemRejectionDetailsCard({ ord, style = {} }) {
  const [showRawJson, setShowRawJson] = useState(false);
  const diag = resolveSystemRejectionDiagnostics(ord);
  if (!diag) return null;

  return (
    <div
      className="system-rejection-card"
      style={{
        marginTop: '10px',
        marginBottom: '6px',
        padding: '12px 14px',
        background: 'linear-gradient(145deg, rgba(30, 20, 25, 0.95), rgba(20, 15, 22, 0.95))',
        border: `1.5px solid ${diag.categoryColor}`,
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
        fontSize: '12px',
        color: '#f3f4f6',
        ...style
      }}
    >
      {/* Nagłówek i Kategoria */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          paddingBottom: '8px',
          marginBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>⚠️</span>
          <strong style={{ fontSize: '13px', color: '#ffffff', letterSpacing: '0.3px' }}>
            Transakcja odrzucona przez System
          </strong>
        </div>

        <span
          style={{
            padding: '3px 9px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 800,
            background: diag.categoryBg,
            color: diag.categoryColor,
            border: `1px solid ${diag.categoryColor}`
          }}
        >
          {diag.categoryBadge}
        </span>
      </div>

      {/* Główny opis dlaczego nie doszło do transakcji */}
      <div style={{ marginBottom: '10px', lineHeight: '1.5' }}>
        <div style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
          🔍 Dlaczego nie doszło do transakcji:
        </div>
        <div style={{ color: '#fecaca', fontWeight: 600, fontSize: '12.5px' }}>
          {diag.whyDescription}
        </div>
      </div>

      {/* Sekcja Braku Środków: Porównanie Wymaganych vs Dostępnych */}
      {diag.isFundsRelated && (diag.availableStr || diag.requiredStr) && (
        <div
          style={{
            marginBottom: '10px',
            padding: '10px 12px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '6px'
          }}
        >
          <div style={{ color: '#fbbf24', fontSize: '11.5px', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🪙 Szczegółowy Bilans Środków Rachunku Handlowego:</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px',
              fontSize: '12px'
            }}
          >
            {diag.requiredStr && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '6px 8px', borderRadius: '4px' }}>
                <span style={{ fontSize: '10.5px', color: '#9ca3af', display: 'block' }}>
                  {diag.isFutures ? 'Wymagany depozyt (Initial Margin):' : 'Wymagana wartość zakupu:'}
                </span>
                <strong style={{ color: '#f87171', fontSize: '13px' }}>
                  {diag.requiredStr} {diag.currency}
                </strong>
              </div>
            )}

            {diag.availableStr && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '6px 8px', borderRadius: '4px' }}>
                <span style={{ fontSize: '10.5px', color: '#9ca3af', display: 'block' }}>
                  Dostępne wolne saldo w portfelu:
                </span>
                <strong style={{ color: '#38bdf8', fontSize: '13px' }}>
                  {diag.availableStr} {diag.currency}
                </strong>
              </div>
            )}

            {diag.shortfallStr && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '6px 8px', borderRadius: '4px' }}>
                <span style={{ fontSize: '10.5px', color: '#9ca3af', display: 'block' }}>
                  Brakująca kwota (Niedobór):
                </span>
                <strong style={{ color: '#fbbf24', fontSize: '13px' }}>
                  -{diag.shortfallStr} {diag.currency}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Komunikat bezpośrednio z giełdy OKX */}
      {diag.exchangeMsg && (
        <div
          style={{
            marginBottom: '10px',
            padding: '8px 12px',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '6px',
            fontSize: '11.5px'
          }}
        >
          <div style={{ color: '#fb7185', fontWeight: 800, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏛️ Komunikat Zwrotny Giełdy OKX Europe (API v5):</span>
          </div>
          <code
            style={{
              display: 'block',
              background: 'rgba(0, 0, 0, 0.45)',
              padding: '4px 8px',
              borderRadius: '4px',
              color: '#fecdd3',
              fontSize: '11px',
              wordBreak: 'break-all',
              fontFamily: 'Consolas, monospace'
            }}
          >
            {diag.exchangeMsg}
          </code>
        </div>
      )}

      {/* Parametry techniczne: rodzaj błędu i kod */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          padding: '6px 0',
          fontSize: '11.5px',
          color: '#d1d5db',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          marginBottom: '8px'
        }}
      >
        <div>
          <strong style={{ color: '#9ca3af' }}>Rodzaj błędu: </strong>
          <span style={{ color: '#ffffff' }}>{diag.errorType}</span>
        </div>

        <div>
          <strong style={{ color: '#9ca3af' }}>Kod błędu: </strong>
          <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: '3px', color: '#fca5a5' }}>
            {diag.errorCode}
          </code>
        </div>

        {ord.id && (
          <div>
            <strong style={{ color: '#9ca3af' }}>ID Zlecenia: </strong>
            <code>{ord.id}</code>
          </div>
        )}
      </div>

      {/* Rekomendowane rozwiązanie */}
      <div style={{ fontSize: '11.5px', color: '#93c5fd', display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '8px' }}>
        <span>💡</span>
        <div>
          <strong>Jak rozwiązać: </strong>
          <span>{diag.recommendation}</span>
        </div>
      </div>

      {/* Przycisk rozwijania JSON / szczegółów technicznych */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '10.5px',
            cursor: 'pointer',
            padding: '2px 4px',
            textDecoration: 'underline'
          }}
          onClick={() => setShowRawJson((prev) => !prev)}
        >
          {showRawJson ? '▲ Ukryj szczegóły techniczne (Raw JSON)' : '▼ Pokaż szczegóły techniczne (Raw JSON)'}
        </button>
      </div>

      {showRawJson && (
        <pre
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            fontSize: '10.5px',
            color: '#a7f3d0',
            overflowX: 'auto',
            maxHeight: '160px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'Consolas, monospace'
          }}
        >
          {JSON.stringify(diag.rawDetails, null, 2)}
        </pre>
      )}
    </div>
  );
}
