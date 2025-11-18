import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function FunderPortalOverview() {
  const { byFunder, projects, funders } = useFinance();
  const { currency } = useOrg();

  const rows = useMemo(() => {
    // Get unique funders from funders array
    return funders.map(funder => {
      // Find all projects for this funder
      const funderProjects = projects.filter(p => p.funderId === funder.id);
      
      // Calculate totals for this funder
      const totals = byFunder
        .filter(bf => bf.funder.id === funder.id)
        .reduce((acc, curr) => ({
          allocation: acc.allocation + (curr.allocation || 0),
          income: acc.income + (curr.income || 0),
          expenses: acc.expenses + (curr.expenses || 0),
          available: acc.available + (curr.available || 0)
        }), { allocation: 0, income: 0, expenses: 0, available: 0 });
      
      return {
        id: funder.id,
        name: funder.name,
        contact: funder.contact,
        projects: funderProjects.length,
        allocation: totals.allocation,
        income: totals.income,
        expenses: totals.expenses,
        available: totals.available
      };
    });
  }, [funders, byFunder, projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">Funders Portal</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View financial summaries for individual funders.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Funders</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Name</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Projects</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Available</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-slate-100">{r.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{r.projects}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium dark:text-slate-100">{formatAmount(r.available, currency)}</td>
                    <td className="px-3 py-2 text-sm">
                      <Link to={`/app/funders/portal/${r.id}`} className="px-2 py-1 rounded-md bg-sky-700 text-white text-sm">View Portal</Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={4}>No funders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
