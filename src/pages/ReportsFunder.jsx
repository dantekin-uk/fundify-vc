import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(',')].concat(rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsFunder() {
  const { id } = useParams();
  const { incomes, expenses, projects, funders } = useFinance();
  const { currency } = useOrg();

  const funder = funders.find((f) => f.id === id);

  const data = useMemo(() => {
    const inc = (incomes || []).filter((i) => {
      const proj = projects.find((p) => p.id === i.projectId);
      const w = i.walletId || proj?.funderId || 'ORG';
      return w === id;
    });
    const exp = (expenses || []).filter((e) => {
      const proj = projects.find((p) => p.id === e.projectId);
      const w = e.walletId || (e.projectId ? proj?.funderId || 'ORG' : 'ORG');
      return w === id;
    });
    const totalInc = inc.reduce((s, x) => s + (x.amount || 0), 0);
    const totalExp = exp.reduce((s, x) => s + (x.amount || 0), 0);
    return { inc, exp, totalInc, totalExp, balance: totalInc - totalExp };
  }, [id, incomes, expenses, projects]);

  const exportPDF = () => {
    try {
      const title = `Funder report — ${funder?.name || id}`;
      const generated = new Date().toLocaleString();

      const summaryHtml = `
        <h2 style="margin:0 0 8px;">${title}</h2>
        <div style="margin-bottom:12px;color:#6b7280;">Generated: ${generated}</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;">Total income</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${data.totalInc} ${currency}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;">Total expenses</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${data.totalExp} ${currency}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;">Available</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${data.balance} ${currency}</td>
          </tr>
        </table>
      `;

      const incomeRows = data.inc.map((i) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb">${i.date ? new Date(i.date).toLocaleDateString() : ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${(i.description||'Income').replace(/</g,'&lt;')}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${i.amount} ${i.currency || currency}</td>
        </tr>
      `).join('');

      const expenseRows = data.exp.map((e) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb">${e.date ? new Date(e.date).toLocaleDateString() : ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${(e.category || '').replace(/</g,'&lt;')}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${(e.description||'Expense').replace(/</g,'&lt;')}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${e.amount} ${e.currency || currency}</td>
        </tr>
      `).join('');

      const html = `<!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;padding:20px}
            h2{font-size:18px;margin:0 0 4px}
            table{width:100%;border-collapse:collapse}
            th,td{padding:8px;border:1px solid #e5e7eb}
            th{background:#f8fafc;text-align:left}
          </style>
        </head>
        <body>
          ${summaryHtml}

          <h3 style="margin-top:8px;">Incomes</h3>
          <table>
            <thead>
              <tr><th style="padding:8px;border:1px solid #e5e7eb">Date</th><th style="padding:8px;border:1px solid #e5e7eb">Description</th><th style="padding:8px;border:1px solid #e5e7eb">Amount</th></tr>
            </thead>
            <tbody>
              ${incomeRows || '<tr><td colspan="3" style="padding:8px">No income transactions.</td></tr>'}
            </tbody>
          </table>

          <h3 style="margin-top:12px;">Expenses</h3>
          <table>
            <thead>
              <tr><th style="padding:8px;border:1px solid #e5e7eb">Date</th><th style="padding:8px;border:1px solid #e5e7eb">Category</th><th style="padding:8px;border:1px solid #e5e7eb">Description</th><th style="padding:8px;border:1px solid #e5e7eb">Amount</th></tr>
            </thead>
            <tbody>
              ${expenseRows || '<tr><td colspan="4" style="padding:8px">No expense transactions.</td></tr>'}
            </tbody>
          </table>

        </body>
        </html>`;

      const w = window.open('', '_blank');
      if (!w) return alert('Unable to open print window — please allow popups.');
      w.document.write(html);
      w.document.close();
      // give the browser a moment to render
      setTimeout(() => {
        try { w.focus(); w.print(); } catch (e) { console.error(e); }
      }, 500);
    } catch (e) {
      console.error('Export PDF failed', e);
      alert('Failed to generate PDF: ' + (e?.message || e));
    }
  };

  if (!id) return <div className="text-sm text-gray-500 dark:text-slate-400">No funder specified.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-slate-100">Funder report — {funder?.name || id}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Summary of posted transactions for this funder.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/funders" className="px-3 py-2 rounded-md bg-white ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-100">Back</Link>
          <button onClick={() => downloadCSV(`funder-report-${id}.csv`, [
            { metric: 'Total income', value: data.totalInc, currency },
            { metric: 'Total expenses', value: data.totalExp, currency },
            { metric: 'Balance', value: data.balance, currency },
          ])} className="px-3 py-2 rounded-md bg-sky-700 text-white">Download summary CSV</button>
          <button onClick={exportPDF} className="px-3 py-2 rounded-md bg-gray-800 text-white">Export PDF</button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl ring-1 ring-gray-100 p-4 bg-white dark:bg-slate-900/70">
              <div className="text-sm text-slate-500">Total income</div>
              <div className="text-xl font-semibold">{data.totalInc} {currency}</div>
            </div>
            <div className="rounded-xl ring-1 ring-gray-100 p-4 bg-white dark:bg-slate-900/70">
              <div className="text-sm text-slate-500">Total expenses</div>
              <div className="text-xl font-semibold text-rose-600">{data.totalExp} {currency}</div>
            </div>
            <div className="rounded-xl ring-1 ring-gray-100 p-4 bg-white dark:bg-slate-900/70">
              <div className="text-sm text-slate-500">Available</div>
              <div className="text-xl font-semibold">{data.balance} {currency}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">Incomes</h4>
            <div className="mt-2 space-y-2">
              {data.inc.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-2 rounded-md ring-1 ring-gray-100 bg-white dark:ring-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                  <div className="text-sm text-gray-700 dark:text-slate-300">{i.description || 'Income'}</div>
                  <div className="text-sm font-medium">{i.amount} {i.currency || currency}</div>
                </div>
              ))}
              {data.inc.length === 0 && <div className="text-sm text-gray-500 dark:text-slate-400">No income transactions.</div>}
            </div>

            <h4 className="mt-4 text-sm font-medium text-gray-700 dark:text-slate-300">Expenses</h4>
            <div className="mt-2 space-y-2">
              {data.exp.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2 rounded-md ring-1 ring-gray-100 bg-white dark:ring-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                  <div className="text-sm text-gray-700 dark:text-slate-300">{e.description || 'Expense'}</div>
                  <div className="text-sm font-medium text-rose-600">{e.amount} {e.currency || currency}</div>
                </div>
              ))}
              {data.exp.length === 0 && <div className="text-sm text-gray-500 dark:text-slate-400">No expense transactions.</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
