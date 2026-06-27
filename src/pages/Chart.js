import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useChart from '../hooks/useChart';
import useQuote from '../hooks/useQuote';
import { Spinner } from '../components/Loading';
import SymbolSearch from '../components/SymbolSearch';
import PriceChange from '../components/PriceChange';
import { fetchV7Quotes, fetchSummary } from '../api/yahoo';

// Markets that load their stock list dynamically from JPX
const DYNAMIC_JP = { tse_prime: 'prime', tse_standard: 'standard', tse_growth: 'growth' };

// In-memory + sessionStorage cache so switching markets doesn't re-fetch
const _memCache = {};
async function fetchMarketStocks(market) {
  if (_memCache[market]) return _memCache[market];
  try {
    const ss = sessionStorage.getItem(`stocks_${market}`);
    if (ss) { _memCache[market] = JSON.parse(ss); return _memCache[market]; }
  } catch {}
  const res = await fetch(`/api/stocklist?market=${market}`);
  const data = await res.json();
  if (!Array.isArray(data.stocks) || !data.stocks.length) throw new Error(data.error ?? 'empty');
  _memCache[market] = data.stocks;
  try { sessionStorage.setItem(`stocks_${market}`, JSON.stringify(data.stocks)); } catch {}
  return data.stocks;
}

