import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSummary } from '../api/yahoo';
import { Spinner, ErrorMsg } from '../components/Loading';

function RangeInput({ label, min, max, step = 0.1, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value[0]} ~ {value[1] === max ? '∞' : value[1]}</span>
      </div>
      <div className="flex gap-2 items-center">
        <input type="number" className="w-20 bg-slate-700 rounded px-2 py-1 text-xs text-center" value={value[0]} step={step} onChange={e => onChange([Number(e.target.value), value[1]])} />
        <input type="range" className="flex-1" min={min} max={max} step={step} value={value[0]} onChange={e => onChange([Number(e.target.value), value[1]])} />
        <input type="range" className="flex-1" min={min} max={max} step={step} value={value[1]} onChange={e => onChange([value[0], Number(e.target.value)])} />
        <input type="number" className="w-20 bg-slate-700 rounded px-2 py-1 text-xs text-center" value={value[1]} step={step} onChange={e => onChange([value[0], Number(e.target.value)])} />
      </div>
    </div>
  );
}

const FILTERS_DEF = [
  { key: 'per', label: 'PER', min: 0, max: 100, step: 1 },
  { key: 'pbr', label: 'PBR', min: 0, max: 20, step: 0.1 },
  { key: 'roe', label: 'ROE (%)', min: 0, max: 50, step: 1 },
  { key: 'div', label: '配当利回り (%)', min: 0, max: 10, step: 0.1 },
];

export default function Screening() {
  const [symbols, setSymbols] = useState('7203.T,6758.T,9984.T,4063.T,8306.T,AAPL,MSFT,GOOGL,AMZN,META,NVDA,TSLA');
  const [filters, setFilters] = useState({ per: [0, 100], pbr: [0, 20], roe: [0, 50], div: [0, 10] });
  const [buffettFilter, setBuffettFilter] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleFilter = key => val => setFilters(prev => ({ ...prev, [key]: val }));
  const runScreening = async () => {
    setLoading(true); setError(null); setResults([]);
    const list = symbols.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const all = await Promise.allSettled(list.map(sym => fetchSummary(sym).then(s => ({ symbol: sym, summary: s }))));
      const succeeded = all.filter(r => r.status === 'fulfilled').map(r => r.value);
      const filtered = succeeded.filter(({ summary }) => {
        const detail = summary?.summaryDetail;
        const stats = summary?.defaultKeyStatistics;
        const financial = summary?.financialData;
        const per = detail?.trailingPE?.raw;
        const pbr = stats?.priceToBook?.raw;
        const roe = financial?.returnOnEquity?.raw ? financial.returnOnEquity.raw * 100 : null;
        const div = detail?.dividendYield?.raw ? detail.dividendYield.raw * 100 : null;
        if (per != null && (per < filters.per[0] || per > filters.per[1])) return false;
        if (pbr != null && (pbr < filters.pbr[0] || pbr > filters.pbr[1])) return false;
        if (roe != null && (roe < filters.roe[0] || roe > filters.roe[1])) return false;
        if (div != null && (div < filters.div[0] || div > filters.div[1])) return false;
        return true;
      });
      setResults(filtered);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">銘柄スクリーニング</h1>
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700 space-y-5">
        <div>
          <label className="text-sm text-slate-400 block mb-1">銘柄コード（カンマ区切り）</label>
          <textarea className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none"
            rows={2} value={symbols} onChange={e => setSymbols(e.target.value)} placeholder="例: 7203.T, AAPL, MSFT" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FILTERS_DEF.map(f => <RangeInput key={f.key} label={f.label} min={f.min} max={f.max} step={f.step} value={filters[f.key]} onChange={handleFilter(f.key)} />)}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={buffettFilter} onChange={e => setBuffettFilter(e.target.checked)} className="w-4 h-4 accent-blue-500" />
          <span className="text-slate-300">バフェット指標 150%以下の銘柄のみ（米国株フィルター）</span>
        </label>
        <button onClick={runScreening} disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center gap-2">
          {loading && <Spinner size={4} />}スクリーニング実行
        </button>
      </div>
      {error && <ErrorMsg message={error} />}
      {results.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-4 py-3">銘柄</th>
                <th className="text-right px-4 py-3">株価</th>
                <th className="text-right px-4 py-3">PER</th>
                <th className="text-right px-4 py-3">PBR</th>
                <th className="text-right px-4 py-3">ROE</th>
                <th className="text-right px-4 py-3">配当利回り</th>
                <th className="text-right px-4 py-3">時価総額</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ symbol, summary }) => {
                const detail = summary?.summaryDetail;
                const stats = summary?.defaultKeyStatistics;
                const financial = summary?.financialData;
                return (
                  <tr key={symbol} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3"><Link to={`/stock/${symbol}`} className="text-blue-400 hover:underline font-medium">{symbol}</Link></td>
                    <td className="px-4 py-3 text-right">{financial?.currentPrice?.fmt ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{detail?.trailingPE?.fmt ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{stats?.priceToBook?.fmt ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{financial?.returnOnEquity?.fmt ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{detail?.dividendYield?.fmt ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{stats?.marketCap?.fmt ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && results.length === 0 && !error && (
        <div className="text-center text-slate-400 py-8">条件を設定してスクリーニングを実行してください</div>
      )}
    </div>
  );
}
