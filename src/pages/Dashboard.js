import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchQuote, fetchV7Quotes, INDICES, DEFAULT_WATCHLIST, WATCH_CATEGORIES } from '../api/yahoo';
import { Spinner } from '../components/Loading';
import PriceChange from '../components/PriceChange';
import SymbolSearch from '../components/SymbolSearch';

function IndexCard({ symbol, name }) {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchQuote(symbol).then(setData).catch(e => setError(e.message));
  }, [symbol]);
  return (
    <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700 hover:border-slate-500 transition-colors">
      <div className="text-slate-400 text-xs mb-1">{name}</div>
      {error && <div className="text-red-400 text-xs">取得失敗</div>}
      {data ? (
        <>
          <div className="text-xl font-bold">{data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className="flex gap-3 mt-1 text-sm">
            <PriceChange value={data.change} suffix="" />
            <PriceChange value={data.changePct} />
          </div>
        </>
      ) : !error && (
        <div className="flex items-center gap-2 mt-2"><Spinner size={4} /><span className="text-slate-400 text-xs">読込中...</span></div>
      )}
    </div>
  );
}

function WatchCard({ symbol, name, quoteData: q, onRemove }) {
  const fmtNum = (v, d = 2) => v != null ? v.toFixed(d) : '—';
  const fmtDiv = (v) => v != null ? `${(v * 100).toFixed(2)}%` : '—';
  return (
    <Link to={`/stock/${symbol}`}>
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer relative group">
        {onRemove && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs p-1"
            title="削除"
          >✕</button>
        )}
        <div className="flex justify-between items-start mb-2 pr-5">
          <div>
            <div className="font-semibold text-sm">{name}</div>
            <div className="text-slate-400 text-xs">{symbol}</div>
          </div>
          {q ? (
            <div className="text-right">
              <div className="font-bold">{q.regularMarketPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}</div>
              <PriceChange value={q.regularMarketChangePercent} />
            </div>
          ) : <Spinner size={4} />}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-400">
          <div><div>PER</div><div className="text-slate-200">{fmtNum(q?.trailingPE)}</div></div>
          <div><div>PBR</div><div className="text-slate-200">{fmtNum(q?.priceToBook)}</div></div>
          <div><div>配当利回り</div><div className="text-slate-200">{fmtDiv(q?.dividendYield)}</div></div>
        </div>
      </div>
    </Link>
  );
}

function BuffettIndicator() {
  const value = { ratio: 1.85, assessment: '割高', gdp: 27.36, marketCap: 50.6 };
  const color = value.ratio > 1.5 ? 'text-red-400' : value.ratio > 1.0 ? 'text-yellow-400' : 'text-emerald-400';
  return (
    <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
      <h3 className="text-slate-400 text-sm mb-3">バフェット指標（米国）</h3>
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold ${color}`}>{(value.ratio * 100).toFixed(0)}%</span>
        <span className={`text-lg mb-1 ${color}`}>{value.assessment}</span>
      </div>
      <div className="mt-3 text-xs text-slate-400 space-y-1">
        <div>米国株式時価総額: <span className="text-slate-200">${value.marketCap}兆</span></div>
        <div>米国GDP: <span className="text-slate-200">${value.gdp}兆</span></div>
        <div className="mt-2 text-slate-500">※ 100%未満: 割安　100-150%: 適正　150%超: 割高</div>
      </div>
      <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${value.ratio > 1.5 ? 'bg-red-500' : 'bg-yellow-500'}`}
          style={{ width: `${Math.min(value.ratio / 2.5 * 100, 100)}%` }} />
      </div>
    </div>
  );
}

const RANKING_TYPES = [
  { key: 'most_actives', label: '出来高上位' },
  { key: 'day_gainers',  label: '値上がり上位' },
  { key: 'day_losers',   label: '値下がり上位' },
];

function RankingPanel() {
  const [type, setType]       = useState('most_actives');
  const [quotes, setQuotes]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/ranking?type=${type}&count=10`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setQuotes(data.quotes ?? []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm">ランキング TOP10</h2>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {RANKING_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner size={5} /></div>}
      {error   && <div className="text-red-400 text-xs py-4 text-center">{error}</div>}
      {!loading && !error && quotes.length === 0 && (
        <div className="text-slate-400 text-xs py-4 text-center">データなし</div>
      )}

      {!loading && quotes.length > 0 && (
        <div className="space-y-0.5">
          {quotes.map((q, i) => (
            <Link key={q.symbol} to={`/stock/${q.symbol}`}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group">
              <span className="text-slate-500 text-xs w-5 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
                  {q.symbol}
                </div>
                {q.shortName && (
                  <div className="text-slate-400 text-xs truncate">{q.shortName}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium">
                  {q.regularMarketPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}
                </div>
                {q.regularMarketChangePercent != null && (
                  <PriceChange value={q.regularMarketChangePercent} />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState('custom');
  const [customList, setCustomList] = useState(() => {
    try {
      const saved = localStorage.getItem('watchlist');
      return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
    } catch { return DEFAULT_WATCHLIST; }
  });
  const [quoteMap, setQuoteMap] = useState({});

  const category     = WATCH_CATEGORIES.find(c => c.key === selectedCategory);
  const currentStocks = selectedCategory === 'custom' ? customList : (category?.stocks ?? []);
  const stocksKey    = currentStocks.map(s => s.symbol).join(',');

  useEffect(() => {
    if (!currentStocks.length) return;
    fetchV7Quotes(currentStocks.map(s => s.symbol))
      .then(results => {
        const map = {};
        results.forEach(r => { map[r.symbol] = r; });
        setQuoteMap(map);
      })
      .catch(() => {});
  }, [stocksKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const addToWatchlist = useCallback((stock) => {
    setCustomList(prev => {
      if (prev.find(s => s.symbol === stock.symbol)) return prev;
      const next = [...prev, { symbol: stock.symbol, name: stock.name || stock.symbol }];
      try { localStorage.setItem('watchlist', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol) => {
    setCustomList(prev => {
      const next = prev.filter(s => s.symbol !== symbol);
      try { localStorage.setItem('watchlist', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <section>
        <h2 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">主要指数</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {INDICES.map(idx => <IndexCard key={idx.symbol} {...idx} />)}
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <section>
            <h2 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">バフェット指標</h2>
            <BuffettIndicator />
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wide">ウォッチリスト</h2>
              <select
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value); setQuoteMap({}); }}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {WATCH_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>

            {selectedCategory === 'custom' && (
              <div className="mb-3">
                <SymbolSearch
                  onSelect={r => addToWatchlist({ symbol: r.symbol, name: r.shortname || r.shortName || r.longname || r.longName || r.symbol })}
                  placeholder="銘柄コード・名前で検索して追加..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentStocks.map(stock => (
                <WatchCard
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                  quoteData={quoteMap[stock.symbol]}
                  onRemove={selectedCategory === 'custom' ? () => removeFromWatchlist(stock.symbol) : null}
                />
              ))}
            </div>
            {!currentStocks.length && selectedCategory === 'custom' && (
              <div className="text-center text-slate-400 py-8">上の検索ボックスから銘柄を追加してください</div>
            )}
          </section>
        </div>

        <div className="lg:w-72 shrink-0">
          <RankingPanel />
        </div>
      </div>
    </div>
  );
}
