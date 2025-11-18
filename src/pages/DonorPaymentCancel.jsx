import React from 'react';
import { Link } from 'react-router-dom';

export default function DonorPaymentCancel() {
  return (
    <div className="p-8 max-w-xl mx-auto text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-rose-100 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7 text-rose-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payment cancelled</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">No charge was made. You can try again anytime.</p>
      <div className="mt-6">
        <Link to="/donor" className="inline-flex items-center px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">Back to Dashboard</Link>
      </div>
    </div>
  );
}
