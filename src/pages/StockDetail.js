import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Customized,
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
  { label: '5日',  key: 'ma5',   period: 5,   color: '#f59e0b' },
  { label: '25日', key: 'ma25',  period: 25,  color: '#3b82f6' },
  { label: '75日', key: 'ma75',  period: 75,  color: '#8b5cf6' },
  { label: '200日',key: 'ma200', period: 200, color: '#ec4899' },
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

function CandlestickLayer(props) {
  const { xAxisMap, yAxisMap, data } = props;
  try {
    const xAxis = xAxisMap && (xAxisMap['0'] || xAxisMap[0] || Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (
      yAxisMap['price'] ||
      Object.values(yAxisMap).find(a => a.orientation === 'right') ||
      Object.values(yAxisMap)[0]
    );
    if (!xAxis?.scale || !yAxis?.scale) return null;
    const xScale = xAxis.scale;
    const yScale = yAxis.scale;
    const bw = typeof xScale.bandwidth === 'function' ? xScale.bandwidth() : 8;
    return (
      <g>
        {(data || []).map((d, i) => {
          if (!d.close || !d.open || !d.high || !d.low) return null;
          const x0 = xScale(d.date);
          if (x0 == null || isNaN(x0)) return null;
          const cx  = x0 + bw / 2;
          const yH  = yScale(d.high);
          const yL  = yScale(d.low);
          const yO  = yScale(d.open);
          const yC  = yScale(d.close);
          if ([yH, yL, yO, yC].some(v => v == null || isNaN(v))) return null;
          const isUp   = d.close >= d.open;
          const color  = isUp ? '#34d399' : '#f87171';
          const bodyTop = Math.min(yO, yC);
          const bodyH   = Math.max(Math.abs(yO - yC), 1);
          const barW    = Math.max(bw * 0.65, 2);
          return (
            <g key={i}>
              <line x1={cx} y1={yH} x2={cx} y2={bodyTop}        stroke={color} strokeWidth={1} />
              <line x1={cx} y1={bodyTop + bodyH} x2={cx} y2={yL} stroke={color} strokeWidth={1} />
              <rect x={cx - barW / 2} y={bodyTop} width={barW} height={bodyH} fill={color} />
            </g>
          );
        })}
      </g>
    );
  } catch { return null; }
}

export default function StockDetail() {
  const { symbol } = useParams();
  const [modeIdx, setModeIdx]   = useState(0);
  const [chartType, setChartType] = useState('line');
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

  const yDomain = useMemo(() => {
    if (chartType !== 'candle' || !enriched.length) return ['auto', 'auto'];
    const lows  = enriched.map(d => d.low).filter(v => v != null);
    const highs = enriched.map(d => d.high).filter(v => v != null);
    if (!lows.length) return ['auto', 'auto'];
    const lo = Math.min(...lows);
    const hi = Math.max(...highs);
    const pad = (hi - lo) * 0.04;
    return [lo - pad, hi + pad];
  }, [enriched, chartType]);

  const detail  = summary?.summaryDetail;
  const stats   = summary?.defaultKeyStatistics;
  const financial = summary?.financialData;
  const profile = summary?.assetProfile;
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
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 border-l border-slate-600 pl-2">
            {[{ key: 'line', label: '折れ線' }, { key: 'candle', label: 'ローソク足' }].map(({ key, label }) => (
              <button key={key} onClick={() => setChartType(key)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  chartType === key ? 'bg-slate-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {chartType === 'line' && (
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
          )}
        </div>

        {chartLoading && <LoadingCard />}
        {chartError && <ErrorMsg message={chartError} />}
        {!chartLoading && !chartError && (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={enriched} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="price" orientation="right"
                tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} domain={yDomain} />
              <YAxis yAxisId="vol" orientation="left"
                tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false}
                tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K`} width={45} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toFixed(2) : value, name
                ]}
              />
              <Bar yAxisId="vol" dataKey="volume" fill="#1e3a5f" name="出来高" />

              {chartType === 'line' ? (
                <>
                  <Line yAxisId="price" type="monotone" dataKey="close" stroke="#38bdf8"
                    dot={false} strokeWidth={2} name="終値" />
                  {MA_OPTIONS.map(({ key, color, label }) =>
                    enabledMAs[key]
                      ? <Line key={key} yAxisId="price" type="monotone" dataKey={key}
                          stroke={color} dot={false} strokeWidth={1.5} name={`MA${label}`} connectNulls />
                      : null
                  )}
                </>
              ) : (
                <>
                  <Line yAxisId="price" dataKey="high"  hide dot={false} />
                  <Line yAxisId="price" dataKey="low"   hide dot={false} />
                  <Line yAxisId="price" dataKey="open"  hide dot={false} />
                  <Line yAxisId="price" dataKey="close" hide dot={false} />
                  <Customized component={CandlestickLayer} />
                  {MA_OPTIONS.map(({ key, color, label }) =>
                    enabledMAs[key]
                      ? <Line key={key} yAxisId="price" type="monotone" dataKey={key}
                          stroke={color} dot={false} strokeWidth={1.5} name={`MA${label}`} connectNulls />
                      : null
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
          <h2 className="font-bold mb-3">主要指標</h2>
          {sumLoading && <LoadingCard />}
          {sumError && <ErrorMsg message={sumError} />}
          {summary && (<>
            <MetricRow label="PER (実績)" value={detail?.trailingPE?.fmt} />
            <MetricRow label="PBR"          value={stats?.priceToBook?.fmt} />
            <MetricRow label="ROE"          value={financial?.returnOnEquity?.fmt} />
            <MetricRow label="EPS (実績)"  value={stats?.trailingEps?.fmt} />
            <MetricRow label="配当利回り"    value={detail?.dividendYield?.fmt} />
            <MetricRow label="時価総額"      value={stats?.marketCap?.fmt} />
            <MetricRow label="52週高値"      value={detail?.fiftyTwoWeekHigh?.fmt} />
            <MetricRow label="52週安値"      value={detail?.fiftyTwoWeekLow?.fmt} />
            <MetricRow label="ベータ"          value={stats?.beta?.fmt} />
          </>)}
        </div>
        <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
          <h2 className="font-bold mb-3">直近決算サマリー</h2>
          {sumLoading && <LoadingCard />}
          {sumError && <ErrorMsg message={sumError} />}
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
                    const yoy = prev
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
