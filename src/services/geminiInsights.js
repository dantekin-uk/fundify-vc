const API_PATH = '/api/ai/insight';

export async function generateInsight(dataContext) {
  try {
    const type = dataContext?.type || 'insight';
    const title = type === 'income' ? 'Income' : type === 'expenses' ? 'Expenses' : type === 'balance' ? 'Balance' : String(type || 'Insight');
    const metrics = {
      amount: dataContext?.amount ?? 0,
      currency: dataContext?.currency ?? 'USD',
      periodChangePercent: dataContext?.periodChangePercent ?? 0,
      topCategory: dataContext?.topCategory ?? null,
      topExpenseCategory: dataContext?.topExpenseCategories ? dataContext.topExpenseCategories[0] : dataContext?.topExpenseCategory,
      topIncomeSource: dataContext?.topIncomeSource,
      totalIncome: dataContext?.totalIncome,
      totalExpenses: dataContext?.totalExpenses,
    };

    // Attempt to fetch AI insight from API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, metrics }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && typeof json === 'object') {
          // Handle both direct summary and nested insight.summary
          const summary = json?.insight?.summary || json?.summary;
          // Ensure we always return a string or null, never an object
          if (typeof summary === 'string' && summary.trim()) {
            return summary.trim();
          }
        }
      } else {
        const errorData = await res.text().catch(() => '');
        console.debug(`AI insight API error (${res.status}):`, errorData);
      }
    } catch (fetchError) {
      // API endpoint not available, timeout, or server error - silently continue without AI insight
      const isAbortError = fetchError?.name === 'AbortError';
      const isNetworkError = fetchError?.message?.includes('Failed to fetch');
      if (isAbortError) {
        console.debug('AI insight request timed out');
      } else if (isNetworkError) {
        console.debug('AI insight API unreachable - ensure "npm run api:dev" is running');
      } else {
        console.debug('AI insight API unavailable:', fetchError?.message || fetchError);
      }
    }

    // Return null if API fails - component will handle gracefully
    return null;
  } catch (error) {
    console.error('Error generating insight:', error);
    return null;
  }
}

export function getCachedInsight(key) {
  try {
    const cached = localStorage.getItem(`insight_${key}`);
    if (!cached) return null;

    const { insight, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours

    if (now - timestamp > expiryTime) {
      localStorage.removeItem(`insight_${key}`);
      return null;
    }

    return insight;
  } catch (error) {
    console.error('Error reading cached insight:', error);
    return null;
  }
}

export function setCachedInsight(key, insight) {
  try {
    localStorage.setItem(`insight_${key}`, JSON.stringify({
      insight,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error caching insight:', error);
  }
}