function formatMarketCap(v) {
  if (v == null) return '—';
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}兆`;
  if (v >= 1e8)  return `${(v / 1e8).toFixed(0)}億`;
  if (v >= 1e6)  return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString();
}

function fmt(v, digits = 2) {
  return v != null ? Number(v).toFixed(digits) : '—';
}

const CHART_MARKETS = [
  { key: 'tse_prime', label: '東証プライム', stocks: [
    { symbol: '1925.T', name: '大和ハウス工業' },
    { symbol: '1928.T', name: '積水ハウス' },
    { symbol: '2502.T', name: 'アサヒグループHD' },
    { symbol: '2503.T', name: 'キリンHD' },
    { symbol: '2801.T', name: 'キッコーマン' },
    { symbol: '2802.T', name: '味の素' },
    { symbol: '2897.T', name: '日清食品HD' },
    { symbol: '2914.T', name: 'JT' },
    { symbol: '3382.T', name: 'セブン&アイHD' },
    { symbol: '3402.T', name: '東レ' },
    { symbol: '3407.T', name: '旭化成' },
    { symbol: '3659.T', name: 'ネクソン' },
    { symbol: '4004.T', name: 'レゾナックHD' },
    { symbol: '4063.T', name: '信越化学工業' },
    { symbol: '4188.T', name: '三菱ケミカルG' },
    { symbol: '4307.T', name: '野村総合研究所' },
    { symbol: '4452.T', name: '花王' },
    { symbol: '4502.T', name: '武田薬品工業' },
    { symbol: '4503.T', name: 'アステラス製薬' },
    { symbol: '4519.T', name: '中外製薬' },
    { symbol: '4523.T', name: 'エーザイ' },
    { symbol: '4543.T', name: 'テルモ' },
    { symbol: '4568.T', name: '第一三共' },
    { symbol: '4578.T', name: '大塚HD' },
    { symbol: '4661.T', name: 'オリエンタルランド' },
    { symbol: '4689.T', name: 'LINEヤフー' },
    { symbol: '5108.T', name: 'ブリヂストン' },
    { symbol: '5401.T', name: '日本製鉄' },
    { symbol: '5713.T', name: '住友金属鉱山' },
    { symbol: '5802.T', name: '住友電気工業' },
    { symbol: '6098.T', name: 'リクルートHD' },
    { symbol: '6146.T', name: 'ディスコ' },
    { symbol: '6178.T', name: '日本郵政' },
    { symbol: '6273.T', name: 'SMC' },
    { symbol: '6301.T', name: 'コマツ' },
    { symbol: '6326.T', name: 'クボタ' },
    { symbol: '6361.T', name: '荏原製作所' },
    { symbol: '6367.T', name: 'ダイキン工業' },
    { symbol: '6471.T', name: 'NSK' },
    { symbol: '6479.T', name: 'ミネベアミツミ' },
    { symbol: '6501.T', name: '日立製作所' },
    { symbol: '6503.T', name: '三菱電機' },
    { symbol: '6506.T', name: '安川電機' },
    { symbol: '6594.T', name: 'ニデック' },
    { symbol: '6645.T', name: 'オムロン' },
    { symbol: '6702.T', name: '富士通' },
    { symbol: '6723.T', name: 'ルネサスエレクトロニクス' },
    { symbol: '6724.T', name: 'セイコーエプソン' },
    { symbol: '6752.T', name: 'パナソニックHD' },
    { symbol: '6758.T', name: 'ソニーグループ' },
    { symbol: '6762.T', name: 'TDK' },
    { symbol: '6857.T', name: 'アドバンテスト' },
    { symbol: '6861.T', name: 'キーエンス' },
    { symbol: '6902.T', name: 'デンソー' },
    { symbol: '6920.T', name: 'レーザーテック' },
    { symbol: '6954.T', name: 'ファナック' },
    { symbol: '6971.T', name: '京セラ' },
    { symbol: '6981.T', name: '村田製作所' },
    { symbol: '7011.T', name: '三菱重工業' },
    { symbol: '7201.T', name: '日産自動車' },
    { symbol: '7203.T', name: 'トヨタ自動車' },
    { symbol: '7267.T', name: '本田技研工業' },
    { symbol: '7269.T', name: 'スズキ' },
    { symbol: '7270.T', name: 'SUBARU' },
    { symbol: '7309.T', name: 'シマノ' },
    { symbol: '7733.T', name: 'オリンパス' },
    { symbol: '7751.T', name: 'キヤノン' },
    { symbol: '7832.T', name: 'バンダイナムコHD' },
    { symbol: '7974.T', name: '任天堂' },
    { symbol: '8001.T', name: '伊藤忠商事' },
    { symbol: '8002.T', name: '丸紅' },
    { symbol: '8031.T', name: '三井物産' },
    { symbol: '8035.T', name: '東京エレクトロン' },
    { symbol: '8053.T', name: '住友商事' },
    { symbol: '8058.T', name: '三菱商事' },
    { symbol: '8267.T', name: 'イオン' },
    { symbol: '8306.T', name: '三菱UFJフィナンシャルG' },
    { symbol: '8316.T', name: '三井住友フィナンシャルG' },
    { symbol: '8411.T', name: 'みずほフィナンシャルG' },
    { symbol: '8591.T', name: 'オリックス' },
    { symbol: '8601.T', name: '大和証券G本社' },
    { symbol: '8697.T', name: '日本取引所G' },
    { symbol: '8750.T', name: '第一生命HD' },
    { symbol: '8766.T', name: '東京海上HD' },
    { symbol: '8801.T', name: '三井不動産' },
    { symbol: '8802.T', name: '三菱地所' },
    { symbol: '9020.T', name: 'JR東日本' },
    { symbol: '9021.T', name: 'JR西日本' },
    { symbol: '9022.T', name: 'JR東海' },
    { symbol: '9064.T', name: 'ヤマトHD' },
    { symbol: '9101.T', name: '日本郵船' },
    { symbol: '9104.T', name: '商船三井' },
    { symbol: '9107.T', name: '川崎汽船' },
    { symbol: '9432.T', name: 'NTT' },
    { symbol: '9433.T', name: 'KDDI' },
    { symbol: '9434.T', name: 'ソフトバンク' },
    { symbol: '9735.T', name: 'セコム' },
    { symbol: '9983.T', name: 'ファーストリテイリング' },
    { symbol: '9984.T', name: 'ソフトバンクG' },
  ]},
  { key: 'us', label: 'NYSE/NASDAQ', stocks: [
    { symbol: 'AAPL',  name: 'Apple' },
    { symbol: 'ABBV',  name: 'AbbVie' },
    { symbol: 'ABT',   name: 'Abbott Labs' },
    { symbol: 'ADBE',  name: 'Adobe' },
    { symbol: 'ADI',   name: 'Analog Devices' },
    { symbol: 'ADP',   name: 'Automatic Data Processing' },
    { symbol: 'AMAT',  name: 'Applied Materials' },
    { symbol: 'AMD',   name: 'Advanced Micro Devices' },
    { symbol: 'AMGN',  name: 'Amgen' },
    { symbol: 'AMZN',  name: 'Amazon' },
    { symbol: 'AVGO',  name: 'Broadcom' },
    { symbol: 'AXP',   name: 'American Express' },
    { symbol: 'BA',    name: 'Boeing' },
    { symbol: 'BAC',   name: 'Bank of America' },
    { symbol: 'BMY',   name: 'Bristol-Myers Squibb' },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
    { symbol: 'C',     name: 'Citigroup' },
    { symbol: 'CAT',   name: 'Caterpillar' },
    { symbol: 'CI',    name: 'Cigna' },
    { symbol: 'CL',    name: 'Colgate-Palmolive' },
    { symbol: 'CMCSA', name: 'Comcast' },
    { symbol: 'COST',  name: 'Costco' },
    { symbol: 'CRM',   name: 'Salesforce' },
    { symbol: 'CSCO',  name: 'Cisco' },
    { symbol: 'CVS',   name: 'CVS Health' },
    { symbol: 'CVX',   name: 'Chevron' },
    { symbol: 'DD',    name: 'DuPont' },
    { symbol: 'DE',    name: 'John Deere' },
    { symbol: 'DHR',   name: 'Danaher' },
    { symbol: 'DIS',   name: 'Disney' },
    { symbol: 'EMR',   name: 'Emerson Electric' },
    { symbol: 'F',     name: 'Ford Motor' },
    { symbol: 'FDX',   name: 'FedEx' },
    { symbol: 'GD',    name: 'General Dynamics' },
    { symbol: 'GE',    name: 'GE Aerospace' },
    { symbol: 'GILD',  name: 'Gilead Sciences' },
    { symbol: 'GM',    name: 'General Motors' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'GS',    name: 'Goldman Sachs' },
    { symbol: 'HD',    name: 'Home Depot' },
    { symbol: 'HON',   name: 'Honeywell' },
    { symbol: 'IBM',   name: 'IBM' },
    { symbol: 'INTC',  name: 'Intel' },
    { symbol: 'JNJ',   name: 'Johnson & Johnson' },
    { symbol: 'JPM',   name: 'JPMorgan Chase' },
    { symbol: 'KO',    name: 'Coca-Cola' },
    { symbol: 'LIN',   name: 'Linde' },
    { symbol: 'LLY',   name: 'Eli Lilly' },
    { symbol: 'LMT',   name: 'Lockheed Martin' },
    { symbol: 'LOW',   name: "Lowe's" },
    { symbol: 'MA',    name: 'Mastercard' },
    { symbol: 'MCD',   name: "McDonald's" },
    { symbol: 'MDT',   name: 'Medtronic' },
    { symbol: 'META',  name: 'Meta Platforms' },
    { symbol: 'MMM',   name: '3M' },
    { symbol: 'MO',    name: 'Altria Group' },
    { symbol: 'MRK',   name: 'Merck' },
    { symbol: 'MS',    name: 'Morgan Stanley' },
    { symbol: 'MSFT',  name: 'Microsoft' },
    { symbol: 'NEE',   name: 'NextEra Energy' },
    { symbol: 'NFLX',  name: 'Netflix' },
    { symbol: 'NKE',   name: 'Nike' },
    { symbol: 'NOW',   name: 'ServiceNow' },
    { symbol: 'NVDA',  name: 'NVIDIA' },
    { symbol: 'ORCL',  name: 'Oracle' },
    { symbol: 'PEP',   name: 'PepsiCo' },
    { symbol: 'PFE',   name: 'Pfizer' },
    { symbol: 'PG',    name: 'Procter & Gamble' },
    { symbol: 'PM',    name: 'Philip Morris' },
    { symbol: 'QCOM',  name: 'Qualcomm' },
    { symbol: 'RTX',   name: 'RTX Corp' },
    { symbol: 'SBUX',  name: 'Starbucks' },
    { symbol: 'SCHW',  name: 'Charles Schwab' },
    { symbol: 'T',     name: 'AT&T' },
    { symbol: 'TGT',   name: 'Target' },
    { symbol: 'TMO',   name: 'Thermo Fisher' },
    { symbol: 'TSLA',  name: 'Tesla' },
    { symbol: 'TXN',   name: 'Texas Instruments' },
    { symbol: 'UNH',   name: 'UnitedHealth' },
    { symbol: 'UNP',   name: 'Union Pacific' },
    { symbol: 'UPS',   name: 'UPS' },
    { symbol: 'USB',   name: 'US Bancorp' },
    { symbol: 'V',     name: 'Visa' },
    { symbol: 'VZ',    name: 'Verizon' },
    { symbol: 'WFC',   name: 'Wells Fargo' },
    { symbol: 'WMT',   name: 'Walmart' },
    { symbol: 'XOM',   name: 'ExxonMobil' },
  ]},
  { key: 'tse_standard', label: '東証スタンダード', stocks: [
    { symbol: '1332.T', name: '日本水産' },
    { symbol: '1333.T', name: 'マルハニチロ' },
    { symbol: '1414.T', name: 'ショーボンドHD' },
    { symbol: '1417.T', name: 'ミライト・ワン' },
    { symbol: '1720.T', name: '東急建設' },
    { symbol: '1721.T', name: 'コムシスHD' },
    { symbol: '1801.T', name: '大成建設' },
    { symbol: '1803.T', name: '清水建設' },
    { symbol: '1812.T', name: '鹿島建設' },
    { symbol: '2002.T', name: '日清製粉G' },
    { symbol: '2201.T', name: '森永製菓' },
    { symbol: '2206.T', name: '江崎グリコ' },
    { symbol: '2282.T', name: '日本ハム' },
    { symbol: '2296.T', name: '丸大食品' },
    { symbol: '2327.T', name: '日鉄ソリューションズ' },
    { symbol: '2390.T', name: 'アクシーズ' },
    { symbol: '2462.T', name: 'ライク' },
    { symbol: '2471.T', name: 'エスプール' },
    { symbol: '2501.T', name: 'サッポロHD' },
    { symbol: '2652.T', name: 'まんだらけ' },
    { symbol: '2702.T', name: '日本マクドナルドHD' },
    { symbol: '2733.T', name: 'あらた' },
    { symbol: '2768.T', name: '双日' },
    { symbol: '2811.T', name: 'カゴメ' },
    { symbol: '2910.T', name: 'ロック・フィールド' },
    { symbol: '3105.T', name: '日清紡HD' },
    { symbol: '3201.T', name: '日本毛織' },
    { symbol: '3250.T', name: 'ADワークスG' },
    { symbol: '3349.T', name: 'コスモス薬品' },
    { symbol: '3543.T', name: 'コメダHD' },
    { symbol: '3563.T', name: 'FOOD & LIFE' },
    { symbol: '3635.T', name: 'コーエーテクモHD' },
    { symbol: '3656.T', name: 'KLab' },
    { symbol: '3769.T', name: 'GMOペイメントゲートウェイ' },
    { symbol: '3856.T', name: 'Abalance' },
    { symbol: '3965.T', name: 'キャピタル・アセット・プランニング' },
    { symbol: '4041.T', name: '日本曹達' },
    { symbol: '4061.T', name: 'デンカ' },
    { symbol: '4096.T', name: '日本カーバイド工業' },
    { symbol: '4206.T', name: 'アイカ工業' },
    { symbol: '4631.T', name: 'DIC' },
    { symbol: '4732.T', name: 'ユー・エス・エス' },
    { symbol: '4746.T', name: '東計電算' },
    { symbol: '5108.T', name: 'ブリヂストン' },
    { symbol: '5202.T', name: '日本板硝子' },
    { symbol: '5232.T', name: '住友大阪セメント' },
    { symbol: '5301.T', name: '東海カーボン' },
    { symbol: '5541.T', name: '大平洋金属' },
    { symbol: '6062.T', name: 'チャームケア・コーポレーション' },
    { symbol: '6309.T', name: '巴工業' },
    { symbol: '6369.T', name: 'トーヨーカネツ' },
    { symbol: '6460.T', name: 'セガサミーHD' },
    { symbol: '6543.T', name: '日信工業' },
    { symbol: '6635.T', name: '大日光・エンジニアリング' },
    { symbol: '7148.T', name: 'FPG' },
    { symbol: '7162.T', name: 'アストマックス' },
    { symbol: '7184.T', name: '富山第一銀行' },
    { symbol: '7508.T', name: 'G-7ホールディングス' },
    { symbol: '7532.T', name: 'パン・パシフィックHD' },
    { symbol: '7552.T', name: 'ハピネット' },
    { symbol: '7599.T', name: 'IDOM' },
    { symbol: '7717.T', name: 'ブイ・テクノロジー' },
    { symbol: '7936.T', name: 'アシックス' },
    { symbol: '8136.T', name: 'サンリオ' },
    { symbol: '8153.T', name: 'MOS FOOD SERVICES' },
    { symbol: '8160.T', name: 'ビックカメラ' },
    { symbol: '8168.T', name: 'ケーズHD' },
    { symbol: '8260.T', name: '井筒屋' },
    { symbol: '8570.T', name: 'イオンフィナンシャルサービス' },
    { symbol: '8572.T', name: 'アコム' },
    { symbol: '8609.T', name: '岡三証券G' },
    { symbol: '8614.T', name: '東洋証券' },
    { symbol: '8616.T', name: '東海東京フィナンシャルHD' },
    { symbol: '8622.T', name: '水戸証券' },
    { symbol: '9504.T', name: '中国電力' },
    { symbol: '9505.T', name: '北陸電力' },
    { symbol: '9507.T', name: '四国電力' },
    { symbol: '9511.T', name: '沖縄電力' },
    { symbol: '9719.T', name: 'SCSK' },
    { symbol: '9728.T', name: '日本管財HD' },
    { symbol: '9742.T', name: 'アイネス' },
    { symbol: '9744.T', name: 'メイテック' },
    { symbol: '9760.T', name: '進学会HD' },
    { symbol: '9795.T', name: 'ステップ' },
  ]},
  { key: 'tse_growth', label: '東証グロース', stocks: [
    { symbol: '2148.T', name: 'ITmedia' },
    { symbol: '2160.T', name: 'ジーエヌアイグループ' },
    { symbol: '2183.T', name: 'リニカル' },
    { symbol: '2323.T', name: 'fonfun' },
    { symbol: '2477.T', name: '手間いらず' },
    { symbol: '3180.T', name: 'ビューティガレージ' },
    { symbol: '3182.T', name: 'オイシックス・ラ・大地' },
    { symbol: '3465.T', name: 'ケイアイスター不動産' },
    { symbol: '3528.T', name: 'プロパティエージェント' },
    { symbol: '3626.T', name: 'TIS' },
    { symbol: '3627.T', name: 'ネットイヤーグループ' },
    { symbol: '3690.T', name: 'イルグルム' },
    { symbol: '3697.T', name: 'SHIFT' },
    { symbol: '3994.T', name: 'マネーフォワード' },
    { symbol: '4019.T', name: 'スタメン' },
    { symbol: '4053.T', name: 'SHOWROOMホールディングス' },
    { symbol: '4058.T', name: 'トヨクモ' },
    { symbol: '4169.T', name: 'ENECHANGE' },
    { symbol: '4170.T', name: '語学春秋社' },
    { symbol: '4175.T', name: 'coly' },
    { symbol: '4376.T', name: 'チームスピリット' },
    { symbol: '4418.T', name: 'JDSC' },
    { symbol: '4422.T', name: 'ヤプリ' },
    { symbol: '4429.T', name: 'リックソフト' },
    { symbol: '4447.T', name: 'ピー・ビーシステムズ' },
    { symbol: '4449.T', name: 'ギフティ' },
    { symbol: '4477.T', name: 'BASE' },
    { symbol: '4480.T', name: 'メドレー' },
    { symbol: '4485.T', name: 'JTower' },
    { symbol: '4488.T', name: 'AI inside' },
    { symbol: '4490.T', name: 'ビザスク' },
    { symbol: '4493.T', name: 'サイバーセキュリティクラウド' },
    { symbol: '4563.T', name: 'アンジェス' },
    { symbol: '4565.T', name: 'そうせいグループ' },
    { symbol: '4588.T', name: 'オンコリスバイオファーマ' },
    { symbol: '4592.T', name: 'サンバイオ' },
    { symbol: '4880.T', name: 'セルソース' },
    { symbol: '4885.T', name: 'コレクティブ・ブレイン' },
    { symbol: '5032.T', name: 'ANYCOLOR' },
    { symbol: '5064.T', name: 'TBグループ' },
    { symbol: '5842.T', name: 'ウィルスマート' },
    { symbol: '6095.T', name: 'メドピア' },
    { symbol: '6099.T', name: 'エラン' },
    { symbol: '6175.T', name: 'ネットビジョンシステムズ' },
    { symbol: '6182.T', name: 'メタリアル' },
    { symbol: '6561.T', name: 'HAREホールディングス' },
    { symbol: '7157.T', name: 'ライフネット生命' },
    { symbol: '7163.T', name: '住信SBIネット銀行' },
    { symbol: '7196.T', name: 'Casa' },
    { symbol: '9263.T', name: 'ビジョナリーHD' },
    { symbol: '9264.T', name: 'ポーラ・オルビスHD' },
  ]},
  { key: 'global', label: 'グローバル', stocks: [
    { symbol: '6758.T', name: 'ソニーグループ (日)' },
    { symbol: '6861.T', name: 'キーエンス (日)' },
    { symbol: '7203.T', name: 'トヨタ自動車 (日)' },
    { symbol: '7974.T', name: '任天堂 (日)' },
    { symbol: '8035.T', name: '東京エレクトロン (日)' },
    { symbol: '8306.T', name: '三菱UFJ (日)' },
    { symbol: '9432.T', name: 'NTT (日)' },
    { symbol: '9984.T', name: 'ソフトバンクG (日)' },
    { symbol: 'AAPL',   name: 'Apple (US)' },
    { symbol: 'AMZN',   name: 'Amazon (US)' },
    { symbol: 'ASML',   name: 'ASML (蘭)' },
    { symbol: 'BABA',   name: 'アリババ (中)' },
    { symbol: 'BIDU',   name: 'バイドゥ (中)' },
    { symbol: 'BHP',    name: 'BHP (豪)' },
    { symbol: 'BRK-B',  name: 'バークシャー (US)' },
    { symbol: 'GOOGL',  name: 'Alphabet (US)' },
    { symbol: 'JD',     name: '京東 (中)' },
    { symbol: 'JPM',    name: 'JPモルガン (US)' },
    { symbol: 'LLY',    name: 'イーライリリー (US)' },
    { symbol: 'META',   name: 'Meta (US)' },
    { symbol: 'MSFT',   name: 'Microsoft (US)' },
    { symbol: 'NVO',    name: 'ノボノルディスク (丁)' },
    { symbol: 'NVDA',   name: 'NVIDIA (US)' },
    { symbol: 'PDD',    name: 'ピンドゥオドゥオ (中)' },
    { symbol: 'RIO',    name: 'リオティント (英豪)' },
    { symbol: 'SAP',    name: 'SAP (独)' },
    { symbol: 'SHEL',   name: 'Shell (英)' },
    { symbol: 'TTE',    name: 'トタルエナジーズ (仏)' },
    { symbol: 'TSLA',   name: 'Tesla (US)' },
    { symbol: 'TSM',    name: 'TSMC (台)' },
    { symbol: 'UNH',    name: 'ユナイテッドヘルス (US)' },
    { symbol: 'V',      name: 'Visa (US)' },
    { symbol: 'XOM',    name: 'エクソンモービル (US)' },
  ]},
];

const PERIODS = [
  { label: '日足', interval: '1d', range: '6mo' },
  { label: '週足', interval: '1wk', range: '2y' },
  { label: '月足', interval: '1mo', range: '5y' },
];

const MA_OPTS = [
  { key: 'ma5',   label: 'MA5',   period: 5,   color: '#f59e0b' },
  { key: 'ma25',  label: 'MA25',  period: 25,  color: '#3b82f6' },
  { key: 'ma75',  label: 'MA75',  period: 75,  color: '#8b5cf6' },
  { key: 'ma200', label: 'MA200', period: 200, color: '#ec4899' },
];

// ── Indicator calculations ──────────────────────────────────────────────────
function calcMA(data, period) {
  return data.map((_, i) =>
    i < period - 1 ? null : data.slice(i - period + 1, i + 1).reduce((s, d) => s + d.close, 0) / period
  );
}

function calcBB(data, period = 20) {
  return data.map((_, i) => {
    if (i < period - 1) return { mid: null, upper: null, lower: null };
    const sl = data.slice(i - period + 1, i + 1);
    const mean = sl.reduce((s, d) => s + d.close, 0) / period;
    const std = Math.sqrt(sl.reduce((s, d) => s + (d.close - mean) ** 2, 0) / period);
    return { mid: mean, upper: mean + 2 * std, lower: mean - 2 * std };
  });
}

function calcRSI(data, period = 14) {
  const out = new Array(data.length).fill(null);
  if (data.length < period + 1) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d > 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  out[period] = 100 - 100 / (1 + ag / Math.max(al, 1e-10));
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i].close - data[i - 1].close;
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = 100 - 100 / (1 + ag / Math.max(al, 1e-10));
  }
  return out;
}

function calcEMA(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period) return out;
  const k = 2 / (period + 1);
  out[period - 1] = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) out[i] = closes[i] * k + out[i - 1] * (1 - k);
  return out;
}

function calcMACD(data) {
  const cl = data.map(d => d.close);
  const e12 = calcEMA(cl, 12), e26 = calcEMA(cl, 26);
  const macd = e12.map((v, i) => v != null && e26[i] != null ? v - e26[i] : null);
  const signal = new Array(data.length).fill(null);
  const start = macd.findIndex(v => v != null);
  if (start >= 0) {
    const k = 2 / 10; let prev = macd[start]; signal[start] = prev;
    for (let i = start + 1; i < data.length; i++)
      if (macd[i] != null) { prev = macd[i] * k + prev * (1 - k); signal[i] = prev; }
  }
  const hist = macd.map((v, i) => v != null && signal[i] != null ? v - signal[i] : null);
  return { macd, signal, hist };
}

function makePoly(vals, xOf, yOf, color, sw, prefix) {
  const segs = []; let cur = [];
  vals.forEach((v, i) => {
    if (v == null) { if (cur.length) { segs.push(cur); cur = []; } } else cur.push(`${xOf(i)},${yOf(v)}`);
  });
  if (cur.length) segs.push(cur);
  return segs.map((pts, si) => (
    <polyline key={`${prefix}-${si}`} points={pts.join(' ')} fill="none" stroke={color} strokeWidth={sw} />
  ));
}

// ── SVG Chart ─────────────────────────────────────────────────────────────────
const PAD = { top: 10, right: 65, bottom: 24, left: 4 };
const PH = 260, VH = 55, SH = 85, GH = 6;

function AdvancedChart({ data, chartType, enabled }) {
  const cRef = useRef(null);
  const [w, setW] = useState(0);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    if (!cRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(cRef.current);
    return () => ro.disconnect();
  }, []);

  const { sects, totalH } = useMemo(() => {
    const sects = []; let y = PAD.top;
    sects.push({ key: 'price', t: y, h: PH }); y += PH + GH;
    if (enabled.volume) { sects.push({ key: 'vol',  t: y, h: VH }); y += VH + GH; }
    if (enabled.rsi)    { sects.push({ key: 'rsi',  t: y, h: SH }); y += SH + GH; }
    if (enabled.macd)   { sects.push({ key: 'macd', t: y, h: SH }); y += SH + GH; }
    return { sects, totalH: y + PAD.bottom - GH };
  }, [enabled.volume, enabled.rsi, enabled.macd]);

  const ind = useMemo(() => {
    if (!data.length) return { maLines: {}, bb: [], rsi: [], macd: [], signal: [], hist: [] };
    const maLines = {};
    MA_OPTS.forEach(({ key, period }) => { maLines[key] = calcMA(data, period); });
    return { maLines, bb: calcBB(data), rsi: calcRSI(data), ...calcMACD(data) };
  }, [data]);

  const sec = (key) => sects.find(s => s.key === key);
  const priceS = sec('price'), volS = sec('vol'), rsiS = sec('rsi'), macdS = sec('macd');

  const { yMin, yMax } = useMemo(() => {
    if (!data.length) return { yMin: 0, yMax: 1 };
    let lo = Math.min(...data.map(d => d.low  ?? Infinity).filter(isFinite));
    let hi = Math.max(...data.map(d => d.high ?? -Infinity).filter(isFinite));
    if (enabled.bb) ind.bb.forEach(b => {
      if (b.upper != null) hi = Math.max(hi, b.upper);
      if (b.lower != null) lo = Math.min(lo, b.lower);
    });
    const pad = (hi - lo) * 0.05 || 1;
    return { yMin: lo - pad, yMax: hi + pad };
  }, [data, enabled.bb, ind.bb]);

  const maxVol = useMemo(() => Math.max(...data.map(d => d.volume ?? 0), 1), [data]);

  const macdRange = useMemo(() => {
    const vals = [...(ind.macd ?? []), ...(ind.signal ?? [])].filter(v => v != null);
    if (!vals.length) return { lo: -1, hi: 1 };
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const p = (hi - lo) * 0.1 || 0.1;
    return { lo: lo - p, hi: hi + p };
  }, [ind]);

  const n  = Math.max(data.length, 1);
  const cw = Math.max(w - PAD.left - PAD.right, 10);
  const bw = Math.max(cw / n * 0.7, 2);

  const xOf    = (i) => PAD.left + (i + 0.5) * (cw / n);
  const yOf    = (p) => priceS.t + PH * (1 - (p - yMin) / (yMax - yMin));
  const yVolOf = (v) => volS  ? volS.t  + VH * (1 - v / maxVol) : 0;
  const yRsiOf = (v) => rsiS  ? rsiS.t  + SH * (1 - v / 100)    : 0;
  const yMOf   = (v) => {
    if (!macdS) return 0;
    const { lo, hi } = macdRange;
    return macdS.t + SH * (1 - (v - lo) / (hi - lo));
  };

  const yTicks = useMemo(() => {
    const range = yMax - yMin; if (!range) return [yMin];
    const rawStep = range / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = ([1, 2, 2.5, 5, 10].find(f => f * mag >= rawStep) ?? 10) * mag;
    const ticks = [];
    for (let v = Math.ceil(yMin / step) * step; v <= yMax + 1e-9 && ticks.length < 8; v += step)
      ticks.push(parseFloat(v.toPrecision(10)));
    return ticks;
  }, [yMin, yMax]);

  const xTicks = useMemo(() => {
    if (!data.length) return [];
    const step = Math.max(1, Math.floor(data.length / Math.min(6, data.length)));
    return Array.from({ length: Math.ceil(data.length / step) }, (_, k) => k * step).filter(i => i < data.length);
  }, [data.length]);

  const onMove = (e) => {
    const rect = cRef.current?.getBoundingClientRect(); if (!rect) return;
    const idx = Math.max(0, Math.min(data.length - 1, Math.floor((e.clientX - rect.left - PAD.left) / (cw / n))));
    setTip({ idx, cx: e.clientX - rect.left });
  };

  if (!w) return <div ref={cRef} style={{ height: totalH }} />;
  if (!data.length) return (
    <div ref={cRef} style={{ height: totalH }} className="flex items-center justify-center text-slate-400 text-sm">データなし</div>
  );

  return (
    <div ref={cRef} className="relative select-none" style={{ height: totalH }}>
      <svg width={w} height={totalH} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        {/* Y grid + labels */}
        {yTicks.map(v => {
          const y = yOf(v);
          if (y < priceS.t - 2 || y > priceS.t + PH + 2) return null;
          const lbl = v >= 10000 ? v.toLocaleString() : v >= 100 ? v.toFixed(0) : v.toFixed(2);
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={w - PAD.right} y2={y} stroke="#1e3a5f" strokeWidth={1} />
              <text x={w - PAD.right + 4} y={y + 4} fill="#94a3b8" fontSize={10}>{lbl}</text>
            </g>
          );
        })}
        {/* X labels */}
        {xTicks.map(i => (
          <text key={i} x={xOf(i)} y={totalH - 6} fill="#94a3b8" fontSize={10} textAnchor="middle">{data[i]?.date}</text>
        ))}
        {/* Section dividers */}
        {[volS, rsiS, macdS].filter(Boolean).map(s => (
          <line key={s.key} x1={PAD.left} y1={s.t} x2={w - PAD.right} y2={s.t} stroke="#334155" strokeWidth={1} />
        ))}

        {/* Bollinger Bands */}
        {enabled.bb && (() => {
          const upper = [], lower = [];
          ind.bb.forEach((b, i) => { if (b.upper != null) { upper.push([xOf(i), yOf(b.upper)]); lower.push([xOf(i), yOf(b.lower)]); } });
          if (!upper.length) return null;
          const fill = [...upper, ...[...lower].reverse()].map(([x, y]) => `${x},${y}`).join(' ');
          return (
            <g>
              <polygon points={fill} fill="#3b82f6" fillOpacity={0.07} />
              <polyline points={upper.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} />
              <polyline points={lower.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.6} />
              {makePoly(ind.bb.map(b => b.mid), xOf, yOf, '#3b82f6', 1, 'bb-mid')}
            </g>
          );
        })()}

        {/* Volume bars */}
        {volS && data.map((d, i) => {
          const top = yVolOf(d.volume ?? 0), h = volS.t + VH - top;
          return <rect key={i} x={xOf(i) - bw / 2} y={top} width={bw} height={Math.max(h, 1)}
            fill={(d.close ?? 0) >= (d.open ?? 0) ? '#064e3b' : '#7f1d1d'} opacity={0.8} />;
        })}

        {/* Candles or Line */}
        {chartType === 'candle'
          ? data.map((d, i) => {
              if (d.open == null || d.close == null) return null;
              const x = xOf(i), color = d.close >= d.open ? '#34d399' : '#f87171';
              const yH = yOf(d.high ?? d.close), yL = yOf(d.low ?? d.close);
              const yO = yOf(d.open), yC = yOf(d.close);
              const top = Math.min(yO, yC), bH = Math.max(Math.abs(yO - yC), 1);
              return (
                <g key={i}>
                  <line x1={x} y1={yH} x2={x} y2={top}     stroke={color} strokeWidth={1} />
                  <line x1={x} y1={top + bH} x2={x} y2={yL} stroke={color} strokeWidth={1} />
                  <rect x={x - bw / 2} y={top} width={bw} height={bH} fill={color} />
                </g>
              );
            })
          : makePoly(data.map(d => d.close), xOf, yOf, '#38bdf8', 2, 'line')
        }

        {/* MA lines */}
        {MA_OPTS.map(({ key, color }) =>
          enabled[key] ? makePoly(ind.maLines[key] ?? [], xOf, yOf, color, 1.5, key) : null
        )}

        {/* RSI */}
        {rsiS && (
          <g>
            <text x={PAD.left + 4} y={rsiS.t + 12} fill="#94a3b8" fontSize={10} fontWeight="500">RSI(14)</text>
            {[70, 30].map(v => (
              <line key={v} x1={PAD.left} y1={yRsiOf(v)} x2={w - PAD.right} y2={yRsiOf(v)}
                stroke={v === 70 ? '#ef4444' : '#22c55e'} strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.5} />
            ))}
            {makePoly(ind.rsi, xOf, yRsiOf, '#a78bfa', 1.5, 'rsi')}
            {[70, 50, 30].map(v => (
              <text key={v} x={w - PAD.right + 4} y={yRsiOf(v) + 4} fill="#94a3b8" fontSize={9}>{v}</text>
            ))}
          </g>
        )}

        {/* MACD */}
        {macdS && (
          <g>
            <text x={PAD.left + 4} y={macdS.t + 12} fill="#94a3b8" fontSize={10} fontWeight="500">MACD(12,26,9)</text>
            <line x1={PAD.left} y1={yMOf(0)} x2={w - PAD.right} y2={yMOf(0)} stroke="#475569" strokeWidth={1} />
            {ind.hist.map((v, i) => {
              if (v == null) return null;
              const y1 = yMOf(v), y2 = yMOf(0), top = Math.min(y1, y2), h = Math.max(Math.abs(y1 - y2), 1);
              return <rect key={i} x={xOf(i) - bw / 2} y={top} width={bw} height={h}
                fill={v >= 0 ? '#34d399' : '#f87171'} opacity={0.5} />;
            })}
            {makePoly(ind.macd,   xOf, yMOf, '#38bdf8', 1.5, 'macd-line')}
            {makePoly(ind.signal, xOf, yMOf, '#f59e0b', 1.5, 'macd-sig')}
          </g>
        )}

        {/* Crosshair */}
        {tip && (
          <line x1={xOf(tip.idx)} y1={PAD.top} x2={xOf(tip.idx)} y2={totalH - PAD.bottom}
            stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {/* Tooltip */}
      {tip && data[tip.idx] && (() => {
        const d = data[tip.idx];
        const toR = tip.cx < w / 2;
        const rsiV = ind.rsi[tip.idx], macdV = ind.macd[tip.idx], sigV = ind.signal[tip.idx];
        const bbB  = ind.bb[tip.idx];
        return (
          <div className="absolute top-2 bg-[#0f172a]/95 border border-slate-600 rounded-lg p-2.5 text-xs pointer-events-none z-10 shadow-xl min-w-[140px]"
            style={toR ? { left: tip.cx + 14 } : { right: w - tip.cx + 14 }}>
            <div className="text-slate-400 mb-1.5 font-medium">{d.date}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-slate-500">始値</span><span>{d.open?.toLocaleString()  ?? '—'}</span>
              <span className="text-slate-500">高値</span><span className="text-emerald-400">{d.high?.toLocaleString()  ?? '—'}</span>
              <span className="text-slate-500">安値</span><span className="text-red-400">{d.low?.toLocaleString()   ?? '—'}</span>
              <span className="text-slate-500">終値</span><span className="text-sky-300">{d.close?.toLocaleString() ?? '—'}</span>
              {d.volume != null && <>
                <span className="text-slate-500">出来高</span>
                <span>{d.volume >= 1e6 ? `${(d.volume / 1e6).toFixed(1)}M` : `${(d.volume / 1e3).toFixed(0)}K`}</span>
              </>}
              {MA_OPTS.filter(m => enabled[m.key]).map(m => (
                <React.Fragment key={m.key}>
                  <span style={{ color: m.color }}>{m.label}</span>
                  <span>{ind.maLines[m.key]?.[tip.idx]?.toFixed(2) ?? '—'}</span>
                </React.Fragment>
              ))}
              {enabled.bb && bbB?.upper != null && <>
                <span className="text-blue-400">BB上</span><span>{bbB.upper.toFixed(2)}</span>
                <span className="text-blue-400">BB下</span><span>{bbB.lower.toFixed(2)}</span>
              </>}
              {enabled.rsi && rsiV != null && <>
                <span className="text-violet-400">RSI</span>
                <span className={rsiV >= 70 ? 'text-red-400' : rsiV <= 30 ? 'text-green-400' : ''}>{rsiV.toFixed(1)}</span>
              </>}
              {enabled.macd && macdV != null && <>
                <span className="text-sky-400">MACD</span><span>{macdV.toFixed(3)}</span>
                <span className="text-amber-400">Signal</span><span>{sigV?.toFixed(3) ?? '—'}</span>
              </>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Chart() {
  const [marketKey, setMarketKey] = useState('tse_prime');
  const [symbol,    setSymbol]    = useState('7203.T');
  const [periodIdx, setPeriodIdx] = useState(0);
  const [chartType, setChartType] = useState('candle');
  const [enabled,   setEnabled]   = useState({
    ma5: true, ma25: true, ma75: false, ma200: false,
    bb: false, volume: true, rsi: false, macd: false,
  });

  const [dynamicStocks,  setDynamicStocks]  = useState({});
  const [stocksLoading,  setStocksLoading]  = useState(false);
  const [metrics,        setMetrics]        = useState(null);
  const [summaryData,    setSummaryData]    = useState(null);

  useEffect(() => {
    if (!symbol) return;
    setMetrics(null);
    fetchV7Quotes([symbol]).then(r => setMetrics(r[0] ?? null)).catch(() => setMetrics(null));
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    setSummaryData(null);
    fetchSummary(symbol).then(d => {
      const fd = d.financialData;
      const bs = d.balanceSheetHistory?.balanceSheetStatements?.[0];
      setSummaryData({
        roe:         fd?.returnOnEquity?.raw ?? null,
        equityRatio: (bs?.totalStockholdersEquity?.raw != null && bs?.totalAssets?.raw)
                       ? bs.totalStockholdersEquity.raw / bs.totalAssets.raw
                       : null,
      });
    }).catch(() => setSummaryData(null));
  }, [symbol]);

  // Dynamically load full stock list from JPX data for JP market segments
  useEffect(() => {
    const apiMarket = DYNAMIC_JP[marketKey];
    if (!apiMarket || dynamicStocks[marketKey]) return;
    setStocksLoading(true);
    fetchMarketStocks(apiMarket)
      .then(stocks => {
        setDynamicStocks(prev => ({ ...prev, [marketKey]: stocks }));
        if (stocks.length) setSymbol(stocks[0].symbol);
      })
      .catch(() => {}) // silently fall back to hardcoded list
      .finally(() => setStocksLoading(false));
  }, [marketKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const period = PERIODS[periodIdx];
  const { data: chartData, loading, error } = useChart(symbol, period.interval, period.range);
  const { data: quote } = useQuote(symbol);

  const stockList = useMemo(() => {
    if (marketKey === 'mylist') {
      try {
        const cats = JSON.parse(localStorage.getItem('watchCategories') ?? '[]');
        const seen = new Set();
        return cats.flatMap(c => c.stocks ?? []).filter(s => {
          if (seen.has(s.symbol)) return false;
          seen.add(s.symbol); return true;
        });
      } catch { return []; }
    }
    // For JP markets, prefer dynamically loaded full list; fall back to hardcoded
    if (DYNAMIC_JP[marketKey]) {
      return dynamicStocks[marketKey] ?? CHART_MARKETS.find(m => m.key === marketKey)?.stocks ?? [];
    }
    return CHART_MARKETS.find(m => m.key === marketKey)?.stocks ?? [];
  }, [marketKey, dynamicStocks]);

  const currentIdx   = stockList.findIndex(s => s.symbol === symbol);
  const currentStock = stockList.find(s => s.symbol === symbol);

  const prevStock = useCallback(() => {
    if (!stockList.length) return;
    setSymbol(stockList[currentIdx <= 0 ? stockList.length - 1 : currentIdx - 1].symbol);
  }, [stockList, currentIdx]);

  const nextStock = useCallback(() => {
    if (!stockList.length) return;
    setSymbol(stockList[currentIdx >= stockList.length - 1 ? 0 : currentIdx + 1].symbol);
  }, [stockList, currentIdx]);

  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevStock(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextStock(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [prevStock, nextStock]);

  const handleMarketChange = (key) => {
    setMarketKey(key);
    const stocks = key === 'mylist'
      ? (() => { try { return JSON.parse(localStorage.getItem('watchCategories') ?? '[]').flatMap(c => c.stocks ?? []); } catch { return []; } })()
      : CHART_MARKETS.find(m => m.key === key)?.stocks ?? [];
    if (stocks.length) setSymbol(stocks[0].symbol);
  };

  const toggle = (key) => setEnabled(prev => ({ ...prev, [key]: !prev[key] }));

  const INDICATOR_BTNS = [
    { key: 'volume', label: '出来高' },
    { key: 'bb',     label: 'ボリンジャー' },
    { key: 'rsi',    label: 'RSI' },
    { key: 'macd',   label: 'MACD' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Title + current price */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">チャート</h1>
          {currentStock && (
            <div className="text-slate-400 text-sm mt-0.5">
              {currentStock.name}
              <Link to={`/stock/${symbol}`} className="ml-2 text-blue-400 hover:underline text-xs">詳細 →</Link>
            </div>
          )}
        </div>
        {quote && (
          <div className="text-right">
            <div className="text-2xl font-bold">{quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="flex gap-2 justify-end mt-0.5">
              <PriceChange value={quote.change} suffix="" />
              <PriceChange value={quote.changePct} />
            </div>
          </div>
        )}
      </div>

      {/* Market + Stock selector row */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">市場</span>
            <select value={marketKey} onChange={e => handleMarketChange(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer">
              {CHART_MARKETS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              <option value="mylist">マイリスト</option>
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevStock} disabled={!stockList.length}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm font-bold transition-colors"
              title="前の銘柄 ← キー">◀</button>
            <select value={currentIdx >= 0 ? symbol : ''}
              onChange={e => setSymbol(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[220px]">
              {stockList.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol}  {s.name}</option>)}
              {currentIdx < 0 && <option value={symbol}>{symbol}</option>}
            </select>
            <button onClick={nextStock} disabled={!stockList.length}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm font-bold transition-colors"
              title="次の銘柄 → キー">▶</button>
            {stocksLoading
              ? <span className="text-xs text-slate-400 animate-pulse w-20 text-center">読み込み中…</span>
              : stockList.length > 0 && (
                  <span className="text-xs text-slate-500 w-20 text-center">
                    {currentIdx >= 0 ? `${currentIdx + 1} / ${stockList.length}` : `— / ${stockList.length}`}
                  </span>
                )
            }
          </div>

          <div className="flex-1 min-w-[180px] max-w-xs">
            <SymbolSearch onSelect={r => setSymbol(r.symbol)} placeholder="銘柄を検索…" />
          </div>
        </div>
      </div>

      {/* Financial metrics panel */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {[
          { label: '時価総額',     value: formatMarketCap(metrics?.marketCap) },
          { label: '配当利回り',   value: metrics?.dividendYield != null ? `${(metrics.dividendYield * 100).toFixed(2)}%` : '—' },
          { label: 'PER',          value: fmt(metrics?.trailingPE, 1) },
          { label: 'PBR',          value: fmt(metrics?.priceToBook, 2) },
          { label: 'EPS',          value: fmt(metrics?.epsTrailingTwelveMonths, 2) },
          { label: 'ROE',          value: summaryData?.roe != null ? `${(summaryData.roe * 100).toFixed(1)}%` : '—' },
          { label: '自己資本比率', value: summaryData?.equityRatio != null ? `${(summaryData.equityRatio * 100).toFixed(1)}%` : '—' },
          { label: '年初来高値',   value: metrics?.fiftyTwoWeekHigh?.toLocaleString() ?? '—' },
          { label: '年初来安値',   value: metrics?.fiftyTwoWeekLow?.toLocaleString()  ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#1e293b] rounded-lg p-2.5 border border-slate-700 text-center">
            <div className="text-[10px] text-slate-500 mb-0.5">{label}</div>
            <div className="text-sm font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Chart controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => setPeriodIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periodIdx === i ? 'bg-blue-600 text-white' : 'bg-[#1e293b] text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}>{p.label}</button>
        ))}

        <div className="w-px h-6 bg-slate-700" />

        {[{ key: 'line', label: '折れ線' }, { key: 'candle', label: 'ローソク足' }].map(({ key, label }) => (
          <button key={key} onClick={() => setChartType(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              chartType === key ? 'bg-amber-600 text-white' : 'bg-[#1e293b] text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}>{label}</button>
        ))}

        <div className="w-px h-6 bg-slate-700" />

        {MA_OPTS.map(({ key, label, color }) => (
          <button key={key} onClick={() => toggle(key)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              enabled[key] ? 'text-white border-transparent' : 'text-slate-400 bg-[#1e293b] border-slate-700 hover:border-slate-500'
            }`}
            style={enabled[key] ? { backgroundColor: color, borderColor: color } : {}}>{label}</button>
        ))}

        <div className="w-px h-6 bg-slate-700" />

        {INDICATOR_BTNS.map(({ key, label }) => (
          <button key={key} onClick={() => toggle(key)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              enabled[key] ? 'bg-slate-500 text-white border-slate-500' : 'text-slate-400 bg-[#1e293b] border-slate-700 hover:border-slate-500'
            }`}>{label}</button>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700">
        {loading && <div className="flex justify-center py-16"><Spinner size={8} /></div>}
        {error   && <div className="text-red-400 text-sm py-8 text-center">{error}</div>}
        {!loading && !error && (
          <AdvancedChart data={chartData} chartType={chartType} enabled={enabled} />
        )}
      </div>

      <p className="text-center text-xs text-slate-600">← → キーで銘柄を切り替え（テキスト入力中は無効）</p>
    </div>
  );
}
