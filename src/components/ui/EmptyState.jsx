import React from 'react';
import Button from './Button';

export default function EmptyState({
  title = 'No data',
  description = 'There is nothing to show here yet.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 p-8 bg-white/60 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100 ${className}`}>
      <div className="text-slate-900 font-medium dark:text-slate-100">{title}</div>
      <div className="mt-1 text-sm text-slate-500 max-w-sm dark:text-slate-400">{description}</div>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
