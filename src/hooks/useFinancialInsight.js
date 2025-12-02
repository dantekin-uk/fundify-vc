import { useState, useEffect } from 'react';
import { generateInsight, getCachedInsight, setCachedInsight } from '../services/geminiInsights';

export function useFinancialInsight(type, dataContext) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      const cacheKey = `${type}_${JSON.stringify(dataContext).slice(0, 10)}`;

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

        // Only set insight if it's a valid string
        if (newInsight && typeof newInsight === 'string' && newInsight.trim()) {
          setInsight(newInsight.trim());
          setCachedInsight(cacheKey, newInsight.trim());
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
  }, [type, dataContext]);

  return { insight, loading };
}
