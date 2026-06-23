import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchQuote, fetchV7Quotes, INDICES, DEFAULT_WATCHLIST } from '../api/yahoo';
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
      ) : !error && <div className="flex items-center gap-2 mt-2"><Spinner size={4} /><span className="text-slate-400 text-xs">読込中...</span></div>}
    </div>
  );
}

function WatchCard({ symbol, name, quoteData: q, onRemove }) {
  const fmtNum = (v, d = 2) => v != null ? v.toFixed(d) : '—';
  const fmtDiv = (v) => v != null ? `${(v * 100).toFixed(2)}%` : '—';
  return (
    <Link to={`/stock/${symbol}`}>
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer relative group">
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs p-1"
          title="削除">✕</button>
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
        <div className="mt-2 text-slate-500">※ 100%未満: 割安　100–150%: 適正　150%超: 割高</div>
      </div>
      <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${value.ratio > 1.5 ? 'bg-red-500' : 'bg-yellow-500'}`}
          style={{ width: `${Math.min(value.ratio / 2.5 * 100, 100)}%` }} />
      </div>
    </div>
  );
}

const RANKING_TYPES   = [
  { key: 'most_actives', label: '出来高上位' },
  { key: 'day_gainers',  label: '値上がり上位' },
  { key: 'day_losers',   label: '値下がり上位' },
];
const RANKING_REGIONS = [
  { key: 'US', label: '米国' },
  { key: 'JP', label: '日本' },
];

function RankingPanel() {
  const [type,   setType]   = useState('most_actives');
  const [region, setRegion] = useState('US');
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/ranking?type=${type}&count=10&region=${region}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setQuotes(data.quotes ?? []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [type, region]);

  return (
    <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">ランキング TOP10</h2>
        <select value={type} onChange={e => setType(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none">
          {RANKING_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>
      <div className="flex gap-1 mb-4">
        {RANKING_REGIONS.map(r => (
          <button key={r.key} onClick={() => setRegion(r.key)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              region === r.key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}>{r.label}</button>
        ))}
      </div>
      {loading && <div className="flex justify-center py-8"><Spinner size={5} /></div>}
      {error   && <div className="text-red-400 text-xs py-4 text-center">{error}</div>}
      {!loading && !error && quotes.length === 0 && <div className="text-slate-400 text-xs py-4 text-center">データなし</div>}
      {!loading && quotes.length > 0 && (
        <div className="space-y-0.5">
          {quotes.map((q, i) => (
            <Link key={q.symbol} to={`/stock/${q.symbol}`}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group">
              <span className="text-slate-500 text-xs w-5 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate group-hover:text-blue-400 transition-colors">{q.symbol}</div>
                {q.shortName && <div className="text-slate-400 text-xs truncate">{q.shortName}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium">{q.regularMarketPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}</div>
                {q.regularMarketChangePercent != null && <PriceChange value={q.regularMarketChangePercent} />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_CATEGORIES = [
  {
    id: 'mylist', name: 'マイリスト',
    stocks: DEFAULT_WATCHLIST,
  },
  {
    id: 'semiconductor', name: '半導体',
    stocks: [
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'AMD',  name: 'AMD' },
      { symbol: 'TSM',  name: 'TSMC' },
      { symbol: 'ASML', name: 'ASML' },
      { symbol: '8035.T', name: '東京エレクトロン' },
      { symbol: 'AVGO', name: 'Broadcom' },
    ],
  },
  {
    id: 'ai', name: 'AI・テック',
    stocks: [
      { symbol: 'MSFT',  name: 'Microsoft' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'META',  name: 'Meta' },
      { symbol: 'AMZN',  name: 'Amazon' },
      { symbol: '4307.T', name: '野村総研' },
    ],
  },
];

export default function Dashboard() {
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('watchCategories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CATEGORIES;
  });
  const [activeCatId, setActiveCatId] = useState(() => {
    try {
      const saved = localStorage.getItem('watchCategories');
      if (saved) return JSON.parse(saved)[0]?.id ?? 'mylist';
    } catch {}
    return 'mylist';
  });
  const [quoteMap,    setQuoteMap]    = useState({});
  const [addingCat,   setAddingCat]   = useState(false);
  const [newCatName,  setNewCatName]  = useState('');
  const newCatInputRef = useRef(null);

  const activeCategory = categories.find(c => c.id === activeCatId) ?? categories[0];
  const currentStocks  = activeCategory?.stocks ?? [];
  const stocksKey      = currentStocks.map(s => s.symbol).join(',');

  useEffect(() => {
    if (!currentStocks.length) { setQuoteMap({}); return; }
    fetchV7Quotes(currentStocks.map(s => s.symbol))
      .then(results => {
        const map = {};
        results.forEach(r => { map[r.symbol] = r; });
        setQuoteMap(map);
      })
      .catch(() => {});
  }, [stocksKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (cats) => {
    setCategories(cats);
    try { localStorage.setItem('watchCategories', JSON.stringify(cats)); } catch {}
  };

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const newCat = { id: `cat-${Date.now()}`, name, stocks: [] };
    persist([...categories, newCat]);
    setActiveCatId(newCat.id);
    setNewCatName('');
    setAddingCat(false);
  };

  const deleteCategory = (id) => {
    if (categories.length <= 1) return;
    const updated = categories.filter(c => c.id !== id);
    persist(updated);
    if (activeCatId === id) setActiveCatId(updated[0].id);
  };

  const addStock = useCallback((r) => {
    const stock = { symbol: r.symbol, name: r.shortname || r.shortName || r.longname || r.longName || r.symbol };
    setCategories(prev => {
      const updated = prev.map(c =>
        c.id === activeCatId && !c.stocks.find(s => s.symbol === stock.symbol)
          ? { ...c, stocks: [...c.stocks, stock] }
          : c
      );
      try { localStorage.setItem('watchCategories', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [activeCatId]);

  const removeStock = useCallback((symbol) => {
    setCategories(prev => {
      const updated = prev.map(c =>
        c.id === activeCatId
          ? { ...c, stocks: c.stocks.filter(s => s.symbol !== symbol) }
          : c
      );
      try { localStorage.setItem('watchCategories', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [activeCatId]);

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
            <h2 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">ウォッチリスト</h2>

            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-3 scrollbar-hide">
              {categories.map(c => (
                <div key={c.id} className="flex items-center shrink-0">
                  <button
                    onClick={() => setActiveCatId(c.id)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeCatId === c.id
                        ? 'bg-blue-600 text-white rounded-l-lg' + (categories.length > 1 ? '' : ' rounded-r-lg')
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-lg'
                    }`}>
                    {c.name}
                    <span className="ml-1.5 text-xs opacity-60">{c.stocks.length}</span>
                  </button>
                  {activeCatId === c.id && categories.length > 1 && (
                    <button
                      onClick={() => { if (window.confirm(`「${c.name}」を削除しますか？`)) deleteCategory(c.id); }}
                      className="px-1.5 py-1.5 bg-blue-700 hover:bg-red-700 text-blue-200 hover:text-white rounded-r-lg text-xs transition-colors">
                      ×
                    </button>
                  )}
                </div>
              ))}

              {addingCat ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    ref={newCatInputRef}
                    autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addCategory();
                      if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); }
                    }}
                    className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-xs w-24 outline-none focus:border-blue-500"
                    placeholder="カテゴリ名"
                  />
                  <button onClick={addCategory} className="text-blue-400 hover:text-blue-200 text-xs px-1.5 py-1">OK</button>
                  <button onClick={() => { setAddingCat(false); setNewCatName(''); }} className="text-slate-400 text-xs px-1">×</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCat(true)}
                  className="shrink-0 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs rounded hover:bg-slate-700 transition-colors">
                  + カテゴリ追加
                </button>
              )}
            </div>

            {/* Add stock search */}
            <div className="mb-3 bg-slate-800/40 border border-dashed border-slate-600 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2">+ 「{activeCategory?.name ?? ''}」に銘柄を追加</p>
              <SymbolSearch onSelect={addStock} placeholder="銘柄名・コードで検索…" />
              <p className="text-xs text-slate-500 mt-1.5">候補をクリックで追加　・　カードの✕で削除</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentStocks.map(stock => (
                <WatchCard
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                  quoteData={quoteMap[stock.symbol]}
                  onRemove={() => removeStock(stock.symbol)}
                />
              ))}
            </div>
            {!currentStocks.length && (
              <div className="text-center text-slate-400 py-8">↑ 上の検索ボックスから銘柄を追加してください</div>
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
