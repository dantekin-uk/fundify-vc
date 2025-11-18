import React from 'react';
import { motion } from 'framer-motion';
import Sparkline from './Sparkline';

export default function CardsGrid() {
  const cards = [
    { title: 'Total Funds', value: 'KES 12,400' },
    { title: 'IGP Funds', value: 'KES 4,200' },
    { title: 'Balance', value: 'KES 8,200' },
    { title: 'Total Expenses', value: 'KES 3,100' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((c) => (
        <motion.div key={c.title} whileHover={{ y: -6 }} className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500">{c.title}</div>
              <div className="text-2xl font-bold mt-1">{c.value}</div>
            </div>
            <div className="text-slate-400">
              <Sparkline size={100} />
            </div>
          </div>
        </motion.div>
      ))}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-lg p-4 col-span-1 sm:col-span-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Project Expenses Breakdown</div>
          <div className="text-xs text-slate-500">By category</div>
        </div>
        <div className="mt-4 h-64">
          {/* placeholder chart area — main App will include DonutChart beside */}
          <div className="w-full h-full rounded-xl bg-gradient-to-b from-slate-50 to-white border border-gray-100" />
        </div>
      </motion.div>
    </div>
  );
}
