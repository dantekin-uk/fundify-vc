import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { useTheme } from '../context/ThemeContext';
import { useMemo, useState } from 'react';

const PALETTE = [
  '#6366F1', // indigo
  '#06B6D4', // cyan
  '#F59E0B', // amber
  '#EF4444', // rose
  '#10B981', // emerald
  '#0EA5E9', // sky
  '#8B5CF6', // violet
  '#84CC16', // lime
  '#14B8A6', // teal
  '#F97316', // orange
];

function formatCurrency(v, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(v || 0);
  } catch (e) {
    return new Intl.NumberFormat().format(Math.round(v || 0));
  }
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[220px] dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-800 mb-1 dark:text-slate-100">{label}</div>
        <div className="space-y-1">
          {payload.map((p) => (
            <div key={p.dataKey} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
              </div>
              <span className="font-medium text-slate-800 dark:text-slate-100">{formatCurrency(p.value, currency)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 mt-2 pt-2 text-xs flex items-center justify-between dark:border-slate-700">
          <span className="text-slate-500 dark:text-slate-400">Total</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function FundersExpensesStackedBar({ className = '', timeRange = 'All' }) {
  const { expenses, projects, funders } = useFinance();
  const { orgs, activeOrgId, currency } = useOrg();
  const { isDark } = useTheme();

  const { data, categories } = useMemo(() => {
    const rangeDays = (tr) => {
      switch (tr) {
        case '1M': return 30;
        case '3M': return 90;
        case '6M': return 180;
        case '1Y': return 365;
        default: return Infinity; // 'All'
      }
    };

    const days = rangeDays(timeRange);
    const now = new Date();
    const start = Number.isFinite(days) ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;
    const safeDate = (t) => (t ? new Date(t) : null);

    const posted = (expenses || [])
      .filter((e) => e.status === 'posted')
      .filter((e) => {
        if (!start) return true;
        const d = safeDate(e.date || e.createdAt || e.timestamp);
        return d ? d >= start && d <= now : true;
      });

    // derive category order preference from org, if provided
    const org = orgs?.find((o) => o.id === activeOrgId) || null;
    const orgCats = Array.isArray(org?.internalCategories)
      ? org.internalCategories.map((c) => (c || '').trim()).filter(Boolean)
      : [];

    // collect unique categories across posted expenses
    const catsSet = new Set(orgCats);
    posted.forEach((e) => { if (e.category) catsSet.add(e.category); });
    const categoriesList = Array.from(catsSet.size ? catsSet : new Set(['Other']));

    // group by funder -> per-category totals
    const map = new Map(); // funderId -> { name, [category]: amount }

    posted.forEach((e) => {
      const project = (projects || []).find((p) => p.id === e.projectId);
      const funderId = e.walletId || project?.funderId || 'ORG';
      const funderName = (funders || []).find((f) => f.id === funderId)?.name || (funderId === 'ORG' ? 'Organization' : funderId);
      const amount = Math.abs(Number(e.amount || 0));
      const cat = (e.category || 'Other');

      if (!map.has(funderId)) {
        const base = { funder: funderName };
        categoriesList.forEach((c) => (base[c] = 0));
        map.set(funderId, base);
      }
      const entry = map.get(funderId);
      entry[cat] = (entry[cat] || 0) + amount;
    });

    const rows = [];
    for (const [, entry] of map.entries()) {
      const row = { funder: entry.funder };
      categoriesList.forEach((c) => { row[c] = entry[c] || 0; });
      row.total = categoriesList.reduce((s, c) => s + (row[c] || 0), 0);
      rows.push(row);
    }

    // sort funders by total descending
    rows.sort((a, b) => (b.total || 0) - (a.total || 0));

    return { data: rows, categories: categoriesList };
  }, [expenses, projects, orgs, activeOrgId, timeRange, funders]);

  // Interactive legend (hooks must be declared before any early return)
  const [hiddenCategories, setHiddenCategories] = useState(new Set());
  const [showAllLegend, setShowAllLegend] = useState(false);
  const categoriesAll = categories || [];
  const categoriesVisible = categoriesAll.filter((c) => !hiddenCategories.has(c));
  const legendMax = 10;
  const legendList = showAllLegend ? categoriesAll : categoriesAll.slice(0, legendMax);
  const toggleCategory = (cat) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  if (!data?.length) {
    return (
      <div className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 ${className} dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100`}>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-slate-100">Funders Expenses Breakdown</h3>
        <div className="text-sm text-gray-500 dark:text-slate-400">No expense data yet.</div>
      </div>
    );
  }

  const angle = data?.length > 6 ? -25 : 0;
  const perRowWidth = 36;
  const minWidth = Math.max(520, (data?.length || 0) * perRowWidth);

  const colors = PALETTE;
  const categoryColors = (categories || []).reduce((acc, c, i) => { acc[c] = colors[i % colors.length]; return acc; }, {});

  return (
    <div className={`overflow-hidden rounded-3xl bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-xl ring-1 ring-gray-200 shadow-sm hover:shadow-md transition-shadow ${className} dark:from-slate-900/80 dark:to-slate-900/60 dark:ring-slate-800 dark:text-slate-100`}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100/70 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M7 11h10M7 15h6"/></svg>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">Funders Expenses</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Stacked by category</p>
          </div>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Live</span>
      </div>
      <div className="px-5 py-4">
        <div className="h-48 lg:h-60 overflow-x-auto">
          <div style={{ minWidth }} className="h-full lg:max-w-4xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 8, bottom: 6, left: 8 }} barCategoryGap="10%" barGap={6}>
                <defs>
                  {categoriesVisible.map((cat) => {
                    const id = `grad-funder-${cat.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-_]/g,'').toLowerCase()}`;
                    const c = categoryColors[cat];
                    return (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity="1" />
                        <stop offset="100%" stopColor={c} stopOpacity="0.75" />
                      </linearGradient>
                    );
                  })}
                  <filter id="barShadowF" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0ea5e9" floodOpacity="0.07" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                <XAxis dataKey="funder" tick={{ fontSize: 12, fill: isDark ? '#cbd5e1' : '#475569' }} interval={0} angle={angle} height={angle ? 70 : 50} dy={angle ? 12 : 10} />
                <YAxis tick={{ fontSize: 12, fill: isDark ? '#cbd5e1' : '#475569' }} tickFormatter={(v) => formatCurrency(v, currency)} />
                <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: 'rgba(2,132,199,0.06)' }} />
                {/* Removed default Legend to keep only the styled legend below */}
                {categoriesVisible.map((cat) => {
                  const id = `grad-funder-${cat.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-_]/g,'').toLowerCase()}`;
                  return <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={`url(#${id})`} radius={[12, 12, 12, 12]} barSize={14} stroke="#ffffff" strokeWidth={2} filter="url(#barShadowF)" />;
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {legendList.map((c) => {
            const hidden = hiddenCategories.has(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggleCategory(c)}
                aria-pressed={!hidden}
                title={hidden ? `Show ${c}` : `Hide ${c}`}
                className={`flex items-center gap-2 text-xs md:text-sm px-2.5 py-1.5 rounded-full border transition ${hidden ? 'bg-white/70 text-slate-400 border-slate-200 dark:bg-slate-900/50 dark:text-slate-500 dark:border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'}`}
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: categoryColors[c], opacity: hidden ? 0.35 : 1 }} />
                <span className="truncate max-w-[140px]">{c}</span>
              </button>
            );
          })}
          {categoriesAll.length > legendMax && (
            <button
              type="button"
              className="text-xs md:text-sm px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
              onClick={() => setShowAllLegend((s) => !s)}
            >
              {showAllLegend ? 'Show less' : `Show all (${categoriesAll.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
