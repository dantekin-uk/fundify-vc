import { useState, useEffect, useMemo } from 'react';
import { generateInsight, getCachedInsight, setCachedInsight } from '../services/geminiInsights';

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
      // Try to get cached insight first
      const cached = getCachedInsight(cacheKey);
      if (cached && typeof cached === 'string') {
        setInsight(cached);
        return;
      }

      // Generate new insight
      setLoading(true);
      try {
        const newInsight = await generateInsight({
          type,
          ...dataContext,
        });

        const asText = typeof newInsight === 'string' ? newInsight : (newInsight && typeof newInsight === 'object' ? String(newInsight.summary || '') : '');
        if (asText && asText.trim()) {
          setInsight(asText.trim());
          setCachedInsight(cacheKey, asText.trim());
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

    if (dataContext && (dataContext.amount !== undefined || dataContext.totalIncome !== undefined)) {
      fetchInsight();
    }
  }, [cacheKey, dataContext]);

  return { insight, loading };
}
