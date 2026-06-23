import { getYahooSession } from './_session.js';

const VALID_IDS     = ['most_actives', 'day_gainers', 'day_losers'];
const VALID_REGIONS = ['US', 'JP'];

// Top 30 TSE stocks by market cap — fetched directly and sorted dynamically
const JP_STOCKS = [
  '7203.T','6758.T','9984.T','8306.T','6861.T','8035.T','9432.T',
  '6954.T','7267.T','8316.T','6902.T','4519.T','7751.T','6367.T',
  '4063.T','9433.T','8031.T','9020.T','8058.T','4661.T','6098.T',
  '4543.T','6501.T','4568.T','6594.T','7974.T','8411.T','6723.T',
  '3382.T','9434.T',
].join(',');

export default async function handler(req, res) {
  const { type = 'most_actives', count = 10, region = 'US' } = req.query;
  if (!VALID_IDS.includes(type)) return res.status(400).json({ error: 'invalid type' });
  const safeRegion = VALID_REGIONS.includes(region) ? region : 'US';
  const n = Math.min(parseInt(count, 10) || 10, 25);

  res.setHeader('Cache-Control', 'public, max-age=60');

  try {
    if (safeRegion === 'JP') {
      const { cookies, crumb, UA } = await getYahooSession();
      const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(JP_STOCKS)}&crumb=${encodeURIComponent(crumb)}&formatted=false`;
      const r = await fetch(url, {
        headers: {
          'User-Agent': UA, 'Cookie': cookies,
          'Accept': 'application/json', 'Referer': 'https://finance.yahoo.com/',
        },
      });
      if (!r.ok) return res.status(r.status).json({ error: `Yahoo returned ${r.status}` });
      const data = await r.json();
      let quotes = data.quoteResponse?.result ?? [];

      if (type === 'most_actives') {
        quotes = quotes.filter(q => q.regularMarketVolume != null)
          .sort((a, b) => (b.regularMarketVolume ?? 0) - (a.regularMarketVolume ?? 0));
      } else if (type === 'day_gainers') {
        quotes = quotes.filter(q => q.regularMarketChangePercent != null)
          .sort((a, b) => (b.regularMarketChangePercent ?? 0) - (a.regularMarketChangePercent ?? 0));
      } else {
        quotes = quotes.filter(q => q.regularMarketChangePercent != null)
          .sort((a, b) => (a.regularMarketChangePercent ?? 0) - (b.regularMarketChangePercent ?? 0));
      }

      return res.json({ quotes: quotes.slice(0, n) });
    }

    // US: predefined screener
    const params = new URLSearchParams({
      count: String(n), scrIds: type, formatted: 'false', region: 'US', lang: 'en-US',
    });
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://finance.yahoo.com/',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) return res.status(response.status).json({ error: `Yahoo Finance error: ${response.status}` });
    const data = await response.json();
    const quotes = data?.finance?.result?.[0]?.quotes ?? [];
    res.json({ quotes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
