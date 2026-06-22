async function fetchAPI(endpoint, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${endpoint}${query ? '?' + query : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchQuote(symbol) {
  const data = await fetchAPI('/api/chart', { symbol, interval: '1d', range: '5d' });
  const meta = data.chart.result[0].meta;
  const closes = data.chart.result[0].indicators.quote[0].close;
  const prev = closes[closes.length - 2] ?? meta.previousClose;
  const current = meta.regularMarketPrice;
  const change = current - prev;
  return { symbol, price: current, change, changePct: (change / prev) * 100, meta };
}

export async function fetchChart(symbol, interval = '1d', range = '6mo') {
  const data = await fetchAPI('/api/chart', { symbol, interval, range });
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  return timestamps.map((t, i) => ({
    date: new Date(t * 1000).toLocaleDateString('ja-JP'),
    open: quotes.open[i], high: quotes.high[i],
    low: quotes.low[i], close: quotes.close[i], volume: quotes.volume[i],
  })).filter(d => d.close != null);
}

export async function fetchSummary(symbol) {
  const data = await fetchAPI('/api/summary', { symbol });
  return data.quoteSummary.result[0];
}

export async function fetchV7Quotes(symbols) {
  if (!symbols.length) return [];
  const data = await fetchAPI('/api/v7quote', { symbols: symbols.join(',') });
  return data.quoteResponse?.result ?? [];
}

export async function searchSymbols(q) {
  const data = await fetchAPI('/api/search', { q });
  return (data.quotes ?? []).filter(r => ['EQUITY', 'ETF', 'INDEX'].includes(r.quoteType));
}

export const INDICES = [
  { symbol: '^N225', name: '日経225' },
  { symbol: '^TOPIX', name: 'TOPIX' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^GSPC', name: 'S&P500' },
  { symbol: '^DJI', name: 'ダウ' },
];

export const DEFAULT_WATCHLIST = [
  { symbol: '7203.T', name: 'トヨタ自動車' },
  { symbol: '6758.T', name: 'ソニーグループ' },
  { symbol: '9984.T', name: 'ソフトバンクG' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'NVDA', name: 'NVIDIA' },
];

export const WATCH_CATEGORIES = [
  { key: 'custom', label: 'マイリスト' },
  {
    key: 'space', label: '宇宙関連',
    stocks: [
      { symbol: '7011.T', name: '三菱重工業' },
      { symbol: '7012.T', name: '川崎重工業' },
      { symbol: 'RKLB', name: 'Rocket Lab' },
      { symbol: 'LMT', name: 'Lockheed Martin' },
      { symbol: 'BA', name: 'Boeing' },
      { symbol: 'ASTS', name: 'AST SpaceMobile' },
    ],
  },
  {
    key: 'drone', label: 'ドローン関連',
    stocks: [
      { symbol: 'JOBY', name: 'Joby Aviation' },
      { symbol: 'ACHR', name: 'Archer Aviation' },
      { symbol: 'AVAV', name: 'AeroVironment' },
      { symbol: 'EH', name: 'EHang Holdings' },
      { symbol: '6954.T', name: 'ファナック' },
    ],
  },
  {
    key: 'semiconductor', label: '半導体',
    stocks: [
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'AMD', name: 'AMD' },
      { symbol: 'TSM', name: 'TSMC' },
      { symbol: 'ASML', name: 'ASML' },
      { symbol: '8035.T', name: '東京エレクトロン' },
      { symbol: '6723.T', name: 'ルネサス' },
    ],
  },
  {
    key: 'ai', label: 'AI・テック',
    stocks: [
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'META', name: 'Meta' },
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'AMZN', name: 'Amazon' },
      { symbol: '4307.T', name: '野村総研' },
    ],
  },
  {
    key: 'finance', label: '金融',
    stocks: [
      { symbol: '8306.T', name: '三菱UFJ' },
      { symbol: '8316.T', name: '三井住友 FG' },
      { symbol: '8411.T', name: 'みずほFG' },
      { symbol: 'JPM', name: 'JPMorgan' },
      { symbol: 'GS', name: 'Goldman Sachs' },
    ],
  },
];
