import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useChart from '../hooks/useChart';
import useQuote from '../hooks/useQuote';
import { Spinner } from '../components/Loading';
import SymbolSearch from '../components/SymbolSearch';
import PriceChange from '../components/PriceChange';

const CHART_MARKETS = [
  { key: 'tse_prime', label: '東証プライム', stocks: [
    { symbol: '7203.T', name: 'トヨタ自動車' }, { symbol: '6758.T', name: 'ソニーグループ' },
    { symbol: '9984.T', name: 'ソフトバンクG' }, { symbol: '4063.T', name: '信越化学' },
    { symbol: '8306.T', name: '三菱UFJ' }, { symbol: '6861.T', name: 'キーエンス' },
    { symbol: '9432.T', name: 'NTT' }, { symbol: '6367.T', name: 'ダイキン工業' },
    { symbol: '4519.T', name: '中外製薬' }, { symbol: '8035.T', name: '東京エレクトロン' },
    { symbol: '6954.T', name: 'ファナック' }, { symbol: '7974.T', name: '任天堂' },
    { symbol: '9433.T', name: 'KDDI' }, { symbol: '8316.T', name: '三井住友FG' },
    { symbol: '6501.T', name: '日立製作所' }, { symbol: '4568.T', name: '第一三共' },
    { symbol: '7751.T', name: 'キヤノン' }, { symbol: '6098.T', name: 'リクルートHD' },
    { symbol: '4543.T', name: 'テルモ' }, { symbol: '6594.T', name: 'ニデック' },
    { symbol: '8031.T', name: '三井物産' }, { symbol: '9020.T', name: 'JR東日本' },
    { symbol: '8058.T', name: '三菱商事' }, { symbol: '6902.T', name: 'デンソー' },
    { symbol: '4661.T', name: 'オリエンタルランド' },
  ]},
  { key: 'us', label: 'NYSE/NASDAQ', stocks: [
    { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'NVDA', name: 'NVIDIA' }, { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'AMZN', name: 'Amazon' }, { symbol: 'META', name: 'Meta' },
    { symbol: 'TSLA', name: 'Tesla' }, { symbol: 'BRK-B', name: 'Berkshire' },
    { symbol: 'LLY', name: 'Eli Lilly' }, { symbol: 'JPM', name: 'JPMorgan' },
    { symbol: 'V', name: 'Visa' }, { symbol: 'UNH', name: 'UnitedHealth' },
    { symbol: 'XOM', name: 'ExxonMobil' }, { symbol: 'AVGO', name: 'Broadcom' },
    { symbol: 'MA', name: 'Mastercard' }, { symbol: 'PG', name: 'P&G' },
    { symbol: 'JNJ', name: 'J&J' }, { symbol: 'HD', name: 'Home Depot' },
    { symbol: 'COST', name: 'Costco' }, { symbol: 'ABBV', name: 'AbbVie' },
    { symbol: 'MRK', name: 'Merck' }, { symbol: 'CVX', name: 'Chevron' },
    { symbol: 'BAC', name: 'Bank of America' }, { symbol: 'KO', name: 'Coca-Cola' },
    { symbol: 'PEP', name: 'PepsiCo' },
  ]},
  { key: 'global', label: 'グローバル', stocks: [
    { symbol: '7203.T', name: 'トヨタ自動車' }, { symbol: '6758.T', name: 'ソニーグループ' },
    { symbol: '9984.T', name: 'ソフトバンクG' }, { symbol: '8306.T', name: '三菱UFJ' },
    { symbol: '6861.T', name: 'キーエンス' }, { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft' }, { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'GOOGL', name: 'Alphabet' }, { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'META', name: 'Meta' }, { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'TSM', name: 'TSMC' }, { symbol: 'ASML', name: 'ASML' },
    { symbol: 'SAP', name: 'SAP' },
  ]},
];

const PERIODS = [
  { label: '日足', interval: '1d', range: '6mo' },
  { label: '週足', interval: '1wk', range: '2y' },
  { label: '月足', interval: '1mo', range: '5y' },
];

const MA_OPTS = [
  { key: 'ma5',   label: 'MA5',   period: 5,   color: '#f59e0b' },
  { key: 'ma25',  label: 'MA25',  period: 25,  color: '#3b82f6' },
  { key: 'ma75',  label: 'MA75',  period: 75,  color: '#8b5cf6' },
  { key: 'ma200', label: 'MA200', period: 200, color: '#ec4899' },
];

// ── Indicator calculations ──────────────────────────────────────────────────
function calcMA(data, period) {
  return data.map((_, i) =>
    i < period - 1 ? null : data.slice(i - period + 1, i + 1).reduce((s, d) => s + d.close, 0) / period
  );
}

function calcBB(data, period = 20) {
  return data.map((_, i) => {
    if (i < period - 1) return { mid: null, upper: null, lower: null };
    const sl = data.slice(i - period + 1, i + 1);
    const mean = sl.reduce((s, d) => s + d.close, 0) / period;
    const std = Math.sqrt(sl.reduce((s, d) => s + (d.close - mean) ** 2, 0) / period);
    return { mid: mean, upper: mean + 2 * std, lower: mean - 2 * std };
  });
}

function calcRSI(data, period = 14) {
  const out = new Array(data.length).fill(null);
  if (data.length < period + 1) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d > 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  out[period] = 100 - 100 / (1 + ag / Math.max(al, 1e-10));
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i].close - data[i - 1].close;
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = 100 - 100 / (1 + ag / Math.max(al, 1e-10));
  }
  return out;
}

