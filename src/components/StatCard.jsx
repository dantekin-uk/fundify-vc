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
import { useFinancialInsight } from '../hooks/useFinancialInsight';


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
  title = 'Untitled',
  value = '0',
  series = [],
  variant = 'funds',
  className = '',
  compact = false,
  rawValue = 0,
  currency = 'USD',
  topExpenseCategories = [],
  topIncomeSource = 'N/A',
  topExpenseCategory = 'N/A',
  totalIncome = 0,
  totalExpenses = 0,
}) {
  const { isDark } = useTheme();

  // Ensure values are strings/numbers, not objects
  const safeTitle = typeof title === 'string' ? title : String(title || 'Untitled');
  const safeValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '0';
  const safeTopExpenseCategories = Array.isArray(topExpenseCategories) ? topExpenseCategories : [];
  const safeTopIncomeSource = typeof topIncomeSource === 'string' ? topIncomeSource : 'N/A';
  const safeTopExpenseCategory = typeof topExpenseCategory === 'string' ? topExpenseCategory : 'N/A';
  const Icon = ICONS[variant] || CurrencyDollarIcon;
  const gradientId = useMemo(() => `stat-grad-${variant}-${String(title)}`.replace(/[^a-z0-9-_]/gi, '-'), [variant, title]);

  // Icon colors per variant
  const iconColors = {
    funds: "#2563EB",      // blue
    income: "#10B981",     // green
    expenses: "#F43F5E",   // rose
    budget: "#F59E0B",     // amber
    balance: "#06B6D4"     // cyan
  };
  // Card name color
  const nameColor = "#2563eb";
  // Amount/currency color
  const amountColor = "#fff";
  // Other text
  const neutral = isDark ? "#cbd5e1" : "#64748b";

  // timeframe: W (7d), M (30d), Y (365d)
  const [range, setRange] = useState('W');
  const [showRangeMenu, setShowRangeMenu] = useState(false);
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
    const raw = a ? ((b - a) / Math.abs(a)) * 100 : 0;
    return Math.max(-100, Math.min(100, raw));
  }, [data]);

  // Prepare data context for AI insight
  const insightContext = useMemo(() => ({
    amount: Number(rawValue) || 0,
    currency: String(currency) || 'USD',
    trend: Number(pct) || 0,
    topCategory: variant === 'expenses' ? safeTopExpenseCategory : safeTopIncomeSource,
    periodChangePercent: Math.round(Math.max(-100, Math.min(100, Number(pct) || 0))),
    totalIncome: Number(totalIncome) || 0,
    totalExpenses: Number(totalExpenses) || 0,
    topExpenseCategories: safeTopExpenseCategories,
  }), [rawValue, currency, pct, variant, safeTopExpenseCategory, safeTopIncomeSource, totalIncome, totalExpenses, safeTopExpenseCategories]);

  // Get AI insight
  const { insight, loading: insightLoading } = useFinancialInsight(variant, insightContext);

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
      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 ${className}`}
      style={{
        minHeight: compact ? 180 : 240,
        padding: 0,
        cursor: 'pointer',
        aspectRatio: '4 / 3',
      }}
    >

      {/* Soft, borderless fintech background */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `linear-gradient(135deg, rgba(30,41,59,0.75) 0%, rgba(15,23,42,0.55) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(248,250,252,0.55) 100%)`,
        }}
      />
      <div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
        style={{ background: `${iconColors[variant] || "#2563EB"}22` }}
      />
      <div
        className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full blur-3xl"
        style={{ background: `${iconColors[variant] || "#2563EB"}12` }}
      />

      <div className={`relative ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
        {/* Time range button - top right corner */}
        <div className="absolute top-2 right-2 z-20">
          <div className="relative">
            <button
              onClick={() => setShowRangeMenu(!showRangeMenu)}
              className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} flex items-center justify-center rounded-full font-semibold text-xs transition-all shadow-sm`}
              style={{
                background: isDark ? "rgba(0,0,0,0.3)" : "#e8f4f8",
                color: isDark ? "#cbd5e1" : iconColors[variant] || "#2563eb",
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : (iconColors[variant] || "#2563eb") + "30"}`,
              }}
              title="Select time range"
            >
              {range}
            </button>
            {showRangeMenu && (
              <div
                className="absolute top-full right-0 mt-1 rounded-lg shadow-xl z-30 min-w-max"
                style={{
                  background: isDark ? "#1e293b" : "#fff",
                  border: `1.5px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {['W', 'M', 'Y'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRange(r);
                      setShowRangeMenu(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                      r === 'W' ? 'rounded-t-lg' : ''
                    } ${r === 'Y' ? 'rounded-b-lg' : ''}`}
                    style={{
                      color: range === r ? (iconColors[variant] || "#2563eb") : (isDark ? "#cbd5e1" : "#64748b"),
                      background: range === r ? (isDark ? "rgba(5,150,105,0.15)" : "rgba(5,150,105,0.1)") : "transparent",
                    }}
                  >
                    {r === 'W' ? 'Week (7d)' : r === 'M' ? 'Month (30d)' : 'Year (365d)'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <div
            className={`absolute inset-y-0 right-0 ${compact ? 'w-[120px]' : 'w-[160px]'} opacity-40 pointer-events-none z-0`}
            style={{
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
              maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
            }}
          >
            {data.length > 0 ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, bottom: 10, left: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={iconColors[variant] || "#2563eb"} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={iconColors[variant] || "#2563eb"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={iconColors[variant] || "#2563eb"}
                      fill={`url(#${gradientId})`}
                      strokeWidth={3}
                      strokeOpacity={0.95}
                      fillOpacity={1}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      dot={false}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </div>

          <div className={`min-w-0 flex flex-col relative z-10 ${compact ? 'pr-[120px]' : 'pr-[160px]'}`}>
            <div className={`flex items-start ${compact ? 'mb-2' : 'mb-3'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`${compact ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-lg'} flex items-center justify-center flex-shrink-0`}
                  style={{
                    background: `${iconColors[variant] || "#2563eb"}15`,
                  }}
                >
                  <Icon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'}`} style={{ color: iconColors[variant] || "#2563eb" }} />
                </div>
                <p className="text-xs uppercase tracking-widest font-semibold opacity-70 truncate" style={{ color: iconColors[variant] || "#2563eb" }}>
                  {safeTitle}
                </p>
              </div>
            </div>

            <div className={`${compact ? 'mb-2' : 'mb-3'}`}>
              <p
                className={`font-bold overflow-hidden text-ellipsis ${compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'}`}
                title={safeValue}
                style={{
                  color: isDark ? "#fff" : "#1e293b",
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  wordBreak: 'break-word'
                }}
              >
                {safeValue}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {data.length > 1 && (
                <div
                  className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} flex flex-col items-center justify-center rounded-full shadow-md`}
                  style={{
                    background: pct >= 0
                      ? (isDark ? "rgba(5, 150, 105, 0.25)" : "rgba(5, 150, 105, 0.1)")
                      : (isDark ? "rgba(220, 38, 38, 0.25)" : "rgba(220, 38, 38, 0.1)"),
                    color: pct >= 0 ? "#059669" : "#dc2626",
                  }}
                >
                  <div className="flex items-center gap-1">
                    {pct >= 0 ? (
                      <ArrowTrendingUpIcon className={`${compact ? 'h-4 w-4' : 'h-4 w-4'}`} />
                    ) : (
                      <ArrowTrendingDownIcon className={`${compact ? 'h-4 w-4' : 'h-4 w-4'}`} />
                    )}
                  </div>
                  <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold`}>
                    {Math.abs(pct).toFixed(1)}%
                  </div>
                </div>
              )}
              <div className="min-w-0">
                {data.length > 1 && (
                  <div className="text-xs font-semibold" style={{ color: pct >= 0 ? "#059669" : "#dc2626" }}>
                    {pct >= 0 ? 'Increase' : 'Decrease'}
                  </div>
                )}
                {lastText && (
                  <div className="text-xs opacity-60" style={{ color: isDark ? "#cbd5e1" : "#64748b" }}>
                    as of {lastText}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`mt-3 rounded-lg ${compact ? 'p-2.5' : 'p-3'} text-xs leading-relaxed`}
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : `${iconColors[variant] || "#2563eb"}08`,
                color: isDark ? "#cbd5e1" : "#64748b",
              }}
            >
              {insightLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                  <span className="opacity-70">Generating insight...</span>
                </div>
              ) : insight && typeof insight === 'string' ? (
                <p className="m-0 line-clamp-3">{insight}</p>
              ) : (
                <span className="opacity-50 italic">
                  {variant === 'income' && 'Monitor your income trends and donor patterns.'}
                  {variant === 'expenses' && 'Track your spending and optimize budget allocation.'}
                  {variant === 'balance' && 'Keep your balance healthy by balancing income and expenses.'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
