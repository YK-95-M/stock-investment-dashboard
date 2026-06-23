const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let _cache = null;
let _expiry = 0;

export async function getYahooSession(force = false) {
  const now = Date.now();
  if (!force && _cache && now < _expiry) return _cache;

  const pageRes = await fetch('https://finance.yahoo.com/', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
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
    throw new Error('Yahoo Finance crumb fetch failed');
  }

  _cache = { cookies, crumb, UA };
  _expiry = now + 5 * 60 * 1000;
  return _cache;
}

export function clearYahooSession() {
  _cache = null;
  _expiry = 0;
}
