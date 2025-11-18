import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';

const Pie = ({ slices }) => {
  const size = 200; const r = 80; const cx = 100; const cy = 100;
  let start = 0;
  const colors = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      {slices.map((s, idx) => {
        const a = (s.pct / 100) * Math.PI * 2;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(start + a);
        const y2 = cy + r * Math.sin(start + a);
        const large = a > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        start += a;
        return <path key={idx} d={d} fill={colors[idx % colors.length]} opacity={0.9} />;
      })}
    </svg>
  );
};

const Bar = ({ data }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs text-slate-500"><span>{d.label}</span><span>{d.value}</span></div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded"><div className="h-2 bg-indigo-500 rounded" style={{ width: `${(d.value/max)*100}%` }} /></div>
        </div>
      ))}
    </div>
  );
};

export default function DonorFundingOverview() {
  const { currency } = useOrg();
  const { incomes, expenses } = useFinance();
  const [funderIdFilter, setFunderIdFilter] = useState(null);

  const postedIncomes = useMemo(() => incomes.filter(i => i.status === 'posted' && (!funderIdFilter || i.walletId === funderIdFilter)), [incomes, funderIdFilter]);
  const postedExpenses = useMemo(() => expenses.filter(e => e.status === 'posted' && (!funderIdFilter || e.walletId === funderIdFilter)), [expenses, funderIdFilter]);

  const allocation = useMemo(() => {
    const map = {};
    postedExpenses.forEach(e => { const k = e.category || 'Other'; map[k] = (map[k]||0)+(e.amount||0); });
    const total = Object.values(map).reduce((a,b)=>a+b,0)||1;
    return Object.entries(map).map(([label, value])=>({ label, value, pct: (value/total)*100 }));
  }, [postedExpenses]);

  const byCategory = useMemo(() => allocation.map(s=>({ label: s.label, value: s.value })), [allocation]);

  const totals = useMemo(() => {
    const inc = postedIncomes.reduce((s,i)=>s+(i.amount||0),0);
    const exp = postedExpenses.reduce((s,e)=>s+(e.amount||0),0);
    return { inc, exp, bal: inc-exp };
  }, [postedIncomes, postedExpenses]);

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Funding Overview</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
          <h3 className="text-sm font-semibold mb-3">Fund Allocation</h3>
          <div className="flex items-start gap-6">
            <Pie slices={allocation} />
            <ul className="text-sm space-y-1">
              {allocation.map((s,i)=>(
                <li key={i} className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{backgroundColor:['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'][i%6]}} />{s.label}<span className="ml-auto text-slate-500">{formatAmount(s.value,currency)}</span></li>
              ))}
              {allocation.length===0 && <li className="text-slate-500">No spending yet.</li>}
            </ul>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
          <h3 className="text-sm font-semibold mb-3">Category Spending</h3>
          <Bar data={byCategory} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500">Total Contributed</div>
          <div className="text-2xl font-semibold">{formatAmount(totals.inc, currency)}</div>
        </div>
        <div className="rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500">Total Spent</div>
          <div className="text-2xl font-semibold">{formatAmount(totals.exp, currency)}</div>
        </div>
        <div className="rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500">Remaining Balance</div>
          <div className="text-2xl font-semibold">{formatAmount(totals.bal, currency)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
        <h3 className="text-sm font-semibold mb-4">Contributions History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {postedIncomes.slice(0,50).map(i=> (
                <tr key={i.id}>
                  <td className="py-2 pr-4">{i.date ? new Date(i.date).toLocaleDateString() : '-'}</td>
                  <td className="py-2 pr-4">{i.projectName || '—'}</td>
                  <td className="py-2 pr-4 font-medium text-emerald-600">+{formatAmount(i.amount||0, currency)}</td>
                  <td className="py-2 pr-4">{i.status}</td>
                </tr>
              ))}
              {postedIncomes.length===0 && (
                <tr><td colSpan={4} className="py-6 text-center text-slate-500">No contributions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
