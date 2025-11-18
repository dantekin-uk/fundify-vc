import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';

export default function DonorProjects() {
  const { currency } = useOrg();
  const { projects, expenses } = useFinance();

  const projectStats = useMemo(() => {
    const byId = {};
    projects.forEach(p => { byId[p.id] = { ...p, used: 0 }; });
    expenses.filter(e=>e.status==='posted').forEach(e => { if (e.projectId && byId[e.projectId]) byId[e.projectId].used += (e.amount||0); });
    return Object.values(byId);
  }, [projects, expenses]);

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Supported Projects</h2>
      {projectStats.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projectStats.map(p => {
            const alloc = p.allocation || 0; const used = p.used || 0; const pct = alloc? Math.min(100, Math.round((used/alloc)*100)) : 0;
            return (
              <div key={p.id} className="rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 p-4 bg-white dark:bg-slate-800">
                <div className="font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                <p className="text-sm text-slate-500 mt-1">{p.description || '—'}</p>
                <div className="mt-3 text-xs text-slate-500">Budget {formatAmount(alloc, currency)} • Spent {formatAmount(used, currency)} • Balance {formatAmount(Math.max(alloc-used,0), currency)}</div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progress</span><span>{pct}%</span></div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded"><div className="h-2 bg-gradient-to-r from-emerald-400 to-sky-500 rounded" style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="mt-3">
                  <Link to={`/donor/projects/${p.id}`} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">View Details</Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-slate-500">No projects found.</div>
      )}
    </div>
  );
}
