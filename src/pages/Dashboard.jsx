import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { usePayment } from '../context/PaymentContext';
import { formatAmount } from '../utils/format';
import StatCard from '../components/StatCard';
import PaymentCardDisplay from '../components/PaymentCardDisplay';
import FundsChart from '../components/FundsChart';
import ProjectExpensesStackedBar from '../components/ProjectExpensesStackedBar';
import PieCharts from '../components/PieCharts';
import FundersExpensesStackedBar from '../components/FundersExpensesStackedBar';
import RecentActivities from '../components/RecentActivities';
import ProgressiveBar from '../components/ProgressiveBar';
import Button from '../components/ui/Button';
import { CurrencyDollarIcon, PlusIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('6M');
  const [funderQuery, setFunderQuery] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [fundingMetric, setFundingMetric] = useState('available');
  const [fundingShowAll, setFundingShowAll] = useState(false);

  const { currency } = useOrg();
  const { paymentMethods, deletePaymentMethod, setDefaultPaymentMethod } = usePayment();
  const {
    stats = [],
    fundingRows = { rows: [] },
    byFunder = [],
    byProject = [],
    seriesMap = {}
  } = useFinance();

  const active = (tab) => window.location.pathname.includes(`/app/dashboard/${tab}`);
  const defaultPayment = paymentMethods.find(m => m.isDefault) || paymentMethods[0] || null;

  // Example: Organization creates Paystack subaccount
  const handleCreateSubaccount = async (orgDetails) => {
    try {
      const res = await fetch('/api/paystack/create-subaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgDetails)
      });
      const data = await res.json();
      if (!data.subaccount_code) throw new Error('Failed to create subaccount');
      // Show success, update UI, etc.
    } catch (err) {
      // Show error
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">
            Dashboard
          </h2>
          <nav className="mt-2 flex space-x-3">
            <Link 
              to="/app/dashboard/overview" 
              className={`px-3 py-1 rounded-md text-sm ${
                active('overview') 
                  ? 'button-brand' 
                  : 'text-gray-600 bg-white border border-gray-100 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              Overview
            </Link>
            <Link 
              to="/app/dashboard/funders" 
              className={`px-3 py-1 rounded-md text-sm ${
                active('funders') 
                  ? 'button-brand' 
                  : 'text-gray-600 bg-white border border-gray-100 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              Funders
            </Link>
            <Link 
              to="/app/dashboard/projects" 
              className={`px-3 py-1 rounded-md text-sm ${
                active('projects') 
                  ? 'button-brand' 
                  : 'text-gray-600 bg-white border border-gray-100 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              Projects
            </Link>
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {active('overview') && (
        <div>
          {/* Conditional Layout - Show enhanced layout only after payment method is added */}
          {paymentMethods.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
              {/* Payment Methods Card - Left Side */}
              <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 p-6 ring-1 ring-gray-200 dark:ring-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300 min-w-0">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Payment Method</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Funds receiver</p>
                  </div>
                  <Link to="/app/integration" className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                    <PlusIcon className="h-5 w-5" />
                  </Link>
                </div>

                {defaultPayment && (
                  <div className="space-y-5">
                    <PaymentCardDisplay
                      payment={defaultPayment}
                      onDelete={deletePaymentMethod}
                      onSetDefault={setDefaultPaymentMethod}
                      size="small"
                    />
                    <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                      <Link
                        to="/app/integration"
                        className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      >
                        Manage Methods
                      </Link>
                      <p className="text-center text-xs text-gray-500 dark:text-slate-400">
                        {paymentMethods.length} method{paymentMethods.length !== 1 ? 's' : ''} saved
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Card - Right Side (2 columns) */}
              <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 p-8 ring-1 ring-gray-200 dark:ring-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300 min-w-0">
                {/* Removed Financial Overview header and description */}
                <div className="grid grid-cols-2 gap-5">
                  {stats.slice(0, 4).map((s) => (
                    <StatCard
                      key={s.name}
                      title={s.name}
                      value={s.value}
                      rawValue={s.raw}
                      variant={s.variant}
                      series={seriesMap[s.name]}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Onboarding Card - Encourage user to add payment method */}
              <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-md border border-slate-200 dark:border-slate-800 flex flex-col items-start justify-center w-full" style={{ minHeight: 120 }}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Complete Your Payment Setup</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Add a debit card or M-Pesa account to start receiving funds from donors. This is required to display your payment details on the dashboard.
                </p>
                <Link to="/app/integration">
                  <button className="inline-flex items-center gap-2 px-5 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-all duration-200 shadow">
                    Add Payment Method Now
                  </button>
                </Link>
              </div>

              {/* Stats Grid - Full Width (4 columns) */}
              <div
                className="rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 p-8 ring-1 ring-gray-200 dark:ring-slate-700 shadow-lg min-w-0 relative"
                style={{ overflow: 'hidden' }}
              >
                {/* Bluish glowing background in top-right corner */}
                <div
                  className="absolute top-0 right-0 pointer-events-none"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #2563eb55 0%, #2563eb00 80%)',
                    filter: 'blur(16px)',
                    zIndex: 0
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
                  {stats.slice(0, 4).map((s) => (
                    <StatCard
                      key={s.name}
                      title={s.name}
                      value={s.value}
                      rawValue={s.raw}
                      variant={s.variant}
                      series={seriesMap[s.name]}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 min-w-0 mt-6">
            <div className="lg:col-span-2 min-w-0">
              {FundsChart ? <FundsChart /> : <div className="p-4">FundsChart missing</div>}
            </div>
            <div className="overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900/80 dark:ring-slate-700/50">
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Funding Sources</h3>
                  <div className="flex space-x-1 p-0.5 bg-gray-100 dark:bg-slate-800 rounded-lg">
                    {['income', 'expenses', 'available'].map((metric) => (
                      <button
                        key={metric}
                        onClick={() => setFundingMetric(metric)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          fundingMetric === metric
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {metric.charAt(0).toUpperCase() + metric.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {fundingRows.rows.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                    No funding sources available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fundingRows.rows.slice(0, fundingShowAll ? fundingRows.rows.length : 5).map((f) => {
                      const val = Number(f[fundingRows.metric] || 0);
                      const pct = Math.round((Math.abs(val) / (fundingRows.maxVal || 1)) * 100);
                      const isNegAvail = fundingRows.metric === 'available' && val < 0;
                      
                      // Calculate percentages for the stacked bar
                      const total = Math.abs(f.income) + Math.abs(f.expenses) + Math.abs(f.available);
                      const incomePct = total > 0 ? (Math.abs(f.income) / total) * 100 : 0;
                      const expensesPct = total > 0 ? (Math.abs(f.expenses) / total) * 100 : 0;
                      const availablePct = total > 0 ? (Math.abs(f.available) / total) * 100 : 0;
                      
                      // Colors for the stacked bar with better gradients
                      const incomeGradient = 'linear-gradient(90deg, #10B981, #34D399)';
                      const expensesGradient = 'linear-gradient(90deg, #EF4444, #F97316)';
                      const availableGradient = isNegAvail 
                        ? 'linear-gradient(90deg, #EF4444, #FB7185)' 
                        : 'linear-gradient(90deg, #3B82F6, #8B5CF6)';
                      
                      return (
                        <div key={f.funder.id} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate" title={f.funder.name}>
                                {f.funder.name}
                              </p>
                            </div>
                            <div className={`ml-2 text-right text-sm font-semibold whitespace-nowrap ${
                              isNegAvail ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-slate-200'
                            }`}>
                              {formatAmount(val, currency)}
                            </div>
                          </div>
                          
                          <div className="relative">
                            <ProgressiveBar
                              height={10}
                              segments={[
                                { key: 'income', percent: incomePct, background: incomeGradient, leftRounded: true, rightRounded: incomePct >= 100 },
                                { key: 'expenses', percent: expensesPct, background: expensesGradient, leftRounded: incomePct <= 0, rightRounded: (incomePct + expensesPct) >= 100 },
                                { key: 'available', percent: availablePct, background: availableGradient, leftRounded: (incomePct + expensesPct) <= 0, rightRounded: true },
                              ]}
                            />
                          </div>
                        </div>
                      );
                    })}
                    
                    {fundingRows.rows.length > 5 && (
                      <button
                        onClick={() => setFundingShowAll(!fundingShowAll)}
                        className="w-full py-2 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 mt-2"
                      >
                        {fundingShowAll ? 'Show less' : `Show all ${fundingRows.rows.length} sources`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Expenses Stacked Bar + Pie Chart */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mt-6 min-w-0">
            <div className="lg:col-span-2 min-w-0">
              {ProjectExpensesStackedBar ? (
                <ProjectExpensesStackedBar timeRange={timeRange} compact />
              ) : (
                <div className="p-4">ProjectExpensesStackedBar missing</div>
              )}
            </div>
            <div>
              {PieCharts ? (
                <PieCharts compact />
              ) : (
                <div className="p-4">ExpensePieChart missing</div>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="mt-8">
            {RecentActivities ? (
              <RecentActivities full />
            ) : (
              <div className="p-4">RecentActivities missing</div>
            )}
          </div>
        </div>
      )}

      {/* Funders Tab */}
      {active('funders') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Funders</h3>
          <div className="pt-2">
            <input 
              value={funderQuery} 
              onChange={(e) => setFunderQuery(e.target.value)} 
              placeholder="Search funders" 
              className="w-full px-3 py-2 rounded-md ring-1 ring-gray-200 bg-white text-sm placeholder:text-gray-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700" 
            />
          </div>

          <div className="mt-4">
            <FundersExpensesStackedBar timeRange={timeRange} />
          </div>

          {(byFunder || []).filter(f => !funderQuery || (f.funder.name || '').toLowerCase().includes(funderQuery.toLowerCase())).length ? (
            <div className="grid grid-cols-1 gap-3">
              {(byFunder || []).filter(f => !funderQuery || (f.funder.name || '').toLowerCase().includes(funderQuery.toLowerCase())).map((f) => (
                <div key={f.funder.id} className="rounded-lg border border-gray-200 p-4 bg-white flex justify-between items-center gap-3 min-w-0 dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate dark:text-slate-100" title={f.funder.name}>{f.funder.name}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-300">Allocation: {formatAmount(f.allocation, currency)}</div>
                    <div className="space-y-2 mt-3">
                      {/* Budget Utilization */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span>Budget Used</span>
                          <span className="font-medium">
                            {Math.round((f.used / f.allocation) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.min((f.used / f.allocation) * 100, 100)}%`,
                              minWidth: '4px'
                            }}
                          />
                        </div>
                      </div>

                      {/* Expense Ratio */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span>Expense Ratio</span>
                          <span className="font-medium">
                            {f.income > 0 ? Math.round((f.expenses / f.income) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.min((f.expenses / (f.income || 1)) * 100, 100)}%`,
                              minWidth: '4px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-700 dark:text-slate-200 font-semibold whitespace-nowrap overflow-hidden text-ellipsis" title={formatAmount(f.available, currency)}>
                    {formatAmount(f.available, currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-slate-400">No funders match your search.</div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {active('projects') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Projects</h3>
          <div className="pt-2">
            <input 
              value={projectQuery} 
              onChange={(e) => setProjectQuery(e.target.value)} 
              placeholder="Search projects" 
              className="w-full px-3 py-2 rounded-md ring-1 ring-gray-200 bg-white text-sm placeholder:text-gray-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700" 
            />
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProjectExpensesStackedBar timeRange={timeRange} compact />
            <PieCharts compact />
          </div>

          {(byProject || []).filter(p => !projectQuery || (p.project.name || '').toLowerCase().includes(projectQuery.toLowerCase())).length ? (
            <div className="grid grid-cols-1 gap-3">
              {(byProject || []).filter(p => !projectQuery || (p.project.name || '').toLowerCase().includes(projectQuery.toLowerCase())).map((p) => (
                <div key={p.project.id} className="rounded-lg border border-gray-200 p-4 bg-white flex justify-between items-center gap-3 min-w-0 dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate dark:text-slate-100" title={p.project.name}>
                      {p.project.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-300">
                      Budget: {formatAmount(Number(p.project.allocation || 0), currency)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-700 dark:text-slate-200 font-semibold whitespace-nowrap overflow-hidden text-ellipsis" 
                       title={formatAmount(p.available, currency)}>
                    Available: {formatAmount(p.available, currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-slate-400">No projects match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
