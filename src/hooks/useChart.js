import { useState, useEffect } from 'react';
import { fetchChart } from '../api/yahoo';
export default function useChart(symbol, interval, range) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!symbol) return;
    setLoading(true); setError(null);
    fetchChart(symbol, interval, range).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [symbol, interval, range]);
  return { data, loading, error };
}
