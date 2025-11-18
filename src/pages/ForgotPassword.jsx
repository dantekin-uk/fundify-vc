import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormInput from '../components/FormInput';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      const res = await resetPassword(email);
      if (res?.success) {
        setMessage('If an account exists for this email, a password reset link has been sent.');
      } else {
        setError(res?.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Failed to send reset email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-base bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">Reset your password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Remembered it?{' '}<Link to="/login" className="font-medium brand-text hover:underline">Back to sign in</Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Forgot password</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {message && (
              <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-400 p-4">
                <p className="text-sm text-emerald-700">{message}</p>
              </div>
            )}
            <form className="space-y-6" onSubmit={onSubmit}>
              <FormInput id="email" name="email" type="email" label="Email address" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              <div>
                <Button type="submit" disabled={loading} className="w-full justify-center">
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
