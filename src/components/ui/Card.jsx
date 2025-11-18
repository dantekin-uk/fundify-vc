import React from 'react';

export function Card({ className = '', children }) {
  return (
    <div className={`bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm ${className} dark:bg-slate-900/70 dark:border-slate-800 dark:shadow-none`}>{children}</div>
  );
}

export function CardHeader({ className = '', children }) {
  return (
    <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${className} dark:border-slate-800`}>{children}</div>
  );
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 ${className}`}>{children}</h3>;
}

export function CardContent({ className = '', children }) {
  return <div className={`p-5 ${className} dark:text-slate-100`}>{children}</div>;
}
