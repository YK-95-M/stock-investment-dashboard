import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Chart from './pages/Chart';
import Screening from './pages/Screening';
import StockDetail from './pages/StockDetail';
import Compare from './pages/Compare';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chart" element={<Chart />} />
          <Route path="/screening" element={<Screening />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
