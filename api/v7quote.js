const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getYahooSession() {
  const pageRes = await fetch('https://finance.yahoo.com/', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const raw = pageRes.headers.get('set-cookie') ?? '';
  const cookies = raw
    .split(/,(?=[A-Za-z_-]+=)/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, 'Cookie': cookies, 'Accept': '*/*' },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes('Bad Request') || crumb.includes('<')) {
    throw new Error('crumb fetch failed');
  }
  return { cookies, crumb };
}

export default async function handler(req, res) {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });
  try {
    const { cookies, crumb } = await getYahooSession();
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
    if (!response.ok) return res.status(response.status).json({ error: `Yahoo returned ${response.status}` });
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
