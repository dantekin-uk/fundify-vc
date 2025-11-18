import React from 'react';
import { Link } from 'react-router-dom';

export default function HowItWorks(){
  return (
    <main className="min-h-screen bg-neutral-base dark:bg-[#071022] py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-extrabold mb-6 text-slate-900 dark:text-slate-100">How it works</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl">A clear four-step flow to get your projects funded, tracked, and reported with confidence.</p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-card-modern dark:bg-slate-800/60 shadow-sm">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">1. Create projects</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Define budgets, assign funders and teams.</div>
          </div>

          <div className="p-6 rounded-xl bg-card-modern dark:bg-slate-800/60 shadow-sm">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">2. Record income</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Record and allocate incoming funds.</div>
          </div>

          <div className="p-6 rounded-xl bg-card-modern dark:bg-slate-800/60 shadow-sm">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">3. Approve expenses</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Use approval flows for governance.</div>
          </div>

          <div className="p-6 rounded-xl bg-card-modern dark:bg-slate-800/60 shadow-sm">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">4. Share reports</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Export CSVs or share clean dashboards.</div>
          </div>
        </div>

        <div className="mt-12">
          <Link to="/register" className="inline-block bg-primary text-white px-6 py-3 rounded-full">Get started</Link>
        </div>
      </div>
    </main>
  );
}
