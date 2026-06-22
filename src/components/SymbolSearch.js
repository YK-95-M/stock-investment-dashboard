import { useState, useEffect, useRef } from 'react';
import { searchSymbols } from '../api/yahoo';

export default function SymbolSearch({ onSelect, placeholder = '銘柄を検索...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchSymbols(query);
        setResults(data.slice(0, 8));
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (r) => {
    onSelect(r);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 gap-2 focus-within:border-blue-500 transition-colors">
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-400 outline-none"
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
          {results.map(r => (
            <button
              key={r.symbol}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
              onMouseDown={() => handleSelect(r)}
            >
              <div className="min-w-0">
                <span className="font-medium text-sm text-slate-100">{r.symbol}</span>
                <span className="text-slate-400 text-xs ml-2 truncate">{r.shortname || r.longname}</span>
              </div>
              <span className="text-slate-500 text-xs ml-2 flex-shrink-0">{r.exchDisp || r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
