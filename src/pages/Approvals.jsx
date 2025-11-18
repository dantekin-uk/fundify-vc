import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Approvals() {
  const { expenses, incomes, approveExpense, rejectExpense, approveIncome, rejectIncome, projects } = useFinance();
  const { currency, role } = useOrg();
  const pendingExpenses = useMemo(() => expenses.filter((e) => e.status === 'pending'), [expenses]);
  const pendingIncomes = useMemo(() => incomes.filter((i) => i.status === 'pending'), [incomes]);

  const isAdmin = role === 'admin';

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">Approvals</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only organization admins can approve or reject items.</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300">Ask an admin to grant you access or to review pending items.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">Approvals</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review and approve or reject pending incomes and expenses.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pending expenses</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Expense</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Project</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Wallet</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Amount</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Attachments</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {pendingExpenses.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-slate-200">{p.description || '—'}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{p.projectId ? (projects.find((pr)=>pr.id===p.projectId)?.name || '-') : '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{p.walletId || 'ORG'}</td>
                  <td className="px-3 py-2 text-sm text-red-600">{formatAmount(p.amount, currency)}</td>
                  <td className="px-3 py-2 text-sm">
                    {Array.isArray(p.attachments) && p.attachments.length ? p.attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-sky-600 underline mr-2">View</a>
                    )) : <span className="text-sm text-gray-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => approveExpense(p.id)} className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow-sm">Approve</button>
                      <button onClick={() => {
                        const reason = window.prompt('Rejection reason (optional)');
                        rejectExpense(p.id, reason);
                      }} className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm shadow-sm">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingExpenses.length === 0 && (
                <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={6}>No pending expenses.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending incomes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Income</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Project</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Wallet</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Amount</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Attachments</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {pendingIncomes.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-slate-200">{p.description || '—'}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{p.projectId ? (projects.find((pr)=>pr.id===p.projectId)?.name || '-') : '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{p.walletId || 'ORG'}</td>
                  <td className="px-3 py-2 text-sm text-emerald-700">{formatAmount(p.amount, currency)}</td>
                  <td className="px-3 py-2 text-sm">
                    {Array.isArray(p.attachments) && p.attachments.length ? p.attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-sky-600 underline mr-2">View</a>
                    )) : <span className="text-sm text-gray-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => approveIncome(p.id)} className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow-sm">Approve</button>
                      <button onClick={() => {
                        const reason = window.prompt('Rejection reason (optional)');
                        rejectIncome(p.id, reason);
                      }} className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm shadow-sm">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingIncomes.length === 0 && (
                <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={6}>No pending incomes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
