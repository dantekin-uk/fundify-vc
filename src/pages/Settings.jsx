import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { useTheme } from '../context/ThemeContext';
import FormInput from '../components/FormInput';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { orgs, activeOrg, switchOrg } = useOrg();
  const { isDark, toggleTheme } = useTheme();

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [orgSettings, setOrgSettings] = useState({ currency: user?.orgSettings?.currency || 'USD' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateUser({ name: profile.name });
      alert('Profile saved');
    } catch (e) {
      console.error(e);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveOrg = async () => {
    setSaving(true);
    try {
      await updateUser({ orgSettings });
      alert('Organization settings updated');
    } catch (e) {
      console.error(e);
      alert('Failed to save organization settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-slate-100">Settings</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your profile, organization settings and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <FormInput label="Name" id="settings-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <FormInput label="Email" id="settings-email" value={profile.email} disabled />
            <div className="flex items-center justify-end">
              <button onClick={saveProfile} disabled={saving} className="px-4 py-2 rounded-md bg-sky-700 text-white">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Active organization</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100" value={activeOrg?.id || ''} onChange={(e) => switchOrg(e.target.value)}>
                {orgs && orgs.map((o) => (<option key={o.id} value={o.id}>{o.name || o.id}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Currency</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100" value={orgSettings.currency} onChange={(e) => setOrgSettings({ ...orgSettings, currency: e.target.value })}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="KES">KES (KSh)</option>
                <option value="NGN">NGN (₦)</option>
              </select>
            </div>
            <div className="mt-4 flex items-center justify-end">
              <button onClick={saveOrg} disabled={saving} className="px-4 py-2 rounded-md bg-sky-700 text-white">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Theme</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Choose light or dark appearance</div>
              </div>
              <div>
                <button onClick={toggleTheme} className="px-3 py-2 rounded-md bg-white border border-gray-200 dark:bg-slate-800 dark:text-slate-100">
                  {isDark ? 'Switch to light' : 'Switch to dark'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600 dark:text-slate-400">Manage authentication settings from your identity provider (password reset, 2FA). For password reset, use the forgot password flow on the login page.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
