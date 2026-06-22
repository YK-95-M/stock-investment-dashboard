import { useState, useEffect } from 'react';
import { fetchSummary } from '../api/yahoo';
export default function useSummary(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!symbol) return;
    setLoading(true); setError(null);
    fetchSummary(symbol).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [symbol]);
  return { data, loading, error };
}
