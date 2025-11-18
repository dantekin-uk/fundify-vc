import { useMemo, useState } from 'react';
import FormInput from '../components/FormInput';
import { useFinance } from '../context/FinanceContext';
import { uploadFiles } from '../services/cloudinary';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const CATEGORIES = ['Salaries','Operations','Transport','Utilities','Training','Supplies','Other'];

export default function Expenses() {
  const { projects, addExpense, expenses, approveExpense, rejectExpense, wallets, removeItem } = useFinance();
  // ensure lists are defined to avoid runtime errors when not yet loaded
  const safeProjects = projects || [];
  const safeWallets = wallets || [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const { currency, role } = useOrg();
  const [projForm, setProjForm] = useState({ projectId: '', category: 'Operations', amount: '', date: '', description: '' });
  const [walletForm, setWalletForm] = useState({ walletId: 'ORG', category: 'Operations', amount: '', date: '', description: '' });
  const [projFiles, setProjFiles] = useState([]);
  const [walletFiles, setWalletFiles] = useState([]);
  const [saving1, setSaving1] = useState(false);
  const [saving3, setSaving3] = useState(false);

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
      const res = addExpense({ scope: 'project', ...projForm, amount: Number(projForm.amount || 0), attachments });
      if (res && res.success === false) {
        alert(res.error || 'Failed to add expense');
      } else {
        setProjForm({ projectId: '', category: 'Operations', amount: '', date: '', description: '' });
        setProjFiles([]);
      }
    } catch (err) {
      console.error('Upload error', err);
      alert(err.message || 'Upload failed');
    } finally {
      setTimeout(()=> setSaving1(false), 200);
    }
  };

  const submitWallet = async (e) => {
    e.preventDefault();
    if (!walletForm.amount) return;
    setSaving3(true);
    try {
      let attachments = [];
      if (walletFiles && walletFiles.length) {
        const uploaded = await uploadFiles(walletFiles);
        attachments = uploaded.map((u) => ({ url: u.url, id: u.public_id }));
      }
      const res = addExpense({
        scope: 'wallet',
        walletId: walletForm.walletId === 'ORG' ? null : walletForm.walletId,
        projectId: null,
        category: walletForm.category,
        amount: Number(walletForm.amount || 0),
        date: walletForm.date || new Date().toISOString(),
        description: walletForm.description,
        attachments,
      });
      if (res && res.success === false) {
        alert(res.error || 'Failed to add expense');
      } else {
        setWalletForm({ walletId: 'ORG', category: 'Operations', amount: '', date: '', description: '' });
        setWalletFiles([]);
      }
    } catch (err) {
      console.error('Upload error', err);
      alert(err.message || 'Upload failed');
    } finally {
      setTimeout(()=> setSaving3(false), 200);
    }
  };

  const rows = useMemo(() => safeExpenses.slice(0, 50), [safeExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">Expenses</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Log new expenses for projects or the organization and manage approvals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Log project expense</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={submitProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Project</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={projForm.projectId} onChange={(e)=>setProjForm({...projForm,projectId:e.target.value})} required>
                <option value="">Select project</option>
                {safeProjects.map((p)=> (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Category</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={projForm.category} onChange={(e)=>setProjForm({...projForm,category:e.target.value})}>
                {CATEGORIES.map((c)=> (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <FormInput id="p-amount" name="p-amount" type="number" min="0" step="0.01" label="Amount" value={projForm.amount} onChange={(e)=>setProjForm({...projForm,amount:e.target.value})} required />
            </div>
            <div>
              <FormInput id="p-date" name="p-date" type="date" label="Date" value={projForm.date} onChange={(e)=>setProjForm({...projForm,date:e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <FormInput id="p-desc" name="p-desc" label="Description" value={projForm.description} onChange={(e)=>setProjForm({...projForm,description:e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Attachments</label>
              <input type="file" multiple onChange={(e)=>setProjFiles(e.target.files)} className="w-full" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving1} className="inline-flex items-center px-4 py-2 rounded-md text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 shadow-sm">{saving1 ? 'Saving...' : 'Add Expense'}</button>
            </div>
          </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Record wallet expense</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={submitWallet} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Wallet</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={walletForm.walletId} onChange={(e)=>setWalletForm({...walletForm, walletId:e.target.value})}>
                <option value="ORG">Organization</option>
                {safeWallets.map((w)=> (
                  w.id !== 'ORG' ? <option key={w.id} value={w.id}>{w.name}</option> : null
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Category</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" value={walletForm.category} onChange={(e)=>setWalletForm({...walletForm,category:e.target.value})}>
                {CATEGORIES.map((c)=> (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <FormInput id="w-amount" name="w-amount" type="number" min="0" step="0.01" label="Amount" value={walletForm.amount} onChange={(e)=>setWalletForm({...walletForm,amount:e.target.value})} required />
            </div>
            <div>
              <FormInput id="w-date" name="w-date" type="date" label="Date" value={walletForm.date} onChange={(e)=>setWalletForm({...walletForm,date:e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <FormInput id="w-desc" name="w-desc" label="Description" value={walletForm.description} onChange={(e)=>setWalletForm({...walletForm,description:e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Attachments</label>
              <input type="file" multiple onChange={(e)=>setWalletFiles(e.target.files)} className="w-full" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving3} className="inline-flex items-center px-4 py-2 rounded-md text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 shadow-sm">{saving3 ? 'Saving...' : 'Add Expense'}</button>
            </div>
          </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Scope</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Wallet</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Project</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Category</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Amount</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Date</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Status</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Attachments</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {rows.map((e)=> (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-sm">{e.projectId ? 'Project' : (e.walletId && e.walletId !== 'ORG' ? 'Funder' : 'Organization')}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{
                    e.walletId
                      ? (safeWallets.find((w)=>w.id===e.walletId)?.name || e.walletId)
                      : (e.projectId
                        ? (()=>{ const proj=safeProjects.find((p)=>p.id===e.projectId); const id=proj?.funderId || 'ORG'; return safeWallets.find((w)=>w.id===id)?.name || (id==='ORG'?'Organization':id); })()
                        : 'Organization')
                  }</td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{e.projectId ? (safeProjects.find((p)=>p.id===e.projectId)?.name || '-') : '-'}</td>
                  <td className="px-3 py-2 text-sm">{e.category}</td>
                  <td className="px-3 py-2 text-sm text-right text-red-600">{formatAmount(e.amount, currency)}</td>
                  <td className="px-3 py-2 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-sm">{e.status}</td>
                  <td className="px-3 py-2 text-sm">
                    {e.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button onClick={()=>approveExpense(e.id)} className="px-2 py-1 rounded-md bg-green-600 text-white text-sm">Approve</button>
                        <button onClick={()=>{ const reason = window.prompt('Rejection reason (optional)'); rejectExpense(e.id, reason); }} className="px-2 py-1 rounded-md bg-rose-600 text-white text-sm">Reject</button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-slate-300">{e.status}</div>
                    )}
                    {role === 'admin' && (
                      <div className="mt-2">
                        <button onClick={() => { if (window.confirm('Delete this expense? This cannot be undone.')) removeItem('expenses', e.id); }} className="px-2 py-1 rounded-md bg-rose-600 text-white text-sm">Delete</button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {Array.isArray(e.attachments) && e.attachments.length ? (
                      <div className="flex items-center gap-2">
                        {e.attachments.map((a, idx) => (
                          <a key={idx} href={a.url} target="_blank" rel="noreferrer" className="text-sm text-sky-600 underline">View</a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-slate-500">—</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{e.description}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={10}>No expenses yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
