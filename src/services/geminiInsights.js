const API_PATH = '/api/ai/insight';

// DeepSeek only

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
    const res = await fetch(API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, metrics })
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const summary = json?.insight?.summary || null;
    return summary || null;
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
