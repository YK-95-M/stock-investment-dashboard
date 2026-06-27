import { getYahooSession, clearYahooSession } from './_session.js';

export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const modules = 'summaryDetail,financialData,defaultKeyStatistics,incomeStatementHistory,balanceSheetHistory,assetProfile';
  try {
    const { cookies, crumb, UA } = await getYahooSession();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
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
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
