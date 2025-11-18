import React from 'react';
import { Link } from 'react-router-dom';

export default function Pricing(){
  return (
    <main className="min-h-screen bg-neutral-base dark:bg-[#071022] py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-extrabold mb-6 text-slate-900 dark:text-slate-100">Pricing</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl">Choose a plan that fits your team's size and needs. Upgrade anytime.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-card-modern rounded-xl shadow-sm dark:bg-slate-800/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Starter</div>
            <div className="mt-4 text-3xl font-bold">Free</div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">Basic fund tracking for small teams</div>
            <div className="mt-6"><Link to="/register" className="px-4 py-2 rounded-full bg-primary text-white">Get started</Link></div>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border-2 border-primary dark:bg-slate-800/60 dark:border-slate-700">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pro</div>
            <div className="mt-4 text-3xl font-bold">KES 2,499/mo</div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">Advanced features for organizations</div>
            <div className="mt-6"><Link to="/register" className="px-4 py-2 rounded-full bg-primary text-white">Start Pro</Link></div>
          </div>

          <div className="p-6 bg-card-modern rounded-xl shadow-sm dark:bg-slate-800/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enterprise</div>
            <div className="mt-4 text-3xl font-bold">Custom</div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">Custom plans and integrations</div>
            <div className="mt-6"><Link to="/register" className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-600">Contact Sales</Link></div>
          </div>
        </div>
      </div>
    </main>
  );
}
