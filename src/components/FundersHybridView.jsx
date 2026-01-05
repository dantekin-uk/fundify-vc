import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, LayoutGrid, List, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';

const FUNDER_COLORS = ['#4F46E5', '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E', '#84CC16', '#F59E0B', '#F97316', '#F43F5E'];

const MiniPieChart = ({ income, expenses, available, isMobile }) => {
  const data = [
    { name: 'Expenses', value: Math.abs(expenses || 0) },
    { name: 'Available', value: Math.abs(available || 0) }
  ];

  if (data.every(d => d.value === 0)) {
    return <div className="text-center text-xs text-gray-500 dark:text-slate-400 py-3">No data</div>;
  }

  const chartHeight = isMobile ? 120 : 150;
  const innerRadius = isMobile ? 25 : 35;
  const outerRadius = isMobile ? 40 : 50;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          <Cell fill="#F97316" />
          <Cell fill="#10B981" />
        </Pie>
        <Tooltip formatter={(value) => value.toFixed(0)} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const MiniBarChart = ({ allocation, income, expenses, isMobile }) => {
  const data = [
    { category: isMobile ? 'Alloc' : 'Allocated', value: Math.abs(allocation || 0), fill: '#4F46E5' },
    { category: isMobile ? 'Inc' : 'Income', value: Math.abs(income || 0), fill: '#10B981' },
    { category: isMobile ? 'Exp' : 'Expenses', value: Math.abs(expenses || 0), fill: '#F97316' }
  ];

  const chartHeight = isMobile ? 120 : 150;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} margin={{ top: 10, right: 5, left: 0, bottom: isMobile ? 45 : 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="category" tick={{ fontSize: isMobile ? 10 : 11 }} angle={-15} textAnchor="end" height={isMobile ? 55 : 60} />
        <YAxis tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 30 : 40} />
        <Tooltip formatter={(value) => value.toFixed(0)} contentStyle={{ fontSize: '12px' }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default function FundersHybridView({ funders = [], currency = 'USD', searchQuery = '' }) {
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'table' or 'card' - default to card for mobile
  const [sortBy, setSortBy] = useState('allocation');
  const [sortOrder, setSortOrder] = useState('desc');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  // Detect screen size and auto-switch to card view on mobile
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 1024;

  const filteredAndSorted = useMemo(() => {
    let result = funders.filter(f => 
      !searchQuery || (f.funder?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortBy) {
        case 'allocation':
          aVal = Math.abs(a.allocation || 0);
          bVal = Math.abs(b.allocation || 0);
          break;
        case 'income':
          aVal = Math.abs(a.income || 0);
          bVal = Math.abs(b.income || 0);
          break;
        case 'expenses':
          aVal = Math.abs(a.expenses || 0);
          bVal = Math.abs(b.expenses || 0);
          break;
        case 'available':
          aVal = Math.abs(a.available || 0);
          bVal = Math.abs(b.available || 0);
          break;
        case 'utilization':
          aVal = a.allocation > 0 ? (a.expenses / a.allocation) * 100 : 0;
          bVal = b.allocation > 0 ? (b.expenses / b.allocation) * 100 : 0;
          break;
        default:
          aVal = a.funder?.name || '';
          bVal = b.funder?.name || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [funders, searchQuery, sortBy, sortOrder]);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === 'asc' ? 
      <ArrowUpDown className="h-3 w-3 text-sky-600" /> : 
      <ArrowUpDown className="h-3 w-3 text-sky-600 rotate-180" />;
  };

  if (filteredAndSorted.length === 0) {
    return (
      <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm p-8 dark:bg-slate-900/80 dark:ring-slate-700/50 text-center">
        <p className="text-gray-500 dark:text-slate-400">No funders match your search.</p>
      </div>
    );
  }

  // TABLE VIEW
  if (viewMode === 'table') {
    return (
      <div className="space-y-3">
        {/* View Toggle & Sort Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'card'
                  ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-slate-400">
            Showing {filteredAndSorted.length} funder{filteredAndSorted.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm dark:bg-slate-900/80 dark:ring-slate-700/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200/50 dark:border-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 w-12"></th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Funder
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th
                    className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 hidden sm:table-cell"
                    onClick={() => toggleSort('allocation')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Allocated
                      <SortIcon column="allocation" />
                    </div>
                  </th>
                  <th
                    className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 hidden md:table-cell"
                    onClick={() => toggleSort('income')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Income
                      <SortIcon column="income" />
                    </div>
                  </th>
                  <th
                    className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 hidden md:table-cell"
                    onClick={() => toggleSort('expenses')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Expenses
                      <SortIcon column="expenses" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50"
                    onClick={() => toggleSort('available')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Available
                      <SortIcon column="available" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-slate-300">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                {filteredAndSorted.map((f, idx) => {
                  const utilization = f.allocation > 0 ? (Math.abs(f.expenses) / f.allocation) * 100 : 0;
                  const isExpanded = expandedId === f.funder.id;
                  const isOverBudget = utilization > 100;
                  const isWarning = utilization > 75;

                  return (
                    <tbody key={f.funder.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : f.funder.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-600 dark:text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2.5 w-2.5 rounded-full ring-1 ring-white dark:ring-slate-900"
                              style={{ backgroundColor: FUNDER_COLORS[idx % FUNDER_COLORS.length] }}
                            />
                            {f.funder?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-right text-gray-900 dark:text-slate-100 font-semibold hidden sm:table-cell">
                          {formatAmount(f.allocation, currency)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-right text-emerald-600 dark:text-emerald-400 font-medium hidden md:table-cell">
                          {formatAmount(f.income, currency)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400 font-medium hidden md:table-cell">
                          {formatAmount(f.expenses, currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-sky-600 dark:text-sky-400 font-medium">
                          {formatAmount(f.available, currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              isOverBudget 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : isWarning
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {Math.round(utilization)}%
                            </div>
                            {utilization > 100 && <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />}
                            {utilization <= 100 && utilization > 75 && <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                            {utilization <= 75 && <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-slate-800/20 border-t border-gray-200/50 dark:border-slate-700/50">
                          <td colSpan="7" className="px-4 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Mini Bar Chart */}
                              <div className="bg-white/50 dark:bg-slate-900/30 rounded-xl p-3 ring-1 ring-gray-200 dark:ring-slate-700">
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100 mb-2">Financial Breakdown</h4>
                                <MiniBarChart
                                  allocation={f.allocation}
                                  income={f.income}
                                  expenses={f.expenses}
                                  isMobile={isMobile}
                                />
                              </div>

                              {/* Mini Pie Chart */}
                              <div className="bg-white/50 dark:bg-slate-900/30 rounded-xl p-3 ring-1 ring-gray-200 dark:ring-slate-700">
                                <h4 className="text-xs font-semibold text-gray-900 dark:text-slate-100 mb-2">Expense vs Available</h4>
                                <MiniPieChart
                                  income={f.income}
                                  expenses={f.expenses}
                                  available={f.available}
                                  isMobile={isMobile}
                                />
                              </div>
                            </div>

                            {/* Detailed Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2">
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Budget Used</div>
                                <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                                  {f.allocation > 0 ? Math.round((f.expenses / f.allocation) * 100) : 0}%
                                </div>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Expense Ratio</div>
                                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                                  {f.income > 0 ? Math.round((f.expenses / f.income) * 100) : 0}%
                                </div>
                              </div>
                              <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-2">
                                <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">Income Ratio</div>
                                <div className="text-sm font-bold text-sky-700 dark:text-sky-300 mt-1">
                                  {f.allocation > 0 ? Math.round((f.income / f.allocation) * 100) : 0}%
                                </div>
                              </div>
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Status</div>
                                <div className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-1">
                                  {isOverBudget ? 'Over' : isWarning ? 'Caution' : 'Healthy'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // CARD VIEW
  return (
    <div className="space-y-3">
      {/* View Toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'card'
                ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-slate-400">
          Showing {filteredAndSorted.length} funder{filteredAndSorted.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSorted.map((f, idx) => {
          const utilization = f.allocation > 0 ? (Math.abs(f.expenses) / f.allocation) * 100 : 0;
          const isExpanded = expandedId === f.funder.id;
          const isOverBudget = utilization > 100;
          const isWarning = utilization > 75;

          return (
            <div
              key={f.funder.id}
              className="rounded-xl bg-white/90 backdrop-blur-sm ring-1 ring-gray-200/50 shadow-sm hover:shadow-md transition-all dark:bg-slate-900/80 dark:ring-slate-700/50 overflow-hidden"
            >
              {/* Card Header */}
              <div 
                className="px-4 py-3 bg-gradient-to-r border-b border-gray-200/50 dark:border-slate-700/50 cursor-pointer hover:bg-opacity-80 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${FUNDER_COLORS[idx % FUNDER_COLORS.length]}15 0%, ${FUNDER_COLORS[idx % FUNDER_COLORS.length]}08 100%)`
                }}
                onClick={() => setExpandedId(isExpanded ? null : f.funder.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900"
                      style={{ backgroundColor: FUNDER_COLORS[idx % FUNDER_COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                        {f.funder?.name || 'Unknown'}
                      </h3>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-gray-200/50 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600 dark:text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600 dark:text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-4 py-3 space-y-3">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold">Allocated</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-slate-100">
                      {formatAmount(f.allocation, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold">Available</div>
                    <div className="text-sm font-bold text-sky-600 dark:text-sky-400">
                      {formatAmount(f.available, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold">Income</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatAmount(f.income, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold">Expenses</div>
                    <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {formatAmount(f.expenses, currency)}
                    </div>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">Budget Utilization</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isOverBudget 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : isWarning
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {Math.round(utilization)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isOverBudget
                          ? 'bg-gradient-to-r from-red-400 to-red-600'
                          : isWarning
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                          : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-200/50 dark:border-slate-700/50 space-y-3">
                  <div className="h-32 sm:h-40">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Financial Breakdown</h4>
                    <MiniBarChart
                      allocation={f.allocation}
                      income={f.income}
                      expenses={f.expenses}
                      isMobile={isMobile}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2">
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Budget Used</div>
                      <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-1">
                        {f.allocation > 0 ? Math.round((f.expenses / f.allocation) * 100) : 0}%
                      </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Expense Ratio</div>
                      <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                        {f.income > 0 ? Math.round((f.expenses / f.income) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
