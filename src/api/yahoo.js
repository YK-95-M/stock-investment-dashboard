const PROXY = 'https://corsproxy.io/?url=';
const BASE = 'https://query1.finance.yahoo.com';

async function fetchYahoo(path) {
  const url = `${PROXY}${encodeURIComponent(BASE + path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchQuote(symbol) {
  const data = await fetchYahoo(`/v8/finance/chart/${symbol}?interval=1d&range=5d`);
  const meta = data.chart.result[0].meta;
  const closes = data.chart.result[0].indicators.quote[0].close;
  const prev = closes[closes.length - 2] ?? meta.previousClose;
  const current = meta.regularMarketPrice;
  const change = current - prev;
  return { symbol, price: current, change, changePct: (change / prev) * 100, meta };
}

export async function fetchChart(symbol, interval = '1d', range = '6mo') {
  const data = await fetchYahoo(`/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
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
  const data = await fetchYahoo(
    `/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,financialData,defaultKeyStatistics,incomeStatementHistory,assetProfile`
  );
  return data.quoteSummary.result[0];
}

export const INDICES = [
  { symbol: '^N225', name: '日経225' },
  { symbol: '^TOPX', name: 'TOPIX' },
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
