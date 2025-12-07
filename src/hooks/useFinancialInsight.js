import { useState, useEffect, useMemo, useRef } from 'react';
import { generateInsight } from '../services/geminiInsights';

export function useFinancialInsight(type, dataContext) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  // Stable cache key based on actual data values
  const cacheKey = useMemo(() => {
    if (!dataContext) return null;
    try {
      return `${type}_${JSON.stringify(dataContext)}`;
    } catch {
      return `${type}_${Date.now()}`;
    }
  }, [type, dataContext]);

  useEffect(() => {
    if (!cacheKey) return;

    const fetchInsight = async () => {
      // Always generate fresh insight for real-time behavior
      setLoading(true);
      try {
        const newInsight = await generateInsight({
          type,
          ...dataContext,
        });

        const asText = typeof newInsight === 'string' ? newInsight : (newInsight && typeof newInsight === 'object' ? String(newInsight.summary || '') : '');
        if (asText && asText.trim()) {
          setInsight(asText.trim());
        } else {
          setInsight('');
        }
      } catch (error) {
        console.error('Failed to generate insight:', error);
        setInsight('');
      } finally {
        setLoading(false);
      }
    };
    const timerRef = { current: null };
    if (dataContext && (dataContext.amount !== undefined || dataContext.totalIncome !== undefined)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchInsight, 500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cacheKey, dataContext]);

  return { insight, loading };
}
