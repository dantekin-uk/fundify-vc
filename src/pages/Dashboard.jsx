import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/format';
import StatCard from '../components/StatCard';
import PaymentCardDisplay from '../components/PaymentCardDisplay';
import FundsChart from '../components/FundsChart';
import ProjectExpensesStackedBar from '../components/ProjectExpensesStackedBar';
import PieCharts from '../components/PieCharts';
import FundersExpensesStackedBar from '../components/FundersExpensesStackedBar';
import FundersBudgetChart from '../components/FundersBudgetChart';
import FundersHybridView from '../components/FundersHybridView';
import RecentActivities from '../components/RecentActivities';
import RecentTransactions from '../components/RecentTransactions';
import ProgressiveBar from '../components/ProgressiveBar';
import Button from '../components/ui/Button';
import { CurrencyDollarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AlertTriangle, X, Building2, Users, FolderKanban, ArrowRight, Sparkles } from 'lucide-react';
import { generateDemoData, isDemoMode, isEmptyOrganization } from '../utils/demoData';
import { markAsRealData, shouldShowDemoBanner } from '../utils/demoDataHelper';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('6M');
  const [funderQuery, setFunderQuery] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [fundingMetric, setFundingMetric] = useState('available');
  const [fundingShowAll, setFundingShowAll] = useState(true);
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const [initializingDemo, setInitializingDemo] = useState(false);

  const { currency, activeOrgId, orgs, loading, activeOrg } = useOrg();
  const { paymentMethods, deletePaymentMethod, setDefaultPaymentMethod } = usePayment();
  const {
    stats = [],
    fundingRows = { rows: [] },
    byFunder = [],
    byProject = [],
    seriesMap = {},
    expenses = [],
    incomes = [],
    funders = [],
    projects = [],
  } = useFinance() || {};

  useEffect(() => {
    if (!activeOrgId || loading) {
      setShowDemoBanner(false);
      return;
    }
    const currentOrg = orgs?.find(o => o.id === activeOrgId) || activeOrg;
    const shouldShow = shouldShowDemoBanner(currentOrg, user);
    setShowDemoBanner(shouldShow);
  }, [activeOrgId, loading, orgs, activeOrg, user?.hasCompletedSetup]);

  // Clear demo data and start fresh
  const clearDemoData = async () => {
    if (!activeOrgId) return;
    
    try {
      const orgRef = doc(db, 'orgs', activeOrgId);
      await updateDoc(orgRef, {
        funders: [],
        projects: [],
        incomes: [],
        expenses: [],
        isDemoMode: false,
        demoInitializedAt: null,
        hasRealData: true, // Mark that user has added real data
      });
      
      setShowDemoBanner(false);
    } catch (error) {
      console.error('Failed to clear demo data:', error);
    }
  };

  // Mark-as-real-data is handled via demoDataHelper and in create flows

  // Compute insight data
  const expenseMap = expenses
    .filter(e => e.status === 'posted')
    .reduce((acc, e) => {
      const existing = acc.get(e.category) || 0;
      acc.set(e.category, existing + e.amount);
      return acc;
    }, new Map());

  const topExpenseCategories = Array.from(expenseMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const topExpenseCategory = topExpenseCategories[0] || 'N/A';

  const incomeBySource = incomes
    .filter(i => i.status === 'posted')
    .reduce((acc, i) => {
      const source = i.projectId ? 'Project' : 'Donor';
      acc[source] = (acc[source] || 0) + i.amount;
      return acc;
    }, {});

  const topIncomeSource = Object.keys(incomeBySource).length > 0
    ? Object.entries(incomeBySource).sort((a, b) => b[1] - a[1])[0][0]
    : 'N/A';

  const totalIncomeAmount = incomes
    .filter(i => i.status === 'posted')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalExpensesAmount = expenses
    .filter(e => e.status === 'posted')
    .reduce((sum, e) => sum + e.amount, 0);

  // Add organization as a funding source
  const activeOrgResolved = activeOrg || orgs?.find(o => o.id === activeOrgId);
  
  // Calculate organization totals from all transactions
  const orgTotals = useMemo(() => {
    const orgIncome = incomes
      .filter(i => i.status === 'posted' && (i.funderId === 'ORG' || i.walletId === 'ORG' || (!i.funderId && !i.walletId)))
      .reduce((sum, i) => sum + i.amount, 0);
    
    const orgExpenses = expenses
      .filter(e => e.status === 'posted' && (e.funderId === 'ORG' || e.walletId === 'ORG' || (!e.funderId && !e.walletId)))
      .reduce((sum, e) => sum + e.amount, 0);
    
    const orgAvailable = orgIncome - orgExpenses;
    
    return { income: orgIncome, expenses: orgExpenses, available: orgAvailable };
  }, [incomes, expenses]);

  // Create enhanced funding rows with organization included
  const enhancedFundingRows = useMemo(() => {
    const rows = [...(fundingRows?.rows || [])];
    
    // Add organization as a funding source if it has any activity
    if (activeOrgResolved && (orgTotals.income !== 0 || orgTotals.expenses !== 0 || orgTotals.available !== 0)) {
      const orgRow = {
        funder: {
          id: 'ORG',
          name: activeOrgResolved.name || 'Organization',
          type: 'organization'
        },
        income: orgTotals.income,
        expenses: orgTotals.expenses,
        available: orgTotals.available,
        allocation: 0
      };
      
      rows.push(orgRow);
    }
    
    return rows;
  }, [fundingRows?.rows, activeOrgResolved, orgTotals]);

  const enhancedFundingMetricMaxVal = (enhancedFundingRows?.length)
    ? Math.max(...enhancedFundingRows.map((r) => Math.abs(Number(r?.[fundingMetric] || 0))), 1)
    : 1;

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

  const isEmpty = isEmptyOrganization(funders || [], projects || [], incomes || [], expenses || []);
  const isDemo = activeOrg?.isDemoMode === true && !activeOrg?.hasRealData;

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {showDemoBanner && isDemo && (
        <div className="relative bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-amber-900/20 border-l-4 border-amber-500 rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  You are viewing Sample Data
                </h3>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                This dashboard is populated with realistic sample data to help you understand how Fundify works. 
                Add your own funders, projects, and transactions to replace this demo data.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={clearDemoData}
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Clear & Start Real Organization
                </Button>
                <Link to="/app/funders/add">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Users className="w-4 h-4 mr-1.5" />
                    Add Your First Funder
                  </Button>
                </Link>
              </div>
            </div>
            <button
              onClick={() => setShowDemoBanner(false)}
              className="flex-shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Setup Actions for Empty/Demo Organizations */}
      {(showDemoBanner || (isEmpty && isDemo)) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/app/funders/add" className="group">
            <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-6 hover:border-slate-900 dark:hover:border-slate-500 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Add Funders</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Set up your funding sources and donors</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors" />
              </div>
            </div>
          </Link>

          <Link to="/app/projects" className="group">
            <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-6 hover:border-slate-900 dark:hover:border-slate-500 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <FolderKanban className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Configure Projects</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Create and manage your programs</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors" />
              </div>
            </div>
          </Link>

          <Link to="/app/settings" className="group">
            <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-6 hover:border-slate-900 dark:hover:border-slate-500 transition-all duration-200 hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                  <Building2 className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Organization Settings</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Complete your organization setup</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">
            Dashboard
          </h2>
          <nav className="mt-2 flex flex-wrap gap-2 sm:gap-3">
            <Link 
              to="/app/dashboard/overview" 
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm whitespace-nowrap ${
                active('overview') 
                  ? 'button-brand' 
                  : 'text-gray-600 bg-white border border-gray-100 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-colors'
              }`}
            >
              Overview
            </Link>
            <Link 
              to="/app/dashboard/funders" 
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm whitespace-nowrap ${
                active('funders') 
                  ? 'button-brand' 
                  : 'text-gray-600 bg-white border border-gray-100 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-colors'
              }`}
            >
              Funders
            </Link>
            <Link 
              to="/app/dashboard/projects" 
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm whitespace-nowrap ${
                active('projects') 
                  ? 'button-brand' 
                  : 'text-gray-600 bg-white border border-gray-100 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-colors'
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
          {/* Stats Grid - Smaller cards */}
          <div className="min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {Array.isArray(stats) && stats.slice(0, 3).map((s) => s && typeof s === 'object' ? (
                <StatCard
                  key={s.name || `stat-${Math.random()}`}
                  title={s.name || 'Unknown'}
                  value={s.value || '0'}
                  rawValue={s.raw || 0}
                  variant={s.variant || 'funds'}
                  series={seriesMap[s.name]}
                  currency={currency}
                  topExpenseCategories={topExpenseCategories}
                  topIncomeSource={topIncomeSource}
                  topExpenseCategory={topExpenseCategory}
                  totalIncome={totalIncomeAmount}
                  totalExpenses={totalExpensesAmount}
                />
              ) : null)}
            </div>
          </div>

          {/* Charts row: Chart.js left, Pie chart right */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-6 min-w-0">
            <div className="md:col-span-2 min-w-0">
              {FundsChart ? <FundsChart /> : <div className="p-4">FundsChart missing</div>}
            </div>
            <div className="md:col-span-1 min-w-0">
              {PieCharts ? <PieCharts compact /> : <div className="p-2">ExpensePieChart missing</div>}
            </div>
          </div>

          {/* Breakdown row: Funding Sources (small) left, Project Expenses (large) right */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-6 min-w-0">
            <div className="md:col-span-1 min-w-0 h-96">
              <div className="overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm dark:bg-slate-900/80 dark:ring-slate-700/50 h-full flex flex-col">
                <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-100/60 dark:border-slate-800/60 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
                      <CurrencyDollarIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Funding Sources</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">By funder ({fundingMetric})</p>
                    </div>
                  </div>
                  <div className="flex space-x-1 p-0.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                    {['income', 'expenses', 'available'].map((metric) => (
                      <button
                        key={metric}
                        onClick={() => setFundingMetric(metric)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                          fundingMetric === metric
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-300/50 dark:ring-slate-600/50'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {metric.charAt(0).toUpperCase() + metric.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-5 py-4 overflow-y-auto flex-1">
                  {enhancedFundingRows.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                      <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <CurrencyDollarIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      No funding sources available
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1 min-h-0">
                      <div className="space-y-3 scrollbar-hide flex-1 overflow-y-auto">
                        {enhancedFundingRows
                          .slice(0, fundingShowAll ? enhancedFundingRows.length : 6)
                          .sort((a, b) => Math.abs(b.income) - Math.abs(a.income))
                          .map((f, idx) => {
                          const val = Number(f?.[fundingMetric] || 0);
                          const pct = Math.round((Math.abs(val) / (enhancedFundingMetricMaxVal || 1)) * 100);
                          const isNegAvail = fundingMetric === 'available' && val < 0;
                          const total = Math.abs(f.income) + Math.abs(f.expenses) + Math.abs(f.available);
                          const incomePct = total > 0 ? (Math.abs(f.income) / total) * 100 : 0;
                          const expensesPct = total > 0 ? (Math.abs(f.expenses) / total) * 100 : 0;
                          const availablePct = total > 0 ? (Math.abs(f.available) / total) * 100 : 0;
                          
                          // Use fintech colors from pie chart
                          const fintechColors = ['#4F46E5', '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E', '#84CC16', '#F59E0B', '#F97316', '#F43F5E'];
                          const primaryColor = fintechColors[idx % fintechColors.length];
                          
                          return (
                            <div key={f.funder.id} className="group">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-900" style={{ backgroundColor: primaryColor }} />
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={f.funder.name}>
                                      {f.funder.name}
                                      {f.funder.type === 'organization' && (
                                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">(Org)</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className={`text-right text-sm font-semibold whitespace-nowrap ${
                                  isNegAvail ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'
                                }`}>
                                  {formatAmount(val, currency)}
                                </div>
                              </div>
                              <div className="relative">
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500 ease-out"
                                    style={{
                                      width: `${Math.min(pct, 100)}%`,
                                      background: `linear-gradient(90deg, ${primaryColor}dd, ${primaryColor}99)`,
                                      boxShadow: pct > 0 ? `0 0 8px ${primaryColor}40` : 'none'
                                    }}
                                  >
                                    <div className="h-full rounded-full relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {pct}% of total
                                  </div>
                                  {pct >= 75 && (
                                    <div className="text-[9px] font-medium px-1 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                      Top
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {enhancedFundingRows.length > 6 && (
                        <button
                          onClick={() => setFundingShowAll(!fundingShowAll)}
                          className="w-full py-2.5 text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors duration-200 mt-4 rounded-lg bg-sky-50/50 hover:bg-sky-100/50 dark:bg-sky-900/20 dark:hover:bg-sky-900/30 border border-sky-200/50 dark:border-sky-800/50"
                        >
                          {fundingShowAll ? 'Show less' : `Show all ${enhancedFundingRows.length} sources`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 min-w-0 h-96">
              <div className="overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm dark:bg-slate-900/80 dark:ring-slate-700/50 h-full">
                <div className="px-5 pt-5 pb-5 h-full flex flex-col">
                  {ProjectExpensesStackedBar ? (
                    <ProjectExpensesStackedBar timeRange={timeRange} />
                  ) : (
                    <div className="p-4">ProjectExpensesStackedBar missing</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: Transactions, Recent activities, Credit card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-8">
            <div className="min-w-0 md:col-span-1 h-96">
              {RecentTransactions ? (
                <RecentTransactions limit={5} />
              ) : (
                <div className="p-4">RecentTransactions missing</div>
              )}
            </div>
            <div className="min-w-0 md:col-span-1 h-96">
              {RecentActivities ? (
                <RecentActivities simple />
              ) : (
                <div className="p-4">RecentActivities missing</div>
              )}
            </div>
            <div className="min-w-0 md:col-span-1 h-96">
              {defaultPayment ? (
                <div className="rounded-2xl bg-white/90 backdrop-blur ring-1 ring-gray-200/50 shadow-sm p-6 dark:bg-slate-900/80 dark:ring-slate-700/50 h-full flex flex-col">
                  <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-slate-100 flex-shrink-0">Credit Card</h3>
                  <div className="flex-1 flex items-center justify-center">
                    <PaymentCardDisplay
                      payment={defaultPayment}
                      onDelete={deletePaymentMethod}
                      onSetDefault={setDefaultPaymentMethod}
                      size="small"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/90 backdrop-blur ring-1 ring-gray-200/50 shadow-sm p-6 dark:bg-slate-900/80 dark:ring-slate-700/50 h-full flex flex-col items-center justify-center">
                  <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-slate-100 text-center">Add Payment Method</h3>
                  <p className="text-xs text-gray-600 dark:text-slate-300 mb-4 text-center">Set up a card to display here.</p>
                  <Link to="/app/integration">
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-all duration-200 shadow">
                      <PlusIcon className="h-4 w-4" /> Add Method
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Funders Tab */}
      {active('funders') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Funders</h3>
          <div className="w-full max-w-sm">
            <input
              value={funderQuery}
              onChange={(e) => setFunderQuery(e.target.value)}
              placeholder="Search funders"
              className="w-full px-3 py-2 rounded-md ring-1 ring-gray-200 bg-white text-sm placeholder:text-gray-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 transition-all"
            />
          </div>

          <div className="mt-6">
            <FundersBudgetChart timeRange={timeRange} />
          </div>

          <FundersHybridView
            funders={byFunder || []}
            currency={currency}
            searchQuery={funderQuery}
          />
        </div>
      )}

      {/* Projects Tab */}
      {active('projects') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Projects</h3>
          <div className="w-full max-w-sm">
            <input
              value={projectQuery}
              onChange={(e) => setProjectQuery(e.target.value)}
              placeholder="Search projects"
              className="w-full px-3 py-2 rounded-md ring-1 ring-gray-200 bg-white text-sm placeholder:text-gray-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 transition-all"
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
