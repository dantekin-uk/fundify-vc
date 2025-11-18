import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';

const COLORS_EXP = [
  '#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',  // Primary colors
  '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#14B8A6',  // Secondary colors
  '#6366F1', '#EC4899', '#F43F5E', '#0EA5E9', '#22C55E'   // Additional colors
];

function formatCurrency(v, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(v || 0);
  } catch (e) {
    return new Intl.NumberFormat().format(Math.round(v || 0));
  }
}

const TooltipBox = ({ title, amount, share, currency }) => (
  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
    <div className="font-semibold">{title}</div>
    <div className="text-sm">Amount: <span className="font-medium">{formatCurrency(amount, currency)}</span></div>
    <div className="text-sm">Share: <span className="font-medium">{(share * 100).toFixed(1)}%</span></div>
  </div>
);

const CustomTooltip = ({ active, payload, currency }) => {
  if (active && payload && payload.length) {
    const p = payload[0];
    return <TooltipBox title={p.name} amount={p.value} share={p.payload.percent} currency={currency} />;
  }
  return null;
};

// Render labels outside with connecting lines; show name and percent, small categories first
const renderOutsideLabel = ({ name, percent, cx, cy, midAngle, outerRadius, fill, value }) => {
  // Only show label if percentage is above 3% to avoid clutter
  if (percent < 0.03) return null;
  
  const RAD = Math.PI / 180;
  const r = outerRadius * 1.1; // Slightly further out
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  const anchor = x > cx ? 'start' : 'end';
  const pct = (percent * 100).toFixed(0) + '%';
  
  return (
    <g>
      <line
        x1={cx + (outerRadius * 0.7) * Math.cos(-midAngle * RAD)}
        y1={cy + (outerRadius * 0.7) * Math.sin(-midAngle * RAD)}
        x2={x - (x > cx ? 5 : -5)}
        y2={y}
        stroke={fill}
        strokeWidth={1.5}
        strokeDasharray="2 2"
      />
      <text 
        x={x + (x > cx ? 5 : -5)}
        y={y + 4}
        fill="#374151"
        textAnchor={anchor}
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={500}
      >
        {name}: {pct}
      </text>
    </g>
  );
};

