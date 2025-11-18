import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { expenseData } from '../data/sample';

function sum(arr) { return (arr || []).reduce((s, x) => s + (x.value || 0), 0); }

export default function DonutChart({ className = '' }) {
  const total = useMemo(() => sum(expenseData), []);
  const colors = ['#0B3D91','#14B8A6','#F59E0B','#EF4444','#10B981'];

  return (
    <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45 }} className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Expense Breakdown</div>
        <div className="text-xs text-slate-500">This month</div>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex-1 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={expenseData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={2} cornerRadius={8}>
                {expenseData.map((entry, i) => (
                  <Cell key={entry.name} fill={colors[i % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-40">
          <div className="text-xs text-slate-500">Total</div>
          <div className="text-xl font-bold">KES {total.toLocaleString()}</div>
          <div className="mt-3 space-y-2">
            {expenseData.map((e, i) => (
              <div key={e.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: colors[i % colors.length] }} />
                  <span className="text-slate-600">{e.name}</span>
                </div>
                <div className="text-slate-700">KES {e.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
