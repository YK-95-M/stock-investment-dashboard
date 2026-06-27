import * as XLSX from 'xlsx';

// JPX publishes daily updated listed-company Excel file
const JPX_URL =
  'https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vgy-att/data_j.xls';

let _stocks = null;
let _expiry = 0;
const TTL = 12 * 60 * 60 * 1000; // 12 hours

async function loadJPX() {
  const now = Date.now();
  if (_stocks && now < _expiry) return _stocks;

  const resp = await fetch(JPX_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/vnd.ms-excel, */*',
      Referer: 'https://www.jpx.co.jp/',
    },
  });
  if (!resp.ok) throw new Error(`JPX returned ${resp.status}`);

  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Locate header row (first row containing "コード")
  let hi = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i].some(c => String(c).includes('コード'))) { hi = i; break; }
  }
  if (hi < 0) throw new Error('Header row not found in JPX file');

  const hdr = rows[hi].map(c => String(c).trim());
  const codeI   = hdr.findIndex(h => /コード/.test(h));
  const nameI   = hdr.findIndex(h => /銘柄名/.test(h));
  const marketI = hdr.findIndex(h => /市場区分/.test(h));
  if (codeI < 0 || nameI < 0) throw new Error('Required columns missing');

  const stocks = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const raw  = String(r[codeI] ?? '').trim();
    const code = raw.padStart(4, '0');
    const name = String(r[nameI] ?? '').trim();
    const seg  = marketI >= 0 ? String(r[marketI] ?? '').trim() : '';
    if (!raw || !name || raw === '0000') continue;
    stocks.push({ symbol: `${code}.T`, name, seg });
  }

  _stocks = stocks;
  _expiry = now + TTL;
  return stocks;
}

export default async function handler(req, res) {
  const { market } = req.query;

  try {
    const all = await loadJPX();

    let filtered = all;
    if (market === 'prime')    filtered = all.filter(s => s.seg.includes('プライム'));
    else if (market === 'standard') filtered = all.filter(s => s.seg.includes('スタンダード'));
    else if (market === 'growth')   filtered = all.filter(s => s.seg.includes('グロース'));
    else if (market === 'pro')      filtered = all.filter(s => s.seg.includes('PRO'));

    const stocks = filtered
      .map(({ symbol, name }) => ({ symbol, name }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=43200');
    res.json({ stocks, total: stocks.length });
  } catch (e) {
    // Return empty so the client falls back to its hardcoded list
    res.status(500).json({ error: e.message, stocks: [], total: 0 });
  }
}