export const ExpensePieChart = ({ data: propData, compact = false }) => {
  const { expenses } = useFinance();
  const { orgs, activeOrgId, currency } = useOrg();

  // Aggregate ALL posted expenses by category (all-time)
  const { data, total } = useMemo(() => {
    // Always aggregate ALL expenses regardless of status, project, funder, or organization
    const source = (propData && propData.length) ? propData : (expenses || []);

    const map = new Map();
    (source || []).forEach((ex) => {
      const cat = (ex.category || 'Miscellaneous').trim() || 'Miscellaneous';
      const amt = Math.abs(Number(ex.amount || 0));
      map.set(cat, (map.get(cat) || 0) + amt);
    });

    // prefer org-defined categories if available for ordering
    const org = orgs?.find((o) => o.id === activeOrgId) || null;
    const orgCats = Array.isArray(org?.internalCategories) && org.internalCategories.length ? org.internalCategories.map((c) => c.trim()).filter(Boolean) : null;

    const entries = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((e) => Number(e.value) > 0);
    const ordered = orgCats
      ? [...entries.filter(e => orgCats.includes(e.name)).sort((a,b)=> orgCats.indexOf(a.name)-orgCats.indexOf(b.name)), ...entries.filter(e => !orgCats.includes(e.name)).sort((a,b)=> b.value-a.value)]
      : entries.sort((a,b)=> b.value - a.value);

    const tot = ordered.reduce((s, it) => s + it.value, 0);
    // add percent and sort ascending by percent (smallest first)
    const itemsWithPercent = ordered.map((it) => ({ ...it, percent: tot ? it.value / tot : 0, change: 0, pctChange: 0 }))
                                   .sort((a, b) => a.percent - b.percent);
    return { data: itemsWithPercent, total: tot };
  }, [expenses, propData, orgs, activeOrgId]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100">
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-slate-100">Expenses by Category</h3>
        <div className="text-sm text-gray-500 dark:text-slate-400">No expenses yet.</div>
      </div>
    );
  }

  if (compact) {
    // Compact, modern thin donut for right-side placement
    return (
      <div className="overflow-hidden rounded-2xl bg-white/90 backdrop-blur ring-1 ring-gray-200 shadow-sm p-4 max-w-[16rem] sm:max-w-[18rem] dark:bg-slate-900/70 dark:ring-slate-800 dark:text-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-100">Expenses Breakdown</h3>
        <div className="h-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.map((entry, idx) => (
                  <linearGradient key={`gradient-${idx}`} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS_EXP[idx % COLORS_EXP.length]} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={COLORS_EXP[idx % COLORS_EXP.length]} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="70%"  // Thinner ring (higher percentage)
                outerRadius="90%"  // Slightly smaller overall
                paddingAngle={1}   // Tighter spacing between segments
                startAngle={90}
                endAngle={-270}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                labelLine={false}
                label={renderOutsideLabel}
              >
                {data.map((entry, idx) => (
                  <Cell 
                    key={`cell-${idx}`} 
                    fill={`url(#gradient-${idx})`}
                    stroke="#fff"
                    strokeWidth={1}
                    style={{
                      transition: 'opacity 0.3s',
                      cursor: 'pointer',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Spent</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatCurrency(total, currency)}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="text-slate-500 dark:text-slate-400">Total: </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(total, currency)}</span>
        </div>
        {/* Condensed breakdown list */}
        <div className="mt-2 space-y-1.5 max-h-32 overflow-auto pr-1">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block h-2 w-5 rounded-full" style={{ background: COLORS_EXP[i % COLORS_EXP.length] }} />
                <span className="text-[11px] text-slate-700 truncate dark:text-slate-200">{d.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 whitespace-nowrap dark:text-slate-400">
                <span className="font-medium text-slate-800 mr-1 dark:text-slate-100">{(d.percent * 100).toFixed(0)}%</span>
                {formatCurrency(d.value, currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default full card with side breakdown
  return (
    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex flex-col md:flex-row gap-4 items-stretch dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100">
      <div className="flex-1 min-h-[220px] flex items-center justify-center">
        <div className="w-full max-w-md h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="45%"
                cy="50%"
                innerRadius={68}
                outerRadius={102}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={true}
                animationDuration={900}
                labelLine={true}
                label={renderOutsideLabel}
              >
                {data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS_EXP[idx % COLORS_EXP.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Expenses</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(total, currency)}</div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-80 flex-shrink-0">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 dark:text-slate-200">Breakdown</h4>
        <div className="space-y-3">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-8 rounded-full shadow-sm" style={{ background: COLORS_EXP[i % COLORS_EXP.length] }} />
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{d.name}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-400">{formatCurrency(d.value, currency)} • {(d.percent * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="text-sm font-medium text-slate-400 dark:text-slate-400">{(d.percent * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProjectPieChart = ({ data }) => {
  const { currency } = useOrg();
  if (!data?.length) return null;
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-slate-100">Expenses by Project</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} innerRadius={40} dataKey="value" 
                 label={({ name, value, percent }) => `${name}: ${formatCurrency(value, currency)} (${(percent * 100).toFixed(1)}%)`}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_EXP[index % COLORS_EXP.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Keep simple FunderPieChart (unchanged behavior)
export const FunderPieChart = ({ data }) => {
  const { currency } = useOrg();
  if (!data?.length) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-slate-100">Expenses by Donor</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              dataKey="value"
              animationBegin={100}
              animationDuration={1000}
              animationEasing="ease-out"
              label={({ name, value, percent }) => `${name}: ${formatCurrency(value, currency)} (${(percent * 100).toFixed(1)}%)`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_EXP[index % COLORS_EXP.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const PieCharts = ({ expenseData, funderData, projectData }) => {
  // Expenses-by-category and project breakdown removed per request.
  // Only show funder-level breakdown when needed.
  return (
    <div className="grid grid-cols-1 gap-6 mt-6">
      <FunderPieChart data={funderData} />
    </div>
  );
};

export { PieCharts };
export default ExpensePieChart;
