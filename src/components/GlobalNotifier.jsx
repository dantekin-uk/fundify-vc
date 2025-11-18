import React, { useEffect, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export default function GlobalNotifier() {
  const { logs = [] } = useFinance();
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);

  // Track latest seen id to show only new events
  const [seen, setSeen] = useState(new Set());

  useEffect(() => {
    const interesting = (logs || []).filter((l) => ['log_soft_removed','log_restored','log_finalized_removed'].includes(l.action));
    interesting.forEach((l) => {
      if (seen.has(l.id)) return;
      // don't notify about actions initiated by self
      if (l.by === (user?.id || '')) {
        seen.add(l.id);
        setSeen(new Set(seen));
        return;
      }
      const text = l.action === 'log_soft_removed' ? `${l.byName || l.by} removed an activity` : l.action === 'log_restored' ? `${l.byName || l.by} restored an activity` : `${l.byName || l.by} finalized removal`;
      const id = `notif-${l.id}`;
      setQueue((q) => [...q, { id, text }]);
      seen.add(l.id);
      setSeen(new Set(seen));
      // auto-dismiss after a short time
      setTimeout(() => setQueue((q) => q.filter((x) => x.id !== id)), 5000);
    });
  }, [logs, user, seen]);

  if (!queue.length) return null;
  return (
    <div className="fixed left-4 bottom-4 z-60 space-y-2">
      {queue.map((n) => (
        <div key={n.id} className="bg-white p-3 rounded-md shadow ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <div className="text-sm text-slate-800 dark:text-slate-100">{n.text}</div>
        </div>
      ))}
    </div>
  );
}
