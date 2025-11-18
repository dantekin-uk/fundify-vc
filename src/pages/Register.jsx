import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import FormInput from '../components/FormInput';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const Register = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orgIdParam = params.get('orgId');
  const tokenParam = params.get('token');
  const preName = params.get('name') || '';
  const preEmail = params.get('email') || '';
  const redirectTo = params.get('redirect') || null;
  const invitedEmail = preEmail || null;

  const [formData, setFormData] = useState({
    name: preName,
    email: preEmail,
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, login } = useAuth();
  const { switchOrg } = useOrg();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    // If email is locked by an invite, prevent changes
    if (name === 'email' && invitedEmail) return;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const { name, email, password, confirmPassword } = formData;
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      const { success, error: registerError, user: createdUser } = await register({
        name,
        email,
        password,
      }, (new URLSearchParams(location.search)).get('orgId') ? { profile: { hasCompletedSetup: true, isUserProfile: true }, createProfile: true } : {});

      if (success) {
        // Try to auto-login the newly created user so invite acceptance can proceed without extra steps
        try {
          await login(email, password);
        } catch (loginErr) {
          console.warn('Auto-login after registration failed:', loginErr?.message || loginErr);
        }

        // If there's an invite in URL params, try to accept it for the newly created user
        try {
          const params = new URLSearchParams(location.search);
          const orgId = params.get('orgId');
          const token = params.get('token');
          if (orgId && token && createdUser) {
            // load org invite and apply membership
            const ref = doc(db, 'orgs', orgId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data();
              const invs = Array.isArray(data.invites) ? data.invites : [];
              const inv = invs.find((i) => i.token === token);
              if (inv) {
                const registeredUserId = createdUser.id;
                // ensure emails match when invite.email is present
                if (inv.email && inv.email.toLowerCase() !== (createdUser.email || '').toLowerCase()) {
                  setError('Your account email does not match the invited email. Please sign in with the invited email to accept.');
                  navigate('/login');
                  return;
                }

                const memberships = Array.isArray(data.memberships) ? data.memberships : [];
                const already = memberships.some((m) => m.userId === registeredUserId);
                const roleNormalized = (inv.role === 'finance') ? 'financial_officer' : (inv.role || 'viewer');
                const newMembership = { userId: registeredUserId, email: createdUser.email || '', role: roleNormalized, addedAt: new Date().toISOString() };
                const nextMemberships = already
                  ? memberships.map((m) => (m.userId === registeredUserId ? { ...m, role: roleNormalized || m.role } : m))
                  : [...memberships, newMembership];
                const nextMembers = Array.isArray(data.members) ? (already ? data.members : Array.from(new Set([...(data.members || []), registeredUserId]))) : [registeredUserId];
                const nextInvites = invs.filter((i) => i.token !== token);

                console.log('Register: Accepting invitation for user:', registeredUserId, 'org:', orgId);
                console.log('Register: New membership:', newMembership);
                console.log('Register: Next memberships:', nextMemberships);
                console.log('Register: Next members:', nextMembers);

                // Build funder object for this user so they have a portal
                const funderObj = {
                  id: registeredUserId,
                  name: inv?.name || (createdUser.email || '').split('@')[0] || 'Funder',
                  email: createdUser.email || inv?.email || '',
                  status: 'active',
                  createdAt: new Date().toISOString(),
                };

                const existingFunders = Array.isArray(data.funders) ? data.funders : [];
                const nextFunders = [
                  // keep other funders but replace any existing with same id
                  ...existingFunders.filter((f) => f && f.id !== funderObj.id),
                  funderObj,
                ];

                // include funders in the org update so membership and funder creation are atomic-ish
                await updateDoc(ref, {
                  memberships: nextMemberships,
                  members: nextMembers,
                  invites: nextInvites,
                  funders: nextFunders,
                });

                console.log('Register: Successfully updated organization with new member and funder');

                // Set the active organization to the one they were invited to
                switchOrg(orgId);
                console.log('Register: Switched to organization:', orgId);

                // After successful invite acceptance during registration, redirect the user to donor dashboard or to any redirect specified in the URL
                // Use replace: true to prevent intermediate redirects through admin dashboard
                if (redirectTo) {
                  navigate(redirectTo, { replace: true });
                } else {
                  navigate(`/donor/dashboard/${registeredUserId}`, { replace: true });
                }
                return;
              }
            }
          }
        } catch (e) {
          console.error('Accept invite after signup failed', e);
          // Permission-safe fallback: still switch to invited org and take user to donor dashboard
          // Use replace: true to prevent intermediate redirects
          try {
            const orgId = new URLSearchParams(location.search).get('orgId');
            if (orgId) switchOrg(orgId);
            const fallbackId = (createdUser && createdUser.id) ? createdUser.id : 'me';
            navigate(`/donor/dashboard/${fallbackId}`, { replace: true });
            return;
          } catch (_) {}
        }

        // No invite flow or invite handling failed — send new users to setup or the provided redirect
        if (redirectTo) {
          navigate(redirectTo);
        } else {
          const paramsFinal = new URLSearchParams(location.search);
          const finalOrgId = paramsFinal.get('orgId');
          if (finalOrgId) {
            // If an orgId is present but invite handling did not redirect, still switch and show donor dashboard
            try { switchOrg(finalOrgId); } catch {}
            navigate(`/donor/dashboard/${(createdUser && createdUser.id) ? createdUser.id : 'me'}`, { replace: true });
          } else {
            navigate(`/donor/dashboard/${(createdUser && createdUser.id) ? createdUser.id : 'me'}`, { replace: true });
          }
        }
      } else {
        setError(registerError || 'Failed to register. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-base bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-blue-100 py-12 px-4 sm:px-6 lg:px-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-300">
            Or{' '}
            <Link
              to="/login"
              className="font-medium brand-text hover:underline"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 dark:bg-rose-900/20 dark:border-rose-700">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-rose-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* If arriving from an invite, ask for user full name instead of organization name */}
              {!(orgIdParam && tokenParam) ? (
                <FormInput id="name" name="name" type="text" required label="Organization Name" value={formData.name} onChange={handleChange} />
              ) : (
                <FormInput id="name" name="name" type="text" required label="Your Name" value={formData.name} onChange={handleChange} />
              )}

              <FormInput id="email" name="email" type="email" autoComplete="email" required label="Email address" value={formData.email} onChange={handleChange} disabled={!!invitedEmail} />
              <FormInput id="password" name="password" type="password" required label="Password" value={formData.password} onChange={handleChange} minLength="8" />
              <FormInput id="confirmPassword" name="confirmPassword" type="password" required label="Confirm Password" value={formData.confirmPassword} onChange={handleChange} minLength="8" />
              <div>
                <Button type="submit" disabled={isLoading} className="w-full justify-center" variant="primary">
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 dark:bg-slate-900 dark:text-slate-400">Already have an account?</span>
                </div>
              </div>
              <div className="mt-6">
                <Link to="/login" className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none dark:border-slate-700 dark:text-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
                  Sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
