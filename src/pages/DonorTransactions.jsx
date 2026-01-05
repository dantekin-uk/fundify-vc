import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';

export default function DonorTransactions() {
  const { currency } = useOrg();
  const { expenses, incomes, projects } = useFinance();
  const [category, setCategory] = useState('');
  const [project, setProject] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [modal, setModal] = useState(null);

  const rows = useMemo(() => {
    const all = [...incomes.map(i=>({ ...i, kind:'income' })), ...expenses.map(e=>({ ...e, kind:'expense' }))];
    return all.filter(r => (
      (!category || (r.category|| (r.amount>0?'Donation':'Expense'))===category) &&
      (!project || r.projectId === project) &&
      (!status || r.status === status) &&
      (!date || (r.date || '').startsWith(date))
    ));
  }, [incomes, expenses, category, project, status, date]);

  const categories = useMemo(()=> Array.from(new Set(expenses.map(e=>e.category||'Expense'))), [expenses]);

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Transactions</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded ring-1 ring-slate-300 dark:ring-slate-700 bg-white dark:bg-slate-800 p-2 text-sm">
          <option value="">All Categories</option>
          {categories.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
        </select>
        <select value={project} onChange={e=>setProject(e.target.value)} className="rounded ring-1 ring-slate-300 dark:ring-slate-700 bg-white dark:bg-slate-800 p-2 text-sm">
          <option value="">All Projects</option>
          {projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded ring-1 ring-slate-300 dark:ring-slate-700 bg-white dark:bg-slate-800 p-2 text-sm">
          <option value="">All Statuses</option>
          <option>posted</option>
          <option>pending</option>
          <option>rejected</option>
        </select>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded ring-1 ring-slate-300 dark:ring-slate-700 bg-white dark:bg-slate-800 p-2 text-sm" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.slice(0,100).map(r => (
                <tr key={r.id} onClick={()=>setModal(r)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2 pr-4">{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                  <td className="py-2 pr-4">{r.category || (r.kind==='income'?'Donation':'Expense')}</td>
                  <td className={`py-2 pr-4 font-medium ${r.kind==='income'?'text-emerald-600':'text-rose-600'}`}>{r.kind==='income'?'+':''}{formatAmount(r.amount||0, currency)}</td>
                  <td className="py-2 pr-4">{projects.find(p=>p.id===r.projectId)?.name || '—'}</td>
                  <td className="py-2 pr-4">{r.status || 'posted'}</td>
                  <td className="py-2 pr-4">{r.receiptUrl ? <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline">View</a> : <span className="text-slate-400">—</span>}</td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-500">No transactions match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={()=>setModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg p-5 ring-1 ring-slate-200 dark:ring-slate-700" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-500">Type:</span> {modal.kind}</div>
              <div><span className="text-slate-500">Date:</span> {modal.date ? new Date(modal.date).toLocaleString() : '-'}</div>
              <div><span className="text-slate-500">Category:</span> {modal.category || (modal.kind==='income'?'Donation':'Expense')}</div>
              <div><span className="text-slate-500">Amount:</span> {formatAmount(modal.amount||0, currency)}</div>
              <div><span className="text-slate-500">Project:</span> {projects.find(p=>p.id===modal.projectId)?.name || '—'}</div>
              <div><span className="text-slate-500">Status:</span> {modal.status || 'posted'}</div>
              <div><span className="text-slate-500">Description:</span> {modal.description || '—'}</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setModal(null)} className="px-4 py-2 text-sm rounded ring-1 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">Close</button>
              {modal.receiptUrl && <a href={modal.receiptUrl} target="_blank" rel="noreferrer" className="px-4 py-2 text-sm rounded bg-sky-600 text-white">Open Receipt</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
