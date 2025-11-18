import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';

const Pie = ({ slices }) => {
  const size = 180; const r = 70; const cx = 90; const cy = 90; let start = 0;
  const colors = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'];
  return (
    <svg width={size} height={size} viewBox="0 0 180 180">
      {slices.map((s, idx) => { const a=(s.pct/100)*Math.PI*2; const x1=cx+r*Math.cos(start); const y1=cy+r*Math.sin(start); const x2=cx+r*Math.cos(start+a); const y2=cy+r*Math.sin(start+a); const large=a>Math.PI?1:0; const d=`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`; start+=a; return <path key={idx} d={d} fill={colors[idx%colors.length]} opacity={0.9}/>; })}
    </svg>
  );
};

const Line = ({ points }) => {
  const w = 420, h = 160, pad = 24; const max = Math.max(1, ...points.map(p=>p.value)); const step=(w-pad*2)/Math.max(1, points.length-1);
  const path = points.map((p,i)=>{ const x=pad+i*step; const y=h-pad-(p.value/max)*(h-pad*2); return `${i?'L':'M'}${x},${y}`; }).join(' ');
  return (<svg width={w} height={h} className="w-full"><path d={path} fill="none" stroke="#6366f1" strokeWidth="2" /></svg>);
};

export default function DonorProjectDetails() {
  const { id } = useParams();
  const { currency } = useOrg();
  const { projects, expenses } = useFinance();

  const project = projects.find(p=>p.id===id);
  const tx = expenses.filter(e=>e.projectId===id && e.status==='posted');

  const allocation = useMemo(()=>{
    const map={}; tx.forEach(e=>{ const k=e.category||'Other'; map[k]=(map[k]||0)+(e.amount||0); });
    const total=Object.values(map).reduce((a,b)=>a+b,0)||1; return Object.entries(map).map(([label,value])=>({label,value,pct:(value/total)*100}));
  }, [tx]);

  const timeline = useMemo(()=>{
    const bucket={}; tx.forEach(e=>{ const d=new Date(e.date||Date.now()); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; bucket[key]=(bucket[key]||0)+(e.amount||0); })
    return Object.entries(bucket).sort((a,b)=>a[0]>b[0]?1:-1).map(([label,value])=>({label,value}));
  }, [tx]);

  const used = tx.reduce((s,e)=>s+(e.amount||0),0);
  const alloc = project?.allocation || 0;

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{project?.name || 'Project'}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500">Budget</div>
          <div className="text-2xl font-semibold">{formatAmount(alloc, currency)}</div>
        </div>
        <div className="rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500">Spent</div>
          <div className="text-2xl font-semibold">{formatAmount(used, currency)}</div>
        </div>
        <div className="rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500">Balance</div>
          <div className="text-2xl font-semibold">{formatAmount(Math.max(alloc-used,0), currency)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
          <h3 className="text-sm font-semibold mb-2">Category Breakdown</h3>
          <div className="flex items-center gap-6">
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
          <h3 className="text-sm font-semibold mb-2">Spending Timeline</h3>
          <Line points={timeline} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
        <h3 className="text-sm font-semibold mb-3">Transactions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {tx.map(e=> (
                <tr key={e.id}>
                  <td className="py-2 pr-4">{e.date ? new Date(e.date).toLocaleDateString() : '-'}</td>
                  <td className="py-2 pr-4">{e.category || 'Expense'}</td>
                  <td className="py-2 pr-4 font-medium text-rose-600">-{formatAmount(e.amount||0, currency)}</td>
                  <td className="py-2 pr-4">{e.status}</td>
                </tr>
              ))}
              {tx.length===0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No expenses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
