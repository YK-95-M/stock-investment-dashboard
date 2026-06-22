import { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchQuote, fetchSummary, fetchChart, searchSymbols } from '../api/yahoo';
import { Spinner } from '../components/Loading';
import { Link } from 'react-router-dom';

const COLORS = ['#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa'];
const METRICS = [
  { key: 'price', label: '株価', path: (q) => q?.price?.toFixed(2) },
  { key: 'per', label: 'PER', path: (_, s) => s?.summaryDetail?.trailingPE?.fmt },
  { key: 'pbr', label: 'PBR', path: (_, s) => s?.defaultKeyStatistics?.priceToBook?.fmt },
  { key: 'roe', label: 'ROE', path: (_, s) => s?.financialData?.returnOnEquity?.fmt },
  { key: 'eps', label: 'EPS', path: (_, s) => s?.defaultKeyStatistics?.trailingEps?.fmt },
  { key: 'div', label: '配当利回り', path: (_, s) => s?.summaryDetail?.dividendYield?.fmt },
  { key: 'cap', label: '時価総額', path: (_, s) => s?.defaultKeyStatistics?.marketCap?.fmt },
  { key: 'beta', label: 'ベータ', path: (_, s) => s?.defaultKeyStatistics?.beta?.fmt },
  { key: 'changePct', label: '前日比', path: (q) => q?.changePct != null ? `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%` : '—' },
];

function useStockData(symbol) {
  const [quote, setQuote] = useState(null);
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!symbol) return;
    setLoading(true); setError(null);
    Promise.all([fetchQuote(symbol), fetchSummary(symbol).catch(() => null), fetchChart(symbol, '1d', '6mo').catch(() => [])])
      .then(([q, s, c]) => { setQuote(q); setSummary(s); setChart(c); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);
  return { quote, summary, chart, loading, error };
}

function SymbolInput({ value, onChange, onRemove, color }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchSymbols(query);
        setResults(data.slice(0, 6));
        setOpen(data.length > 0);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleChange = (v) => {
    setQuery(v);
    onChange(v.toUpperCase());
  };

  const handleSelect = (r) => {
    setQuery(r.symbol);
    onChange(r.symbol);
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 relative">
        <div className="flex items-center bg-slate-700 rounded px-3 py-1.5 gap-2 focus-within:ring-1 focus-within:ring-blue-500">
          <input
            type="text"
            className="flex-1 bg-transparent text-sm uppercase text-slate-200 placeholder-slate-500 outline-none"
            placeholder="例: AAPL, 7203.T"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {loading && <div className="w-3 h-3 border border-slate-500 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />}
        </div>
        {open && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
            {results.map(r => (
              <button
                key={r.symbol}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700 text-left text-sm"
                onMouseDown={() => handleSelect(r)}
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-100">{r.symbol}</span>
                  <span className="text-slate-400 text-xs ml-2 truncate">{r.shortname || r.longname}</span>
                </div>
                <span className="text-slate-500 text-xs flex-shrink-0 ml-2">{r.exchDisp}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onRemove} className="text-slate-400 hover:text-red-400 transition-colors px-1 flex-shrink-0">✕</button>
    </div>
  );
}

function StockDataProvider({ symbol, onData }) {
  const data = useStockData(symbol);
  useEffect(() => { onData(symbol, data); }, [symbol, data.quote, data.summary, data.loading, data.error]); // eslint-disable-line
  return null;
}

export default function Compare() {
  const [inputs, setInputs] = useState(['AAPL', 'MSFT', '7203.T']);
  const [stockData, setStockData] = useState({});
  const handleData = (sym, data) => setStockData(prev => ({ ...prev, [sym]: data }));
  const addSymbol = () => { if (inputs.length < 5) setInputs(prev => [...prev, '']); };
  const removeSymbol = i => {
    const sym = inputs[i];
    setInputs(prev => prev.filter((_, idx) => idx !== i));
    setStockData(prev => { const n = { ...prev }; delete n[sym]; return n; });
  };
  const updateSymbol = (i, val) => setInputs(prev => prev.map((s, idx) => idx === i ? val : s));
  const normalizedChart = useMemo(() => {
    const valid = inputs.filter(s => s && stockData[s]?.chart?.length > 0);
    if (!valid.length) return [];
    const minLen = Math.min(...valid.map(s => stockData[s].chart.length));
    return Array.from({ length: minLen }, (_, i) => {
      const row = { date: stockData[valid[0]].chart[i]?.date };
      valid.forEach(sym => {
        const c = stockData[sym].chart;
        if (!c[i] || !c[0]?.close) return;
        row[sym] = +((c[i].close / c[0].close - 1) * 100).toFixed(2);
      });
      return row;
    });
  }, [inputs, stockData]);
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">銘柄比較</h1>
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700 space-y-3">
        <div className="text-sm text-slate-400 mb-2">最大5銘柄まで比較できます</div>
        {inputs.map((sym, i) => (
          <SymbolInput key={i} value={sym} color={COLORS[i]} onChange={val => updateSymbol(i, val)} onRemove={() => removeSymbol(i)} />
        ))}
        {inputs.length < 5 && <button onClick={addSymbol} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">+ 銘柄を追加</button>}
      </div>
      {inputs.filter(Boolean).map((sym, i) => <StockDataProvider key={sym} symbol={sym} color={COLORS[i]} onData={handleData} />)}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
        <h2 className="font-bold mb-4">騰落率チャート（基準日からの比較）</h2>
        {normalizedChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={normalizedChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }} formatter={(v, name) => [`${v >= 0 ? '+' : ''}${v}%`, name]} />
              <Legend />
              {inputs.filter(s => s && stockData[s]?.chart?.length).map((sym, i) => (
                <Line key={sym} type="monotone" dataKey={sym} stroke={COLORS[i]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="text-center text-slate-400 py-8">銘柄を入力するとチャートが表示されます</div>}
      </div>
      <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-slate-400">指標</th>
              {inputs.filter(Boolean).map((sym, i) => (
                <th key={sym} className="text-right px-4 py-3">
                  <Link to={`/stock/${sym}`} className="hover:underline" style={{ color: COLORS[i] }}>{sym}</Link>
                  {stockData[sym]?.loading && <Spinner size={3} />}
                  {stockData[sym]?.error && <span className="text-red-400 text-xs ml-1">!</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ key, label, path }) => (
              <tr key={key} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-4 py-3 text-slate-400">{label}</td>
                {inputs.filter(Boolean).map(sym => {
                  const d = stockData[sym];
                  const val = d ? path(d.quote, d.summary) : '—';
                  const isChange = key === 'changePct' && val && val !== '—';
                  const isPos = isChange && !val.startsWith('-');
                  return (
                    <td key={sym} className={`px-4 py-3 text-right font-medium ${isChange ? (isPos ? 'text-emerald-400' : 'text-red-400') : ''}`}>
                      {val ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
