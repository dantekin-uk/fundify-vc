import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import FormInput from '../components/FormInput';
import { uploadFiles } from '../services/cloudinary';

// Helper function to safely access and map over an array
const safeMap = (array, callback) => {
  if (!Array.isArray(array)) return [];
  try {
    return array.map(callback);
  } catch (error) {
    console.error('Error mapping array:', error);
    return [];
  }
};

// Helper function to safely filter an array
const safeFilter = (array, callback) => {
  if (!Array.isArray(array)) return [];
  try {
    return array.filter(callback);
  } catch (error) {
    console.error('Error filtering array:', error);
    return [];
  }
};

// Main Funders component
export default function Funders() {
  // State for component
  const [form, setForm] = useState({ name: '', contact: '', notes: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Get data from context with safe defaults
  const { 
    addFunder, 
    addIncome,
    byFunder = [], 
    projects = [], 
    wallets = [], 
    funders = [],
    removeItem 
  } = useFinance();
  
  const { currency = 'USD', role = 'user' } = useOrg();
  
  // Handle loading state and errors
  useEffect(() => {
    try {
      setIsLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to load funders. Please try again later.');
      setIsLoading(false);
    }
  }, [funders]);
  
  // Safely get funders data
  const safeFunders = Array.isArray(funders) ? funders : [];
  const safeByFunder = Array.isArray(byFunder) ? byFunder : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  // Add Income modal state
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incomeWallet, setIncomeWallet] = useState(null);
  const [incomeForm, setIncomeForm] = useState({ projectId: '', amount: '', date: '', description: '' });
  const [incomeFiles, setIncomeFiles] = useState([]);
  const [incomeSaving, setIncomeSaving] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    addFunder(form);
    setForm({ name: '', contact: '', notes: '' });
    setTimeout(() => setSaving(false), 200);
  };

  // Calculate rows with safe operations
  const rows = useMemo(() => {
    try {
      return safeMap(safeFunders, funder => {
        if (!funder || typeof funder !== 'object') return null;
        
        // Safely find projects for this funder
        const funderProjects = safeFilter(safeProjects, p => p?.funderId === funder?.id);
        
        // Calculate totals safely
        const totals = safeFilter(safeByFunder, bf => bf?.funder?.id === funder?.id)
          .reduce((acc, curr) => ({
            allocation: (acc.allocation || 0) + (curr.allocation || 0),
            income: (acc.income || 0) + (curr.income || 0),
            expenses: (acc.expenses || 0) + (curr.expenses || 0),
            available: (acc.available || 0) + (curr.available || 0)
          }), { 
            allocation: 0, 
            income: 0, 
            expenses: 0, 
            available: 0 
          });
        
        return {
          id: funder.id,
          name: funder.name || '',
          projects: funderProjects.length,
          allocation: totals.allocation || 0,
          income: totals.income || 0,
          expenses: totals.expenses || 0,
          available: totals.available || 0
        };
      }).filter(Boolean);
    } catch (err) {
      console.error('Error calculating rows:', err);
      return [];
    }
  }, [safeFunders, safeByFunder, safeProjects]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <h2 className="font-bold">Error Loading Funders</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // Main component render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-slate-100">Funders</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage funder profiles, their wallets, and contributions.</p>
        </div>
        <Link to="/app/funders/add" className="px-4 py-2 rounded-md bg-sky-700 hover:bg-sky-800 text-white font-medium shadow-sm">Add Funder</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funder summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Name</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Projects</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Allocation</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Income</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Expenses</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Available</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-slate-100">{r.name}</td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{r.projects}</td>
                  <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-slate-100">{formatAmount(r.allocation, currency)}</td>
                  <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-slate-300">{formatAmount(r.income, currency)}</td>
                  <td className="px-3 py-2 text-sm text-right text-red-600">{formatAmount(r.expenses, currency)}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium dark:text-slate-100">{formatAmount(r.available, currency)}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Link to={`/app/reports/funder/${r.id}`} className="px-2 py-1 rounded-md bg-sky-700 text-white text-sm">Report</Link>
                      <Link to={`/app/funders/portal/${r.id}`} className="px-2 py-1 rounded-md bg-indigo-600 text-white text-sm">View Details</Link>
                      {role === 'admin' ? (
                        <button onClick={() => { if (window.confirm('Delete this funder and all associated data? This cannot be undone.')) removeItem('funders', r.id); }} className="px-2 py-1 rounded-md bg-rose-600 text-white text-sm">Delete</button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={7}>No funders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallets</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((w) => (
            <div key={w.id} className="rounded-xl ring-1 ring-gray-100 p-4 flex items-center justify-between bg-white dark:bg-slate-900/70 dark:ring-slate-800 dark:text-slate-100">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{w.name}</div>
                <div className="text-xs text-gray-500 dark:text-slate-300">Type: {w.type}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-slate-100">{formatAmount(w.balance || 0, currency)}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => { setIncomeWallet(w); setIncomeForm({ projectId: '', amount: '', date: '', description: '' }); setIncomeFiles([]); setIncomeModalOpen(true); }} className="px-3 py-1 rounded-md bg-sky-700 hover:bg-sky-800 text-white text-sm shadow-sm">Add income</button>
                </div>
              </div>
            </div>
          ))}
          {wallets.length === 0 && <div className="text-sm text-gray-500 dark:text-slate-400">No wallets yet.</div>}
        </div>
        </CardContent>
      </Card>

      {/* Add Income Modal */}
      {incomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIncomeModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-6 dark:bg-slate-900/90 dark:border-slate-700 dark:text-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add income to {incomeWallet?.name}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!incomeForm.amount) return alert('Amount is required');
              setIncomeSaving(true);
              try {
                let attachments = [];
                if (incomeFiles && incomeFiles.length) {
                  const uploaded = await uploadFiles(incomeFiles);
                  attachments = uploaded.map((u) => ({ url: u.url, id: u.public_id }));
                }
                const payload = {
                  walletId: incomeWallet?.id,
                  projectId: incomeForm.projectId || null,
                  amount: Number(incomeForm.amount),
                  date: incomeForm.date || new Date().toISOString(),
                  description: incomeForm.description || '',
                  attachments,
                };
                addIncome(payload);
                setIncomeModalOpen(false);
                alert('Income added');
              } catch (err) {
                console.error(err);
                alert(err.message || 'Failed to upload attachments');
              } finally {
                setIncomeSaving(false);
              }
            }} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Project (optional)</label>
                <select value={incomeForm.projectId} onChange={(e)=>setIncomeForm({...incomeForm,projectId:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                  <option value="">-- None --</option>
                  {projects.filter((p)=> (p.funderId===incomeWallet?.id) || p.type==='igp').map((p)=> (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FormInput id="i-amount" name="i-amount" type="number" label="Amount" value={incomeForm.amount} onChange={(e)=>setIncomeForm({...incomeForm,amount:e.target.value})} required />
              </div>
              <div>
                <FormInput id="i-date" name="i-date" type="date" label="Date" value={incomeForm.date} onChange={(e)=>setIncomeForm({...incomeForm,date:e.target.value})} />
              </div>
              <div>
                <FormInput id="i-desc" name="i-desc" label="Description" value={incomeForm.description} onChange={(e)=>setIncomeForm({...incomeForm,description:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Attachments</label>
                <input type="file" multiple onChange={(e)=>setIncomeFiles(e.target.files)} className="w-full" />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={()=>setIncomeModalOpen(false)} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100">Cancel</button>
                <button type="submit" disabled={incomeSaving} className="px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-800 text-white shadow-sm">{incomeSaving ? 'Saving...' : 'Add income'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
