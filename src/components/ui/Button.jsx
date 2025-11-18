import React from 'react';

const VARIANTS = {
  primary: 'bg-sky-700 hover:bg-sky-800 text-white shadow-sm',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5',
};

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  onClick,
}) {
  const base = 'inline-flex items-center rounded-md transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  const cls = [base, VARIANTS[variant] || VARIANTS.primary, SIZES[size] || SIZES.md, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} onClick={onClick} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}
