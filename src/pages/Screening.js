import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchV7Quotes } from '../api/yahoo';
import { Spinner, ErrorMsg } from '../components/Loading';
import SymbolSearch from '../components/SymbolSearch';
import PriceChange from '../components/PriceChange';

function RangeInput({ label, min, max, step = 0.1, value, onChange }) {
  const isMax = value[1] >= max;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value[0]} ~ {isMax ? '∞' : value[1]}</span>
      </div>
      <div className="flex gap-2 items-center">
        <input type="number" className="w-20 bg-slate-700 rounded px-2 py-1 text-xs text-center" value={value[0]} step={step}
          onChange={e => onChange([Number(e.target.value), value[1]])} />
        <input type="range" className="flex-1" min={min} max={max} step={step} value={value[0]}
          onChange={e => onChange([Number(e.target.value), value[1]])} />
        <input type="range" className="flex-1" min={min} max={max} step={step} value={value[1]}
          onChange={e => onChange([value[0], Number(e.target.value)])} />
        <input type="number" className="w-20 bg-slate-700 rounded px-2 py-1 text-xs text-center" value={value[1]} step={step}
          onChange={e => onChange([value[0], Number(e.target.value)])} />
      </div>
    </div>
  );
}

const MARKETS = [
  {
    key: 'custom',
    label: 'マイリスト',
    symbols: null,
  },
  {
    key: 'tse_prime',
    label: '東証プライム',
    symbols: '7203.T,6758.T,9984.T,4063.T,8306.T,6861.T,9432.T,6367.T,4519.T,8035.T,6954.T,7974.T,9433.T,8316.T,6501.T,4568.T,7751.T,6098.T,4543.T,6594.T,8031.T,9020.T,8058.T,6902.T,4661.T',
  },
  {
    key: 'us',
    label: 'NYSE/NASDAQ',
    symbols: 'AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,BRK-B,LLY,JPM,V,UNH,XOM,AVGO,MA,PG,JNJ,HD,COST,ABBV,MRK,CVX,BAC,KO,PEP',
  },
  {
    key: 'global',
    label: 'グローバル主要銘柄',
    symbols: '7203.T,6758.T,9984.T,8306.T,6861.T,AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,TSM,ASML,SAP',
  },
];

const FILTERS_DEF = [
  { key: 'per',       label: 'PER',           min: 0,   max: 500,  step: 5 },
  { key: 'pbr',       label: 'PBR',           min: 0,   max: 50,   step: 0.5 },
  { key: 'div',       label: '配当利回り (%)',  min: 0,   max: 15,   step: 0.1 },
  { key: 'changePct', label: '前日比 (%)',     min: -30, max: 30,   step: 0.5 },
];
const FILTER_MAXES = Object.fromEntries(FILTERS_DEF.map(f => [f.key, f.max]));
const FILTER_MINS  = Object.fromEntries(FILTERS_DEF.map(f => [f.key, f.min]));

function fmtNum(v, d = 2) { return v != null ? v.toFixed(d) : '—'; }
function fmtCap(v) {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

export default function Screening() {
  const [selectedMarket, setSelectedMarket] = useState('custom');
  const [symbols, setSymbols] = useState('7203.T,6758.T,9984.T,4063.T,8306.T,AAPL,MSFT,GOOGL,AMZN,META,NVDA,TSLA');
  const [filters, setFilters] = useState({
    per:       [0, FILTER_MAXES.per],
    pbr:       [0, FILTER_MAXES.pbr],
    div:       [0, FILTER_MAXES.div],
    changePct: [FILTER_MINS.changePct, FILTER_MAXES.changePct],
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleMarketChange = (key) => {
    setSelectedMarket(key);
    const market = MARKETS.find(m => m.key === key);
    if (market?.symbols) setSymbols(market.symbols);
  };

  const handleFilter = key => val => setFilters(prev => ({ ...prev, [key]: val }));

  const addSymbol = useCallback((stock) => {
    setSymbols(prev => {
      const list = prev.split(',').map(s => s.trim()).filter(Boolean);
      if (list.includes(stock.symbol)) return prev;
      return [...list, stock.symbol].join(', ');
    });
    setSelectedMarket('custom');
  }, []);

  const passes = (val, key) => {
    if (val == null) return true;
    const [lo, hi] = filters[key];
    if (val < lo) return false;
    if (hi < FILTER_MAXES[key] && val > hi) return false;
    if (lo > FILTER_MINS[key] && val < lo) return false;
    return true;
  };

  const runScreening = async () => {
    setLoading(true); setError(null); setResults([]);
    const list = symbols.split(',').map(s => s.trim()).filter(Boolean);
    if (!list.length) { setLoading(false); return; }
    try {
      const quotes = await fetchV7Quotes(list);
      const filtered = quotes.filter(q => {
        if (!passes(q.trailingPE, 'per')) return false;
        if (!passes(q.priceToBook, 'pbr')) return false;
        if (!passes(q.dividendYield != null ? q.dividendYield * 100 : null, 'div')) return false;
        if (!passes(q.regularMarketChangePercent, 'changePct')) return false;
        return true;
      });
      setResults(filtered);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">銘柄スクリーニング</h1>
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700 space-y-5">

        <div>
          <label className="text-sm text-slate-400 block mb-2">株式市場</label>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map(m => (
              <button
                key={m.key}
                onClick={() => handleMarketChange(m.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedMarket === m.key
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {selectedMarket === 'custom' && (
          <div>
            <label className="text-sm text-slate-400 block mb-2">銘柄を検索して追加</label>
            <SymbolSearch onSelect={addSymbol} placeholder="銘柄コード・名前で検索..." />
          </div>
        )}

        <div>
          <label className="text-sm text-slate-400 block mb-1">銘柄リスト（カンマ区切り）</label>
          <textarea
            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none"
            rows={2}
            value={symbols}
            onChange={e => { setSymbols(e.target.value); setSelectedMarket('custom'); }}
            placeholder="例: 7203.T, AAPL, MSFT"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FILTERS_DEF.map(f => (
            <RangeInput key={f.key} label={f.label} min={f.min} max={f.max} step={f.step}
              value={filters[f.key]} onChange={handleFilter(f.key)} />
          ))}
        </div>

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
                <th className="text-right px-4 py-3">前日比</th>
                <th className="text-right px-4 py-3">PER</th>
                <th className="text-right px-4 py-3">PBR</th>
                <th className="text-right px-4 py-3">配当利回り</th>
                <th className="text-right px-4 py-3">時価総額</th>
              </tr>
            </thead>
            <tbody>
              {results.map(q => (
                <tr key={q.symbol} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/stock/${q.symbol}`} className="text-blue-400 hover:underline font-medium">{q.symbol}</Link>
                    {q.shortName && <div className="text-slate-400 text-xs">{q.shortName}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">{q.regularMarketPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{q.regularMarketChangePercent != null ? <PriceChange value={q.regularMarketChangePercent} /> : '—'}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(q.trailingPE)}</td>
                  <td className="px-4 py-3 text-right">{fmtNum(q.priceToBook)}</td>
                  <td className="px-4 py-3 text-right">{q.dividendYield != null ? `${(q.dividendYield * 100).toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-3 text-right">{fmtCap(q.marketCap)}</td>
                </tr>
              ))}
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
