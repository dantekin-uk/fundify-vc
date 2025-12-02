import { useEffect, useMemo, useState } from 'react';

export default function AiInsightCard({ title, metrics }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const cacheKey = useMemo(() => {
    try { return `ai_${title}_${JSON.stringify(metrics)}`; } catch { return `ai_${title}`; }
  }, [title, metrics]);

  useEffect(() => {
    let mounted = true;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { const parsed = JSON.parse(cached); if (mounted) setData(parsed); } catch {}
      return;
    }
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const r = await fetch('/api/ai/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, metrics })
        });
        if (!r.ok) { throw new Error('Request failed'); }
        const json = await r.json();
        const insight = json?.insight || null;
        if (insight) {
          if (mounted) setData(insight);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(insight)); } catch {}
        } else {
          throw new Error('No insight');
        }
      } catch (e) {
        if (mounted) setError('Failed to analyze');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [cacheKey, title, metrics]);

  const urgencyColor = useMemo(() => {
    const u = (data?.urgency || '').toLowerCase();
    if (u === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (u === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  }, [data]);

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {data?.urgency && (
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs border ${urgencyColor}`}>{String(data.urgency).toUpperCase()}</span>
        )}
      </div>
      {loading && (
        <div className="text-xs text-slate-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>Analyzing...</div>
      )}
      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
      {!loading && !error && data && (
        <div className="space-y-2">
          <div className="text-sm text-slate-700">{data.summary}</div>
          <div className="text-xs text-slate-500">{data.recommendation}</div>
        </div>
      )}
    </div>
  );
}
