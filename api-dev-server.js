import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.options('/api/ai/insight', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

app.post('/api/ai/insight', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const title = String(body?.title || '').trim();
    const metrics = body?.metrics && typeof body.metrics === 'object' ? body.metrics : null;

    if (!title || !metrics) {
      console.error('Invalid request body:', { title, metrics });
      res.status(400).json({ error: 'Invalid body' });
      return;
    }

    const key = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    const model = process.env.GROK_MODEL || 'grok-2-mini';

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

    if (!key) {
      res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'missing_grok_key' });
      return;
    }

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
      console.log(`[Grok] Requesting insight for: ${title}, Model: ${model}`);

      const openaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
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

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error(`[Grok] API Error (${openaiResponse.status}):`, errorText);
        res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'grok_error', details: errorText });
        return;
      }

      const data = await openaiResponse.json();
      const content = data?.choices?.[0]?.message?.content || '';
      console.log(`[Grok] Response received, content length: ${content.length}`);

      let parsed = null;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        console.error('[Grok] JSON Parse Error:', parseErr.message, 'Content:', content);
        parsed = null;
      }

      if (!parsed || !parsed.summary || !parsed.recommendation || !parsed.urgency) {
        console.warn('[Grok] Invalid response structure:', parsed);
        res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'bad_json' });
        return;
      }

      console.log('[Grok] Successfully generated insight');
      res.status(200).json({ success: true, provider: 'grok', insight: parsed });
    } catch (e) {
      console.error('[Grok] Exception:', e.message);
      res.status(200).json({ success: true, provider: 'fallback', insight: fallback(), error: 'exception', details: e.message });
    }
  } catch (err) {
    console.error('[API] Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Development API server running on http://localhost:${PORT}`);
  console.log(`Grok Key configured: ${process.env.GROK_API_KEY ? 'YES' : 'NO'}`);
  console.log(`Grok Model: ${process.env.GROK_MODEL || 'grok-2-mini'}`);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  process.exit(1);
});
