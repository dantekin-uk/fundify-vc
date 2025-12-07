const API_PATH = '/api/ai/insight';

// Track which insights came from OpenAI vs fallback for debugging
export const insightSource = { source: 'fallback', timestamp: Date.now() };

function generateFallbackInsight(type, change) {
  const isIncome = /income/i.test(type);
  const isExpenses = /expense/i.test(type);
  const isBalance = /balance/i.test(type);
  const changeAbs = Math.abs(Math.round(change));

  if (isIncome) {
    if (changeAbs < 1) return 'Income steady. Monitor for opportunities to increase.';
    return change >= 0 ? `Income up ${changeAbs}%. Good momentum!` : `Income down ${changeAbs}%. Consider fundraising strategies.`;
  } else if (isExpenses) {
    if (changeAbs < 1) return 'Expenses stable. Maintain current controls.';
    return change >= 0 ? `Expenses up ${changeAbs}%. Review major categories.` : `Expenses down ${changeAbs}%. Great cost control!`;
  } else if (isBalance) {
    if (changeAbs < 1) return 'Balance unchanged. Keep monitoring closely.';
    return change >= 0 ? `Balance improving ${changeAbs}%. Surplus growing!` : `Balance declining ${changeAbs}%. Increase income or reduce expenses.`;
  }
  return 'Monitor trends and adjust your plans accordingly.';
}

export async function generateInsight(dataContext) {
  try {
    const type = dataContext?.type || 'insight';
    const title = type === 'income' ? 'Income' : type === 'expenses' ? 'Expenses' : type === 'balance' ? 'Balance' : String(type || 'Insight');
    const change = Number(dataContext?.periodChangePercent ?? 0);

    const metrics = {
      amount: dataContext?.amount ?? 0,
      currency: dataContext?.currency ?? 'USD',
      periodChangePercent: change,
      topCategory: dataContext?.topCategory ?? null,
      topExpenseCategory: dataContext?.topExpenseCategories ? dataContext.topExpenseCategories[0] : dataContext?.topExpenseCategory,
      topIncomeSource: dataContext?.topIncomeSource,
      totalIncome: dataContext?.totalIncome,
      totalExpenses: dataContext?.totalExpenses,
    };

    // Attempt to fetch AI insight from API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
          const summary = json?.insight?.summary || json?.summary;
          const provider = json?.provider || (json?.error ? 'fallback' : null);
          if (typeof summary === 'string' && summary.trim()) {
            insightSource.source = provider || 'grok';
            insightSource.timestamp = Date.now();
            insightSource.title = title;
            insightSource.change = change;
            if (insightSource.source === 'grok') {
              console.log('✅ Grok Insight Generated:', { title, change, summary: summary.substring(0, 60) + '...' });
            } else {
              console.log('📊 Fallback Insight Used:', { title, change, insight: summary.substring(0, 60) + '...' });
            }
            return summary.trim();
          }
        }
        console.debug('⚠️ AI insight API returned empty response - using fallback');
      } else {
        console.debug(`⚠️ AI insight API error (${res.status}) - using fallback`);
      }
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError') {
        console.debug('⚠️ AI insight request timed out - using fallback');
      } else if (fetchError?.message?.includes('Failed to fetch')) {
        console.debug('⚠️ AI insight API unreachable - using fallback');
      } else {
        console.debug('⚠️ AI insight generation failed - using fallback:', fetchError?.message);
      }
    }

    // Return a fallback insight if API fails
    insightSource.source = 'fallback';
    insightSource.timestamp = Date.now();
    insightSource.title = title;
    insightSource.change = change;
    const fallback = generateFallbackInsight(title, change);
    console.log('📊 Fallback Insight Used:', { title, change, insight: fallback });
    return fallback;
  } catch (error) {
    console.error('Error generating insight:', error);
    return null;
  }
}

export function getCachedInsight(key) {
  try {
    const cached = sessionStorage.getItem(`insight_${key}`);
    if (!cached) return null;

    const { insight, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = 5 * 60 * 1000;

    if (now - timestamp > expiryTime) {
      sessionStorage.removeItem(`insight_${key}`);
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
    sessionStorage.setItem(`insight_${key}`, JSON.stringify({
      insight,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Error caching insight:', error);
  }
}
