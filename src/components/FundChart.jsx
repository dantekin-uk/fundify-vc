import React from 'react';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';

export default function FundChart({ funds }) {
  const { currency } = useOrg();

  return (
    <div>
      <div className="flex gap-3 mb-4">
        {funds.map((fund) => (
          <div
            key={fund.id}
            className="fund-row rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800 shadow-sm"
            style={{
              background: 'white',
              color: '#222',
            }}
          >
            <span className="font-semibold">{fund.name}</span>
            <span className="ml-2 font-mono text-sm">{formatAmount(fund.amount, currency)}</span>
          </div>
        ))}
      </div>
      {/* ...existing code... */}
    </div>
  );
}