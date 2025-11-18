import { useEffect, useMemo, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Members() {
  const { activeOrg, role, inviteMember, revokeInvite, updateMemberRole, restoreMemberRole, removeMember } = useOrg();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('financial_officer');
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);

  const invites = useMemo(() => Array.isArray(activeOrg?.invites) ? activeOrg.invites : [], [activeOrg?.invites]);
  const memberships = useMemo(() => Array.isArray(activeOrg?.memberships) ? activeOrg.memberships : [], [activeOrg?.memberships]);

  const isAdmin = role === 'admin';

  const onInvite = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const res = await inviteMember(email, inviteRole);
    setSending(false);
    if (res?.success) {
      setInviteLink(res.link || '');
      setEmail('');
    } else {
      alert(res?.error || 'Failed to send invite');
    }
  };

  const onRevoke = async (idOrToken) => {
    const ok = await revokeInvite(idOrToken);
    if (!ok?.success) alert(ok?.error || 'Failed to revoke invite');
  };

  const onChangeRole = async (uid, newRole) => {
    if (!isAdmin) return;
    if (uid === user?.id && newRole !== 'admin') {
      alert('You cannot change your own admin role. Ask another admin to modify your role.');
      return;
    }
    const res = await updateMemberRole(uid, newRole);
    if (!res?.success) alert(res?.error || 'Failed to update role');
  };

  const onRemove = async (uid) => {
    if (!isAdmin) return;
    if (!window.confirm('Remove this member from the organization?')) return;
    const res = await removeMember(uid);
    if (!res?.success) alert(res?.error || 'Failed to remove member');
  };

  const friendlyRole = (r) => {
    if (r === 'admin') return 'Admin';
    if (r === 'finance' || r === 'financial_officer') return 'Finance';
    return 'Viewer';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">Accounts</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Invite accounts and manage access for your organization.</p>
        </div>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" placeholder="person@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Role</label>
                <select value={inviteRole} onChange={(e)=>setInviteRole(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                  <option value="admin">Admin</option>
                  <option value="financial_officer">Finance</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="md:self-end">
                <button type="submit" disabled={sending} className="inline-flex items-center px-4 py-2 rounded-md text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 shadow-sm">{sending ? 'Sending…' : 'Send invite'}</button>
              </div>
            </form>
            {inviteLink && (
              <div className="mt-3 text-sm"><span className="text-slate-500 dark:text-slate-400">Share invite link:</span> <a href={inviteLink} className="text-sky-600 underline" target="_blank" rel="noreferrer">{inviteLink}</a></div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Email</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Role</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {invites.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-slate-200">{i.email}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-300">{friendlyRole(i.role)}</td>
                      <td className="px-3 py-2 text-sm">
                        {isAdmin ? (
                          <button onClick={()=>onRevoke(i.id)} className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm shadow-sm">Revoke</button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={3}>No pending invites.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">User</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Role</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {memberships.map((m) => (
                    <tr key={m.userId}>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-slate-200">{m.email || m.userId}</td>
                      <td className="px-3 py-2 text-sm">
                        {isAdmin ? (
                          <select value={m.role === 'finance' ? 'financial_officer' : m.role} onChange={(e)=>onChangeRole(m.userId, e.target.value)} className="border border-gray-200 rounded px-2 py-1 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                            <option value="admin">Admin</option>
                            <option value="financial_officer">Finance</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="text-gray-500 dark:text-slate-300">{friendlyRole(m.role)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setHistoryUser(m.userId); setHistoryOpen(true); }} className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm">History</button>
                            {m.userId !== user?.id ? (
                              <button onClick={()=>onRemove(m.userId)} className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm shadow-sm">Remove</button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {memberships.length === 0 && (
                    <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={3}>No members yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-6 dark:bg-slate-900/90 dark:border-slate-700 dark:text-slate-100">
            <h3 className="text-lg font-semibold">Role history</h3>
            <div className="mt-4">
              {Array.isArray(activeOrg?.roleHistory) ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {activeOrg.roleHistory.filter((h) => h.userId === historyUser).map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-md ring-1 ring-gray-100 bg-white dark:ring-slate-700 dark:bg-slate-800/80">
                      <div>
                        <div className="text-sm"><strong>{h.previousRole || 'none'}</strong> → <strong>{h.newRole}</strong></div>
                        <div className="text-xs text-slate-500">Changed by: {h.byEmail || h.by} — {new Date(h.at).toLocaleString()}</div>
                      </div>
                      <div>
                        <button onClick={async () => {
                          const ok = await restoreMemberRole(historyUser, h.id);
                          if (!ok?.success) alert(ok?.error || 'Failed to restore role');
                          else {
                            alert('Role restored');
                            setHistoryOpen(false);
                          }
                        }} className="px-3 py-1 rounded-md bg-sky-700 hover:bg-sky-800 text-white text-sm">Restore</button>
                      </div>
                    </div>
                  ))}
                  {activeOrg.roleHistory.filter((h) => h.userId === historyUser).length === 0 && <div className="text-sm text-slate-500">No role history for this user.</div>}
                </div>
              ) : <div className="text-sm text-slate-500">No role history available.</div>}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setHistoryOpen(false)} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
