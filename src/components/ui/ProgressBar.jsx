import React from 'react';

// ProgressBar supports two modes:
// - simple percentage fill (value / max)
// - trend mode: provide trendData (array of numbers) to render a sparkline and a per-item scale
export default function ProgressBar({
  value = 0,
  max = 100,
  className = '',
  heightClass = 'h-2',
  roundedClass = 'rounded-full',
  showLabel = false,
  label = '',
  gradient,
  trendData = null, // array of numbers (oldest -> newest)
  sparklineHeight = 28,
}) {
  const safeMax = Number(max) > 0 ? Number(max) : 100;

  // If trendData is provided, compute percent relative to trend max (per-item scale)
  const hasTrend = Array.isArray(trendData) && trendData.length > 0;
  const trendMax = hasTrend ? Math.max(1, ...trendData.map((n) => Math.abs(Number(n) || 0))) : 1;
  const latest = hasTrend ? Math.abs(Number(trendData[trendData.length - 1] || 0)) : Number(value || 0);
  const pct = Math.max(0, Math.min(100, (Number(latest) / (hasTrend ? trendMax : safeMax)) * 100));

  const fillStyle = {
    width: `${pct}%`,
    background: gradient || 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
    boxShadow: '0 4px 12px rgba(59,130,246,0.08)'
  };

  // Build sparkline path if trend provided
  const renderSparkline = () => {
    if (!hasTrend) return null;
    const w = 120; // svg width
    const h = sparklineHeight;
    const padX = 4;
    const padY = 4;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const max = trendMax;
    const points = trendData.map((v, i) => {
      const x = padX + (i / Math.max(1, trendData.length - 1)) * innerW;
      const y = padY + innerH - (Math.abs(Number(v) || 0) / max) * innerH;
      return [x, y];
    });
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
    const last = points[points.length - 1];

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block mx-auto">
        <defs>
          <linearGradient id="pb-spark-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#pb-spark-grad)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* small circle at latest point */}
        {last && <circle cx={last[0]} cy={last[1]} r={2.5} fill="#fff" stroke="#3B82F6" strokeWidth={1.5} />}
      </svg>
    );
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400">
          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{label}</span>
          <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-100">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`relative w-full bg-slate-100 overflow-hidden ${heightClass} ${roundedClass} dark:bg-slate-800/50`} role="progressbar" aria-valuemin={0} aria-valuemax={hasTrend ? trendMax : safeMax} aria-valuenow={Math.round(latest)}>
        <div className={`h-full transition-all duration-700 ease-out ${roundedClass}`} style={fillStyle} />
        {/* Sparkline centered over the bar, pointer-events-none so it doesn't block hover */}
        {hasTrend && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[120px] opacity-90">
              {renderSparkline()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