function calcEMA(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period) return out;
  const k = 2 / (period + 1);
  out[period - 1] = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) out[i] = closes[i] * k + out[i - 1] * (1 - k);
  return out;
}

function calcMACD(data) {
  const cl = data.map(d => d.close);
  const e12 = calcEMA(cl, 12), e26 = calcEMA(cl, 26);
  const macd = e12.map((v, i) => v != null && e26[i] != null ? v - e26[i] : null);
  const signal = new Array(data.length).fill(null);
  const start = macd.findIndex(v => v != null);
  if (start >= 0) {
    const k = 2 / 10; let prev = macd[start]; signal[start] = prev;
    for (let i = start + 1; i < data.length; i++)
      if (macd[i] != null) { prev = macd[i] * k + prev * (1 - k); signal[i] = prev; }
  }
  const hist = macd.map((v, i) => v != null && signal[i] != null ? v - signal[i] : null);
  return { macd, signal, hist };
}

function makePoly(vals, xOf, yOf, color, sw, prefix) {
  const segs = []; let cur = [];
  vals.forEach((v, i) => {
    if (v == null) { if (cur.length) { segs.push(cur); cur = []; } } else cur.push(`${xOf(i)},${yOf(v)}`);
  });
  if (cur.length) segs.push(cur);
  return segs.map((pts, si) => (
    <polyline key={`${prefix}-${si}`} points={pts.join(' ')} fill="none" stroke={color} strokeWidth={sw} />
  ));
}

// ── SVG Chart ─────────────────────────────────────────────────────────────────
const PAD = { top: 10, right: 65, bottom: 24, left: 4 };
const PH = 260, VH = 55, SH = 85, GH = 6;

