import React from 'react';

const INTENTS = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

export default function Badge({ children, className = '', intent = 'neutral' }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  const cls = [base, INTENTS[intent] || INTENTS.neutral, className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
