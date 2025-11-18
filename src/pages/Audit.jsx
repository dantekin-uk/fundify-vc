import { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import AdminOnly from '../components/AdminOnly';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

function shortPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload.length > 140 ? payload.slice(0, 137) + '...' : payload;
  try {
    const p = JSON.stringify(payload);
    return p.length > 140 ? p.slice(0, 137) + '...' : p;
  } catch { return '' }
}

export default function Audit() {
  const { logs, removeItem, softRemoveLog, finalizeRemoveLog, restoreLog } = useFinance();
  const { activeOrg, role } = useOrg();
  const rows = useMemo(() => (logs || []).filter((l) => !l.deleted), [logs]);
  const [emailMap, setEmailMap] = useState({});
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  const [pendingDeletes, setPendingDeletes] = useState([]);

  useEffect(() => {
    let mounted = true;
    const missing = (rows || []).filter((r) => !r.byEmail && r.by && !r.deleted).map((r) => r.by).filter(Boolean);
    const unique = Array.from(new Set(missing)).filter((id) => !emailMap[id]);
    if (unique.length === 0) return () => { mounted = false; };

    (async () => {
      const updates = {};
      await Promise.all(unique.map(async (uid) => {
        try {
          // try to find email from activeOrg memberships first
          let found = null;
          if (activeOrg && Array.isArray(activeOrg.memberships)) {
            const mem = activeOrg.memberships.find((m) => m.userId === uid || m.userId === (uid || ''));
            if (mem && mem.email) found = mem.email;
          }
          if (found) {
            updates[uid] = found;
            return;
          }

          // fallback: try users collection
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

          // last resort keep null
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Audit Trail</h2>
          <p className="mt-1 text-sm text-slate-500">System activity logs for transparency and traceability.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent actions</CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">When</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Who</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Action</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r) => {
                  const email = r.byEmail || emailMap[r.by] || r.byName || r.by || 'Unknown';
                  const role = r.byRole || r.role || '';
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-slate-300 w-48">{new Date(r.at).toLocaleString()}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-slate-100">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-slate-100 truncate" title={email}>{email}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">{role || '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">{(r.action || '').replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">
                        <AdminOnly>
                          <button onClick={() => setConfirm({ open: true, id: r.id, title: 'Delete audit log', message: 'Remove this audit log? You can undo for 6 seconds.' })} className="px-2 py-1 rounded-md bg-white border border-gray-200 text-rose-600 text-sm hover:bg-rose-50 dark:bg-slate-800 dark:text-rose-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6m-5 2v8" /></svg>Delete
                          </button>
                        </AdminOnly>
                        {role !== 'admin' && (<span className="text-sm text-gray-400">—</span>)}
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr><td className="px-3 py-4 text-sm text-gray-500" colSpan={4}>No audit logs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirm({ open: false, id: null, title: '', message: '' })} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{confirm.title}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">{confirm.message}</p>
                    <div className="mt-4 flex justify-end gap-2">
                <button className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setConfirm({ open: false, id: null, title: '', message: '' })}>Cancel</button>
                <button className="px-3 py-2 rounded-md bg-rose-600 text-sm text-white" onClick={() => {
                  try {
                    // perform soft delete and allow undo via toast
                    softRemoveLog(confirm.id);
                    const UNDO_MS = Number(process.env.REACT_APP_UNDO_WINDOW_MS) || 6000;
                    const timer = setTimeout(() => { try { finalizeRemoveLog(confirm.id); } catch (e) { console.error(e); } setPendingDeletes((s) => s.filter((p) => p.id !== confirm.id)); }, UNDO_MS);
                    setPendingDeletes((s) => [...s, { id: confirm.id, timer }]);
                  } catch (e) {
                    console.error('audit delete failed', e);
                  }
                  setConfirm({ open: false, id: null, title: '', message: '' });
                }}>Delete</button>
              </div>
          </div>
        </div>
      )}

      {/* Undo toast for recently removed audit logs */}
      {pendingDeletes.length > 0 && (
        <div className="fixed right-4 bottom-4 z-50 space-y-2">
          {pendingDeletes.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-white rounded-md px-3 py-2 shadow ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <div className="text-sm text-slate-700 dark:text-slate-100">Audit log removed</div>
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
