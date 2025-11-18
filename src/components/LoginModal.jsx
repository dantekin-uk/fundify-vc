import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormInput from './FormInput';

export default function LoginModal({ onClose }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Please fill in both fields');
    try {
      setLoading(true);
      const { success, error: msg } = await login(email, password);
      if (success) {
        onClose?.();
        navigate('/app/dashboard/overview');
      } else {
        setError(msg || 'Login failed');
      }
    } catch (e) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-700 dark:text-slate-100">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Sign in</h3>
          <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">Enter your credentials to continue</p>

          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700 dark:bg-rose-900/20 dark:border-rose-700 dark:text-rose-300">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <FormInput id="modal-email" label="Email address" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <FormInput id="modal-password" label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <div className="flex items-center justify-end space-x-2">
              <button type="button" onClick={onClose} className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-100">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-md button-brand disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
