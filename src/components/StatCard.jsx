import React, { useMemo, useState } from 'react';
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';

/* --------------------------------------------------------
   CONFIG
--------------------------------------------------------- */

const ICONS = {
  funds: CurrencyDollarIcon,
  income: BanknotesIcon,
  expenses: ArrowTrendingDownIcon,
  budget: WalletIcon,
  // Use a distinct icon for balance so it reads visually different from Total Funds
  balance: WalletIcon,
};

/* --------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */

export default function StatCard({
  title,
  value,
  series = [],
  variant = 'funds',
  className = '',
}) {
  const { isDark } = useTheme();
  const Icon = ICONS[variant] || CurrencyDollarIcon;
  const gradientId = useMemo(() => `stat-grad-${variant}-${String(title)}`.replace(/[^a-z0-9-_]/gi, '-'), [variant, title]);
  // Icon colors per variant
  const iconColors = {
    funds: "#2563eb",      // blue
    income: "#059669",     // green
    expenses: "#e11d48",   // red
    budget: "#d97706",     // amber
    balance: "#06b6d4"     // cyan
  };
  // Card name color
  const nameColor = "#2563eb";
  // Amount/currency color
  const amountColor = "#fff";
  // Other text
  const neutral = isDark ? "#cbd5e1" : "#64748b";

  // timeframe: W (7d), M (30d), Y (365d)
  const [range, setRange] = useState('W');
  const days = range === 'W' ? 7 : range === 'M' ? 30 : 365;

  // normalize incoming series keys to { value, label }
  const normalized = useMemo(() => {
    return (series || []).map((p) => ({
      value: Number(p.value ?? p.y ?? 0),
      label: p.date ?? p.x ?? null,
    }));
  }, [series]);

  const data = useMemo(() => {
    if (!normalized || normalized.length === 0) return [];
    if (normalized.length <= days) return normalized;
    return normalized.slice(-days);
  }, [normalized, days]);

  // simple % change over current range
  const pct = useMemo(() => {
    if (!data || data.length < 2) return 0;
    const a = Number(data[0]?.value ?? 0);
    const b = Number(data[data.length - 1]?.value ?? 0);
    return a ? ((b - a) / Math.abs(a)) * 100 : 0;
  }, [data]);

  const lastText = useMemo(() => {
    if (!data || data.length === 0) return '';
    const raw = data[data.length - 1]?.label;
    const d = raw ? new Date(raw) : new Date();
    if (isNaN(d)) return '';
    try {
      return format(d, 'MMM d, yyyy');
    } catch {
      return '';
    }
  }, [data]);

  const renderTooltip = useMemo(() => {
    return ({ active, payload }) => {
      if (!active || !payload || payload.length === 0) return null;
      const item = payload[0]?.payload || {};
      const dt = item.label ? new Date(item.label) : null;
      const dText = dt && !isNaN(dt) ? format(dt, 'MMM d, yyyy') : '';
      return (
        <div className="px-2 py-1 rounded-md bg-white/90 backdrop-blur ring-1 ring-slate-200 shadow text-[10px] text-slate-700 dark:bg-slate-800/90 dark:ring-slate-700 dark:text-slate-100">
          <div className="font-medium text-slate-900 dark:text-slate-100">{(item.value ?? 0).toLocaleString()}</div>
          {dText && <div className="text-slate-500 dark:text-slate-300">{dText}</div>}
        </div>
      );
    };
  }, []);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-md transition-all duration-300 ${className}`}
      style={{
        minHeight: 96,
        padding: 0,
        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.06)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 24px 0 rgba(37,99,235,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
        e.currentTarget.style.borderColor = '#2563eb';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 12px 0 rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = isDark ? '#334155' : '#d1d5db';
      }}
    >
      <div className="relative p-3 sm:p-4 flex flex-col min-h-[96px]">
        {/* header */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-800 shadow-sm"
            style={{
              background: isDark ? "#1e293b" : "#f8fafc"
            }}
          >
            <Icon className="h-4 w-4 opacity-90" style={{ color: iconColors[variant] || "#2563eb" }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide truncate font-semibold" style={{ color: nameColor }}>
              {title}
            </p>
            <p
              className="mt-0.5 font-bold whitespace-nowrap overflow-hidden text-ellipsis text-[2rem]"
              title={String(value)}
              style={{
                color: isDark ? "#fff" : "#1e293b",
                fontWeight: 700,
                letterSpacing: '0.01em'
              }}
            >
              {value}
            </p>
          </div>
        </div>

        {/* spark-line */}
        {data.length > 0 && (
          <div className="mt-1 h-8 sm:h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={iconColors[variant] || "#2563eb"} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={iconColors[variant] || "#2563eb"} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="none"
                  fill={`url(#${gradientId})`}
                  strokeWidth={0}
                  strokeOpacity={0}
                  fillOpacity={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* percent change badge */}
        {data.length > 1 && (
          <span
            className="absolute top-2 right-2 rounded-lg px-2 py-0.5 text-xs font-semibold inline-flex items-center gap-1"
            style={{
              color: neutral,
              background: isDark ? "#1e293b" : "#f1f5f9",
              fontWeight: 600
            }}
          >
            {pct >= 0 ? (
              <ArrowTrendingUpIcon className="h-3 w-3" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3" />
            )}
            {Math.abs(pct).toFixed(1)}%
          </span>
        )}

        {/* footer: timestamp + timeframe chips */}
        <div className="mt-1 text-[10px] flex items-center justify-between" style={{ color: neutral }}>
          <span
            className="truncate"
            style={{
              color: "#fbbf24"
              // Removed textShadow for glow
            }}
          >
            {lastText ? `as of ${lastText}` : ''}
          </span>
          <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5 shadow-inner dark:bg-slate-800/60">
            {['W','M','Y'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full transition-colors ${range===r ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100' : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'}`}
                aria-label={`Show ${r==='W'?'7d':r==='M'?'30d':'365d'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
