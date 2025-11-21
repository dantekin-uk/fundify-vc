import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AdminOnly from './AdminOnly';

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function shortPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  try {
    const p = JSON.stringify(payload);
    return p.length > 160 ? p.slice(0, 157) + '...' : p;
  } catch { return '' }
}

export default function RecentActivities({ full = false }) {
  const { logs = [], removeItem, softRemoveLog, restoreLog, finalizeRemoveLog } = useFinance();
  const { activeOrg, role: orgRole } = useOrg();
  const { user } = useAuth();
  const UNDO_MS = Number(import.meta.env.REACT_APP_UNDO_WINDOW_MS || import.meta.env.VITE_UNDO_WINDOW_MS) || 6000;
  const isSystemAction = (a) => {
    const s = String(a || '').toLowerCase();
    return s.startsWith('log_') || s === 'item_removed';
  };
  const items = (logs || [])
    .filter((l) => !l.deleted)
    .filter((l) => !isSystemAction(l.action))
    .slice(0, 20);
  const [emailMap, setEmailMap] = useState({});
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null, hasItem: false });
  const [pendingDeletes, setPendingDeletes] = useState([]); // { id, timer }

  function inferTypeFromAction(action) {
    const a = (action || '').toLowerCase();
    if (a.includes('income')) return 'incomes';
    if (a.includes('expense')) return 'expenses';
    if (a.includes('project')) return 'projects';
    if (a.includes('funder')) return 'funders';
    // Do not infer 'logs' as a deletable item type; logs are managed separately
    return null;
  }

  function openDeleteConfirm(opts) {
    setConfirm({ open: true, ...opts });
  }

  function closeConfirm() {
    setConfirm({ open: false, title: '', message: '', onConfirm: null });
  }

  useEffect(() => {
    let mounted = true;
    // derive missing from raw logs to avoid depending on derived items which may include emailMap
    const missing = (logs || []).filter((r) => !r.byEmail && r.by && !r.deleted).map((r) => r.by).filter(Boolean);
    const unique = Array.from(new Set(missing)).filter((id) => !emailMap[id]);
    if (unique.length === 0) return () => { mounted = false; };

    (async () => {
      const updates = {};
      await Promise.all(unique.map(async (uid) => {
        try {
          let found = null;
          if (activeOrg && Array.isArray(activeOrg.memberships)) {
            const mem = activeOrg.memberships.find((m) => m.userId === uid || m.userId === (uid || ''));
            if (mem && mem.email) found = mem.email;
          }
          if (found) { updates[uid] = found; return; }
          try {
            const ref = doc(db, 'users', uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const d = snap.data();
              updates[uid] = d?.email || d?.name || null;
              return;
            }
          } catch (e) {
            // ignore
          }
          updates[uid] = null;
        } catch (e) {
          updates[uid] = null;
        }
      }));
      if (!mounted) return;
      setEmailMap((prev) => ({ ...prev, ...updates }));
    })();

    return () => { mounted = false; };
  }, [logs, activeOrg]);

  function actionMeta(action) {
    const a = (action || '').toLowerCase();
    if (a.includes('income')) return { label: (action || '').replace(/_/g, ' '), border: 'border-l-4 border-green-500', badgeBg: 'bg-green-100', badgeText: 'text-green-800', cardBg: 'bg-green-50', cardBgDark: 'bg-green-900/20' };
    if (a.includes('expense')) return { label: (action || '').replace(/_/g, ' '), border: 'border-l-4 border-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-800', cardBg: 'bg-red-50', cardBgDark: 'bg-red-900/20' };
    if (a.includes('approve') || a.includes('approval')) return { label: (action || '').replace(/_/g, ' '), border: 'border-l-4 border-sky-500', badgeBg: 'bg-sky-100', badgeText: 'text-sky-800', cardBg: 'bg-sky-50', cardBgDark: 'bg-sky-900/20' };
    return { label: (action || '').replace(/_/g, ' '), border: 'border-l-4 border-gray-200', badgeBg: 'bg-gray-100', badgeText: 'text-gray-800', cardBg: 'bg-white/60', cardBgDark: 'bg-slate-900/60' };
  }

  return (
    <div className={`recent-activities-card w-full ${full ? 'lg:w-full' : ''} overflow-hidden rounded-3xl bg-white/90 backdrop-blur ring-1 ring-gray-200 px-4 py-4 shadow-sm sm:p-6 min-w-0 dark:bg-slate-900/70 dark:ring-slate-800`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent activities</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">Timeline of recent actions</p>
        </div>
        <Link to="/audit" className="text-xs text-sky-700 hover:underline self-start">View all</Link>
      </div>

      <div className="max-h-[520px] overflow-auto">
        {items.length === 0 && <div className="text-sm text-gray-500 dark:text-slate-400 p-4">No recent activity</div>}
        <div className="space-y-3">
          {items.map((l) => {
            const email = l.byEmail || l.byName || emailMap[l.by] || l.by || 'Unknown';
            const role = l.byRole || l.role || '';
            const avatarLetter = (email || 'U').charAt(0).toUpperCase();
            const meta = actionMeta(l.action);
            const inferredType = inferTypeFromAction(l.action);
            return (
              <div key={l.id} className={`${meta.border} rounded-2xl ${meta.cardBg} dark:${meta.cardBgDark} p-3 shadow-sm hover:shadow-md transition transform-gpu` }>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">{avatarLetter}</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${meta.badgeBg} ${meta.badgeText}`}>{meta.label}</span>
                        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{email}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-400 dark:text-slate-500">{formatDateTime(l.at)}</div>

                        <AdminOnly>
                          <button
                            title="Delete activity"
                            onClick={() => openDeleteConfirm({
                              title: 'Delete activity',
                              message: inferredType && l.refId ? `Delete the referenced ${inferredType.replace(/s$/, '')} (id: ${l.refId}) or just remove this activity?` : 'Remove this activity from the timeline?',
                              hasItem: Boolean(inferredType && l.refId),
                              onConfirm: async (choice) => {
                                try {
                                  // Primary action now is to delete the activity/log only (choice 'log')
                                  if (choice === 'log') {
                                    softRemoveLog(l.id);
                                    const timer = setTimeout(() => {
                                      try { finalizeRemoveLog(l.id); } catch (e) { console.error(e); }
                                      setPendingDeletes((s) => s.filter((p) => p.id !== l.id));
                                    }, UNDO_MS);
                                    setPendingDeletes((s) => [...s, { id: l.id, timer }]);
                                    closeConfirm();
                                    return;
                                  }

                                  // If user chooses to delete the referenced item, remove it (item) or both
                                  if ((choice === 'item' || choice === 'both') && inferredType && l.refId) {
                                    await removeItem(inferredType, l.refId);
                                  }

                                  // If deleting both, also remove the activity/log
                                  if (choice === 'both') {
                                    softRemoveLog(l.id);
                                    const timer = setTimeout(() => {
                                      try { finalizeRemoveLog(l.id); } catch (e) { console.error(e); }
                                      setPendingDeletes((s) => s.filter((p) => p.id !== l.id));
                                    }, UNDO_MS);
                                    setPendingDeletes((s) => [...s, { id: l.id, timer }]);
                                  }
                                } catch (err) {
                                  console.error('delete failed', err);
                                }
                                closeConfirm();
                              },
                            })}
                            className="h-8 w-8 rounded-full flex items-center justify-center bg-white shadow-sm text-rose-600 hover:bg-rose-50 dark:bg-slate-800 dark:text-rose-400"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6m-5 2v8" /></svg>
                          </button>
                        </AdminOnly>

                        {/* Allow owners or admins to soft-remove the activity (with undo) */}
                        {((user?.id && user.id === l.by) || orgRole === 'admin') ? (
                          <button
                            title="Remove activity"
                            onClick={async () => {
                              if (!window.confirm('Remove this activity from the timeline? You can undo for 6 seconds.')) return;
                              try {
                                softRemoveLog(l.id);
                                const timer = setTimeout(() => {
                                  try { finalizeRemoveLog(l.id); } catch (e) { console.error(e); }
                                  setPendingDeletes((s) => s.filter((p) => p.id !== l.id));
                                }, UNDO_MS);
                                    setPendingDeletes((s) => [...s, { id: l.id, timer }]);
                              } catch (err) {
                                console.error('remove activity failed', err);
                                try { window.alert('Failed to remove activity'); } catch {}
                              }
                            }}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" /></svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-100">{role || '—'}</span>
                      <span className="text-[12px] text-gray-400">{l.refId ? `ref: ${l.refId}` : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeConfirm} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{confirm.title}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">{confirm.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50" onClick={closeConfirm}>Cancel</button>
              {confirm.hasItem ? (
                <>
                  <button className="px-3 py-2 rounded-md bg-rose-600 text-sm text-white" onClick={() => confirm.onConfirm('log')}>Delete activity</button>
                  <button className="px-3 py-2 rounded-md bg-yellow-500 text-sm text-white" onClick={() => confirm.onConfirm('item')}>Delete referenced item</button>
                  <button className="px-3 py-2 rounded-md bg-red-700 text-sm text-white" onClick={() => confirm.onConfirm('both')}>Delete both</button>
                </>
              ) : (
                <button className="px-3 py-2 rounded-md bg-rose-600 text-sm text-white" onClick={() => confirm.onConfirm('log')}>Delete activity</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Undo toast for recently removed activities */}
      {pendingDeletes.length > 0 && (
        <div className="fixed right-4 bottom-4 z-50 space-y-2">
          {pendingDeletes.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-white rounded-md px-3 py-2 shadow ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <div className="text-sm text-slate-700 dark:text-slate-100">Activity removed</div>
              <button
                onClick={() => {
                  clearTimeout(p.timer);
                  restoreLog(p.id);
                  setPendingDeletes((s) => s.filter((x) => x.id !== p.id));
                }}
                className="text-sm text-sky-700 hover:underline"
              >Undo</button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
