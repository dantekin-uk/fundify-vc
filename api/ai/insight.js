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

    const key = process.env.HF_API_KEY;
    const model = process.env.HF_MODEL || 'microsoft/Phi-3.5-mini-instruct';

    const baseSummary = `${title}: ${Number(metrics?.amount || metrics?.value || 0).toLocaleString()} ${metrics?.currency || ''}`.trim();
    const change = Number(metrics?.periodChangePercent ?? metrics?.trend ?? 0);
    const clamped = Math.max(-100, Math.min(100, change));
    const urgency = Math.abs(clamped) >= 15 ? 'high' : Math.abs(clamped) >= 7 ? 'medium' : 'low';
    const fallback = () => {
      const isIncome = /income/i.test(title);
      const isExpenses = /expense/i.test(title);
      const isBalance = /balance/i.test(title);
      let summary = baseSummary;
      let recommendation = 'Monitor trends and adjust plan.';
      if (isIncome) {
        summary = clamped >= 0 ? `Income up ${Math.round(Math.abs(clamped))}%` : `Income down ${Math.round(Math.abs(clamped))}%`;
        recommendation = clamped >= 0 ? 'Engage donors and maintain momentum.' : 'Strengthen outreach to improve inflows.';
      } else if (isExpenses) {
        summary = clamped >= 0 ? `Expenses up ${Math.round(Math.abs(clamped))}%` : `Expenses down ${Math.round(Math.abs(clamped))}%`;
        recommendation = clamped >= 0 ? 'Prioritize cost control on top categories.' : 'Maintain current spending discipline.';
      } else if (isBalance) {
        summary = clamped >= 0 ? `Balance improving ${Math.round(Math.abs(clamped))}%` : `Balance declining ${Math.round(Math.abs(clamped))}%`;
        recommendation = clamped >= 0 ? 'Allocate surplus to key projects.' : 'Reduce expenses to stabilize balance.';
      }
      return { summary, recommendation, urgency };
    };

    if (!key) { res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'missing_hf_key' }); return; }

    const prompt = [
      `Title: ${title}`,
      `Amount: ${metrics?.amount ?? metrics?.value ?? 0} ${metrics?.currency || ''}`,
      `ChangePercent: ${clamped}`,
      `TopCategory: ${metrics?.topCategory || metrics?.topExpenseCategory || metrics?.topIncomeSource || 'N/A'}`,
      `TotalIncome: ${metrics?.totalIncome ?? 'N/A'}`,
      `TotalExpenses: ${metrics?.totalExpenses ?? 'N/A'}`,
      'Respond ONLY as a compact JSON object with keys: summary, recommendation, urgency (low|medium|high). No prose.'
    ].join('\n');

    try {
      const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          inputs: [
            'Generate concise financial insights as JSON only. Keys: summary, recommendation, urgency (low|medium|high). No prose.',
            prompt
          ].join('\n'),
          parameters: { temperature: 0.3, max_new_tokens: 160, top_p: 0.9, return_full_text: false, wait_for_model: true }
        })
      });
      if (!r.ok) { res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'hf_error' }); return; }
      const data = await r.json();
      const content = (Array.isArray(data) ? (data[0]?.generated_text || '') : (data?.generated_text || (typeof data === 'string' ? data : '')));
      let parsed = null;
      try {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        const jsonText = start >= 0 && end >= start ? content.slice(start, end + 1) : content;
        parsed = JSON.parse(jsonText);
      } catch {
        parsed = null;
      }
      if (!parsed || !parsed.summary || !parsed.recommendation || !parsed.urgency) {
        res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'bad_json' }); return;
      }
      res.status(200).json({ success: true, provider: 'huggingface', insight: parsed });
    } catch (e) {
      res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'exception' });
    }
  } catch (err) {
    res.status(400).json({ error: 'Bad Request' });
  }
}
