const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function generateInsight(dataContext) {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return null;
  }

  try {
    const { type, amount, currency, trend, topCategory, periodChangePercent, totalIncome, totalExpenses, topExpenseCategories } = dataContext;

    let prompt = '';

    if (type === 'income') {
      prompt = `You are a financial analyst. Analyze this income data and provide ONE short, insightful sentence (max 15 words) about the income trend.

Data:
- Current Income: ${currency} ${amount.toLocaleString()}
- Weekly Trend: ${periodChangePercent}% change
- Top Income Source: ${topCategory || 'N/A'}
- Period: This week

Provide a brief, actionable insight. Example: "5% increase this week, donors are your main source."`;
    } else if (type === 'expenses') {
      prompt = `You are a financial analyst. Analyze this expense data and provide ONE short, insightful sentence (max 15 words) about spending patterns.

Data:
- Current Expenses: ${currency} ${amount.toLocaleString()}
- Weekly Trend: ${periodChangePercent}% change
- Top Expense Category: ${topCategory || 'N/A'}
- All Categories: ${topExpenseCategories.join(', ') || 'N/A'}
- Period: This week

Provide a brief, actionable insight about their biggest expense drain. Example: "Transport costs increased 12% this week, your biggest drain."`;
    } else if (type === 'balance') {
      prompt = `You are a financial analyst. Analyze this balance data and provide ONE short, insightful sentence (max 15 words) about their financial health.

Data:
- Current Balance: ${currency} ${amount.toLocaleString()}
- Total Income: ${currency} ${totalIncome.toLocaleString()}
- Total Expenses: ${currency} ${totalExpenses.toLocaleString()}
- Weekly Trend: ${periodChangePercent}% change
- Period: This week

Provide a brief, actionable insight about their financial health. Example: "Balance growing steadily, income outpaces expenses by 30%."`;
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    const insight = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return insight || null;
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
