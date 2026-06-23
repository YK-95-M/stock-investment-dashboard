import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import useChart from '../hooks/useChart';
import useSummary from '../hooks/useSummary';
import useQuote from '../hooks/useQuote';
import { LoadingCard, ErrorMsg } from '../components/Loading';
import PriceChange from '../components/PriceChange';

const CHART_MODES = [
  { label: '日足', interval: '1d', range: '6mo' },
  { label: '週足', interval: '1wk', range: '2y' },
  { label: '月足', interval: '1mo', range: '5y' },
];
const MA_OPTIONS = [
  { label: '5日',   key: 'ma5',   period: 5,   color: '#f59e0b' },
  { label: '25日',  key: 'ma25',  period: 25,  color: '#3b82f6' },
  { label: '75日',  key: 'ma75',  period: 75,  color: '#8b5cf6' },
  { label: '200日', key: 'ma200', period: 200, color: '#ec4899' },
];

function calcMA(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, d) => s + d.close, 0) / period;
  });
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-700 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}

const SVG_PAD = { top: 10, right: 58, bottom: 24, left: 4 };
const PRICE_H = 270;
const VOL_H   = 55;
const VOL_GAP = 8;

function CandlestickChart({ data, enabledMAs }) {
  const containerRef = useRef(null);
  const [w, setW]             = useState(0);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const TOTAL_H = SVG_PAD.top + PRICE_H + VOL_GAP + VOL_H + SVG_PAD.bottom;
  const VOL_TOP = SVG_PAD.top + PRICE_H + VOL_GAP;
  const chartW  = Math.max(w - SVG_PAD.left - SVG_PAD.right, 10);
  const n       = Math.max(data.length, 1);

  const { yMin, yMax, maxVol, maLines } = useMemo(() => {
    if (!data.length) return { yMin: 0, yMax: 1, maxVol: 1, maLines: {} };
    const lows  = data.map(d => d.low).filter(v => v != null);
    const highs = data.map(d => d.high).filter(v => v != null);
    const vols  = data.map(d => d.volume).filter(v => v != null);
    if (!lows.length) return { yMin: 0, yMax: 1, maxVol: 1, maLines: {} };
    const lo  = Math.min(...lows);
    const hi  = Math.max(...highs);
    const pad = (hi - lo) * 0.05 || Math.abs(hi) * 0.05 || 1;
    const ml  = {};
    MA_OPTIONS.forEach(({ key, period }) => { ml[key] = calcMA(data, period); });
    return { yMin: lo - pad, yMax: hi + pad, maxVol: Math.max(...vols, 1), maLines: ml };
  }, [data]);

  const xOf    = (i) => SVG_PAD.left + (i + 0.5) * (chartW / n);
  const yOf    = (p) => SVG_PAD.top  + PRICE_H  * (1 - (p - yMin) / (yMax - yMin));
  const yVolOf = (v) => VOL_TOP      + VOL_H    * (1 - v / maxVol);
  const bw     = Math.max(chartW / n * 0.7, 2);

  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    if (!range) return [yMin];
    const rawStep = range / 5;
    const mag     = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const nice    = [1, 2, 2.5, 5, 10].find(f => f * mag >= rawStep) ?? 10;
    const step    = nice * mag;
    const start   = Math.ceil(yMin / step) * step;
    const ticks   = [];
    for (let v = start; v <= yMax + 1e-9; v += step) {
      if (ticks.length >= 8) break;
      ticks.push(parseFloat(v.toPrecision(10)));
    }
    return ticks;
  }, [yMin, yMax]);

  const xTickIndices = useMemo(() => {
    if (!data.length) return [];
    const cnt  = Math.min(6, data.length);
    const step = Math.max(1, Math.floor(data.length / cnt));
    const arr  = [];
    for (let i = 0; i < data.length; i += step) arr.push(i);
    return arr;
  }, [data.length]);

  const handleMouseMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx  = e.clientX - rect.left - SVG_PAD.left;
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor(mx / (chartW / n))));
    setTooltip({ idx, cx: e.clientX - rect.left });
  };

  if (!w) return <div ref={containerRef} style={{ height: TOTAL_H }} />;
  if (!data.length) return (
    <div ref={containerRef} style={{ height: TOTAL_H }}
      className="flex items-center justify-center text-slate-400 text-sm">
      データなし
    </div>
  );

  return (
    <div ref={containerRef} className="relative select-none" style={{ height: TOTAL_H }}>
      <svg width={w} height={TOTAL_H} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>

        {yTicks.map(v => {
          const y = yOf(v);
          if (y < SVG_PAD.top - 2 || y > SVG_PAD.top + PRICE_H + 2) return null;
          const lbl = v >= 10000 ? v.toLocaleString() : v >= 100 ? v.toFixed(0) : v.toFixed(2);
          return (
            <g key={v}>
              <line x1={SVG_PAD.left} y1={y} x2={w - SVG_PAD.right} y2={y} stroke="#1e3a5f" strokeWidth={1} />
              <text x={w - SVG_PAD.right + 4} y={y + 4} fill="#94a3b8" fontSize={10}>{lbl}</text>
            </g>
          );
        })}

        {xTickIndices.map(i => (
          <text key={i} x={xOf(i)} y={TOTAL_H - 6} fill="#94a3b8" fontSize={10} textAnchor="middle">
            {data[i].date}
          </text>
        ))}

        <line x1={SVG_PAD.left} y1={VOL_TOP} x2={w - SVG_PAD.right} y2={VOL_TOP} stroke="#1e3a5f" strokeWidth={1} />

        {data.map((d, i) => {
          const x    = xOf(i);
          const yTop = yVolOf(d.volume ?? 0);
          const h    = VOL_TOP + VOL_H - yTop;
          const isUp = (d.close ?? 0) >= (d.open ?? 0);
          return <rect key={i} x={x - bw / 2} y={yTop} width={bw} height={Math.max(h, 1)}
            fill={isUp ? '#064e3b' : '#7f1d1d'} opacity={0.8} />;
        })}

        {data.map((d, i) => {
          if (d.open == null || d.close == null || d.high == null || d.low == null) return null;
          const x       = xOf(i);
          const yH      = yOf(d.high);
          const yL      = yOf(d.low);
          const yO      = yOf(d.open);
          const yC      = yOf(d.close);
          const isUp    = d.close >= d.open;
          const color   = isUp ? '#34d399' : '#f87171';
          const bodyTop = Math.min(yO, yC);
          const bodyH   = Math.max(Math.abs(yO - yC), 1);
          return (
            <g key={i}>
              <line x1={x} y1={yH} x2={x} y2={bodyTop}         stroke={color} strokeWidth={1} />
              <line x1={x} y1={bodyTop + bodyH} x2={x} y2={yL} stroke={color} strokeWidth={1} />
              <rect x={x - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
            </g>
          );
        })}

        {MA_OPTIONS.map(({ key, color }) => {
          if (!enabledMAs[key]) return null;
          const vals = maLines[key];
          const segs = []; let cur = [];
          vals.forEach((v, i) => {
            if (v == null) { if (cur.length) { segs.push(cur); cur = []; } }
            else cur.push(`${xOf(i)},${yOf(v)}`);
          });
          if (cur.length) segs.push(cur);
          return segs.map((pts, si) => (
            <polyline key={`${key}-${si}`} points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} />
          ));
        })}

        {tooltip && (
          <line x1={xOf(tooltip.idx)} y1={SVG_PAD.top} x2={xOf(tooltip.idx)} y2={TOTAL_H - SVG_PAD.bottom}
            stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {tooltip && (() => {
        const d = data[tooltip.idx];
        if (!d) return null;
        const toRight = tooltip.cx < w / 2;
        return (
          <div className="absolute top-2 bg-[#0f172a]/95 border border-slate-600 rounded-lg p-2.5 text-xs pointer-events-none z-10 shadow-xl"
            style={{ left: toRight ? tooltip.cx + 14 : undefined, right: toRight ? undefined : w - tooltip.cx + 14 }}>
            <div className="text-slate-400 mb-1.5 font-medium">{d.date}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span className="text-slate-500">始値</span><span>{d.open?.toLocaleString()}</span>
              <span className="text-slate-500">高値</span><span className="text-emerald-400">{d.high?.toLocaleString()}</span>
              <span className="text-slate-500">安値</span><span className="text-red-400">{d.low?.toLocaleString()}</span>
              <span className="text-slate-500">終値</span><span className="text-sky-300">{d.close?.toLocaleString()}</span>
              <span className="text-slate-500">出来高</span>
              <span>{d.volume != null ? (d.volume >= 1e6 ? `${(d.volume/1e6).toFixed(1)}M` : `${(d.volume/1e3).toFixed(0)}K`) : '—'}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const [modeIdx,    setModeIdx]    = useState(0);
  const [chartType,  setChartType]  = useState('line');
  const [enabledMAs, setEnabledMAs] = useState({ ma5: true, ma25: true, ma75: false, ma200: false });
  const mode = CHART_MODES[modeIdx];

  const { data: chartData, loading: chartLoading, error: chartError } = useChart(symbol, mode.interval, mode.range);
  const { data: summary,   loading: sumLoading,   error: sumError   } = useSummary(symbol);
  const { data: quote } = useQuote(symbol);

  const enriched = useMemo(() => {
    if (!chartData.length) return [];
    const maArrays = {};
    MA_OPTIONS.forEach(({ key, period }) => { maArrays[key] = calcMA(chartData, period); });
    return chartData.map((d, i) => ({
      ...d,
      ...Object.fromEntries(MA_OPTIONS.map(({ key }) => [key, maArrays[key][i]])),
    }));
  }, [chartData]);

  const detail      = summary?.summaryDetail;
  const stats       = summary?.defaultKeyStatistics;
  const financial   = summary?.financialData;
  const profile     = summary?.assetProfile;
  const incomeHistory = summary?.incomeStatementHistory?.incomeStatementHistory ?? [];

  const toggleMA = key => setEnabledMAs(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-slate-400 text-sm mb-1">
            <Link to="/" className="hover:text-white">ダッシュボード</Link> › {symbol}
          </div>
          <h1 className="text-2xl font-bold">{symbol}</h1>
          {profile?.industry && <div className="text-slate-400 text-sm mt-1">{profile.sector} / {profile.industry}</div>}
        </div>
        {quote && (
          <div className="text-right">
            <div className="text-3xl font-bold">{quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="flex gap-3 justify-end mt-1">
              <PriceChange value={quote.change} suffix="" />
              <PriceChange value={quote.changePct} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <div className="flex gap-1">
            {CHART_MODES.map((m, i) => (
              <button key={m.label} onClick={() => setModeIdx(i)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  modeIdx === i ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}>{m.label}</button>
            ))}
          </div>

          <div className="flex gap-1 border-l border-slate-600 pl-2">
            {[{ key: 'line', label: '折れ線' }, { key: 'candle', label: 'ローソク足' }].map(({ key, label }) => (
              <button key={key} onClick={() => setChartType(key)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  chartType === key ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}>{label}</button>
            ))}
          </div>

          <div className="flex gap-2 ml-2 flex-wrap">
            {MA_OPTIONS.map(({ label, key, color }) => (
              <button key={key} onClick={() => toggleMA(key)}
                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                  enabledMAs[key] ? 'text-white border-transparent' : 'bg-transparent text-slate-400 border-slate-600'
                }`}
                style={enabledMAs[key] ? { backgroundColor: color, borderColor: color } : {}}>
                MA{label}
              </button>
            ))}
          </div>
        </div>

        {chartLoading && <LoadingCard />}
        {chartError   && <ErrorMsg message={chartError} />}

        {!chartLoading && !chartError && chartType === 'line' && (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={enriched} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="price" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} domain={['auto','auto']} />
              <YAxis yAxisId="vol" orientation="left" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false}
                tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K`} width={45} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : value, name]} />
              <Bar yAxisId="vol" dataKey="volume" fill="#1e3a5f" name="出来高" />
              <Line yAxisId="price" type="monotone" dataKey="close" stroke="#38bdf8" dot={false} strokeWidth={2} name="終値" />
              {MA_OPTIONS.map(({ key, color, label }) =>
                enabledMAs[key]
                  ? <Line key={key} yAxisId="price" type="monotone" dataKey={key}
                      stroke={color} dot={false} strokeWidth={1.5} name={`MA${label}`} connectNulls />
                  : null
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {!chartLoading && !chartError && chartType === 'candle' && (
          <CandlestickChart data={enriched} enabledMAs={enabledMAs} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
          <h2 className="font-bold mb-3">主要指標</h2>
          {sumLoading && <LoadingCard />}
          {sumError   && <ErrorMsg message={sumError} />}
          {summary && (<>
            <MetricRow label="PER (実績)" value={detail?.trailingPE?.fmt} />
            <MetricRow label="PBR"         value={stats?.priceToBook?.fmt} />
            <MetricRow label="ROE"         value={financial?.returnOnEquity?.fmt} />
            <MetricRow label="EPS (実績)" value={stats?.trailingEps?.fmt} />
            <MetricRow label="配当利回り"  value={detail?.dividendYield?.fmt} />
            <MetricRow label="時価総額"    value={stats?.marketCap?.fmt} />
            <MetricRow label="52週高値"    value={detail?.fiftyTwoWeekHigh?.fmt} />
            <MetricRow label="52週安値"    value={detail?.fiftyTwoWeekLow?.fmt} />
            <MetricRow label="ベータ"       value={stats?.beta?.fmt} />
          </>)}
        </div>
        <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
          <h2 className="font-bold mb-3">直近決算サマリー</h2>
          {sumLoading && <LoadingCard />}
          {sumError   && <ErrorMsg message={sumError} />}
          {summary && incomeHistory.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">期間</th>
                    <th className="text-right py-2 pr-4">売上高</th>
                    <th className="text-right py-2 pr-4">営業利益</th>
                    <th className="text-right py-2">純利益</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeHistory.slice(0, 4).map((inc, i) => {
                    const prev = incomeHistory[i + 1];
                    const yoy  = prev
                      ? ((inc.totalRevenue?.raw - prev.totalRevenue?.raw) / Math.abs(prev.totalRevenue?.raw)) * 100
                      : null;
                    return (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="py-2 pr-4 text-slate-400 text-xs">{inc.endDate?.fmt}</td>
                        <td className="py-2 pr-4 text-right">
                          <div>{inc.totalRevenue?.fmt ?? '—'}</div>
                          {yoy != null && <PriceChange value={yoy} suffix="%" digits={1} />}
                        </td>
                        <td className="py-2 pr-4 text-right">{inc.operatingIncome?.fmt ?? '—'}</td>
                        <td className="py-2 text-right">{inc.netIncome?.fmt ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {summary && incomeHistory.length === 0 && (
            <div className="text-slate-400 text-sm">決算データなし</div>
          )}
        </div>
      </div>
    </div>
  );
}
