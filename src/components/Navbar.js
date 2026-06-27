import { Link, useLocation } from 'react-router-dom';
const links = [
  { to: '/', label: 'ダッシュボード' },
  { to: '/chart', label: 'チャート' },
  { to: '/screening', label: 'スクリーニング' },
  { to: '/compare', label: '銘柄比較' },
];
export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <nav className="bg-[#1e293b] border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        <span className="text-blue-400 font-bold text-lg mr-4">📈 StockDash</span>
        {links.map(({ to, label }) => (
          <Link key={to} to={to}
            className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
              pathname === to ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
            }`}>{label}</Link>
        ))}
      </div>
    </nav>
  );
}
