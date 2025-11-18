import React from 'react';
import { motion } from 'framer-motion';
import Sparkline from './Sparkline';

export default function Hero() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div>
        <motion.h1 initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="text-4xl sm:text-5xl font-extrabold leading-tight">Manage funds, projects, and reports—simplified.</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="mt-4 text-lg text-slate-600">Track multiple funders, run income-projects, and share clean reports — all from one modern dashboard.</motion.p>
        <div className="mt-6 flex items-center gap-4">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="px-6 py-3 rounded-full bg-primary text-white font-semibold">Get started free</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} className="px-5 py-3 rounded-full border border-slate-200 text-slate-700">Watch demo</motion.button>
        </div>
        <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
          <motion.div whileHover={{ y: -2 }} className="inline-flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">✓</div>
            <div>Real-time reports</div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="inline-flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm">
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">🔁</div>
            <div>Donor & project tracking</div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="inline-flex items-center gap-2 bg-amber-50 rounded-xl p-2 shadow-sm">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">⚡</div>
            <div>Approval workflows</div>
          </motion.div>
        </div>
      </div>

      <div>
        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45 }} className="bg-white rounded-xl shadow-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -4 }} className="p-3 rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500">Total Funds</div>
              <div className="text-xl font-bold">KES 12,400</div>
              <div className="mt-2 h-6"><Sparkline size={80} /></div>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="p-3 rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500">IGP Funds</div>
              <div className="text-xl font-bold">KES 4,200</div>
              <div className="mt-2 h-6"><Sparkline size={80} /></div>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="p-3 rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500">Balance</div>
              <div className="text-xl font-bold">KES 8,200</div>
              <div className="mt-2 h-6"><Sparkline size={80} /></div>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="p-3 rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500">Total Expenses</div>
              <div className="text-xl font-bold">KES 3,100</div>
              <div className="mt-2 h-6"><Sparkline size={80} /></div>
            </motion.div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Overview</div>
              <div className="text-xs text-slate-500">Last 30 days</div>
            </div>
            <div className="mt-3 h-40">
              <Sparkline timeframe="month" fullHeight />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
