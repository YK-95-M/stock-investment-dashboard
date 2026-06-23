const VALID_IDS    = ['most_actives', 'day_gainers', 'day_losers'];
const VALID_REGIONS = ['US', 'JP'];

export default async function handler(req, res) {
  const { type = 'most_actives', count = 10, region = 'US' } = req.query;
  if (!VALID_IDS.includes(type)) return res.status(400).json({ error: 'invalid type' });
  const safeRegion = VALID_REGIONS.includes(region) ? region : 'US';

  const params = new URLSearchParams({
    count: String(count),
    scrIds: type,
    formatted: 'false',
    region: safeRegion,
    lang: safeRegion === 'JP' ? 'ja-JP' : 'en-US',
  });
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?${params}`;
  try {
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
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ quotes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
