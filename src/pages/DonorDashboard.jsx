import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ContributionForm from '../components/ContributionForm';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/format';
import {
  HeartIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  LightBulbIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

const DonorDashboard = () => {
  const { user } = useAuth();
  const { currency, activeOrgId } = useOrg();
  const { byFunder, incomes, expenses, projects, addProject, addIncome } = useFinance();
  const [trendRange, setTrendRange] = useState('Month'); // Week | Month | Year
  const [search, setSearch] = useState('');
  const [firstVisit, setFirstVisit] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [projForm, setProjForm] = useState({ name: '', funderId: '', allocation: '' });
  const [incForm, setIncForm] = useState({ amount: '', walletId: '', projectId: '', description: '' });
  const [formError, setFormError] = useState('');
  const [showContributionForm, setShowContributionForm] = useState(false);

  // Handle successful contribution
  const handleContributionSuccess = (response) => {
    // Show success message
    console.log('Contribution successful:', response);
    // The webhook will trigger a refresh via the real-time listener
  };

  // No internal menu/sidebar; layout handles header/sidebar


  // Add a prominent contribution button in the header
  const renderContributionButton = () => (
    <button
      onClick={() => setShowContributionForm(true)}
      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
    >
      <CurrencyDollarIcon className="w-5 h-5 mr-2" />
      Make a Contribution
    </button>
  );

  // First-visit greeting (per user, per browser)
  useEffect(() => {
    if (!user?.id) return;
    try {
      const key = `donor_greeted_${user.id}`;
      const seen = localStorage.getItem(key) === '1';
      if (!seen) {
        setFirstVisit(true);
        localStorage.setItem(key, '1');
      } else {
        setFirstVisit(false);
      }
    } catch {}
  }, [user?.id]);

  // Identify current donor
  const donorFunder = useMemo(() => {
    return byFunder.find(f => f?.funder?.contact === user?.email) || byFunder[0] || null;
  }, [byFunder, user]);

  // Guard empty
  const funderId = donorFunder?.funder?.id;

  const donorTx = useMemo(() => {
    if (!funderId) return { incomes: [], expenses: [] };
    const inc = incomes.filter(i => i.status === 'posted' && i.walletId === funderId);
    const exp = expenses.filter(e => e.status === 'posted' && e.walletId === funderId);
    return { incomes: inc, expenses: exp };
  }, [funderId, incomes, expenses]);

  const donorProjects = useMemo(() => {
    if (!funderId) return [];
    const all = projects.filter(p => p.funderId === funderId);
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(p => (
      (p.name || '').toLowerCase().includes(q) ||
      String(p.projectName || '').toLowerCase().includes(q)
    ));
  }, [funderId, projects, search]);

  const metrics = useMemo(() => {
    const totalDonated = donorTx.incomes.reduce((s, i) => s + (i.amount || 0), 0);
    const totalSpent = donorTx.expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const remaining = (donorFunder?.available ?? Math.max(totalDonated - totalSpent, 0));
    return {
      totalDonated,
      totalSpent,
      remaining,
      activeProjects: donorProjects.length,
      sparkline: donorTx.expenses.slice(-12).map(e => e.amount || 0)
    };
  }, [donorTx, donorProjects.length, donorFunder]);

  // Filtered transactions by search (project or category)
  const filteredTx = useMemo(() => {
    const rows = [...donorTx.incomes, ...donorTx.expenses];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(tx => (
      String(tx.projectName || '').toLowerCase().includes(q) ||
      String(tx.category || '').toLowerCase().includes(q) ||
      String(tx.description || '').toLowerCase().includes(q)
    ));
  }, [donorTx, search]);

  // Handlers: create project and income
  const funderOptions = (Array.isArray(byFunder) ? byFunder.map(r => r?.funder).filter(Boolean) : []);
  const walletOptions = [ { id: 'ORG', name: 'Organization' }, ...funderOptions.map(f => ({ id: f.id, name: f.name || f.id })) ];

  const handleCreateProject = async () => {
    setFormError('');
    if (!projForm.name || !(projForm.funderId || projForm.funderId === 'ORG')) {
      setFormError('Please provide a name and select a funding source.');
      return;
    }
    try {
      setSavingProject(true);
      const res = await addProject({
        name: projForm.name,
        funderId: projForm.funderId || 'ORG',
        allocation: Number(projForm.allocation || 0)
      });
      if (!res?.success) {
        setFormError(res?.error || 'Failed to create project');
      } else {
        setShowProjectForm(false);
        setProjForm({ name: '', funderId: '', allocation: '' });
      }
    } finally {
      setSavingProject(false);
    }
  };

  const handleCreateIncome = async () => {
    setFormError('');
    if (!incForm.amount || !incForm.walletId) {
      setFormError('Please enter amount and select a wallet.');
      return;
    }
    try {
      setSavingIncome(true);
      const res = await addIncome({
        amount: Number(incForm.amount || 0),
        walletId: incForm.walletId,
        projectId: incForm.projectId || null,
        description: incForm.description || ''
      });
      if (!res?.success) {
        setFormError(res?.error || 'Failed to create income');
      } else {
        setShowIncomeForm(false);
        setIncForm({ amount: '', walletId: '', projectId: '', description: '' });
      }
    } finally {
      setSavingIncome(false);
    }
  };

  // CSV export for filtered transactions
  const exportCSV = () => {
    const headers = ['Date','Project','Category','Amount','Status'];
    const rows = filteredTx.map(tx => [
      tx.date ? new Date(tx.date).toISOString().split('T')[0] : '',
      tx.projectName || '',
      tx.category || (tx.amount > 0 ? 'Donation' : 'Expense'),
      String(tx.amount || 0),
      tx.status || 'posted'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple loading heuristics/skeletons
  const isLoading = !Array.isArray(byFunder) || (!donorFunder && (incomes.length === 0 && expenses.length === 0));
  const SkeletonCard = () => (
    <div className="animate-pulse rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 h-28" />
  );
  const SkeletonRow = () => (
    <tr className="animate-pulse"><td colSpan={6} className="py-3">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
    </td></tr>
  );

  // Allocation pie data (by expense category)
  const allocation = useMemo(() => {
    const map = {};
    donorTx.expenses.forEach(e => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map).map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));
  }, [donorTx]);

  // Spending over time trend
  const trend = useMemo(() => {
    const bucket = {};
    const fmt = (d) => {
      const dt = new Date(d);
      if (trendRange === 'Week') {
        const wk = `${dt.getFullYear()}-W${Math.ceil((dt.getDate()) / 7)}`;
        return wk;
      }
      if (trendRange === 'Year') return `${dt.getFullYear()}`;
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };
    donorTx.expenses.forEach(e => {
      const key = fmt(e.date || e.createdAt || Date.now());
      bucket[key] = (bucket[key] || 0) + (e.amount || 0);
    });
    const entries = Object.entries(bucket).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    return entries.map(([label, value]) => ({ label, value }));
  }, [donorTx, trendRange]);

  // Helpers for simple SVG charts
  const Sparkline = ({ data = [], color = '#22c55e' }) => {
    const w = 120, h = 32, pad = 4;
    const max = Math.max(1, ...data);
    const step = (w - pad * 2) / Math.max(1, data.length - 1);
    const points = data.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
    return (
      <svg width={w} height={h} className="absolute right-2 bottom-2 opacity-30">
        <path d={d} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  };

  const Pie = ({ slices }) => {
    const size = 160; const r = 70; const cx = 90; const cy = 90;
    let start = 0;
    const colors = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'];
    return (
      <svg width={size} height={size} viewBox="0 0 180 180">
        {slices.map((s, idx) => {
          const a = (s.pct / 100) * Math.PI * 2;
          const x1 = cx + r * Math.cos(start);
          const y1 = cy + r * Math.sin(start);
          const x2 = cx + r * Math.cos(start + a);
          const y2 = cy + r * Math.sin(start + a);
          const large = a > Math.PI ? 1 : 0;
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
          start += a;
          return <path key={idx} d={d} fill={colors[idx % colors.length]} opacity={0.9} />;
        })}
      </svg>
    );
  };

  const Line = ({ points }) => {
    const w = 420, h = 160, pad = 24;
    const max = Math.max(1, ...points.map(p => p.value));
    const step = (w - pad * 2) / Math.max(1, points.length - 1);
    const path = points.map((p, i) => {
      const x = pad + i * step; const y = h - pad - (p.value / max) * (h - pad * 2);
      return `${i ? 'L' : 'M'}${x},${y}`;
    }).join(' ');
    return (
      <svg width={w} height={h} className="w-full">
        <path d={path} fill="none" stroke="#6366f1" strokeWidth="2" />
      </svg>
    );
  };

  if (!donorFunder) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-slate-100">No donor profile found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Please contact support if you believe this is an error.</p>
        </div>

      {/* Create Project Modal */}
      {showProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowProjectForm(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Create Project</h3>
            {formError && <div className="mb-3 text-xs text-rose-600 dark:text-rose-400">{formError}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Name</label>
                <input value={projForm.name} onChange={e=>setProjForm(f=>({...f, name:e.target.value}))} className="w-full text-sm px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Funding Source</label>
                <select value={projForm.funderId} onChange={e=>setProjForm(f=>({...f, funderId:e.target.value}))} className="w-full text-sm px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
                  <option value="">Select...</option>
                  <option value="ORG">Organization</option>
                  {funderOptions.map(f=> (
                    <option key={f.id} value={f.id}>{f.name || f.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Allocation</label>
                <input type="number" min="0" step="0.01" value={projForm.allocation} onChange={e=>setProjForm(f=>({...f, allocation:e.target.value}))} className="w-full text-sm px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setShowProjectForm(false)} className="text-xs px-3 py-1.5 rounded-md ring-1 ring-slate-200 dark:ring-slate-700">Cancel</button>
              <button disabled={savingProject} onClick={handleCreateProject} className="text-xs px-3 py-1.5 rounded-md bg-sky-600 text-white disabled:opacity-60">{savingProject ? 'Saving...' : 'Create Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Form Modal */}
      {showContributionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowContributionForm(false)} />
          <div className="relative z-10">
            <ContributionForm
              onSuccess={handleContributionSuccess}
              onClose={() => setShowContributionForm(false)}
              funderId={funderId}
            />
          </div>
        </div>
      )}

      {/* Create Income Modal */}
      {showIncomeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowIncomeForm(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Record Income</h3>
            {formError && <div className="mb-3 text-xs text-rose-600 dark:text-rose-400">{formError}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Amount</label>
                <input type="number" min="0" step="0.01" value={incForm.amount} onChange={e=>setIncForm(f=>({...f, amount:e.target.value}))} className="w-full text-sm px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800" />
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Wallet</label>
                <select value={incForm.walletId} onChange={e=>setIncForm(f=>({...f, walletId:e.target.value}))} className="w-full text-sm px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
                  <option value="">Select...</option>
                  {walletOptions.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Project (optional)</label>
                <select value={incForm.projectId} onChange={e=>setIncForm(f=>({...f, projectId:e.target.value}))} className="w-full text-sm px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800">
                  <option value="">None</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Description</label>
                <input value={incForm.description} onChange={e=>setIncForm(f=>({...f, description:e.target.value}))} className="w-full text-sm px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setShowIncomeForm(false)} className="text-xs px-3 py-1.5 rounded-md ring-1 ring-slate-200 dark:ring-slate-700">Cancel</button>
              <button disabled={savingIncome} onClick={handleCreateIncome} className="text-xs px-3 py-1.5 rounded-md bg-sky-600 text-white disabled:opacity-60">{savingIncome ? 'Saving...' : 'Record Income'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Form Modal */}
      {showContributionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowContributionForm(false)} />
          <div className="relative z-10">
            <ContributionForm
              onSuccess={handleContributionSuccess}
              onClose={() => setShowContributionForm(false)}
              funderId={funderId}
            />
          </div>
        </div>
      )}
      </div>
    );
  }

  // Handler for Paystack payment
  const handlePaystackContribute = async () => {
    setFormError('');
    if (!incForm.amount || !incForm.walletId || !user?.email) {
      setFormError('Please enter amount, select wallet, and ensure you are logged in.');
      return;
    }
    try {
      // Call backend to initiate payment (routes to org subaccount)
      const res = await fetch('/api/paystack/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(incForm.amount) * 100, // Paystack expects kobo
          email: user.email,
          ngo_id: incForm.walletId
        })
      });
      const data = await res.json();
      if (!data.authorization_url) throw new Error('Failed to get Paystack payment link');
      window.location.href = data.authorization_url;
    } catch (err) {
      setFormError('Could not start payment: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl dark:text-slate-100">
            {firstVisit ? 'Welcome' : 'Welcome back'}, {user?.name?.split(' ')[0] || 'Funder'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Your giving at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} className="hidden md:block bg-white dark:bg-slate-800 text-sm outline-none placeholder:text-slate-400 w-56 px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700" placeholder="Search (projects, transactions)" />
          <button onClick={() => { setShowProjectForm(true); setFormError(''); }} className="hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">New Project</button>
          <button onClick={() => { setShowIncomeForm(true); setFormError(''); }} className="hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">Record Income</button>
          {renderContributionButton()}
        </div>
      </div>

      {/* Row 1 — Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="relative rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-gradient-to-br from-white to-sky-50 dark:from-slate-800 dark:to-slate-800/60 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <CurrencyDollarIcon className="h-7 w-7 text-emerald-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Funds Contributed</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatAmount(metrics.totalDonated, currency)}</p>
              </div>
            </div>
            <Sparkline data={metrics.sparkline} color="#10b981" />
          </div>
          <div className="relative rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-gradient-to-br from-white to-indigo-50 dark:from-slate-800 dark:to-slate-800/60 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <ChartBarIcon className="h-7 w-7 text-indigo-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Spent</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatAmount(metrics.totalSpent, currency)}</p>
              </div>
            </div>
            <Sparkline data={metrics.sparkline} color="#6366f1" />
          </div>
          <div className="relative rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-gradient-to-br from-white to-amber-50 dark:from-slate-800 dark:to-slate-800/60 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <EyeIcon className="h-7 w-7 text-amber-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Remaining Balance</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatAmount(metrics.remaining, currency)}</p>
              </div>
            </div>
            <Sparkline data={metrics.sparkline} color="#f59e0b" />
          </div>
          <div className="relative rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-700 bg-gradient-to-br from-white to-rose-50 dark:from-slate-800 dark:to-slate-800/60 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <HeartIcon className="h-7 w-7 text-pink-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Active Projects Supported</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{metrics.activeProjects}</p>
              </div>
            </div>
            <Sparkline data={metrics.sparkline} color="#ec4899" />
          </div>
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Funding Allocation</h3>
            </div>
            <div className="flex items-center gap-6">
              <Pie slices={allocation} />
              <ul className="text-sm space-y-2">
                {allocation.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-50 dark:bg-slate-900/40" title={`${s.label} • ${formatAmount(s.value, currency)}`}>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'][i % 6] }} />
                      <span className="text-slate-700 dark:text-slate-200">{s.label}</span>
                    </span>
                    <span className="ml-auto text-slate-500">{formatAmount(s.value, currency)}</span>
                  </li>
                ))}
                {allocation.length === 0 && <li className="text-slate-500">No spending yet.</li>}
              </ul>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Spending Over Time</h3>
              <div className="flex gap-2 text-xs">
                {['Week','Month','Year'].map(r => (
                  <button key={r} onClick={() => setTrendRange(r)} className={`px-2 py-1 rounded border ${trendRange===r ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{r}</button>
                ))}
              </div>
            </div>
            <Line points={trend} />
          </div>
      </div>

      {/* Row 3 — Project Cards */}
      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Supported Projects</h3>
          {donorProjects.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {donorProjects.map(p => {
                const used = p.used || 0; const alloc = p.allocation || 0; const pct = alloc ? Math.min(100, Math.round((used/alloc)*100)) : 0;
                return (
                  <div key={p.id} className="rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Budget {formatAmount(alloc, currency)} • Spent {formatAmount(used, currency)} • Balance {formatAmount(Math.max(alloc-used,0), currency)}</div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progress</span><span>{pct}%</span></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded">
                        <div className="h-2 bg-gradient-to-r from-emerald-400 to-sky-500 rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link to={`/donor/projects/${p.id}`} className="inline-flex items-center text-xs px-2 py-1 rounded-md ring-1 ring-slate-200 dark:ring-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50/60 dark:hover:bg-slate-800/60 transition">View Details</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="rounded-lg"><SkeletonCard /></div>
                <div className="rounded-lg"><SkeletonCard /></div>
                <div className="rounded-lg"><SkeletonCard /></div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No funded projects yet.</div>
            )
          )}
        </div>

      {/* (Documents/Settings live on their own pages in donor area) */}

      {/* Row 4 — Recent Transactions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Transactions</h3>
            <button onClick={exportCSV} className="flex items-center gap-2 text-xs px-2 py-1 rounded ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              <DocumentArrowDownIcon className="h-4 w-4" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Project</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredTx
                  .sort((a,b) => new Date(b.date||0) - new Date(a.date||0))
                  .slice(0, 10)
                  .map(tx => (
                  <tr key={tx.id} className="odd:bg-slate-50/40 dark:odd:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{tx.date ? new Date(tx.date).toLocaleDateString() : '-'}</td>
                    <td className="py-2 pr-4">{tx.projectName || '—'}</td>
                    <td className="py-2 pr-4">{tx.category || (tx.amount > 0 ? 'Donation' : 'Expense')}</td>
                    <td className={`py-2 pr-4 font-medium ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount || 0, currency)}</td>
                    <td className="py-2 pr-4">{tx.status || 'posted'}</td>
                    <td className="py-2 pr-4">
                      {tx.receiptUrl ? (
                        <a href={tx.receiptUrl} target="_blank" rel="noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline">View</a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTx.length === 0 && (
                  isLoading ? (
                    <SkeletonRow />
                  ) : (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">No transactions yet.</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Contribution Form Modal */}
      {showContributionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowContributionForm(false)} />
          <div className="relative z-10">
            <ContributionForm
              onSuccess={handleContributionSuccess}
              onClose={() => setShowContributionForm(false)}
              funderId={funderId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorDashboard;
