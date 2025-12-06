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
import { insightSource } from '../services/geminiInsights';

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
    return a ? ((b - a) / Math.abs(a)) * 100 : 0;
  }, [data]);

  // Prepare data context for AI insight
  const insightContext = useMemo(() => ({
    amount: Number(rawValue) || 0,
    currency: String(currency) || 'USD',
    trend: Number(pct) || 0,
    topCategory: variant === 'expenses' ? safeTopExpenseCategory : safeTopIncomeSource,
    periodChangePercent: Math.round(pct),
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
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg transition-all duration-300 ${className}`}
      style={{
        minHeight: 260,
        padding: 0,
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.08)',
        cursor: 'pointer',
        background: isDark
          ? `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`
          : `linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(37,99,235,0.16)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 4px 20px 0 rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'none';
      }}
    >

      <div className="relative p-6 sm:p-8 flex flex-col justify-between min-h-[260px]">
        {/* Top Header: Icon + Title (left) and Timeframe Dropdown (right) */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="h-8 w-8 flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                background: `${iconColors[variant] || "#2563eb"}15`,
              }}
            >
              <Icon className="h-5 w-5" style={{ color: iconColors[variant] || "#2563eb" }} />
            </div>
            <p className="text-xs uppercase tracking-widest font-semibold opacity-70 truncate" style={{ color: iconColors[variant] || "#2563eb" }}>
              {safeTitle}
            </p>
          </div>

          {/* Timeframe Dropdown Selector */}
          <div className="relative ml-2 flex-shrink-0">
            <button
              onClick={() => setShowRangeMenu(!showRangeMenu)}
              className="h-9 w-9 flex items-center justify-center rounded-full font-semibold text-xs transition-all shadow-sm"
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
                className="absolute top-full right-0 mt-2 rounded-lg shadow-xl z-10 min-w-max"
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
                    className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
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

        {/* Amount */}
        <div className="mb-4">
          <p
            className="font-bold overflow-hidden text-ellipsis text-2xl sm:text-3xl"
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

        {/* Chart */}
        {data.length > 0 && (
          <div className="h-12 rounded-lg overflow-hidden mb-4 border" style={{
            background: isDark ? "rgba(0,0,0,0.2)" : `${iconColors[variant] || "#2563eb"}08`,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : `${iconColors[variant] || "#2563eb"}20`,
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={iconColors[variant] || "#2563eb"} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={iconColors[variant] || "#2563eb"} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={iconColors[variant] || "#2563eb"}
                  fill={`url(#${gradientId})`}
                  strokeWidth={2}
                  strokeOpacity={1}
                  fillOpacity={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bottom: Percentage Badge and Timestamp */}
        <div className="space-y-3 mt-auto">
          <div className="flex items-center gap-3">
            {data.length > 1 && (
              <div
                className="h-12 w-12 flex flex-col items-center justify-center rounded-full shadow-md border-2"
                style={{
                  background: pct >= 0
                    ? (isDark ? "rgba(5, 150, 105, 0.25)" : "rgba(5, 150, 105, 0.1)")
                    : (isDark ? "rgba(220, 38, 38, 0.25)" : "rgba(220, 38, 38, 0.1)"),
                  color: pct >= 0 ? "#059669" : "#dc2626",
                  borderColor: pct >= 0 ? (isDark ? "rgba(5, 150, 105, 0.4)" : "rgba(5, 150, 105, 0.3)") : (isDark ? "rgba(220, 38, 38, 0.4)" : "rgba(220, 38, 38, 0.3)"),
                }}
              >
                <div className="flex items-center gap-1">
                  {pct >= 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="text-xs font-bold">
                  {Math.abs(pct).toFixed(1)}%
                </div>
              </div>
            )}
            <div>
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

          {/* AI Insight */}
          <div
            className="rounded-lg p-3 border text-xs leading-relaxed"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : `${iconColors[variant] || "#2563eb"}08`,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : `${iconColors[variant] || "#2563eb"}20`,
              color: isDark ? "#cbd5e1" : "#64748b",
            }}
          >
            {insightLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                <span className="opacity-70">Generating insight...</span>
              </div>
            ) : insight && typeof insight === 'string' ? (
              <div className="flex flex-col gap-2">
                <p className="m-0">{insight}</p>
                {insightSource?.source === 'openai' && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">✨ Powered by OpenAI</span>
                )}
              </div>
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
  );
}
