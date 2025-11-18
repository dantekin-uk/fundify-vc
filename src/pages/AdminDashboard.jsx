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
import RecentActivities from '../components/RecentActivities';
import RecentTransactions from '../components/RecentTransactions';
import Button from '../components/ui/Button';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  LightBulbIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
    // --- Payment Integration Section ---
    const [integrationStatus, setIntegrationStatus] = useState(null);
    const [loadingIntegration, setLoadingIntegration] = useState(false);
    const [integrationError, setIntegrationError] = useState(null);

    const handleSetupPaystack = async () => {
      setLoadingIntegration(true);
      setIntegrationError(null);
      try {
        // Example org details, replace with real org data
        const orgDetails = { orgId: 'ORG_ID', name: 'Organization Name' };
        const res = await fetch('/api/paystack/create-subaccount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orgDetails)
        });
        const data = await res.json();
        if (!data.subaccount_id) throw new Error('Failed to create subaccount');
        setIntegrationStatus('active');
      } catch (err) {
        setIntegrationError(err.message);
        setIntegrationStatus('error');
      } finally {
        setLoadingIntegration(false);
      }
    };
  const [timeRange, setTimeRange] = useState('6M');
  const { currency } = useOrg();
  const { paymentMethods, deletePaymentMethod, setDefaultPaymentMethod } = usePayment();
  const {
    stats = [],
    fundingRows = { rows: [] },
    byFunder = [],
    byProject = [],
    seriesMap = {}
  } = useFinance();

  const defaultPayment = paymentMethods.find(m => m.isDefault) || paymentMethods[0] || null;

  // AI Insights data (mock for now)
  const aiInsights = [
    {
      id: 1,
      title: 'Funding Gap Alert',
      description: 'Project Alpha is 15% over budget. Consider reallocating from Project Beta.',
      type: 'warning',
      impact: 'high'
    },
    {
      id: 2,
      title: 'Donor Retention Opportunity',
      description: 'Top donors show 23% engagement increase. Schedule follow-up calls.',
      type: 'opportunity',
      impact: 'medium'
    },
    {
      id: 3,
      title: 'Expense Optimization',
      description: 'Administrative costs can be reduced by 8% through vendor negotiation.',
      type: 'savings',
      impact: 'low'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Payment Integration Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-2">Payment Integration</h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Connect your organization to Paystack for secure payments and real-time dashboard updates.
        </p>
        {integrationStatus === 'active' ? (
          <div className="text-green-600 font-medium mb-2">Integration Active</div>
        ) : (
          <Button onClick={handleSetupPaystack} disabled={loadingIntegration}>
            {loadingIntegration ? 'Setting Up...' : 'Setup Paystack Integration'}
          </Button>
        )}
        {integrationError && (
          <div className="text-red-600 mt-2">{integrationError}</div>
        )}
        <div className="mt-4">
          <Link to="/PAYMENT_SETUP_GUIDE.md" className="text-blue-500 underline text-sm">View Setup Guide</Link>
        </div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">
            Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Comprehensive overview of your organization's financial health and donor relationships.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white ring-1 ring-gray-200 text-sm focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
          >
            <option value="1M">Last Month</option>
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="1Y">Last Year</option>
          </select>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {aiInsights.map((insight) => (
          <div key={insight.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 ring-1 ring-blue-100 dark:ring-slate-600">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <LightBulbIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{insight.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{insight.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    insight.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {insight.impact} impact
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Financial Overview</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Key metrics and performance</p>
            </div>
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
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 p-8 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -ml-36 -mb-36" />

            <div className="relative z-10 max-w-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Complete Your Payment Setup</h3>
                  <p className="text-indigo-100 mb-4">
                    Add a debit card or M-Pesa account to start receiving funds from donors. This is required to display your payment details on the dashboard.
                  </p>
                  <Link to="/app/integration">
                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg">
                      <PlusIcon className="h-5 w-5" />
                      Add Payment Method Now
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid - Full Width (4 columns) */}
          <div className="rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 p-8 ring-1 ring-gray-200 dark:ring-slate-700 shadow-lg min-w-0">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Financial Overview</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Key metrics and performance</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 min-w-0">
        <div className="lg:col-span-2 min-w-0">
          {FundsChart ? <FundsChart /> : <div className="p-4 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">FundsChart component</div>}
        </div>
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="rounded-xl bg-white dark:bg-slate-800 p-4 ring-1 ring-gray-200 dark:ring-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/app/income" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Add Income</span>
              </Link>
              <Link to="/app/expenses" className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                <ChartBarIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">Add Expense</span>
              </Link>
              <Link to="/app/funders" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Manage Donors</span>
              </Link>
            </div>
          </div>

          {/* Funding Overview */}
          <div className="rounded-xl bg-white dark:bg-slate-800 p-4 ring-1 ring-gray-200 dark:ring-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Funding Overview</h3>
            <div className="space-y-3">
              {fundingRows.rows?.slice(0, 3).map((f) => (
                <div key={f.funder.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{f.funder.name}</p>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {formatAmount(f.available || 0, currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Project Expenses & Pie Chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mt-6 min-w-0">
        <div className="lg:col-span-2 min-w-0">
          {ProjectExpensesStackedBar ? (
            <ProjectExpensesStackedBar timeRange={timeRange} compact />
          ) : (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">ProjectExpensesStackedBar component</div>
          )}
        </div>
        <div>
          {PieCharts ? (
            <PieCharts compact />
          ) : (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">PieCharts component</div>
          )}
        </div>
      </div>

      {/* Recent Transactions & Activities */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        <div className="min-w-0">
          {RecentTransactions ? (
            <RecentTransactions limit={10} />
          ) : (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">RecentTransactions component</div>
          )}
        </div>
        <div className="min-w-0">
          {RecentActivities ? (
            <RecentActivities full />
          ) : (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">RecentActivities component</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
