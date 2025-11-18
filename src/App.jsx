import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CardsGrid from './components/CardsGrid';
import DonutChart from './components/DonutChart';
import './styles/main.css';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--bg,#F9FAFB)] text-[var(--text,#111827)]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Hero />

        <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CardsGrid />
          </div>
          <aside className="lg:col-span-1">
            <DonutChart className="h-80" />
          </aside>
        </section>

        <section className="mt-16">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-lg font-semibold">How it works</h3>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="text-sm font-semibold">1. Create Projects</div>
                <p className="text-sm text-slate-500 mt-2">Add projects, assign funders and budgets in seconds.</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="text-sm font-semibold">2. Track Income</div>
                <p className="text-sm text-slate-500 mt-2">Record incomes and allocate to project wallets.</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="text-sm font-semibold">3. Approvals</div>
                <p className="text-sm text-slate-500 mt-2">Use approval workflows for transparency and control.</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="text-sm font-semibold">4. Reports</div>
                <p className="text-sm text-slate-500 mt-2">Export clear reports and share with stakeholders.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 text-center">
          <h3 className="text-2xl font-semibold">Pricing</h3>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-sm font-semibold">Starter</div>
              <div className="mt-4 text-3xl font-bold">Free</div>
              <p className="mt-3 text-sm text-slate-500">For small teams getting started with fund tracking.</p>
              <button className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary text-white">Get started</button>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-primary">
              <div className="text-sm font-semibold">Pro</div>
              <div className="mt-4 text-3xl font-bold">KES 2,499/mo</div>
              <p className="mt-3 text-sm text-slate-500">Advanced features for organizations and fund managers.</p>
              <button className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary text-white">Start Pro</button>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-sm font-semibold">Enterprise</div>
              <div className="mt-4 text-3xl font-bold">Custom</div>
              <p className="mt-3 text-sm text-slate-500">Custom plans for large organizations and integration needs.</p>
              <button className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-200">Contact Sales</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 bg-white border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-slate-600">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>© {new Date().getFullYear()} Fundify — Built for transparent fund management.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:underline">Privacy</a>
              <a href="#" className="hover:underline">Terms</a>
              <a href="#" className="hover:underline">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
