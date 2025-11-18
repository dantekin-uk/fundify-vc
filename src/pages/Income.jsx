import { useState, useMemo } from 'react';
import FormInput from '../components/FormInput';
import { useFinance } from '../context/FinanceContext';
import { uploadFiles } from '../services/cloudinary';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Income() {
  const { projects = [], addIncome, incomes = [], wallets = [], removeItem } = useFinance();
  const { currency, role } = useOrg();
  const [projForm, setProjForm] = useState({ projectId: '', amount: '', date: '', description: '' });
  const [orgForm, setOrgForm] = useState({ walletId: 'ORG', amount: '', date: '', description: '' });
  const [projFiles, setProjFiles] = useState([]);
  const [orgFiles, setOrgFiles] = useState([]);
  const [saving1, setSaving1] = useState(false);
  const [saving2, setSaving2] = useState(false);

  const canAdd = role === 'admin' || role === 'financial_officer';

  const submitProject = async (e) => {
    e.preventDefault();
    if (!projForm.projectId || !projForm.amount) return;
    setSaving1(true);
    try {
      let attachments = [];
      if (projFiles && projFiles.length) {
        const uploaded = await uploadFiles(projFiles);
        attachments = uploaded.map((u) => ({ url: u.url, id: u.public_id }));
      }
      const res = addIncome({ projectId: projForm.projectId, amount: Number(projForm.amount), date: projForm.date || new Date().toISOString(), description: projForm.description, attachments });
      if (res?.success === false) {
        alert(res?.error || 'You do not have permission to add income.');
      } else {
        setProjForm({ projectId: '', amount: '', date: '', description: '' });
        setProjFiles([]);
      }
    } catch (err) {
      console.error('Upload error', err);
      alert(err.message || 'Upload failed');
    } finally {
      setTimeout(() => setSaving1(false), 200);
    }
  };

  const submitOrg = async (e) => {
    e.preventDefault();
    if (!orgForm.amount) return;
    setSaving2(true);
    try {
      let attachments = [];
      if (orgFiles && orgFiles.length) {
        const uploaded = await uploadFiles(orgFiles);
        attachments = uploaded.map((u) => ({ url: u.url, id: u.public_id }));
      }
      const res = addIncome({ walletId: orgForm.walletId === 'ORG' ? null : orgForm.walletId, amount: Number(orgForm.amount), date: orgForm.date || new Date().toISOString(), description: orgForm.description, attachments });
      if (res?.success === false) {
        alert(res?.error || 'You do not have permission to add income.');
      } else {
        setOrgForm({ walletId: 'ORG', amount: '', date: '', description: '' });
        setOrgFiles([]);
      }
    } catch (err) {
      console.error('Upload error', err);
      alert(err.message || 'Upload failed');
    } finally {
      setTimeout(() => setSaving2(false), 200);
    }
  };

  const rows = useMemo(() => (Array.isArray(incomes) ? incomes.slice(0, 50) : []), [incomes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">Income</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record new income for projects or organization wallets and view recent activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Record project income</CardTitle>
          </CardHeader>
          <CardContent>
          {!canAdd ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">You don’t have permission to add income. Contact an admin.</div>
          ) : (
          <form onSubmit={submitProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Project</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={projForm.projectId} onChange={(e) => setProjForm({ ...projForm, projectId: e.target.value })} required>
                <option value="">Select project</option>
                {(projects || []).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div>
              <FormInput id="pi-amount" name="pi-amount" type="number" min="0" step="0.01" label="Amount" value={projForm.amount} onChange={(e) => setProjForm({ ...projForm, amount: e.target.value })} required />
            </div>
            <div>
              <FormInput id="pi-date" name="pi-date" type="date" label="Date" value={projForm.date} onChange={(e) => setProjForm({ ...projForm, date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <FormInput id="pi-desc" name="pi-desc" label="Description" value={projForm.description} onChange={(e) => setProjForm({ ...projForm, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Attachments</label>
              <input type="file" multiple onChange={(e) => setProjFiles(e.target.files)} className="w-full" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving1} className="inline-flex items-center px-4 py-2 rounded-md text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 shadow-sm">{saving1 ? 'Saving...' : 'Add Income'}</button>
            </div>
          </form>
          )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record wallet income</CardTitle>
          </CardHeader>
          <CardContent>
          {!canAdd ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">You don’t have permission to add income. Contact an admin.</div>
          ) : (
          <form onSubmit={submitOrg} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Wallet</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={orgForm.walletId} onChange={(e) => setOrgForm({ ...orgForm, walletId: e.target.value })}>
                <option value="ORG">Organization</option>
                {(wallets || []).map((w) => (
                  w.id !== 'ORG' ? <option key={w.id} value={w.id}>{w.name}</option> : null
                ))}
              </select>
            </div>
            <div>
              <FormInput id="oi-amount" name="oi-amount" type="number" min="0" step="0.01" label="Amount" value={orgForm.amount} onChange={(e) => setOrgForm({ ...orgForm, amount: e.target.value })} required />
            </div>
            <div>
              <FormInput id="oi-date" name="oi-date" type="date" label="Date" value={orgForm.date} onChange={(e) => setOrgForm({ ...orgForm, date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <FormInput id="oi-desc" name="oi-desc" label="Description" value={orgForm.description} onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Attachments</label>
              <input type="file" multiple onChange={(e) => setOrgFiles(e.target.files)} className="w-full" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving2} className="inline-flex items-center px-4 py-2 rounded-md text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 shadow-sm">{saving2 ? 'Saving...' : 'Add Income'}</button>
            </div>
          </form>
          )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent incomes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Project / Wallet</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Date</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Amount</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Attachments</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Description</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-slate-200">{i.projectId ? (projects.find((p) => p.id === i.projectId)?.name || '-') : (i.walletId ? wallets.find((w) => w.id === i.walletId)?.name || 'Organization' : 'Organization')}</td>
                  <td className="px-3 py-2 text-sm">{new Date(i.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium">{formatAmount(i.amount, currency)}</td>
                  <td className="px-3 py-2 text-sm">
                    {Array.isArray(i.attachments) && i.attachments.length ? (
                      <div className="flex items-center gap-2">
                        {i.attachments.map((a, idx) => (
                          <a key={idx} href={a.url} target="_blank" rel="noreferrer" className="text-sm text-sky-600 underline">View</a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-slate-500">—</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{i.description}</td>
                  <td className="px-3 py-2 text-sm">
                    {role === 'admin' ? (
                      <button onClick={() => { if (window.confirm('Delete this income? This cannot be undone.')) removeItem('incomes', i.id); }} className="px-2 py-1 rounded-md bg-rose-600 text-white text-sm">Delete</button>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={6}>No incomes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
