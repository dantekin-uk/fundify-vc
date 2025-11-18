import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DonorSettings() {
  const { user, updateUser, resetPassword } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [notif, setNotif] = useState(true);
  const [msg, setMsg] = useState('');

  const save = async () => {
    await updateUser({ name });
    setMsg('Profile updated');
  };

  const changePassword = async () => {
    if (!user?.email) return;
    const res = await resetPassword(user.email);
    setMsg(res?.success ? 'Password reset email sent' : (res?.error || 'Failed to send reset email'));
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Account Settings</h2>

      {msg && <div className="text-sm text-emerald-600">{msg}</div>}

      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5 space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Full Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded p-2 ring-1 ring-slate-300 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm" />
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={notif} onChange={e=>setNotif(e.target.checked)} /> Email Notifications</label>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="px-4 py-2 text-sm rounded bg-sky-600 text-white">Save</button>
          <button onClick={changePassword} className="px-4 py-2 text-sm rounded ring-1 ring-slate-300 dark:ring-slate-700">Change Password</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
        <h3 className="text-sm font-semibold mb-2">Connected Organizations</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">Coming soon.</p>
      </div>
    </div>
  );
}
