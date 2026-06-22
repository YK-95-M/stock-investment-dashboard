import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchQuote, fetchSummary, INDICES, DEFAULT_WATCHLIST } from '../api/yahoo';
import { ErrorMsg, Spinner } from '../components/Loading';
import PriceChange from '../components/PriceChange';

function IndexCard({ symbol, name }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { fetchQuote(symbol).then(setData).catch(e => setError(e.message)); }, [symbol]);
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

function WatchCard({ symbol, name }) {
  const [quote, setQuote] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    Promise.all([fetchQuote(symbol), fetchSummary(symbol).catch(() => null)])
      .then(([q, s]) => { setQuote(q); setSummary(s); })
      .catch(e => setError(e.message));
  }, [symbol]);
  const detail = summary?.summaryDetail;
  const stats = summary?.defaultKeyStatistics;
  return (
    <Link to={`/stock/${symbol}`}>
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="font-semibold text-sm">{name}</div>
            <div className="text-slate-400 text-xs">{symbol}</div>
          </div>
          {quote && (
            <div className="text-right">
              <div className="font-bold">{quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <PriceChange value={quote.changePct} />
            </div>
          )}
        </div>
        {error && <ErrorMsg message="データ取得失敗" />}
        {!quote && !error && <div className="flex gap-2 items-center"><Spinner size={4} /><span className="text-xs text-slate-400">読込中...</span></div>}
        {quote && (
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-400">
            <div><div>PER</div><div className="text-slate-200">{detail?.trailingPE?.fmt ?? '—'}</div></div>
            <div><div>PBR</div><div className="text-slate-200">{stats?.priceToBook?.fmt ?? '—'}</div></div>
            <div><div>配当利回り</div><div className="text-slate-200">{detail?.dividendYield?.fmt ?? '—'}</div></div>
          </div>
        )}
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

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <section>
        <h2 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">主要指数</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {INDICES.map(idx => <IndexCard key={idx.symbol} {...idx} />)}
        </div>
      </section>
      <section>
        <h2 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">バフェット指標</h2>
        <BuffettIndicator />
      </section>
      <section>
        <h2 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wide">ウォッチリスト</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEFAULT_WATCHLIST.map(stock => <WatchCard key={stock.symbol} {...stock} />)}
        </div>
      </section>
    </div>
  );
}
