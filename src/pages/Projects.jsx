import { useMemo, useState } from 'react';
import FormInput from '../components/FormInput';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Projects() {
  const { funders, addProject, byProject, removeItem } = useFinance();
  const { role } = useOrg();
  const [form, setForm] = useState({ name: '', type: 'igp', funderId: '', allocation: '', startDate: '', endDate: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.type === 'donor' && !form.funderId) return alert('Please select a funder for funder-funded project');
    setSaving(true);
    addProject({ ...form, allocation: Number(form.allocation || 0) });
    setForm({ name: '', type: 'igp', funderId: '', allocation: '', startDate: '', endDate: '', notes: '' });
    setTimeout(() => setSaving(false), 200);
  };

  const rows = useMemo(() => byProject, [byProject]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">Projects</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create IGP or funder-funded projects and track their budgets.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
        </CardHeader>
        <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <FormInput id="name" name="name" label="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Project type</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}>
              <option value="igp">IGP (Org income project)</option>
              <option value="donor">Funder-funded project</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Funder</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={form.funderId} onChange={(e)=>setForm({...form,funderId:e.target.value})} disabled={form.type === 'igp'}>
              <option value="">Select funder</option>
              {funders.map((f)=> (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <FormInput id="allocation" name="allocation" label="Allocation" type="number" min="0" value={form.allocation} onChange={(e)=>setForm({...form,allocation:e.target.value})} />
          </div>
          <div>
            <FormInput id="startDate" name="startDate" type="date" label="Start date" value={form.startDate} onChange={(e)=>setForm({...form,startDate:e.target.value})} />
          </div>
          <div>
            <FormInput id="endDate" name="endDate" type="date" label="End date" value={form.endDate} onChange={(e)=>setForm({...form,endDate:e.target.value})} />
          </div>
          <div className="md:col-span-6">
            <FormInput id="notes" name="notes" label="Notes" value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} />
          </div>
          <div className="md:col-span-6">
            <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 rounded-md text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 shadow-sm">{saving ? 'Saving...' : 'Create Project'}</button>
          </div>
        </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Project</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Funder</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Budget</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Income</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Expenses</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Available</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {rows.map(({ project, income, expenses, available }) => {
                const budget = Number(project.allocation || 0);
                const overspend = expenses > budget && budget > 0;
                return (
                  <tr key={project.id}>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-slate-100">{project.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{funders.find((f)=>f.id===project.funderId)?.name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-slate-100">{formatAmount(budget)}</td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-slate-300">{formatAmount(income)}</td>
                    <td className={`px-3 py-2 text-sm text-right ${overspend ? 'text-rose-700 font-semibold' : 'text-red-600'}`}>{formatAmount(expenses)}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium dark:text-slate-100">{formatAmount(available)}</td>
                    <td className="px-3 py-2 text-sm">
                      {role === 'admin' ? (
                        <button onClick={() => { if (window.confirm('Delete this project? This action will remove the project and its references.')) removeItem('projects', project.id); }} className="px-2 py-1 rounded-md bg-rose-600 text-white text-sm">Delete</button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={7}>No projects yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
