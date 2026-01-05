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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
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
    
    // Enhanced password validation for fintech security
    if (password.length < 12) {
      setError('Password must be at least 12 characters long');
      return;
    }
    
    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return;
    }
    
    // Legal compliance checkboxes
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Please accept the Terms of Service and Privacy Policy to continue');
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
        // Show email verification notice
        if (registerError === undefined) {
          // Email verification was sent - show notice but don't block
          // User can still proceed but should verify email
        }
        
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

                // Only create funder object if the invite role is specifically for a funder/viewer
                // Don't create funder objects for admin/financial_officer invites - they're org members, not funders
                const isFunderInvite = roleNormalized === 'viewer' || inv.role === 'funder' || (!inv.role && roleNormalized === 'viewer');
                const existingFunders = Array.isArray(data.funders) ? data.funders : [];
                let nextFunders = existingFunders;
                
                if (isFunderInvite) {
                  // Build funder object for this user so they have a portal
                  // Include 'contact' field for matching in DonorDashboard
                  const funderEmail = createdUser.email || inv?.email || '';
                  const funderObj = {
                    id: registeredUserId,
                    name: inv?.name || funderEmail.split('@')[0] || 'Funder',
                    email: funderEmail,
                    contact: funderEmail, // Critical: used by DonorDashboard to identify funder
                    status: 'active',
                    createdAt: new Date().toISOString(),
                  };

                  nextFunders = [
                    // keep other funders but replace any existing with same id OR same email to prevent duplicates
                    ...existingFunders.filter((f) => {
                      if (!f) return false;
                      // Remove if same ID
                      if (f.id === funderObj.id) return false;
                      // Remove if same email (to prevent duplicates)
                      if (f.email && funderObj.email && f.email.toLowerCase() === funderObj.email.toLowerCase()) return false;
                      if (f.contact && funderObj.contact && f.contact.toLowerCase() === funderObj.contact.toLowerCase()) return false;
                      return true;
                    }),
                    funderObj,
                  ];
                } else {
                  // For admin/financial_officer invites, make sure they're NOT in funders array
                  nextFunders = existingFunders.filter((f) => f && f.id !== registeredUserId);
                }

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

                // After successful invite acceptance during registration, redirect based on role
                // Use replace: true to prevent intermediate redirects
                if (redirectTo) {
                  navigate(redirectTo, { replace: true });
                } else {
                  // Redirect based on role: funders go to donor dashboard, admins/financial officers go to org dashboard
                  if (isFunderInvite) {
                    navigate(`/donor/dashboard/${registeredUserId}`, { replace: true });
                  } else {
                    // Admin or financial officer should go to organization dashboard
                    navigate('/app/dashboard/overview', { replace: true });
                  }
                }
                return;
              }
            }
          }
        } catch (e) {
          console.error('Accept invite after signup failed', e);
          // Permission-safe fallback: switch to invited org and take user to setup or org dashboard
          // Use replace: true to prevent intermediate redirects
          try {
            const orgId = new URLSearchParams(location.search).get('orgId');
            if (orgId) {
              switchOrg(orgId);
              // Go to setup first, then org dashboard - NOT donor dashboard
              navigate('/setup', { replace: true });
            } else {
              // No orgId means new org creator - go to setup
              navigate('/setup', { replace: true });
            }
            return;
          } catch (_) {}
        }

        // No invite flow or invite handling failed — send new organization creators to setup
        // New users creating their own organization should NOT go to donor dashboard
        // They should go to setup first, then organization dashboard
        if (redirectTo) {
          navigate(redirectTo);
        } else {
          // Check if this is an invited user (has orgId in URL but no token means partial invite)
          const paramsFinal = new URLSearchParams(location.search);
          const finalOrgId = paramsFinal.get('orgId');
          
          if (finalOrgId && tokenParam) {
            // This was an invite flow that failed - still try to switch org
            try { switchOrg(finalOrgId); } catch {}
            // But redirect to setup or org dashboard, not donor dashboard
            navigate('/setup', { replace: true });
          } else {
            // This is a NEW organization creator (no invite)
            // They should go to setup, NOT donor dashboard
            // The org was created with their UID, so they're the owner/admin
            navigate('/setup', { replace: true });
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
            
            {/* Email verification notice */}
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 dark:bg-blue-900/20 dark:border-blue-700">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Email Verification:</strong> After registration, please check your email and verify your account to access all features.
                  </p>
                </div>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* If arriving from an invite, ask for user full name instead of organization name */}
              {!(orgIdParam && tokenParam) ? (
                <FormInput id="name" name="name" type="text" required label="Organization Name" value={formData.name} onChange={handleChange} />
              ) : (
                <FormInput id="name" name="name" type="text" required label="Your Name" value={formData.name} onChange={handleChange} />
              )}

              <FormInput id="email" name="email" type="email" autoComplete="email" required label="Email address" value={formData.email} onChange={handleChange} disabled={!!invitedEmail} />
              <FormInput id="password" name="password" type="password" required label="Password" value={formData.password} onChange={handleChange} minLength="12" />
              {formData.password && (
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                  <div className="flex items-center gap-2">
                    <span className={formData.password.length >= 12 ? 'text-green-600' : 'text-gray-400'}>✓ 12+ characters</span>
                    <span className={/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}>✓ Uppercase</span>
                    <span className={/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}>✓ Lowercase</span>
                    <span className={/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}>✓ Number</span>
                    <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}>✓ Special</span>
                  </div>
                </div>
              )}
              <FormInput id="confirmPassword" name="confirmPassword" type="password" required label="Confirm Password" value={formData.confirmPassword} onChange={handleChange} minLength="12" />
              
              {/* Legal compliance checkboxes */}
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1"
                    required
                  />
                  <span className="text-gray-700 dark:text-slate-300">
                    I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Terms of Service</a>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-1"
                    required
                  />
                  <span className="text-gray-700 dark:text-slate-300">
                    I accept the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a>
                  </span>
                </label>
              </div>
              
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
