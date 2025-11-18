import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormInput from '../components/FormInput';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { search } = window.location;
  const params = new URLSearchParams(search);
  const redirectTo = params.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const { success, error: loginError } = await login(email, password);

      if (success) {
        // If a redirect URL is specified in the params, use it
        // Otherwise, navigate to the app dashboard, and let FunderRedirect handle role-based routing
        const destination = redirectTo && redirectTo !== '/' ? redirectTo : '/app/dashboard/overview';
        navigate(destination);
      } else {
        setError(loginError || 'Failed to log in. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-base bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-blue-100 py-12 px-4 sm:px-6 lg:px-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-300">
            Or{' '}
            <Link
              to="/register"
              className="font-medium brand-text hover:underline"
            >
              create a new account
            </Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 dark:bg-rose-900/20 dark:border-rose-700">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-500 dark:text-amber-300"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-rose-300">{error}</p>
                </div>
              </div>
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 brand-emerald focus:ring-0 border-gray-300 rounded dark:border-slate-600"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900 dark:text-slate-100"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot" className="font-medium brand-text hover:underline dark:text-slate-200">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <Button type="submit" disabled={isLoading} className="w-full justify-center" variant="primary">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
