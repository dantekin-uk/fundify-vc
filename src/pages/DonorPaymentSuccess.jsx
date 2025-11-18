import React from 'react';
import { Link } from 'react-router-dom';

export default function DonorPaymentSuccess() {
  return (
    <div className="p-8 max-w-xl mx-auto text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7 text-emerald-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5" /></svg>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Thank you for your contribution</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Your payment was received. Records will reflect in real time.</p>
      <div className="mt-6">
        <Link to="/donor" className="inline-flex items-center px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700">Back to Dashboard</Link>
      </div>
    </div>
  );
}
