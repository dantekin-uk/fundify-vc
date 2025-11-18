import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

const RecentTransactions = ({ limit = 8 }) => {
  const { incomes = [], expenses = [], funders = [], projects = [] } = useFinance();
  const { currency } = useOrg();

  const funderMap = useMemo(() => {
    const map = {};
    (funders || []).forEach(f => {
      map[f.id] = f.name;
    });
    return map;
  }, [funders]);

  const projectMap = useMemo(() => {
    const map = {};
    (projects || []).forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  // Combine incomes and expenses, sort by date descending
  const transactions = useMemo(() => {
    const combined = [
      ...(incomes || []).map(i => ({
        ...i,
        type: 'income',
        funderName: funderMap[i.walletId] || 'Organization',
        projectName: projectMap[i.projectId] || null
      })),
      ...(expenses || []).map(e => ({
        ...e,
        type: 'expense',
        funderName: funderMap[e.walletId] || 'Organization',
        projectName: projectMap[e.projectId] || null
      }))
    ];

    return combined
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }, [incomes, expenses, funderMap, projectMap, limit]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'posted':
        return <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type) => {
    return type === 'income' 
      ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
      : 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 p-4 ring-1 ring-gray-200 dark:ring-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Transactions</h3>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-slate-400">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div
              key={`${tx.type}-${tx.id}`}
              className={`${getTypeColor(tx.type)} rounded-lg p-3 flex items-center justify-between`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {tx.type === 'income' ? '💰 Income' : '💸 Expense'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
                    {tx.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-300 truncate">
                  {tx.description || `${tx.type === 'income' ? 'Payment from' : 'Payment to'} ${tx.funderName}`}
                </p>
                {tx.projectName && (
                  <p className="text-xs text-gray-600 dark:text-slate-400 truncate mt-1">
                    Project: {tx.projectName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <div className="text-right">
                  <div className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, currency)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">
                    {formatDate(tx.date)}
                  </div>
                </div>
                {getStatusIcon(tx.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
