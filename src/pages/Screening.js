import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchV7Quotes } from '../api/yahoo';
import { Spinner, ErrorMsg } from '../components/Loading';
import SymbolSearch from '../components/SymbolSearch';
import PriceChange from '../components/PriceChange';

const MARKETS = [
  { key: 'tse_prime', label: '東証プライム',
    symbols: '7203.T,6758.T,9984.T,4063.T,8306.T,6861.T,9432.T,6367.T,4519.T,8035.T,6954.T,7974.T,9433.T,8316.T,6501.T,4568.T,7751.T,6098.T,4543.T,6594.T,8031.T,9020.T,8058.T,6902.T,4661.T' },
  { key: 'us', label: 'NYSE/NASDAQ',
    symbols: 'AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,BRK-B,LLY,JPM,V,UNH,XOM,AVGO,MA,PG,JNJ,HD,COST,ABBV,MRK,CVX,BAC,KO,PEP' },
  { key: 'global', label: 'グローバル',
    symbols: '7203.T,6758.T,9984.T,8306.T,6861.T,AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,TSM,ASML,SAP' },
  { key: 'custom', label: 'マイリスト', symbols: null },
];

const FILTERS_DEF = [
  { key: 'per',       label: 'PER',           min: 0,   max: 500, step: 5   },
  { key: 'pbr',       label: 'PBR',           min: 0,   max: 50,  step: 0.5 },
  { key: 'div',       label: '配当利回り (%)',  min: 0,   max: 15,  step: 0.1 },
  { key: 'changePct', label: '前日比 (%)',     min: -30, max: 30,  step: 0.5 },
];
const FILTER_MAXES = Object.fromEntries(FILTERS_DEF.map(f => [f.key, f.max]));
const FILTER_MINS  = Object.fromEntries(FILTERS_DEF.map(f => [f.key, f.min]));

function DualRangeFilter({ label, min, max, step, value, onChange }) {
  const [lo, hi] = value;
  const range   = max - min;
  const pctLo   = range ? ((lo - min) / range) * 100 : 0;
  const pctHi   = range ? ((hi - min) / range) * 100 : 100;
  const atMax   = hi >= max;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-slate-400 tabular-nums">
          {lo} 〜 {atMax ? '∞' : hi}
        </span>
      </div>
      <div className="relative" style={{ paddingTop: 2 }}>
        {/* Track background */}
        <div className="absolute left-0 right-0 h-1 bg-slate-600 rounded" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        {/* Track fill */}
        <div className="absolute h-1 bg-blue-500 rounded"
          style={{ left: `${pctLo}%`, width: `${pctHi - pctLo}%`, top: '50%', transform: 'translateY(-50%)' }} />
        <div className="range-slider">
          <input type="range" min={min} max={max} step={step} value={lo}
            style={{ zIndex: lo >= hi ? 5 : 3 }}
            onChange={e => onChange([Math.min(Number(e.target.value), hi), hi])} />
          <input type="range" min={min} max={max} step={step} value={hi}
            style={{ zIndex: 4 }}
            onChange={e => onChange([lo, Math.max(Number(e.target.value), lo)])} />
        </div>
      </div>
    </div>
  );
}

function fmtNum(v, d = 2) { return v != null ? v.toFixed(d) : '—'; }
function fmtCap(v) {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

export default function Screening() {
  const [selectedMarket, setSelectedMarket] = useState('tse_prime');
  const [customSymbols,  setCustomSymbols]  = useState([]);
  const [filters, setFilters] = useState({
    per:       [0, FILTER_MAXES.per],
    pbr:       [0, FILTER_MAXES.pbr],
    div:       [0, FILTER_MAXES.div],
    changePct: [FILTER_MINS.changePct, FILTER_MAXES.changePct],
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [ran, setRan]         = useState(false);

  const symbolList = selectedMarket === 'custom'
    ? customSymbols
    : (MARKETS.find(m => m.key === selectedMarket)?.symbols?.split(',') ?? []);

  const addSymbol = useCallback((stock) => {
    setSelectedMarket('custom');
    setCustomSymbols(prev =>
      prev.includes(stock.symbol) ? prev : [...prev, stock.symbol]
    );
  }, []);

  const removeSymbol = (sym) =>
    setCustomSymbols(prev => prev.filter(s => s !== sym));

  const handleFilter = key => val => setFilters(prev => ({ ...prev, [key]: val }));

  const passes = (val, key) => {
    if (val == null) return true;
    const [lo, hi] = filters[key];
    if (lo > FILTER_MINS[key]  && val < lo) return false;
    if (hi < FILTER_MAXES[key] && val > hi) return false;
    return true;
  };

  const runScreening = async () => {
    if (!symbolList.length) return;
    setLoading(true); setError(null); setResults([]); setRan(true);
    try {
      const quotes = await fetchV7Quotes(symbolList);
      setResults(quotes.filter(q =>
        passes(q.trailingPE, 'per') &&
        passes(q.priceToBook, 'pbr') &&
        passes(q.dividendYield != null ? q.dividendYield * 100 : null, 'div') &&
        passes(q.regularMarketChangePercent, 'changePct')
      ));
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
          <p className="text-xs text-slate-400 mb-2 font-medium">対象市場を選択</p>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map(m => (
              <button key={m.key} onClick={() => setSelectedMarket(m.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedMarket === m.key
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'
                }`}>
                {m.label}
                {m.symbols && (
                  <span className="ml-1.5 text-xs opacity-60">
                    {m.symbols.split(',').length}銘柄
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedMarket === 'custom' && (
          <div>
            <p className="text-xs text-slate-400 mb-2 font-medium">銘柄を追加</p>
            <SymbolSearch onSelect={addSymbol} placeholder="銘柄名・コードで検索…" />
            {customSymbols.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {customSymbols.map(sym => (
                  <span key={sym} className="inline-flex items-center gap-1 bg-slate-700 rounded-full px-2.5 py-0.5 text-xs">
                    {sym}
                    <button onClick={() => removeSymbol(sym)}
                      className="text-slate-400 hover:text-red-400 transition-colors ml-0.5">×</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">検索候補をクリックすると追加されます</p>
            )}
          </div>
        )}

        <div className="text-xs text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2">
          {symbolList.length > 0
            ? `🔍 ${MARKETS.find(m => m.key === selectedMarket)?.label ?? 'マイリスト'} の ${symbolList.length} 銘柄を対象にフィルタリングします`
            : '銘柄を選択または追加してください'
          }
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-4 font-medium">フィルター条件（最大値が ∞ の項目は上限なし）</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FILTERS_DEF.map(f => (
              <DualRangeFilter key={f.key} label={f.label}
                min={f.min} max={f.max} step={f.step}
                value={filters[f.key]} onChange={handleFilter(f.key)} />
            ))}
          </div>
        </div>

        <button onClick={runScreening} disabled={loading || !symbolList.length}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2">
          {loading && <Spinner size={4} />}スクリーニング実行
        </button>
      </div>

      {error && <ErrorMsg message={error} />}

      {!loading && ran && results.length === 0 && !error && (
        <div className="text-center text-slate-400 py-8">条件に該当する銘柄が見つかりませんでした</div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-sm text-slate-400 mb-2">{results.length}銘柄が該当</p>
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
        </div>
      )}

      {!ran && (
        <div className="text-center text-slate-400 py-8">市場を選び、「スクリーニング実行」をクリックすると結果が表示されます</div>
      )}
    </div>
  );
}