function AdvancedChart({ data, chartType, enabled }) {
  const cRef = useRef(null);
  const [w, setW] = useState(0);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    if (!cRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(cRef.current);
    return () => ro.disconnect();
  }, []);

  const { sects, totalH } = useMemo(() => {
    const sects = []; let y = PAD.top;
    sects.push({ key: 'price', t: y, h: PH }); y += PH + GH;
    if (enabled.volume) { sects.push({ key: 'vol',  t: y, h: VH }); y += VH + GH; }
    if (enabled.rsi)    { sects.push({ key: 'rsi',  t: y, h: SH }); y += SH + GH; }
    if (enabled.macd)   { sects.push({ key: 'macd', t: y, h: SH }); y += SH + GH; }
    return { sects, totalH: y + PAD.bottom - GH };
  }, [enabled.volume, enabled.rsi, enabled.macd]);

  const ind = useMemo(() => {
    if (!data.length) return { maLines: {}, bb: [], rsi: [], macd: [], signal: [], hist: [] };
    const maLines = {};
    MA_OPTS.forEach(({ key, period }) => { maLines[key] = calcMA(data, period); });
    return { maLines, bb: calcBB(data), rsi: calcRSI(data), ...calcMACD(data) };
  }, [data]);

  const sec = (key) => sects.find(s => s.key === key);
  const priceS = sec('price'), volS = sec('vol'), rsiS = sec('rsi'), macdS = sec('macd');

  const { yMin, yMax } = useMemo(() => {
    if (!data.length) return { yMin: 0, yMax: 1 };
    let lo = Math.min(...data.map(d => d.low  ?? Infinity).filter(isFinite));
    let hi = Math.max(...data.map(d => d.high ?? -Infinity).filter(isFinite));
    if (enabled.bb) ind.bb.forEach(b => {
      if (b.upper != null) hi = Math.max(hi, b.upper);
      if (b.lower != null) lo = Math.min(lo, b.lower);
    });
    const pad = (hi - lo) * 0.05 || 1;
    return { yMin: lo - pad, yMax: hi + pad };
  }, [data, enabled.bb, ind.bb]);

  const maxVol = useMemo(() => Math.max(...data.map(d => d.volume ?? 0), 1), [data]);

  const macdRange = useMemo(() => {
    const vals = [...(ind.macd ?? []), ...(ind.signal ?? [])].filter(v => v != null);
    if (!vals.length) return { lo: -1, hi: 1 };
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const p = (hi - lo) * 0.1 || 0.1;
    return { lo: lo - p, hi: hi + p };
  }, [ind]);

  const n  = Math.max(data.length, 1);
  const cw = Math.max(w - PAD.left - PAD.right, 10);
  const bw = Math.max(cw / n * 0.7, 2);

  const xOf    = (i) => PAD.left + (i + 0.5) * (cw / n);
  const yOf    = (p) => priceS.t + PH * (1 - (p - yMin) / (yMax - yMin));
  const yVolOf = (v) => volS  ? volS.t  + VH * (1 - v / maxVol) : 0;
  const yRsiOf = (v) => rsiS  ? rsiS.t  + SH * (1 - v / 100)    : 0;
  const yMOf   = (v) => {
    if (!macdS) return 0;
    const { lo, hi } = macdRange;
    return macdS.t + SH * (1 - (v - lo) / (hi - lo));
  };

  const yTicks = useMemo(() => {
    const range = yMax - yMin; if (!range) return [yMin];
    const rawStep = range / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = ([1, 2, 2.5, 5, 10].find(f => f * mag >= rawStep) ?? 10) * mag;
    const ticks = [];
    for (let v = Math.ceil(yMin / step) * step; v <= yMax + 1e-9 && ticks.length < 8; v += step)
      ticks.push(parseFloat(v.toPrecision(10)));
    return ticks;
  }, [yMin, yMax]);

  const xTicks = useMemo(() => {
    if (!data.length) return [];
    const step = Math.max(1, Math.floor(data.length / Math.min(6, data.length)));
    return Array.from({ length: Math.ceil(data.length / step) }, (_, k) => k * step).filter(i => i < data.length);
  }, [data.length]);

  const onMove = (e) => {
    const rect = cRef.current?.getBoundingClientRect(); if (!rect) return;
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((e.clientX - rect.left - PAD.left) / (cw / n))));
    setTip({ idx, cx: e.clientX - rect.left });
  };

  if (!w) return <div ref={cRef} style={{ height: totalH }} />;
  if (!data.length) return (
    <div ref={cRef} style={{ height: totalH }} className="flex items-center justify-center text-slate-400 text-sm">データなし</div>
  );

  return (
    <div ref={cRef} className="relative select-none" style={{ height: totalH }}>
      <svg width={w} height={totalH} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        {/* Y grid + labels */}
        {yTicks.map(v => {
          const y = yOf(v);
          if (y < priceS.t - 2 || y > priceS.t + PH + 2) return null;
          const lbl = v >= 10000 ? v.toLocaleString() : v >= 100 ? v.toFixed(0) : v.toFixed(2);
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={w - PAD.right} y2={y} stroke="#1e3a5f" strokeWidth={1} />
              <text x={w - PAD.right + 4} y={y + 4} fill="#94a3b8" fontSize={10}>{lbl}</text>
            </g>
          );
        })}
        {/* X labels */}
        {xTicks.map(i => (
          <text key={i} x={xOf(i)} y={totalH - 6} fill="#94a3b8" fontSize={10} textAnchor="middle">{data[i]?.date}</text>
        ))}
        {/* Section dividers */}
        {[volS, rsiS, macdS].filter(Boolean).map(s => (
          <line key={s.key} x1={PAD.left} y1={s.t} x2={w - PAD.right} y2={s.t} stroke="#334155" strokeWidth={1} />
        ))}

        {/* Bollinger Bands */}
        {enabled.bb && (() => {
          const upper = [], lower = [];
          ind.bb.forEach((b, i) => { if (b.upper != null) { upper.push([xOf(i), yOf(b.upper)]); lower.push([xOf(i), yOf(b.lower)]); } });
          if (!upper.length) return null;
          const fill = [...upper, ...[...lower].reverse()].map(([x, y]) => `${x},${y}`).join(' ');
          return (
            <g>
              <polygon points={fill} fill="#3b82f6" fillOpacity={0.07} />
              <polyline points={upper.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} />
              <polyline points={lower.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} />
              {makePoly(ind.bb.map(b => b.mid), xOf, yOf, '#3b82f6', 1, 'bb-mid')}
            </g>
          );
        })()}

        {/* Volume bars */}
        {volS && data.map((d, i) => {
          const top = yVolOf(d.volume ?? 0), h = volS.t + VH - top;
          return <rect key={i} x={xOf(i) - bw / 2} y={top} width={bw} height={Math.max(h, 1)}
            fill={(d.close ?? 0) >= (d.open ?? 0) ? '#064e3b' : '#7f1d1d'} opacity={0.8} />;
        })}

        {/* Candles or Line */}
        {chartType === 'candle'
          ? data.map((d, i) => {
              if (d.open == null || d.close == null) return null;
              const x = xOf(i), color = d.close >= d.open ? '#34d399' : '#f87171';
              const yH = yOf(d.high ?? d.close), yL = yOf(d.low ?? d.close);
              const yO = yOf(d.open), yC = yOf(d.close);
              const top = Math.min(yO, yC), bH = Math.max(Math.abs(yO - yC), 1);
              return (
                <g key={i}>
                  <line x1={x} y1={yH} x2={x} y2={top}     stroke={color} strokeWidth={1} />
                  <line x1={x} y1={top + bH} x2={x} y2={yL} stroke={color} strokeWidth={1} />
                  <rect x={x - bw / 2} y={top} width={bw} height={bH} fill={color} />
                </g>
              );
            })
          : makePoly(data.map(d => d.close), xOf, yOf, '#38bdf8', 2, 'line')
        }

        {/* MA lines */}
        {MA_OPTS.map(({ key, color }) =>
          enabled[key] ? makePoly(ind.maLines[key] ?? [], xOf, yOf, color, 1.5, key) : null
        )}

        {/* RSI */}
        {rsiS && (
          <g>
            <text x={PAD.left + 4} y={rsiS.t + 12} fill="#94a3b8" fontSize={10} fontWeight="500">RSI(14)</text>
            {[70, 30].map(v => (
              <line key={v} x1={PAD.left} y1={yRsiOf(v)} x2={w - PAD.right} y2={yRsiOf(v)}
                stroke={v === 70 ? '#ef4444' : '#22c55e'} strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.5} />
            ))}
            {makePoly(ind.rsi, xOf, yRsiOf, '#a78bfa', 1.5, 'rsi')}
            {[70, 50, 30].map(v => (
              <text key={v} x={w - PAD.right + 4} y={yRsiOf(v) + 4} fill="#94a3b8" fontSize={9}>{v}</text>
            ))}
          </g>
        )}

        {/* MACD */}
        {macdS && (
          <g>
            <text x={PAD.left + 4} y={macdS.t + 12} fill="#94a3b8" fontSize={10} fontWeight="500">MACD(12,26,9)</text>
            <line x1={PAD.left} y1={yMOf(0)} x2={w - PAD.right} y2={yMOf(0)} stroke="#475569" strokeWidth={1} />
            {ind.hist.map((v, i) => {
              if (v == null) return null;
              const y1 = yMOf(v), y2 = yMOf(0), top = Math.min(y1, y2), h = Math.max(Math.abs(y1 - y2), 1);
              return <rect key={i} x={xOf(i) - bw / 2} y={top} width={bw} height={h}
                fill={v >= 0 ? '#34d399' : '#f87171'} opacity={0.5} />;
            })}
            {makePoly(ind.macd,   xOf, yMOf, '#38bdf8', 1.5, 'macd-line')}
            {makePoly(ind.signal, xOf, yMOf, '#f59e0b', 1.5, 'macd-sig')}
          </g>
        )}

        {/* Crosshair */}
        {tip && (
          <line x1={xOf(tip.idx)} y1={PAD.top} x2={xOf(tip.idx)} y2={totalH - PAD.bottom}
            stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {/* Tooltip */}
      {tip && data[tip.idx] && (() => {
        const d = data[tip.idx];
        const toR = tip.cx < w / 2;
        const rsiV = ind.rsi[tip.idx], macdV = ind.macd[tip.idx], sigV = ind.signal[tip.idx];
        const bbB  = ind.bb[tip.idx];
        return (
          <div className="absolute top-2 bg-[#0f172a]/95 border border-slate-600 rounded-lg p-2.5 text-xs pointer-events-none z-10 shadow-xl min-w-[140px]"
            style={toR ? { left: tip.cx + 14 } : { right: w - tip.cx + 14 }}>
            <div className="text-slate-400 mb-1.5 font-medium">{d.date}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-slate-500">始値</span><span>{d.open?.toLocaleString()  ?? '—'}</span>
              <span className="text-slate-500">高値</span><span className="text-emerald-400">{d.high?.toLocaleString()  ?? '—'}</span>
              <span className="text-slate-500">安値</span><span className="text-red-400">{d.low?.toLocaleString()   ?? '—'}</span>
              <span className="text-slate-500">終値</span><span className="text-sky-300">{d.close?.toLocaleString() ?? '—'}</span>
              {d.volume != null && <>
                <span className="text-slate-500">出来高</span>
                <span>{d.volume >= 1e6 ? `${(d.volume / 1e6).toFixed(1)}M` : `${(d.volume / 1e3).toFixed(0)}K`}</span>
              </>}
              {MA_OPTS.filter(m => enabled[m.key]).map(m => (
                <React.Fragment key={m.key}>
                  <span style={{ color: m.color }}>{m.label}</span>
                  <span>{ind.maLines[m.key]?.[tip.idx]?.toFixed(2) ?? '—'}</span>
                </React.Fragment>
              ))}
              {enabled.bb && bbB?.upper != null && <>
                <span className="text-blue-400">BB上</span><span>{bbB.upper.toFixed(2)}</span>
                <span className="text-blue-400">BB下</span><span>{bbB.lower.toFixed(2)}</span>
              </>}
              {enabled.rsi && rsiV != null && <>
                <span className="text-violet-400">RSI</span>
                <span className={rsiV >= 70 ? 'text-red-400' : rsiV <= 30 ? 'text-green-400' : ''}>{rsiV.toFixed(1)}</span>
              </>}
              {enabled.macd && macdV != null && <>
                <span className="text-sky-400">MACD</span><span>{macdV.toFixed(3)}</span>
                <span className="text-amber-400">Signal</span><span>{sigV?.toFixed(3) ?? '—'}</span>
              </>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Chart() {
  const [marketKey, setMarketKey] = useState('tse_prime');
  const [symbol,    setSymbol]    = useState('7203.T');
  const [periodIdx, setPeriodIdx] = useState(0);
  const [chartType, setChartType] = useState('candle');
  const [enabled,   setEnabled]   = useState({
    ma5: true, ma25: true, ma75: false, ma200: false,
    bb: false, volume: true, rsi: false, macd: false,
  });

  const period = PERIODS[periodIdx];
  const { data: chartData, loading, error } = useChart(symbol, period.interval, period.range);
  const { data: quote } = useQuote(symbol);

  const stockList = useMemo(() => {
    if (marketKey === 'mylist') {
      try {
        const cats = JSON.parse(localStorage.getItem('watchCategories') ?? '[]');
        const seen = new Set();
        return cats.flatMap(c => c.stocks ?? []).filter(s => {
          if (seen.has(s.symbol)) return false;
          seen.add(s.symbol); return true;
        });
      } catch { return []; }
    }
    return CHART_MARKETS.find(m => m.key === marketKey)?.stocks ?? [];
  }, [marketKey]);

  const currentIdx   = stockList.findIndex(s => s.symbol === symbol);
  const currentStock = stockList.find(s => s.symbol === symbol);

  const prevStock = useCallback(() => {
    if (!stockList.length) return;
    setSymbol(stockList[currentIdx <= 0 ? stockList.length - 1 : currentIdx - 1].symbol);
  }, [stockList, currentIdx]);

  const nextStock = useCallback(() => {
    if (!stockList.length) return;
    setSymbol(stockList[currentIdx >= stockList.length - 1 ? 0 : currentIdx + 1].symbol);
  }, [stockList, currentIdx]);

  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevStock(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextStock(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [prevStock, nextStock]);

  const handleMarketChange = (key) => {
    setMarketKey(key);
    const stocks = key === 'mylist'
      ? (() => { try { return JSON.parse(localStorage.getItem('watchCategories') ?? '[]').flatMap(c => c.stocks ?? []); } catch { return []; } })()
      : CHART_MARKETS.find(m => m.key === key)?.stocks ?? [];
    if (stocks.length) setSymbol(stocks[0].symbol);
  };

  const toggle = (key) => setEnabled(prev => ({ ...prev, [key]: !prev[key] }));

  const INDICATOR_BTNS = [
    { key: 'volume', label: '出来高' },
    { key: 'bb',     label: 'ボリンジャー' },
    { key: 'rsi',    label: 'RSI' },
    { key: 'macd',   label: 'MACD' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Title + current price */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">チャート</h1>
          {currentStock && (
            <div className="text-slate-400 text-sm mt-0.5">
              {currentStock.name}
              <Link to={`/stock/${symbol}`} className="ml-2 text-blue-400 hover:underline text-xs">詳細 →</Link>
            </div>
          )}
        </div>
        {quote && (
          <div className="text-right">
            <div className="text-2xl font-bold">{quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="flex gap-2 justify-end mt-0.5">
              <PriceChange value={quote.change} suffix="" />
              <PriceChange value={quote.changePct} />
            </div>
          </div>
        )}
      </div>

      {/* Market + Stock selector row */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">市場</span>
            <select value={marketKey} onChange={e => handleMarketChange(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer">
              {CHART_MARKETS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              <option value="mylist">マイリスト</option>
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevStock} disabled={!stockList.length}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm font-bold transition-colors"
              title="前の銘柄 ← キー">◀</button>
            <select value={currentIdx >= 0 ? symbol : ''}
              onChange={e => setSymbol(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[220px]">
              {stockList.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol}  {s.name}</option>)}
              {currentIdx < 0 && <option value={symbol}>{symbol}</option>}
            </select>
            <button onClick={nextStock} disabled={!stockList.length}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm font-bold transition-colors"
              title="次の銘柄 → キー">▶</button>
            {stockList.length > 0 && (
              <span className="text-xs text-slate-500 w-16 text-center">
                {currentIdx >= 0 ? `${currentIdx + 1} / ${stockList.length}` : `— / ${stockList.length}`}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-[180px] max-w-xs">
            <SymbolSearch onSelect={r => setSymbol(r.symbol)} placeholder="銘柄を検索…" />
          </div>
        </div>
      </div>

      {/* Chart controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => setPeriodIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periodIdx === i ? 'bg-blue-600 text-white' : 'bg-[#1e293b] text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}>{p.label}</button>
        ))}

        <div className="w-px h-6 bg-slate-700" />

        {[{ key: 'line', label: '折れ線' }, { key: 'candle', label: 'ローソク足' }].map(({ key, label }) => (
          <button key={key} onClick={() => setChartType(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              chartType === key ? 'bg-amber-600 text-white' : 'bg-[#1e293b] text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}>{label}</button>
        ))}

        <div className="w-px h-6 bg-slate-700" />

        {MA_OPTS.map(({ key, label, color }) => (
          <button key={key} onClick={() => toggle(key)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              enabled[key] ? 'text-white border-transparent' : 'text-slate-400 bg-[#1e293b] border-slate-700 hover:border-slate-500'
            }`}
            style={enabled[key] ? { backgroundColor: color, borderColor: color } : {}}>{label}</button>
        ))}

        <div className="w-px h-6 bg-slate-700" />

        {INDICATOR_BTNS.map(({ key, label }) => (
          <button key={key} onClick={() => toggle(key)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              enabled[key] ? 'bg-slate-500 text-white border-slate-500' : 'text-slate-400 bg-[#1e293b] border-slate-700 hover:border-slate-500'
            }`}>{label}</button>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700">
        {loading && <div className="flex justify-center py-16"><Spinner size={8} /></div>}
        {error   && <div className="text-red-400 text-sm py-8 text-center">{error}</div>}
        {!loading && !error && (
          <AdvancedChart data={chartData} chartType={chartType} enabled={enabled} />
        )}
      </div>

      <p className="text-center text-xs text-slate-600">← → キーで銘柄を切り替え（テキスト入力中は無効）</p>
    </div>
  );
}
