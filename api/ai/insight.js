export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const title = String(body?.title || '').trim();
    const metrics = body?.metrics && typeof body.metrics === 'object' ? body.metrics : null;
    if (!title || !metrics) { res.status(400).json({ error: 'Invalid body' }); return; }

    const key = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const baseSummary = `${title}: ${Number(metrics?.amount || metrics?.value || 0).toLocaleString()} ${metrics?.currency || ''}`.trim();
    const change = Number(metrics?.periodChangePercent ?? metrics?.trend ?? 0);
    const urgency = Math.abs(change) >= 15 ? 'high' : Math.abs(change) >= 7 ? 'medium' : 'low';
    const fallback = () => {
      const isIncome = /income/i.test(title);
      const isExpenses = /expense/i.test(title);
      const isBalance = /balance/i.test(title);
      let summary = baseSummary;
      let recommendation = 'Monitor trends and adjust plan.';
      if (isIncome) {
        summary = change >= 0 ? `Income up ${Math.round(change)}%` : `Income down ${Math.abs(Math.round(change))}%`;
        recommendation = change >= 0 ? 'Engage donors and maintain momentum.' : 'Strengthen outreach to improve inflows.';
      } else if (isExpenses) {
        summary = change >= 0 ? `Expenses up ${Math.round(change)}%` : `Expenses down ${Math.abs(Math.round(change))}%`;
        recommendation = change >= 0 ? 'Prioritize cost control on top categories.' : 'Maintain current spending discipline.';
      } else if (isBalance) {
        summary = change >= 0 ? `Balance improving ${Math.round(change)}%` : `Balance declining ${Math.abs(Math.round(change))}%`;
        recommendation = change >= 0 ? 'Allocate surplus to key projects.' : 'Reduce expenses to stabilize balance.';
      }
      return { summary, recommendation, urgency };
    };

    if (!key) { res.status(200).json({ success: true, insight: fallback() }); return; }

    const prompt = [
      `Title: ${title}`,
      `Amount: ${metrics?.amount ?? metrics?.value ?? 0} ${metrics?.currency || ''}`,
      `ChangePercent: ${change}`,
      `TopCategory: ${metrics?.topCategory || metrics?.topExpenseCategory || metrics?.topIncomeSource || 'N/A'}`,
      `TotalIncome: ${metrics?.totalIncome ?? 'N/A'}`,
      `TotalExpenses: ${metrics?.totalExpenses ?? 'N/A'}`,
      'Respond ONLY as a compact JSON object with keys: summary, recommendation, urgency (low|medium|high). No prose.'
    ].join('\n');

    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Generate concise financial insights as JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 160
        })
      });
      if (!r.ok) { res.status(200).json({ success: true, insight: fallback(), error: 'openai_error' }); return; }
      const data = await r.json();
      const content = data?.choices?.[0]?.message?.content || '';
      let parsed = null;
      try { parsed = JSON.parse(content); } catch { parsed = null; }
      if (!parsed || !parsed.summary || !parsed.recommendation || !parsed.urgency) {
        res.status(200).json({ success: true, insight: fallback(), error: 'bad_json' }); return;
      }
      res.status(200).json({ success: true, insight: parsed });
    } catch (e) {
      res.status(200).json({ success: true, insight: fallback(), error: 'exception' });
    }
  } catch (err) {
    res.status(400).json({ error: 'Bad Request' });
  }
}
