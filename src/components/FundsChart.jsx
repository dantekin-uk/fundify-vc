import { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { formatAmount } from '../utils/format';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function FundsChart({ initialWallet = 'ALL' }) {
  const { incomes, expenses, projects, totals, byFunder } = useFinance();
  const { currency } = useOrg();
  const { isDark } = useTheme();
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [timeRange, setTimeRange] = useState(7);
  const chartRef = useRef(null);
  const [chartOptions, setChartOptions] = useState(null);
  const [summary, setSummary] = useState({ lastValue: 0, valuePct: 0 });
  const [selectedWallet, setSelectedWallet] = useState(initialWallet);
  const [lines, setLines] = useState({ total: true, igp: true, income: true });

  useEffect(() => {
    // Build a time series of cumulative total funds (posted incomes - posted expenses) over the selected range
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - timeRange);

    const safeDate = (t) => (t ? new Date(t) : new Date());

    const inc = (incomes || [])
      .filter((i) => i.status === 'posted')
      .map((i) => ({ date: safeDate(i.date || i.createdAt || i.timestamp), delta: Number(i.amount || 0), projectId: i.projectId, walletId: i.walletId || null }));

    const exp = (expenses || [])
      .filter((e) => e.status === 'posted')
      .map((e) => ({ date: safeDate(e.date || e.createdAt || e.timestamp), delta: -Number(e.amount || 0), projectId: e.projectId, walletId: e.walletId || null }));

    // combined transactions in range (we will use only incomes for the blue line below)
    const all = [...inc, ...exp]
      .filter((t) => t.date >= startDate && t.date <= now)
      .sort((a, b) => a.date - b.date);

    // Optionally filter by wallet (transactions use walletId)
    const filtered = selectedWallet === 'ALL' ? all : all.filter((t) => (t.walletId ? t.walletId === selectedWallet : true));

    // Aggregate by day into a map of YYYY-MM-DD -> delta
    const map = new Map();
    filtered.forEach((t) => {
      const day = t.date.toISOString().slice(0, 10);
      map.set(day, (map.get(day) || 0) + t.delta);
    });

    // Build a full daily timeline from startDate to now so single-day changes are reflected
    const daysArr = [];
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      daysArr.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    // For the blue Total Funds line we now show Total Posted Income (all sources including Organization)
    // Build a map of daily ALL incomes and cumulative series
    const mapAllIncome = new Map();
    (incomes || [])
      .filter((i) => i.status === 'posted' && (i.date ? new Date(i.date) >= startDate && new Date(i.date) <= now : true))
      .forEach((i) => {
        const d = (i.date ? new Date(i.date) : new Date()).toISOString().slice(0, 10);
        mapAllIncome.set(d, (mapAllIncome.get(d) || 0) + Number(i.amount || 0));
      });
    let totalIncomeCum = 0;
    const points = [];
    for (const d of daysArr) {
      totalIncomeCum += mapAllIncome.get(d) || 0;
      points.push({ date: d, value: totalIncomeCum });
    }

    const labelsRaw = points.length ? points.map((p) => p.date) : [];

    const labels = labelsRaw.map((l) => format(new Date(l), 'MMM d'));

    // Ensure the last point reflects the stat card Total Funds (total posted incomes)
    const totalIncomeAll = (incomes || [])
      .filter((i) => i.status === 'posted')
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    if (points.length) {
      const lastIdx = points.length - 1;
      const existing = Number(points[lastIdx].value || 0);
      if (Math.abs(existing - totalIncomeAll) > 0.0001) {
        points[lastIdx].value = totalIncomeAll;
      }
    }

    const lastValue = points.length ? points[points.length - 1].value : totalIncomeAll || 0;
    const firstValue = points.length ? points[0].value : lastValue;
    const valuePct = firstValue ? ((lastValue - firstValue) / Math.abs(firstValue || 1)) * 100 : 0;
    setSummary({ lastValue, valuePct });

    const valueSeries = points.length ? points.map((p) => p.value) : labels.map(() => lastValue);

    // IGP Income cumulative line
    const igpIds = new Set((projects || []).filter((p) => p.type === 'igp').map((p) => p.id));
    const mapIgp = new Map();
    (incomes || [])
      .filter((i) => i.status === 'posted' && (i.date ? new Date(i.date) >= startDate && new Date(i.date) <= now : true) && igpIds.has(i.projectId))
      .forEach((i) => {
        const day = (i.date ? new Date(i.date) : new Date()).toISOString().slice(0, 10);
        mapIgp.set(day, (mapIgp.get(day) || 0) + Number(i.amount || 0));
      });
    let igpCum = 0;
    let igpSeries = daysArr.map((d) => {
      igpCum += mapIgp.get(d) || 0;
      return igpCum;
    });
    // Align IGP line's last point with stat card's IGP Funds (all posted IGP incomes)
    const igpIncomeTotal = (incomes || [])
      .filter((i) => i.status === 'posted' && igpIds.has(i.projectId))
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    if (igpSeries.length) igpSeries[igpSeries.length - 1] = igpIncomeTotal;

    // Funding Income line (exclude Organization income). Resolve wallet as income.walletId || project.funderId || 'ORG'
    const mapIncome = new Map();
    (incomes || [])
      .filter((i) => i.status === 'posted' && (i.date ? new Date(i.date) >= startDate && new Date(i.date) <= now : true))
      .forEach((i) => {
        const project = (projects || []).find((p) => p.id === i.projectId);
        const resolvedWallet = i.walletId || (project?.funderId || 'ORG');
        if (resolvedWallet === 'ORG') return; // exclude org income
        const day = (i.date ? new Date(i.date) : new Date()).toISOString().slice(0, 10);
        mapIncome.set(day, (mapIncome.get(day) || 0) + Number(i.amount || 0));
      });
    let incomeCum = 0;
    let incomeSeries = daysArr.map((d) => {
      incomeCum += mapIncome.get(d) || 0;
      return incomeCum;
    });
    // Align Funding Income line's last point with total posted funding income (exclude ORG)
    const totalFundingIncome = (incomes || [])
      .filter((i) => i.status === 'posted')
      .reduce((s, i) => {
        const project = (projects || []).find((p) => p.id === i.projectId);
        const resolvedWallet = i.walletId || (project?.funderId || 'ORG');
        return resolvedWallet === 'ORG' ? s : s + Number(i.amount || 0);
      }, 0);
    if (incomeSeries.length) incomeSeries[incomeSeries.length - 1] = totalFundingIncome;

    const datasets = [];
    if (lines.total) {
      datasets.push({
        label: 'Total Funds (All Income)',
        data: valueSeries,
        borderColor: '#2563eb',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(37,99,235,0.12)';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(37,99,235,0)');
          gradient.addColorStop(1, 'rgba(37,99,235,0.20)');
          return gradient;
        },
        fill: true,
        tension: 0.6,
        cubicInterpolationMode: 'default',
        borderWidth: 2,
        pointRadius: (context) => (context.dataIndex === context.dataset.data.length - 1 ? 4 : 0),
        pointBackgroundColor: (context) => (context.dataIndex === context.dataset.data.length - 1 ? '#2563eb' : 'rgba(37,99,235,0.6)'),
        pointHoverRadius: 6,
        hoverBorderWidth: 3,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
      });
    }
    if (lines.igp) {
      datasets.push({
        label: 'IGP Income',
        data: igpSeries,
        borderColor: '#059669',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(5,150,105,0.12)';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(5,150,105,0)');
          gradient.addColorStop(1, 'rgba(5,150,105,0.18)');
          return gradient;
        },
        fill: true,
        tension: 0.6,
        borderWidth: 2,
        pointRadius: 0,
      });
    }
    if (lines.income) {
      datasets.push({
        label: 'Funding Income (Donors)',
        data: incomeSeries,
        borderColor: '#d97706',
        // Dotted line styling
        borderDash: [6, 4],
        fill: false,
        tension: 0.6,
        borderWidth: 2,
        pointRadius: 0,
      });
    }

    setChartData({ labels, datasets });

    // small enhancement: ensure chart animations enabled for live updates
    setChartOptions((opts) => ({
      ...(opts || {}),
      animation: { duration: 600, easing: 'easeOutCubic' },
    }));

    // Compute Y-axis bounds across all visible series so small/zero Funding line is not clipped
    const candidates = [];
    if (valueSeries && valueSeries.length) candidates.push(...valueSeries);
    if (lines.igp && igpSeries && igpSeries.length) candidates.push(...igpSeries);
    if (lines.income && incomeSeries && incomeSeries.length) candidates.push(...incomeSeries);
    if (candidates.length === 0) candidates.push(0);
    const vMin = Math.min(...candidates);
    const vMax = Math.max(...candidates);
    const vRange = Math.max(1, vMax - vMin);
    const vSuggestedMin = vMin - vRange * 0.25;

    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, color: isDark ? '#cbd5e1' : '#0f172a' } },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'white',
          titleColor: isDark ? '#e2e8f0' : '#0f172a',
          bodyColor: isDark ? '#e2e8f0' : '#0f172a',
          padding: 10,
          boxPadding: 6,
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#e6eefc',
          callbacks: {
            title: (context) => format(new Date(labelsRaw[context[0].dataIndex] || new Date()), 'MMM d, yyyy'),
            label: (ctx) => `${ctx.dataset.label}: ${formatAmount(ctx.parsed.y, currency)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, color: isDark ? '#94a3b8' : undefined }, offset: true },
        y: { beginAtZero: false, suggestedMin: vSuggestedMin, grid: { display: false }, ticks: { color: isDark ? '#94a3b8' : undefined, callback: (v) => formatAmount(v, currency) }, grace: '20%' },
      },
    });
  }, [incomes, expenses, projects, selectedWallet, timeRange, totals, byFunder]);

  // Force Chart.js to re-render when chartData changes (ensures realtime updates)
  useEffect(() => {
    try {
      const ref = chartRef.current;
      // react-chartjs-2 exposes chart instance in different shapes depending on version
      const chartInstance = ref?.chartInstance || ref?.chart || ref;
      if (chartInstance && typeof chartInstance.update === 'function') chartInstance.update();
      // fallback: force re-render by toggling a minor option (safe)
      else if (ref && typeof ref.forceUpdate === 'function') ref.forceUpdate();
    } catch (e) {
      // ignore
    }
  }, [chartData]);

  const optionsFallback = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: { legend: { display: false } },
  };

  // Compute values for the header cards
  const totalIncomeAllRender = (incomes || [])
    .filter((i) => i.status === 'posted')
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const fundingIncomeSumRender = (incomes || [])
    .filter((i) => i.status === 'posted')
    .reduce((s, i) => {
      const project = (projects || []).find((p) => p.id === i.projectId);
      const resolvedWallet = i.walletId || (project?.funderId || 'ORG');
      return resolvedWallet === 'ORG' ? s : s + Number(i.amount || 0);
    }, 0);

  return (
    <div className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 dark:shadow-none dark:text-slate-100">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3 min-w-0">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Funds Overview</h3>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1 shadow-inner dark:bg-slate-800">
            <button onClick={() => setTimeRange(7)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none ${timeRange === 7 ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow dark:shadow-none' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700'}`}>7 Days</button>
            <button onClick={() => setTimeRange(30)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none ${timeRange === 30 ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow dark:shadow-none' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700'}`}>30 Days</button>
            <button onClick={() => setTimeRange(90)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none ${timeRange === 90 ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow dark:shadow-none' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700'}`}>90 Days</button>
          </div>
          <div className="hidden sm:inline-flex items-center rounded-full bg-slate-100 p-1 shadow-inner dark:bg-slate-800">
            <button onClick={() => setLines((s) => ({ ...s, total: !s.total }))} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-200 ${lines.total ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow dark:shadow-none' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700'}`}>Total</button>
            <button onClick={() => setLines((s) => ({ ...s, igp: !s.igp }))} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-200 ${lines.igp ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow dark:shadow-none' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700'}`}>IGP</button>
            <button onClick={() => setLines((s) => ({ ...s, income: !s.income }))} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-200 ${lines.income ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow dark:shadow-none' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700'}`}>Funding</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Custom Total Funds small card (unique style) */}
        <div className="relative overflow-hidden rounded-2xl p-4 border shadow-sm transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group" style={{ background: isDark ? 'linear-gradient(180deg, #1E293B, #0F172A)' : 'linear-gradient(180deg, #FFFFFF, #F8FAFF)', borderColor: isDark ? '#312E81' : '#E7E9FF', boxShadow: isDark ? '0 0 20px rgba(99, 102, 241, 0.3)' : '0 0 10px rgba(99, 102, 241, 0.1)' }}>
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-tr-xl rounded-br-xl group-hover:w-2 transition-all duration-300" style={{ background: 'linear-gradient(180deg, #6366F1, #8B5CF6)' }} />
          <div className="flex items-center gap-3 z-10 relative">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg transform transition-all duration-300 group-hover:scale-105" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white' }}>
              <CurrencyDollarIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold tracking-wide" style={{ color: isDark ? '#A5B4FC' : '#312E81', letterSpacing: '0.04em' }}>Total Funds</div>
              <div className="mt-1 font-bold text-[clamp(1rem,2.5vw,1.25rem)] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: isDark ? '#F1F5F9' : '#0f172a' }}>{formatAmount(totalIncomeAllRender, currency)}</div>
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: isDark ? '#94A3B8' : '#475569' }}>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 ${summary.valuePct >= 0 ? (isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-50 text-indigo-700') : (isDark ? 'bg-rose-950 text-rose-300' : 'bg-rose-50 text-rose-700')}`}>
                  {summary.valuePct >= 0 ? <ArrowTrendingUpIcon className="h-3 w-3 mr-1" style={{ color: isDark ? '#A78BFA' : '#4F46E5' }} /> : <ArrowTrendingDownIcon className="h-3 w-3 mr-1" style={{ color: isDark ? '#FCA5A5' : '#EF4444' }} />}
                  {`${Math.abs(summary.valuePct).toFixed(1)}%`}
                </div>
                <div className="text-xs" style={{ color: isDark ? '#64748B' : '#9CA3AF' }}>in last {timeRange} days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Funding Sources small card (unique style) */}
        <div className="relative overflow-hidden rounded-2xl p-4 border shadow-sm transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group" style={{ background: isDark ? 'linear-gradient(180deg, #1E293B, #0F172A)' : 'linear-gradient(180deg, #FFFFFF, #F8FFFE)', borderColor: isDark ? '#064E3B' : '#E6FFFA', boxShadow: isDark ? '0 0 20px rgba(6, 182, 212, 0.3)' : '0 0 10px rgba(6, 182, 212, 0.1)' }}>
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-tr-xl rounded-br-xl group-hover:w-2 transition-all duration-300" style={{ background: 'linear-gradient(180deg, #06B6D4, #14B8A6)' }} />
          <div className="flex items-center gap-3 z-10 relative">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg transform transition-all duration-300 group-hover:scale-105" style={{ background: 'linear-gradient(135deg,#06B6D4,#14B8A6)', color: 'white' }}>
              <BanknotesIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold tracking-wide" style={{ color: isDark ? '#5EEAD4' : '#064E3B', letterSpacing: '0.04em' }}>Funding Sources</div>
              <div className="mt-1 font-bold text-[clamp(1rem,2.5vw,1.25rem)] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: isDark ? '#F1F5F9' : '#0f172a' }}>{formatAmount(fundingIncomeSumRender, currency)}</div>
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: isDark ? '#94A3B8' : '#475569' }}>
                <div className="text-xs" style={{ color: isDark ? '#94A3B8' : '#9CA3AF' }}>Across {byFunder?.length || 0} funders</div>
                <div className="ml-auto text-xs font-semibold" style={{ color: isDark ? '#5EEAD4' : '#064E3B' }}>Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-80 relative">
        {/* overlay showing total funds (real-time) */}
        {/* <div className="absolute left-4 top-4 z-10">
          <div className="bg-white/90 px-4 py-2 rounded-lg shadow flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <CurrencyDollarIcon className="h-4 w-4" />
            </span>
           
          </div>
        </div> */}

        <div className="absolute right-4 top-4 z-10">
          <div className="bg-white/80 px-3 py-1 rounded-full text-xs text-slate-600 shadow dark:bg-slate-800/80 dark:text-slate-200">{timeRange} days</div>
        </div>

        <div className="h-full">
          {chartData.labels && chartData.labels.length > 0 ? (
            <Line ref={chartRef} options={chartOptions || optionsFallback} data={chartData} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-slate-400">No data available for the selected time range.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
