import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(','));
  return [headers.join(','), ...body].join('\n');
}

function downloadCSV(filename, rows) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { totals: rawTotals, byFunder: rawByFunder, byProject: rawByProject } = useFinance();
  // provide safe defaults to avoid runtime errors when data is not yet loaded
  const totals = rawTotals || { totalIncome: 0, totalExpenses: 0, totalAvailable: 0 };
  const byFunder = Array.isArray(rawByFunder) ? rawByFunder : [];
  const byProject = Array.isArray(rawByProject) ? rawByProject : [];

  const funderRows = useMemo(() => byFunder.map((x) => ({
    funder: x.funder?.name || '-',
    allocation: x.allocation || 0,
    income: x.income || 0,
    expenses: x.expenses || 0,
    available: x.available || 0,
  })), [byFunder]);

  const projectRows = useMemo(() => byProject.map((x) => ({
    project: x.project?.name || '-',
    income: x.income || 0,
    expenses: x.expenses || 0,
    available: x.available || 0,
  })), [byProject]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Key totals and downloadable summaries by funder and project.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total income</div>
            <div className="text-2xl font-semibold text-gray-700">{formatAmount(totals.totalIncome || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total expenses</div>
            <div className="text-2xl font-semibold text-red-600">{formatAmount(totals.totalExpenses || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Funds available</div>
            <div className="text-2xl font-semibold">{formatAmount(totals.totalAvailable || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>By funder</CardTitle>
            <button onClick={()=>downloadCSV('by_funder.csv', funderRows)} className="text-sm font-medium text-slate-700 hover:underline">Export CSV</button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Funder</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Allocation</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Income</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Expenses</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {funderRows.map((r)=> (
                  <tr key={r.funder}>
                    <td className="px-3 py-2 text-sm">{r.funder}</td>
                    <td className="px-3 py-2 text-sm text-right">{formatAmount(r.allocation)}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700">{formatAmount(r.income)}</td>
                    <td className="px-3 py-2 text-sm text-right text-red-600">{formatAmount(r.expenses)}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatAmount(r.available)}</td>
                  </tr>
                ))}
                {funderRows.length === 0 && (<tr><td className="px-3 py-4 text-sm text-gray-500" colSpan={5}>No data.</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>By project</CardTitle>
            <button onClick={()=>downloadCSV('by_project.csv', projectRows)} className="text-sm font-medium text-slate-700 hover:underline">Export CSV</button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Project</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Income</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Expenses</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projectRows.map((r)=> (
                  <tr key={r.project}>
                    <td className="px-3 py-2 text-sm">{r.project}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700">{formatAmount(r.income)}</td>
                    <td className="px-3 py-2 text-sm text-right text-red-600">{formatAmount(r.expenses)}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatAmount(r.available)}</td>
                  </tr>
                ))}
                {projectRows.length === 0 && (<tr><td className="px-3 py-4 text-sm text-gray-500" colSpan={4}>No data.</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
