import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { useTheme } from '../context/ThemeContext';
import { useMemo, useState, useEffect } from 'react';
import { formatAmount } from '../utils/format';

const FUNDER_COLORS = [
  '#4F46E5', // indigo
  '#0EA5E9', // sky
  '#06B6D4', // cyan
  '#14B8A6', // teal
  '#10B981', // emerald
  '#22C55E', // lime
  '#84CC16', // lime-500
  '#F59E0B', // amber
  '#F97316', // orange
  '#F43F5E', // rose
];

const CustomTooltip = ({ active, payload, currency }) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
        <div className="font-semibold text-sm text-gray-900 dark:text-slate-100 mb-2">
          {data.funderName}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-slate-400">Allocated:</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">{formatAmount(data.allocation, currency)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-slate-400">Income:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatAmount(data.income, currency)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-slate-400">Expenses:</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">{formatAmount(data.expenses, currency)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-gray-200 dark:border-slate-600">
            <span className="text-gray-600 dark:text-slate-400">Available:</span>
            <span className="font-medium text-sky-600 dark:text-sky-400">{formatAmount(data.available, currency)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function FundersBudgetChart({ timeRange = 'All', className = '' }) {
  const { byFunder } = useFinance();
  const { currency } = useOrg();
  const { isDark } = useTheme();
  const [metric, setMetric] = useState('allocation');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 1024;

  const chartData = useMemo(() => {
    if (!byFunder || byFunder.length === 0) return [];

    return byFunder
      .sort((a, b) => {
        const aVal = Math.abs(a[metric] || 0);
        const bVal = Math.abs(b[metric] || 0);
        return bVal - aVal;
      })
      .map((f, idx) => ({
        funderName: f.funder?.name || 'Unknown',
        funderId: f.funder?.id || idx,
        value: Math.abs(f[metric] || 0),
        allocation: Math.abs(f.allocation || 0),
        income: Math.abs(f.income || 0),
        expenses: Math.abs(f.expenses || 0),
        available: Math.abs(f.available || 0),
        color: FUNDER_COLORS[idx % FUNDER_COLORS.length],
      }));
  }, [byFunder, metric]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => d.value || 0), 1);
  }, [chartData]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm p-6 dark:bg-slate-900/80 dark:ring-slate-700/50 ${className}`}>
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Funders Budget Overview</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">No funder data available yet.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900/80 dark:ring-slate-700/50 ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-200/50 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-slate-100">Funders Budget Overview</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Budget allocation and financial metrics by funder</p>
          </div>

          {/* Metric Toggle */}
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {['allocation', 'income', 'expenses', 'available'].map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                  metric === m
                    ? 'bg-sky-600 text-white shadow-md ring-1 ring-sky-500/50'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {isMobile ? m.charAt(0).toUpperCase() : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="px-3 sm:px-5 py-5 overflow-x-auto">
        <div className={`${isMobile ? 'h-64' : isTablet ? 'h-80' : 'h-96 lg:h-[450px]'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 10,
                right: 30,
                left: isMobile ? 100 : isTablet ? 150 : 200,
                bottom: 10
              }}
              barCategoryGap="20%"
            >
              <defs>
                {chartData.map((d, idx) => (
                  <linearGradient key={`grad-${idx}`} id={`gradient-${idx}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={d.color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={d.color} stopOpacity="1" />
                  </linearGradient>
                ))}
                <filter id="budgetShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0ea5e9" floodOpacity="0.12" />
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={true}
                horizontal={false}
                stroke={isDark ? '#334155' : '#e5e7eb'}
              />

              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: isDark ? '#cbd5e1' : '#6b7280' }}
                tickFormatter={(v) => formatAmount(v, currency)}
                stroke={isDark ? '#475569' : '#d1d5db'}
              />

              <YAxis
                dataKey="funderName"
                type="category"
                tick={{
                  fontSize: 13,
                  fill: isDark ? '#e2e8f0' : '#374151',
                  fontWeight: 500,
                }}
                width={190}
                stroke={isDark ? '#475569' : '#d1d5db'}
              />

              <Tooltip
                content={<CustomTooltip currency={currency} />}
                cursor={{ fill: isDark ? 'rgba(100, 116, 139, 0.1)' : 'rgba(59, 130, 246, 0.08)' }}
              />

              <Bar
                dataKey="value"
                radius={[0, 12, 12, 0]}
                barSize={28}
                filter="url(#budgetShadow)"
              >
                {chartData.map((d, idx) => (
                  <Cell key={`cell-${idx}`} fill={`url(#gradient-${idx})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Info */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
            <div className="text-indigo-600 dark:text-indigo-400 font-semibold">Total Funders</div>
            <div className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{chartData.length}</div>
          </div>

          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Total Income</div>
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              {formatAmount(chartData.reduce((s, d) => s + d.income, 0), currency)}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <div className="text-orange-600 dark:text-orange-400 font-semibold">Total Expenses</div>
            <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">
              {formatAmount(chartData.reduce((s, d) => s + d.expenses, 0), currency)}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20">
            <div className="text-sky-600 dark:text-sky-400 font-semibold">Total Available</div>
            <div className="text-sm text-sky-700 dark:text-sky-300 font-medium">
              {formatAmount(chartData.reduce((s, d) => s + d.available, 0), currency)}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <div className="text-purple-600 dark:text-purple-400 font-semibold">Total Allocation</div>
            <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">
              {formatAmount(chartData.reduce((s, d) => s + d.allocation, 0), currency)}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
            <div className="text-cyan-600 dark:text-cyan-400 font-semibold">Avg per Funder</div>
            <div className="text-sm text-cyan-700 dark:text-cyan-300 font-medium">
              {formatAmount(chartData.reduce((s, d) => s + d.value, 0) / chartData.length, currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
