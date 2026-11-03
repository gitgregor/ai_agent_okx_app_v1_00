import React, { useRef, useEffect, useState } from 'react';
import {
  formatUnitPrice,
  formatRawPrice,
  computeEMA,
  computeBollinger,
  computeVWAP,
  computeRSI,
  computeMACD,
  computeHeikinAshi,
  formatCandleTime,
  getCandleCountdown,
  DEFAULT_STANDALONE_MARKETS
} from '../engine/okxClientEngine';

const INTERVALS = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];

export function TradingViewChartWindow({
  chartState,
  markets,
  onUpdateChartState,
  onApplyChartSize,
  onDockChartTop,
  onDockChartSidebar,
  onMinimizeChart,
  onCloseChart,
  onRestoreChart,
  onQuickTradeFromChart,
  onClearDrawingsToast
}) {
  const canvasRef = useRef(null);
  const lastGeomRef = useRef(null);
  const panRef = useRef({ isPanning: false, startX: 0, startOffset: 0 });
  const yScaleRef = useRef({ isScaling: false, startY: 0, startScale: 1.0 });
  const chartStateRef = useRef(chartState);
  chartStateRef.current = chartState;
  const [, setLegendTick] = useState(0);

  // Natywny non-passive event listener dla kółka myszy na canvasie
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelNative = (e) => {
      if (chartStateRef.current.engine !== 'pro') return;
      e.preventDefault();
      e.stopPropagation();

      const delta = Math.sign(e.deltaY);
      const curCount = chartStateRef.current.visibleCount || 68;
      // Scroll w dół (delta > 0) = oddalanie / rozszerzanie osi czasu (więcej świeczek widocznych)
      // Scroll w górę (delta < 0) = przybliżanie / zagęszczanie osi czasu (mniej świeczek, świeczki szersze)
      const step = Math.max(3, Math.round(curCount * 0.12));
      const nextCount =
        delta > 0
          ? Math.min(240, curCount + step)
          : Math.max(14, curCount - step);

      if (nextCount !== curCount) {
        onUpdateChartState({ visibleCount: nextCount });
      }
    };

    canvas.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheelNative);
    };
  }, [onUpdateChartState]);

  const mList =
    Array.isArray(markets) && markets.length > 0 ? markets : DEFAULT_STANDALONE_MARKETS;

  const data = chartState.data;
  const isPos = (data?.change24hPct || 0) >= 0;
  const isWidget = chartState.engine === 'widget';

  const drawCanvas = () => {
    if (
      !chartState.data ||
      !chartState.isOpen ||
      chartState.isMinimized ||
      chartState.engine === 'widget'
    ) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(280, Math.floor(rect.width));
    const cssH = Math.max(160, Math.floor(rect.height));

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const w = cssW;
    const h = cssH;

    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, w, h);

    const allCandles = chartState.data.candles || [];
    if (allCandles.length === 0) {
      ctx.restore();
      return;
    }

    const closes = allCandles.map((c) => c.close);
    const ema9All = computeEMA(closes, 9);
    const ema21All = computeEMA(closes, 21);
    const ema50All = computeEMA(closes, 50);
    const bbAll = computeBollinger(closes, 20, 2);
    const vwapAll = computeVWAP(allCandles);
    const rsiAll = computeRSI(closes, 14);
    const macdAll = computeMACD(closes);
    const plotSourceAll =
      chartState.chartType === 'heikin' ? computeHeikinAshi(allCandles) : allCandles;

    const visCount = Math.min(allCandles.length, Math.max(16, chartState.visibleCount));
    const maxPan = Math.max(0, allCandles.length - visCount);
    const panOffset = Math.min(Math.max(0, chartState.panOffset), maxPan);

    const endIdx = allCandles.length - panOffset;
    const startIdx = Math.max(0, endIdx - visCount);
    const candles = plotSourceAll.slice(startIdx, endIdx);
    const rawCandles = allCandles.slice(startIdx, endIdx);

    if (candles.length === 0) {
      ctx.restore();
      return;
    }

    const hasSubPane =
      (chartState.indicators.rsi || chartState.indicators.macd) && h >= 260;
    const padLeft = 8;
    const padRight = 76;
    const padTop = 30;
    const padBottom = 24;
    const totalPlotH = h - padTop - padBottom;
    const mainH = hasSubPane ? Math.floor(totalPlotH * 0.72) : totalPlotH;
    const subGap = hasSubPane ? 10 : 0;
    const subTop = padTop + mainH + subGap;
    const subH = hasSubPane ? totalPlotH - mainH - subGap : 0;
    const chartW = w - padLeft - padRight;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
    ctx.font = `800 ${Math.max(22, Math.min(48, Math.floor(w * 0.055)))}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${chartState.data.instId} • ${chartState.bar}`,
      padLeft + chartW / 2,
      padTop + mainH * 0.48
    );
    ctx.font = `600 ${Math.max(11, Math.min(16, Math.floor(w * 0.02)))}px Inter, sans-serif`;
    ctx.fillText('OKX EUROPE SPOT (LIVE)', padLeft + chartW / 2, padTop + mainH * 0.48 + 22);
    ctx.restore();

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    candles.forEach((c, localIdx) => {
      const gIdx = startIdx + localIdx;
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
      if (chartState.indicators.bb && bbAll.upper[gIdx] !== null) {
        if (bbAll.upper[gIdx] > maxPrice) maxPrice = bbAll.upper[gIdx];
        if (bbAll.lower[gIdx] < minPrice) minPrice = bbAll.lower[gIdx];
      }
    });

    const avgBuyPx = Number(chartState.data.avgBuyPrice || 0);
    if (avgBuyPx > 0 && avgBuyPx >= minPrice * 0.9 && avgBuyPx <= maxPrice * 1.1) {
      if (avgBuyPx < minPrice) minPrice = avgBuyPx;
      if (avgBuyPx > maxPrice) maxPrice = avgBuyPx;
    }

    const rawRange = Math.max(0.00001, maxPrice - minPrice);
    const midPrice = (minPrice + maxPrice) / 2;
    const baseHalfRange = (rawRange / 2) * 1.12;

    const scaleY =
      typeof chartState.priceScaleY === 'number' && chartState.priceScaleY > 0
        ? chartState.priceScaleY
        : 1.0;
    const effectiveHalfRange = Math.max(0.000005, baseHalfRange * scaleY);

    minPrice = midPrice - effectiveHalfRange;
    maxPrice = midPrice + effectiveHalfRange;
    const priceRange = Math.max(0.00001, maxPrice - minPrice);

    const priceToY = (p) => padTop + ((maxPrice - p) / priceRange) * mainH;
    const yToPrice = (y) => maxPrice - ((y - padTop) / mainH) * priceRange;
    const stepX = chartW / candles.length;
    const idxToX = (localIdx) => padLeft + localIdx * stepX + stepX / 2;

    lastGeomRef.current = {
      padLeft,
      padRight,
      padTop,
      padBottom,
      chartW,
      mainH,
      subTop,
      subH,
      w,
      h,
      minPrice,
      maxPrice,
      priceRange,
      stepX,
      startIdx,
      endIdx,
      candles,
      rawCandles,
      priceToY,
      yToPrice,
      idxToX,
      ema9All,
      ema21All,
      ema50All,
      bbAll,
      vwapAll,
      avgBuyPx
    };

    ctx.strokeStyle = '#1e222d';
    ctx.fillStyle = '#787b86';
    ctx.font = '10.5px JetBrains Mono, monospace';
    ctx.lineWidth = 1;

    const hSteps = Math.max(4, Math.min(8, Math.floor(mainH / 48)));
    for (let i = 0; i <= hSteps; i++) {
      const y = Math.round(padTop + (mainH / hSteps) * i) + 0.5;
      const pVal = maxPrice - (priceRange / hSteps) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(formatRawPrice(pVal), w - padRight + 6, y + 3);
    }

    const vStepInterval = Math.max(5, Math.floor(candles.length / 6));
    for (let i = 0; i < candles.length; i += vStepInterval) {
      const x = Math.round(idxToX(i)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + totalPlotH);
      ctx.stroke();

      const tLabel = formatCandleTime(candles[i].time, chartState.bar);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillText(tLabel, x, h - 7);
      ctx.restore();
    }

    ctx.strokeStyle = '#2a2e39';
    ctx.beginPath();
    ctx.moveTo(w - padRight + 0.5, padTop);
    ctx.lineTo(w - padRight + 0.5, h - padBottom);
    ctx.moveTo(padLeft, h - padBottom + 0.5);
    ctx.lineTo(w - padRight, h - padBottom + 0.5);
    ctx.stroke();

    if (chartState.indicators.vol && maxVol > 0) {
      const volMaxH = mainH * 0.2;
      const bodyW = Math.max(2, Math.min(14, stepX * 0.72));
      candles.forEach((c, idx) => {
        const x = idxToX(idx);
        const isBull = c.close >= c.open;
        const vH = (c.volume / maxVol) * volMaxH;
        ctx.fillStyle = isBull ? 'rgba(8, 153, 129, 0.22)' : 'rgba(242, 54, 69, 0.22)';
        ctx.fillRect(x - bodyW / 2, padTop + mainH - vH, bodyW, vH);
      });
    }

    if (chartState.indicators.bb) {
      ctx.save();
      ctx.beginPath();
      let firstPt = null;
      const validIndices = [];
      for (let i = 0; i < candles.length; i++) {
        const gIdx = startIdx + i;
        if (bbAll.upper[gIdx] !== null) {
          validIndices.push(i);
          const x = idxToX(i);
          const y = priceToY(bbAll.upper[gIdx]);
          if (firstPt === null) {
            ctx.moveTo(x, y);
            firstPt = i;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let k = validIndices.length - 1; k >= 0; k--) {
        const i = validIndices[k];
        const gIdx = startIdx + i;
        ctx.lineTo(idxToX(i), priceToY(bbAll.lower[gIdx]));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 188, 212, 0.07)';
      ctx.fill();

      const drawBBLine = (arr, color, dashed = false) => {
        ctx.beginPath();
        if (dashed) ctx.setLineDash([3, 3]);
        else ctx.setLineDash([]);
        let st = false;
        for (let i = 0; i < candles.length; i++) {
          const val = arr[startIdx + i];
          if (val === null) continue;
          const x = idxToX(i);
          const y = priceToY(val);
          if (!st) {
            ctx.moveTo(x, y);
            st = true;
          } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };
      drawBBLine(bbAll.upper, 'rgba(0, 188, 212, 0.65)');
      drawBBLine(bbAll.mid, 'rgba(255, 152, 0, 0.65)', true);
      drawBBLine(bbAll.lower, 'rgba(0, 188, 212, 0.65)');
      ctx.restore();
    }

    const bodyWidth = Math.max(2.5, Math.min(16, stepX * 0.72));

    if (chartState.chartType === 'area' || chartState.chartType === 'line') {
      ctx.save();
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const x = idxToX(idx);
        const y = priceToY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (chartState.chartType === 'area') {
        ctx.lineTo(idxToX(candles.length - 1), padTop + mainH);
        ctx.lineTo(idxToX(0), padTop + mainH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + mainH);
        grad.addColorStop(0, 'rgba(41, 98, 255, 0.32)');
        grad.addColorStop(1, 'rgba(41, 98, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();
    } else if (chartState.chartType === 'bars') {
      candles.forEach((c, idx) => {
        const x = idxToX(idx);
        const isBull = c.close >= c.open;
        const color = isBull ? '#089981' : '#f23645';
        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);
        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.moveTo(x - bodyWidth / 2, openY);
        ctx.lineTo(x, openY);
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + bodyWidth / 2, closeY);
        ctx.stroke();
      });
    } else {
      candles.forEach((c, idx) => {
        const xCenter = idxToX(idx);
        const isBull = c.close >= c.open;
        const color = isBull ? '#089981' : '#f23645';

        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);
        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(1.5, Math.abs(closeY - openY));

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xCenter, highY);
        ctx.lineTo(xCenter, lowY);
        ctx.stroke();

        if (chartState.chartType === 'hollow' && isBull) {
          ctx.fillStyle = '#131722';
          ctx.fillRect(xCenter - bodyWidth / 2, topY, bodyWidth, bodyH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.3;
          ctx.strokeRect(xCenter - bodyWidth / 2, topY, bodyWidth, bodyH);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(xCenter - bodyWidth / 2, topY, bodyWidth, bodyH);
        }
      });
    }

    const drawOverlayLine = (fullArr, color, width = 1.5) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < candles.length; i++) {
        const val = fullArr[startIdx + i];
        if (val === null || val === undefined) continue;
        const x = idxToX(i);
        const y = priceToY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    if (chartState.indicators.ema) {
      drawOverlayLine(ema9All, '#2962ff', 1.5);
      drawOverlayLine(ema21All, '#ff9800', 1.5);
      drawOverlayLine(ema50All, '#e040fb', 1.5);
    }

    if (chartState.indicators.vwap) {
      drawOverlayLine(vwapAll, '#ffeb3b', 1.6);
    }

    if (chartState.indicators.sr) {
      let swingHigh = -Infinity;
      let swingLow = Infinity;
      rawCandles.forEach((c) => {
        if (c.high > swingHigh) swingHigh = c.high;
        if (c.low < swingLow) swingLow = c.low;
      });

      const drawHorizontalTagLine = (
        priceVal,
        label,
        lineColor,
        bgTagColor,
        textColor = '#fff'
      ) => {
        if (priceVal < minPrice || priceVal > maxPrice) return;
        const y = Math.round(priceToY(priceVal)) + 0.5;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.font = 'bold 9.5px JetBrains Mono, monospace';
        const tagText = `${label}: ${formatRawPrice(priceVal)}`;
        const tw = ctx.measureText(tagText).width + 10;
        ctx.fillStyle = bgTagColor;
        ctx.fillRect(padLeft + 6, y - 9, tw, 16);
        ctx.fillStyle = textColor;
        ctx.fillText(tagText, padLeft + 11, y + 2.5);
        ctx.restore();
      };

      drawHorizontalTagLine(
        swingHigh,
        'OPÓR (MAX)',
        'rgba(242, 54, 69, 0.55)',
        'rgba(242, 54, 69, 0.85)'
      );
      drawHorizontalTagLine(
        swingLow,
        'WSPARCIE (MIN)',
        'rgba(8, 153, 129, 0.55)',
        'rgba(8, 153, 129, 0.85)'
      );

      if (avgBuyPx > 0) {
        drawHorizontalTagLine(
          avgBuyPx,
          'ŚR. CENA ZAKUPU',
          '#bcff2f',
          'rgba(188, 255, 47, 0.92)',
          '#090b10'
        );
      }
    }

    const livePrice =
      chartState.data.currentPrice || candles[candles.length - 1].close;
    const latestCandle = candles[candles.length - 1];
    const isLatestBull = latestCandle.close >= latestCandle.open;
    const liveColor = isLatestBull ? '#089981' : '#f23645';

    if (livePrice >= minPrice && livePrice <= maxPrice) {
      const liveY = Math.round(priceToY(livePrice)) + 0.5;
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = liveColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padLeft, liveY);
      ctx.lineTo(w - padRight, liveY);
      ctx.stroke();

      ctx.fillStyle = liveColor;
      ctx.fillRect(w - padRight + 1, liveY - 14, padRight - 2, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10.5px JetBrains Mono, monospace';
      ctx.fillText(formatRawPrice(livePrice), w - padRight + 5, liveY - 1);
      ctx.font = '9.5px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillText(getCandleCountdown(chartState.bar), w - padRight + 5, liveY + 10);
      ctx.restore();
    }

    const pairDrawings = (chartState.drawingsByPair[chartState.instId] || []).slice();
    if (chartState.pendingDrawing) {
      pairDrawings.push(chartState.pendingDrawing);
    }

    pairDrawings.forEach((d) => {
      ctx.save();
      if (d.type === 'hline') {
        const y = priceToY(d.price1);
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`Poziom: ${formatRawPrice(d.price1)}`, w - padRight - 105, y - 4);
      } else if (d.type === 'trendline' && d.price2 !== undefined) {
        const x1 = idxToX(d.idx1 - startIdx);
        const y1 = priceToY(d.price1);
        const x2 = idxToX(d.idx2 - startIdx);
        const y2 = priceToY(d.price2);
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
        ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'fib' && d.price2 !== undefined) {
        const x1 = Math.min(idxToX(d.idx1 - startIdx), idxToX(d.idx2 - startIdx));
        const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const fibColors = [
          '#787b86',
          '#f23645',
          '#ff9800',
          '#089981',
          '#00bcd4',
          '#2962ff',
          '#787b86'
        ];
        const diff = d.price2 - d.price1;
        fibLevels.forEach((lvl, idx) => {
          const p = d.price2 - diff * lvl;
          const y = priceToY(p);
          ctx.strokeStyle = fibColors[idx];
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(w - padRight, y);
          ctx.stroke();
          ctx.fillStyle = fibColors[idx];
          ctx.font = '9.5px JetBrains Mono, monospace';
          ctx.fillText(
            `Fib ${(lvl * 100).toFixed(1)}% (${formatRawPrice(p)})`,
            x1 + 4,
            y - 3
          );
        });
      } else if (d.type === 'measure' && d.price2 !== undefined) {
        const x1 = idxToX(d.idx1 - startIdx);
        const y1 = priceToY(d.price1);
        const x2 = idxToX(d.idx2 - startIdx);
        const y2 = priceToY(d.price2);
        const delta = d.price2 - d.price1;
        const pct = d.price1 > 0 ? ((delta / d.price1) * 100).toFixed(2) : '0.00';
        const barsCount = Math.abs(d.idx2 - d.idx1);
        const isUp = delta >= 0;

        ctx.fillStyle = isUp ? 'rgba(8, 153, 129, 0.2)' : 'rgba(242, 54, 69, 0.2)';
        ctx.strokeStyle = isUp ? '#089981' : '#f23645';
        ctx.lineWidth = 1.3;
        ctx.fillRect(
          Math.min(x1, x2),
          Math.min(y1, y2),
          Math.abs(x2 - x1),
          Math.abs(y2 - y1)
        );
        ctx.strokeRect(
          Math.min(x1, x2),
          Math.min(y1, y2),
          Math.abs(x2 - x1),
          Math.abs(y2 - y1)
        );

        const badgeText = `${isUp ? '+' : ''}${formatRawPrice(delta)} (${
          isUp ? '+' : ''
        }${pct}%) • ${barsCount} świec`;
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        const bw = ctx.measureText(badgeText).width + 12;
        const bx = (x1 + x2) / 2 - bw / 2;
        const by = Math.min(y1, y2) - 22;
        ctx.fillStyle = isUp ? '#089981' : '#f23645';
        ctx.fillRect(bx, Math.max(padTop + 2, by), bw, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, bx + 6, Math.max(padTop + 2, by) + 12);
      }
      ctx.restore();
    });

    if (hasSubPane) {
      ctx.save();
      ctx.strokeStyle = '#2a2e39';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, subTop - 4);
      ctx.lineTo(w, subTop - 4);
      ctx.stroke();

      if (chartState.indicators.rsi) {
        const rsiToY = (v) => subTop + ((100 - v) / 100) * subH;
        const y70 = rsiToY(70);
        const y30 = rsiToY(30);
        ctx.fillStyle = 'rgba(179, 136, 255, 0.06)';
        ctx.fillRect(padLeft, y70, chartW, y30 - y70);

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(179, 136, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y70);
        ctx.lineTo(w - padRight, y70);
        ctx.moveTo(padLeft, y30);
        ctx.lineTo(w - padRight, y30);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#787b86';
        ctx.font = '9.5px JetBrains Mono, monospace';
        ctx.fillText('70', w - padRight + 6, y70 + 3);
        ctx.fillText('30', w - padRight + 6, y30 + 3);

        ctx.beginPath();
        let st = false;
        for (let i = 0; i < candles.length; i++) {
          const val = rsiAll[startIdx + i];
          if (val === null) continue;
          const x = idxToX(i);
          const y = rsiToY(val);
          if (!st) {
            ctx.moveTo(x, y);
            st = true;
          } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        const lastRsi = rsiAll[endIdx - 1];
        ctx.fillStyle = '#b388ff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(
          `RSI(14): ${lastRsi ? lastRsi.toFixed(1) : '—'}`,
          padLeft + 6,
          subTop + 11
        );
      } else if (chartState.indicators.macd) {
        let maxAbs = 0.0001;
        for (let i = 0; i < candles.length; i++) {
          const g = startIdx + i;
          maxAbs = Math.max(
            maxAbs,
            Math.abs(macdAll.macdLine[g] || 0),
            Math.abs(macdAll.signalLine[g] || 0),
            Math.abs(macdAll.hist[g] || 0)
          );
        }
        const zeroY = subTop + subH / 2;
        const mToY = (v) => zeroY - (v / maxAbs) * (subH * 0.44);

        ctx.strokeStyle = '#1e222d';
        ctx.beginPath();
        ctx.moveTo(padLeft, zeroY);
        ctx.lineTo(w - padRight, zeroY);
        ctx.stroke();

        const barW = Math.max(2, Math.min(10, stepX * 0.6));
        for (let i = 0; i < candles.length; i++) {
          const hVal = macdAll.hist[startIdx + i] || 0;
          const x = idxToX(i);
          const y = mToY(hVal);
          ctx.fillStyle =
            hVal >= 0 ? 'rgba(8, 153, 129, 0.65)' : 'rgba(242, 54, 69, 0.65)';
          ctx.fillRect(
            x - barW / 2,
            Math.min(zeroY, y),
            barW,
            Math.max(1, Math.abs(y - zeroY))
          );
        }

        const drawSubLine = (arr, col) => {
          ctx.beginPath();
          for (let i = 0; i < candles.length; i++) {
            const x = idxToX(i);
            const y = mToY(arr[startIdx + i] || 0);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        };
        drawSubLine(macdAll.macdLine, '#2962ff');
        drawSubLine(macdAll.signalLine, '#ff9800');

        ctx.fillStyle = '#2962ff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(
          `MACD(12,26,9): ${formatRawPrice(macdAll.macdLine[endIdx - 1] || 0)}`,
          padLeft + 6,
          subTop + 11
        );
      }
      ctx.restore();
    }

    if (
      chartState.hoverX !== null &&
      chartState.hoverY !== null &&
      chartState.hoverX >= padLeft &&
      chartState.hoverX <= w - padRight &&
      chartState.hoverY >= padTop &&
      chartState.hoverY <= h - padBottom
    ) {
      const hoveredIdx = Math.min(
        candles.length - 1,
        Math.max(0, Math.floor((chartState.hoverX - padLeft) / stepX))
      );
      const snapX = Math.round(idxToX(hoveredIdx)) + 0.5;
      const snapY = Math.round(chartState.hoverY) + 0.5;

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#9598a1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(snapX, padTop);
      ctx.lineTo(snapX, h - padBottom);
      ctx.moveTo(padLeft, snapY);
      ctx.lineTo(w - padRight, snapY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (snapY <= padTop + mainH) {
        const hoveredPrice = yToPrice(snapY);
        ctx.fillStyle = '#2a2e39';
        ctx.fillRect(w - padRight + 1, snapY - 10, padRight - 2, 20);
        ctx.strokeStyle = '#5b8def';
        ctx.strokeRect(w - padRight + 1, snapY - 10, padRight - 2, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10.5px JetBrains Mono, monospace';
        ctx.fillText(formatRawPrice(hoveredPrice), w - padRight + 5, snapY + 3.5);
      }

      const hoveredTimeStr = formatCandleTime(candles[hoveredIdx].time, chartState.bar);
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      const tw = ctx.measureText(hoveredTimeStr).width + 14;
      const tx = Math.min(Math.max(padLeft, snapX - tw / 2), w - padRight - tw);
      ctx.fillStyle = '#2962ff';
      ctx.fillRect(tx, h - padBottom + 2, tw, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hoveredTimeStr, tx + 7, h - padBottom + 14);
      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
    setLegendTick((t) => t + 1);
  }, [chartState]);

  useEffect(() => {
    const handleResize = () => {
      if (chartState.isOpen && !chartState.isMinimized) {
        drawCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chartState]);

  // Legend computation
  const geom = lastGeomRef.current;
  let cInfo = null;
  let gInfoIdx = 0;
  if (geom && geom.candles && geom.candles.length > 0) {
    let activeLocalIdx = geom.candles.length - 1;
    if (
      chartState.hoverX !== null &&
      chartState.hoverY !== null &&
      chartState.hoverX >= geom.padLeft &&
      chartState.hoverX <= geom.w - geom.padRight
    ) {
      activeLocalIdx = Math.min(
        geom.candles.length - 1,
        Math.max(0, Math.floor((chartState.hoverX - geom.padLeft) / geom.stepX))
      );
    }
    cInfo = geom.candles[activeLocalIdx] || geom.candles[geom.candles.length - 1];
    gInfoIdx = geom.startIdx + activeLocalIdx;
  }

  const cChange = cInfo ? cInfo.close - cInfo.open : 0;
  const cChangePct =
    cInfo && cInfo.open > 0 ? ((cChange / cInfo.open) * 100).toFixed(2) : '0.00';
  const cCol = cChange >= 0 ? '#089981' : '#f23645';

  // Official TradingView iframe URL
  const [baseSym] = (chartState.instId || 'BTC-USDC').split('-');
  const tvSymbol = `OKX:${baseSym}USDC`;
  const tvIntervalMap = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1H': '60',
    '4H': '240',
    '1D': 'D',
    '1W': 'W'
  };
  const tvInt = tvIntervalMap[chartState.bar] || '15';
  const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tv_embed_okx&symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${tvInt}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=131722&studies=MASimple%40tv-basicstudies%1FRSI%40tv-basicstudies&theme=dark&style=1&timezone=Europe%2FWarsaw&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=pl`;

  const winStyle = {
    left: `${Math.round(chartState.posX || 90)}px`,
    top: `${Math.round(chartState.posY || 85)}px`
  };
  if (chartState.zIndex) {
    winStyle.zIndex = String(chartState.zIndex);
  }

  return (
    <>
      <div
        id="floatingChartWindow"
        className={`chart-window size-${chartState.size || 'medium'} tv-superchart-window`}
        data-window-id="win-chart"
        data-window-title="🕯️ Wykres TradingView"
        data-window-icon="🕯️"
        style={winStyle}
        hidden={!chartState.isOpen || chartState.isMinimized}
      >
        <div
          id="chartWindowHeader"
          className="chart-window-header"
          title="Przeciągnij myszką lub palcem, aby przesunąć okno wykresu"
        >
          <div className="chart-title-group">
            <span className="drag-grip">⠿</span>
            <span className="tv-brand-pill">TradingView PRO</span>
            <strong id="chartPairTitle">{data?.instId || chartState.instId}</strong>
            <span id="chartLivePriceBadge" className="chart-price-badge">
              {data ? formatUnitPrice(data.currentPrice) : '— USDC'}
            </span>
            <span
              id="chartChangeBadge"
              className={`chart-change-badge ${isPos ? 'pos' : 'neg'}`}
            >
              {data ? `${isPos ? '+' : ''}${data.change24hPct}%` : '0.00%'}
            </span>
            <span className="tv-live-dot-badge" title="Notowania na żywo z giełdy OKX">
              ● OKX LIVE
            </span>
          </div>

          <div className="chart-window-controls">
            <div
              className="chart-size-group tv-engine-switch"
              role="group"
              aria-label="Silnik wykresu"
            >
              <button
                type="button"
                className={`tv-engine-btn ${chartState.engine === 'pro' ? 'active' : ''}`}
                data-engine="pro"
                title="Interaktywny wykres TradingView Pro z Twoimi zleceniami, średnią ceną zakupu i narzędziami rysowania"
                onClick={() => onUpdateChartState({ engine: 'pro' })}
              >
                ⚡ TV Pro
              </button>
              <button
                type="button"
                className={`tv-engine-btn ${chartState.engine === 'widget' ? 'active' : ''}`}
                data-engine="widget"
                title="Oficjalny wbudowany widget TradingView.com (OKX)"
                onClick={() => onUpdateChartState({ engine: 'widget' })}
              >
                🌐 TV Widget
              </button>
            </div>

            <div className="chart-size-group" role="group" aria-label="Rozmiar wykresu">
              {['small', 'medium', 'full'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={`chart-size-btn ${chartState.size === sz ? 'active' : ''}`}
                  data-size={sz}
                  onClick={() => onApplyChartSize(sz)}
                >
                  {sz === 'small' ? 'Mały' : sz === 'medium' ? 'Średni' : 'Full'}
                </button>
              ))}
            </div>

            <button
              type="button"
              id="dockChartTopBtn"
              className="win-ctrl-btn dock-btn"
              title="Zwróć wykres do menu na górze"
              onClick={onDockChartTop}
            >
              🔼 Menu
            </button>
            <button
              type="button"
              id="dockChartSidebarBtn"
              className="win-ctrl-btn dock-btn"
              title="Zwróć wykres do sidebaru z lewej"
              onClick={onDockChartSidebar}
            >
              ◀ Sidebar
            </button>
            <button
              type="button"
              id="minimizeChartBtn"
              className="chart-ctrl-btn"
              title="Minimalizuj wykres"
              onClick={onMinimizeChart}
            >
              —
            </button>
            <button
              type="button"
              id="closeChartBtn"
              className="chart-ctrl-btn close"
              title="Zamknij wykres"
              onClick={onCloseChart}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="chart-toolbar tv-top-toolbar" id="tvTopToolbar">
          <div className="tv-toolbar-group">
            <select
              id="chartAssetSelect"
              aria-label="Wybierz parę walutową"
              value={chartState.instId}
              onChange={(e) =>
                onUpdateChartState({ instId: e.target.value, panOffset: 0 }, true)
              }
            >
              {mList.map((m) => (
                <option key={m.instId} value={m.instId}>
                  {m.instId}
                </option>
              ))}
            </select>

            <div className="chart-intervals" role="group" aria-label="Interwał świec">
              {INTERVALS.map((bar) => (
                <button
                  key={bar}
                  type="button"
                  className={`interval-btn ${chartState.bar === bar ? 'active' : ''}`}
                  data-bar={bar}
                  onClick={() => onUpdateChartState({ bar, panOffset: 0 }, true)}
                >
                  {bar}
                </button>
              ))}
            </div>

            <select
              id="tvChartTypeSelect"
              className="tv-select-compact"
              title="Typ wykresu TradingView"
              value={chartState.chartType}
              onChange={(e) => onUpdateChartState({ chartType: e.target.value })}
            >
              <option value="candles">🕯️ Świece</option>
              <option value="hollow">🮙 Puste świece</option>
              <option value="heikin">📈 Heikin Ashi</option>
              <option value="area">🌊 Obszar (Area)</option>
              <option value="line">📉 Linia (Line)</option>
              <option value="bars">📊 Słupki (OHLC)</option>
            </select>
          </div>

          <div
            className="tv-indicators-bar"
            role="group"
            aria-label="Wskaźniki techniczne"
          >
            {[
              { key: 'ema', label: 'EMA 9/21/50' },
              { key: 'bb', label: 'BB (20,2)' },
              { key: 'vwap', label: 'VWAP' },
              { key: 'sr', label: 'Poziomy S/R' },
              { key: 'vol', label: 'Wolumen' },
              { key: 'rsi', label: 'RSI (14)' },
              { key: 'macd', label: 'MACD' }
            ].map((ind) => (
              <button
                key={ind.key}
                type="button"
                className={`tv-ind-btn ${chartState.indicators[ind.key] ? 'active' : ''}`}
                data-ind={ind.key}
                onClick={() => {
                  const nextInds = { ...chartState.indicators };
                  if (ind.key === 'rsi' && !nextInds.rsi) nextInds.macd = false;
                  else if (ind.key === 'macd' && !nextInds.macd) nextInds.rsi = false;
                  nextInds[ind.key] = !nextInds[ind.key];
                  onUpdateChartState({ indicators: nextInds });
                }}
              >
                {ind.label}
              </button>
            ))}
          </div>

          <div className="tv-zoom-and-stats">
            <div className="tv-zoom-btns">
              <button
                type="button"
                id="tvZoomInBtn"
                className="tv-mini-icon-btn"
                title="Przybliż wykres (lub użyj rolki myszy)"
                onClick={() =>
                  onUpdateChartState({
                    visibleCount: Math.max(18, Math.round(chartState.visibleCount * 0.8))
                  })
                }
              >
                🔍+
              </button>
              <button
                type="button"
                id="tvZoomOutBtn"
                className="tv-mini-icon-btn"
                title="Oddal wykres (lub użyj rolki myszy)"
                onClick={() =>
                  onUpdateChartState({
                    visibleCount: Math.min(180, Math.round(chartState.visibleCount * 1.25))
                  })
                }
              >
                🔍−
              </button>
              <button
                type="button"
                id="tvResetViewBtn"
                className="tv-mini-icon-btn"
                title="Resetuj widok i dopasuj do najnowszych świec"
                onClick={() => onUpdateChartState({ visibleCount: 68, panOffset: 0 })}
              >
                ⟲ Auto
              </button>
            </div>
            <div className="chart-stats-mini">
              <span>
                24h Max:{' '}
                <strong id="chartHigh24h">
                  {data ? formatUnitPrice(data.high24h) : '—'}
                </strong>
              </span>
              <span>
                24h Min:{' '}
                <strong id="chartLow24h">
                  {data ? formatUnitPrice(data.low24h) : '—'}
                </strong>
              </span>
              <span>
                Wol 24h:{' '}
                <strong id="chartVol24h">
                  {data
                    ? `${Number(data.vol24h || 0).toLocaleString('pl-PL', {
                        maximumFractionDigits: 1
                      })} ${data.base}`
                    : '—'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="tv-workspace">
          <aside
            className="tv-drawing-toolbar"
            id="tvDrawingToolbar"
            aria-label="Narzędzia rysowania TradingView"
            style={{ display: isWidget ? 'none' : '' }}
          >
            {[
              { tool: 'crosshair', icon: '✥', title: 'Celownik (Crosshair) + Przesuwanie wykresu myszką' },
              { tool: 'trendline', icon: '╱', title: 'Linia trendu' },
              { tool: 'hline', icon: '━', title: 'Poziom wsparcia / oporu' },
              { tool: 'fib', icon: '📐', title: 'Zniesienia Fibonacciego' },
              { tool: 'measure', icon: '📏', title: 'Linijka / Pomiar zmiany ceny %' }
            ].map((t) => (
              <button
                key={t.tool}
                type="button"
                className={`tv-tool-btn ${chartState.activeTool === t.tool ? 'active' : ''}`}
                data-tool={t.tool}
                title={t.title}
                onClick={() =>
                  onUpdateChartState({ activeTool: t.tool, pendingDrawing: null })
                }
              >
                {t.icon}
              </button>
            ))}
            <button
              type="button"
              className="tv-tool-btn danger"
              id="tvClearDrawingsBtn"
              title="Wyczyść wszystkie rysunki z wykresu"
              onClick={() => {
                const nextDrawings = { ...chartState.drawingsByPair };
                nextDrawings[chartState.instId] = [];
                onUpdateChartState({
                  drawingsByPair: nextDrawings,
                  pendingDrawing: null
                });
                if (onClearDrawingsToast) onClearDrawingsToast(chartState.instId);
              }}
            >
              🗑️
            </button>
          </aside>

          <div className="chart-canvas-wrapper tv-chart-stage" id="tvChartStage">
            <div
              className="tv-ohlc-legend"
              id="tvOhlcLegend"
              style={{ display: isWidget ? 'none' : 'flex' }}
            >
              <div className="tv-legend-row-main" id="tvLegendMainRow">
                <strong className="tv-leg-sym">
                  {data?.instId || chartState.instId}
                </strong>
                <span className="tv-leg-sep">•</span>
                <span className="tv-leg-tf">{chartState.bar}</span>
                <span className="tv-leg-sep">•</span>
                <span className="tv-leg-exch">OKX Spot</span>
                {cInfo ? (
                  <span className="tv-leg-ohlc" id="tvLegendOhlcValues">
                    O<span style={{ color: cCol }}>{formatRawPrice(cInfo.open)}</span> H
                    <span style={{ color: cCol }}>{formatRawPrice(cInfo.high)}</span> L
                    <span style={{ color: cCol }}>{formatRawPrice(cInfo.low)}</span> C
                    <span style={{ color: cCol }}>{formatRawPrice(cInfo.close)}</span>{' '}
                    <span style={{ color: cCol }}>
                      ({cChange >= 0 ? '+' : ''}
                      {cChangePct}%)
                    </span>{' '}
                    Wol:{' '}
                    <strong style={{ color: '#d1d4dc' }}>
                      {Number(cInfo.volume || 0).toFixed(2)}
                    </strong>
                  </span>
                ) : (
                  <span className="tv-leg-ohlc" id="tvLegendOhlcValues">
                    O: — H: — L: — C: —
                  </span>
                )}
              </div>
              <div className="tv-legend-row-inds" id="tvLegendIndicatorsRow">
                {geom && (
                  <>
                    {chartState.indicators.ema && geom.ema9All[gInfoIdx] && (
                      <span style={{ color: '#2962ff', marginRight: 8 }}>
                        EMA9: {formatRawPrice(geom.ema9All[gInfoIdx])}
                      </span>
                    )}
                    {chartState.indicators.ema && geom.ema21All[gInfoIdx] && (
                      <span style={{ color: '#ff9800', marginRight: 8 }}>
                        EMA21: {formatRawPrice(geom.ema21All[gInfoIdx])}
                      </span>
                    )}
                    {chartState.indicators.ema && geom.ema50All[gInfoIdx] && (
                      <span style={{ color: '#e040fb', marginRight: 8 }}>
                        EMA50: {formatRawPrice(geom.ema50All[gInfoIdx])}
                      </span>
                    )}
                    {chartState.indicators.bb && geom.bbAll.mid[gInfoIdx] && (
                      <span style={{ color: '#00bcd4', marginRight: 8 }}>
                        BB(20,2): {formatRawPrice(geom.bbAll.lower[gInfoIdx])}–
                        {formatRawPrice(geom.bbAll.upper[gInfoIdx])}
                      </span>
                    )}
                    {chartState.indicators.vwap && geom.vwapAll[gInfoIdx] && (
                      <span style={{ color: '#ffeb3b', marginRight: 8 }}>
                        VWAP: {formatRawPrice(geom.vwapAll[gInfoIdx])}
                      </span>
                    )}
                    {geom.avgBuyPx > 0 && (
                      <span style={{ color: '#bcff2f' }}>
                        Śr. zakup: {formatRawPrice(geom.avgBuyPx)} USDC
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <canvas
              id="assetChartCanvas"
              ref={canvasRef}
              onMouseDown={(e) => {
                if (chartState.engine !== 'pro' || !lastGeomRef.current) return;
                const g = lastGeomRef.current;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // 1. Sprawdzamy czy kliknięto na skali ceny z prawej strony (oś Y)
                if (x >= g.w - g.padRight) {
                  yScaleRef.current = {
                    isScaling: true,
                    startY: e.clientY,
                    startScale: chartState.priceScaleY || 1.0
                  };
                  return;
                }

                const localIdx = Math.min(
                  g.candles.length - 1,
                  Math.max(0, Math.floor((x - g.padLeft) / g.stepX))
                );
                const globalIdx = g.startIdx + localIdx;
                const clickedPrice = g.yToPrice(y);

                if (chartState.activeTool === 'hline') {
                  const nextDrawings = { ...chartState.drawingsByPair };
                  nextDrawings[chartState.instId] = [
                    ...(nextDrawings[chartState.instId] || []),
                    { type: 'hline', price1: clickedPrice }
                  ];
                  onUpdateChartState({ drawingsByPair: nextDrawings });
                  return;
                }

                if (
                  chartState.activeTool === 'trendline' ||
                  chartState.activeTool === 'fib' ||
                  chartState.activeTool === 'measure'
                ) {
                  if (!chartState.pendingDrawing) {
                    onUpdateChartState({
                      pendingDrawing: {
                        type: chartState.activeTool,
                        idx1: globalIdx,
                        price1: clickedPrice,
                        idx2: globalIdx,
                        price2: clickedPrice
                      }
                    });
                  } else {
                    const completed = {
                      ...chartState.pendingDrawing,
                      idx2: globalIdx,
                      price2: clickedPrice
                    };
                    const nextDrawings = { ...chartState.drawingsByPair };
                    nextDrawings[chartState.instId] = [
                      ...(nextDrawings[chartState.instId] || []),
                      completed
                    ];
                    onUpdateChartState({
                      drawingsByPair: nextDrawings,
                      pendingDrawing: null
                    });
                  }
                  return;
                }

                panRef.current = {
                  isPanning: true,
                  startX: e.clientX,
                  startOffset: chartState.panOffset
                };
              }}
              onMouseMove={(e) => {
                if (chartState.engine !== 'pro' || !lastGeomRef.current) return;
                const g = lastGeomRef.current;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // A) Skalowanie zakresu osi Y ceny myszką
                if (yScaleRef.current.isScaling) {
                  const dy = e.clientY - yScaleRef.current.startY;
                  // Ruch w dół (dy > 0): powiększa zakres ceny (świeczki mniejsze w pionie)
                  // Ruch w górę (dy < 0): zawęża zakres ceny (świeczki wyższe w pionie)
                  const factor = Math.exp(dy * 0.008);
                  const newScale = Math.min(15.0, Math.max(0.06, yScaleRef.current.startScale * factor));
                  onUpdateChartState({ priceScaleY: newScale });
                  return;
                }

                // B) Styl kursora: na osi Y strzałka góra/dół (ns-resize)
                if (x >= g.w - g.padRight) {
                  e.currentTarget.style.cursor = 'ns-resize';
                } else if (panRef.current.isPanning) {
                  e.currentTarget.style.cursor = 'grabbing';
                } else {
                  e.currentTarget.style.cursor =
                    chartState.activeTool === 'crosshair' ? 'crosshair' : 'default';
                }

                if (panRef.current.isPanning) {
                  const dx = e.clientX - panRef.current.startX;
                  const candlesDelta = Math.round(dx / Math.max(3, g.stepX));
                  const total = (chartState.data?.candles || []).length;
                  const maxPan = Math.max(0, total - chartState.visibleCount);
                  onUpdateChartState({
                    panOffset: Math.min(
                      Math.max(0, panRef.current.startOffset + candlesDelta),
                      maxPan
                    )
                  });
                  return;
                }

                const updates = { hoverX: x, hoverY: y };
                if (chartState.pendingDrawing) {
                  const localIdx = Math.min(
                    g.candles.length - 1,
                    Math.max(0, Math.floor((x - g.padLeft) / g.stepX))
                  );
                  updates.pendingDrawing = {
                    ...chartState.pendingDrawing,
                    idx2: g.startIdx + localIdx,
                    price2: g.yToPrice(y)
                  };
                }
                onUpdateChartState(updates);
              }}
              onMouseUp={() => {
                panRef.current.isPanning = false;
                yScaleRef.current.isScaling = false;
              }}
              onMouseLeave={() => {
                panRef.current.isPanning = false;
                yScaleRef.current.isScaling = false;
                onUpdateChartState({ hoverX: null, hoverY: null });
              }}
              onDoubleClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (lastGeomRef.current && x >= lastGeomRef.current.w - lastGeomRef.current.padRight) {
                  // Podwójne kliknięcie na osi Y przywraca automatyczną skalę ceny
                  onUpdateChartState({ priceScaleY: 1.0 });
                } else {
                  // Podwójne kliknięcie na wykresie przywraca domyślny widok osi czasu
                  onUpdateChartState({ panOffset: 0, visibleCount: 68 });
                }
              }}
            />

            <div
              id="tvOfficialWidgetContainer"
              className="tv-official-widget-box"
              hidden={!isWidget}
            >
              {isWidget && chartState.isOpen && !chartState.isMinimized && (
                <iframe
                  src={iframeUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowTransparency="true"
                  allowFullScreen
                  title={`TradingView Official Chart ${tvSymbol}`}
                />
              )}
            </div>
          </div>
        </div>

        <div className="chart-window-footer">
          <span>
            💡 <strong>TradingView Pro:</strong> Rolka myszy = Zagęszczanie / Rozszerzanie osi czasu (Zoom) • Oś Y z prawej = Przeciągnij myszką, aby skalować wysokość ceny (2x klik = Auto-fit) • Przeciągnij wykres = Historia
          </span>
          <button
            type="button"
            id="quickTradeFromChartBtn"
            className="btn btn-primary-sm"
            onClick={onQuickTradeFromChart}
          >
            ⚡ Handluj tym aktywem
          </button>
        </div>
      </div>

      <div
        id="minimizedChartBar"
        className="minimized-chart-bar"
        hidden={!chartState.isMinimized}
      >
        <div className="min-bar-info">
          <span>📈 Wykres zminimalizowany:</span>
          <strong id="minBarPair">{chartState.instId}</strong>
          <span id="minBarPrice" className="chart-price-badge">
            {data ? formatUnitPrice(data.currentPrice) : '— USDC'}
          </span>
        </div>
        <div className="min-bar-actions">
          {['small', 'medium', 'full'].map((sz) => (
            <button
              key={sz}
              type="button"
              className="btn btn-outline-sm restore-chart-btn"
              data-size={sz}
              onClick={() => onRestoreChart(sz)}
            >
              {sz === 'small' ? 'Mały' : sz === 'medium' ? 'Średni' : 'Full'}
            </button>
          ))}
          <button
            type="button"
            id="closeMinimizedChartBtn"
            className="chart-ctrl-btn close"
            title="Zamknij"
            onClick={onCloseChart}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
