import { getYahooSession, clearYahooSession } from './_session.js';

export default async function handler(req, res) {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });
  try {
    const { cookies, crumb, UA } = await getYahooSession();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}&formatted=false`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Cookie': cookies,
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 429) clearYahooSession();
      return res.status(response.status).json({ error: `Yahoo returned ${response.status}` });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
