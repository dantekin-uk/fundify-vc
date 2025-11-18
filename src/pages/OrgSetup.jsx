import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/format';
import Button from '../components/ui/Button';

const sectors = ['NGO', 'Nonprofit', 'SME', 'Social Enterprise', 'Other'];
const fundingTypes = ['Grant', 'Donation', 'Internal Project', 'Other'];
const defaultCategories = ['Salaries', 'Office Rent', 'Utilities', 'Transport'];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function OrgSetup() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Step 1 – Organization Details
  const [orgDetails, setOrgDetails] = useState({
    name: user?.name || '',
    sector: sectors[0],
    country: '',
    currency: user?.orgSettings?.currency || 'USD',
  });

  // Step 2 – Funding Sources
  const [funders, setFunders] = useState([
    { id: uid(), name: '', type: fundingTypes[0], initialBalance: '' },
  ]);

  // Step 3 – Projects Setup
  const [projects, setProjects] = useState([]);

  // Step 4 – Internal Operations
  const [internalCategories, setInternalCategories] = useState([...defaultCategories]);

  const totalSteps = 5;
  const progress = useMemo(() => Math.round(((step - 1) / (totalSteps - 1)) * 100), [step]);

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!orgDetails.name.trim()) e.name = 'Organization name is required';
      if (!orgDetails.country.trim()) e.country = 'Country is required';
      if (!orgDetails.currency.trim()) e.currency = 'Currency is required';
    }
    if (s === 2) {
      const hasAtLeastOne = funders.some((f) => f.name.trim());
      if (!hasAtLeastOne) e.funders = 'Add at least one funder/donor';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((x) => Math.min(totalSteps, x + 1));
  };
  const back = () => setStep((x) => Math.max(1, x - 1));
  const skip = () => setStep((x) => Math.min(totalSteps, x + 1));

  const addFunder = () => setFunders((arr) => [...arr, { id: uid(), name: '', type: fundingTypes[0], initialBalance: '' }]);
  const removeFunder = (id) => setFunders((arr) => arr.filter((f) => f.id !== id));

  const addProject = () => setProjects((arr) => [...arr, { id: uid(), name: '', funderId: funders[0]?.id || '', budget: '', startDate: '', endDate: '' }]);
  const removeProject = (id) => setProjects((arr) => arr.filter((p) => p.id !== id));

  const addCategory = () => setInternalCategories((arr) => [...arr, '']);
  const removeCategory = (idx) => setInternalCategories((arr) => arr.filter((_, i) => i !== idx));

  const onConfirm = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      const cleanFunders = funders
        .filter((f) => f.name.trim())
        .map((f) => ({ id: f.id, name: f.name.trim(), type: f.type, initialBalance: Number(f.initialBalance || 0) }));

      const funderIds = new Set(cleanFunders.map((f) => f.id));
      const cleanProjects = projects
        .filter((p) => p.name.trim() && (!p.funderId || funderIds.has(p.funderId)))
        .map((p) => ({
          id: p.id,
          name: p.name.trim(),
          funderId: p.funderId || '',
          budget: Number(p.budget || 0),
          startDate: p.startDate || '',
          endDate: p.endDate || '',
        }));

      const cleanCategories = internalCategories.map((c) => c.trim()).filter(Boolean);

      await updateUser({
        name: orgDetails.name.trim(),
        sector: orgDetails.sector,
        country: orgDetails.country.trim(),
        orgSettings: { currency: orgDetails.currency },
        funders: cleanFunders,
        projects: cleanProjects,
        internalCategories: cleanCategories,
        hasCompletedSetup: true,
        updatedAt: new Date().toISOString(),
      });
      setSaving(false);
      navigate('/');
    } catch (e) {
      setSaving(false);
      // Silently handled by context; provide minimal feedback here
      alert('Failed to save. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] relative overflow-hidden py-10 px-4 dark:bg-slate-950">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-24 w-96 h-96 bg-gradient-to-tr from-gray-100 to-gray-200 opacity-60 rounded-full filter blur-3xl transform rotate-12 animate-pulse" />
        <div className="absolute -right-24 -bottom-20 w-80 h-80 bg-gradient-to-br from-gray-100 to-gray-200 opacity-50 rounded-full filter blur-2xl transform -rotate-12" />
        <svg className="absolute right-0 top-0 -mt-20 -mr-20 w-[600px] opacity-10" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(300,300)">
            <path d="M120,-160C150,-120,170,-80,180,-40C190,0,190,40,170,80C150,120,120,160,80,180C40,200,0,200,-40,190C-80,180,-120,160,-150,120C-180,80,-200,40,-200,0C-200,-40,-180,-80,-150,-120C-120,-160,-80,-190,-40,-200C0,-210,40,-200,80,-180C120,-160,120,-160,120,-160Z" fill="#1E3A8A" />
          </g>
        </svg>
        <div className="absolute left-10 top-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 opacity-30 rounded-full filter blur-2xl animate-pulse" />
      </div>

      <div className="w-full max-w-3xl bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl ring-1 ring-black/5 dark:bg-slate-900/80 dark:supports-[backdrop-filter]:bg-slate-900/60 dark:ring-slate-700 dark:text-slate-100 dark:shadow-none">
        <div className="px-6 sm:px-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Step {step} of {totalSteps}</div>
              <h2 className="text-2xl font-bold text-gray-900 mt-1 dark:text-slate-100">Organization Setup</h2>
            </div>
          </div>

          <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-slate-800">
            <div className="h-full brand-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Organization Name</label>
                <input
                  className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-700`}
                  value={orgDetails.name}
                  onChange={(e) => setOrgDetails({ ...orgDetails, name: e.target.value })}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-rose-300">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Sector</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                    value={orgDetails.sector}
                    onChange={(e) => setOrgDetails({ ...orgDetails, sector: e.target.value })}
                  >
                    {sectors.map((s) => (
                      <option value={s} key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Country</label>
                  <input
                    className={`w-full border ${errors.country ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-700`}
                    value={orgDetails.country}
                    onChange={(e) => setOrgDetails({ ...orgDetails, country: e.target.value })}
                  />
                  {errors.country && <p className="mt-1 text-sm text-red-600 dark:text-rose-300">{errors.country}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Currency</label>
                <select
                  className={`w-full border ${errors.currency ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-700`}
                  value={orgDetails.currency}
                  onChange={(e) => setOrgDetails({ ...orgDetails, currency: e.target.value })}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
                {errors.currency && <p className="mt-1 text-sm text-red-600 dark:text-rose-300">{errors.currency}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Funding Sources</h3>
                <Button size="sm" onClick={addFunder}>Add Funder</Button>
              </div>
              {errors.funders && <p className="mb-3 text-sm text-red-600 dark:text-rose-300">{errors.funders}</p>}
              <div className="space-y-4">
                {funders.map((f, idx) => (
                  <div key={f.id} className="rounded-lg border border-gray-200 p-4 bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Funder/Donor Name</label>
                        <input
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={f.name}
                          onChange={(e) => setFunders((arr) => arr.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Funding Type</label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={f.type}
                          onChange={(e) => setFunders((arr) => arr.map((x) => (x.id === f.id ? { ...x, type: e.target.value } : x)))}
                        >
                          {fundingTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Initial Balance (optional)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={f.initialBalance}
                          onChange={(e) => setFunders((arr) => arr.map((x) => (x.id === f.id ? { ...x, initialBalance: e.target.value } : x)))}
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        {funders.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => removeFunder(f.id)}>Remove</Button>
                        )}
                      </div>
                    </div>
                    {idx === funders.length - 1 && (
                      <div className="mt-3">
                        <button onClick={addFunder} className="text-sm text-sky-700 hover:underline">+ Add another funder</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Projects Setup (optional)</h3>
                <div className="space-x-2">
                  <Button onClick={addProject} disabled={funders.filter((f)=>f.name.trim()).length === 0} size="sm">Add Project</Button>
                  <Button variant="secondary" size="sm" onClick={skip}>Skip for now</Button>
                </div>
              </div>
              {funders.filter((f)=>f.name.trim()).length === 0 && (
                <p className="text-sm text-gray-600 mb-3 dark:text-slate-400">Add at least one funder in the previous step to tie projects.</p>
              )}
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-lg border border-gray-200 p-4 bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Project Name</label>
                        <input
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={p.name}
                          onChange={(e) => setProjects((arr) => arr.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Funder</label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={p.funderId}
                          onChange={(e) => setProjects((arr) => arr.map((x) => (x.id === p.id ? { ...x, funderId: e.target.value } : x)))}
                        >
                          <option value="">Select funder</option>
                          {funders.filter((f)=>f.name.trim()).map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Budget</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={p.budget}
                          onChange={(e) => setProjects((arr) => arr.map((x) => (x.id === p.id ? { ...x, budget: e.target.value } : x)))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Start</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={p.startDate}
                          onChange={(e) => setProjects((arr) => arr.map((x) => (x.id === p.id ? { ...x, startDate: e.target.value } : x)))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">End</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                          value={p.endDate}
                          onChange={(e) => setProjects((arr) => arr.map((x) => (x.id === p.id ? { ...x, endDate: e.target.value } : x)))}
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <Button variant="outline" size="sm" onClick={() => removeProject(p.id)}>Remove</Button>
                      </div>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-slate-400">No projects added yet.</div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Internal Operations (optional)</h3>
                <div className="space-x-2">
                  <Button size="sm" onClick={addCategory}>Add Category</Button>
                  <Button variant="secondary" size="sm" onClick={skip}>Skip for now</Button>
                </div>
              </div>
              <div className="space-y-3">
                {internalCategories.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-slate-700"
                      value={c}
                      onChange={(e) => setInternalCategories((arr) => arr.map((x, i) => (i === idx ? e.target.value : x)))}
                    />
                    <Button variant="outline" size="sm" onClick={() => removeCategory(idx)}>Remove</Button>
                  </div>
                ))}
                {internalCategories.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-slate-400">No categories added yet.</div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Review & Finish</h3>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                  <div className="p-4 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-slate-700">
                    <div className="text-sm text-gray-500 dark:text-slate-400">Organization</div>
                    <div className="mt-2 text-gray-900 dark:text-slate-100">
                      <div className="font-medium">{orgDetails.name}</div>
                      <div className="text-sm text-gray-600 dark:text-slate-300">{orgDetails.sector} • {orgDetails.country}</div>
                      <div className="text-sm text-gray-600 dark:text-slate-300">Currency: {orgDetails.currency}</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-gray-500 dark:text-slate-400">Internal Operations</div>
                    <div className="mt-2 text-gray-900 text-sm dark:text-slate-100">
                      {internalCategories.length ? internalCategories.join(', ') : 'None'}
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-sm text-gray-500 mb-2 dark:text-slate-400">Funders</div>
                  {funders.filter((f)=>f.name.trim()).length ? (
                    <div className="space-y-1">
                      {funders.filter((f)=>f.name.trim()).map((f) => (
                        <div key={f.id} className="text-sm text-gray-900 dark:text-slate-100">{f.name} — {f.type} {f.initialBalance ? `• ${formatAmount(Number(f.initialBalance || 0))}` : ''}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-slate-400">None</div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-sm text-gray-500 mb-2 dark:text-slate-400">Projects</div>
                  {projects.filter((p)=>p.name.trim()).length ? (
                    <div className="space-y-1">
                      {projects.filter((p)=>p.name.trim()).map((p) => (
                        <div key={p.id} className="text-sm text-gray-900 dark:text-slate-100">
                          {p.name} — {funders.find((f)=>f.id===p.funderId)?.name || 'No funder'} {p.budget ? `• ${formatAmount(Number(p.budget || 0))}` : ''}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-slate-400">None</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 pb-6 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={back}>Back</Button>
            )}
          </div>
          <div className="space-x-2">
            {step < 5 && (
              <>
                {step === 3 && (
                  <Button variant="secondary" onClick={skip}>Skip for now</Button>
                )}
                {step === 4 && (
                  <Button variant="secondary" onClick={skip}>Skip for now</Button>
                )}
                <Button onClick={next}>Next</Button>
              </>
            )}
            {step === 5 && (
              <Button variant="success" onClick={onConfirm} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm & Go to Dashboard'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
