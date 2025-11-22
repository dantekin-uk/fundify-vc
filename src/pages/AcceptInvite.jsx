import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, addDoc, collection, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function AcceptInvite() {
  const { orgId, token } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { switchOrg } = useOrg();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [resolvedOrgId, setResolvedOrgId] = useState(orgId);
  // Prevent double acceptance loops when user is already authenticated
  const [autoAcceptTried, setAutoAcceptTried] = useState(false);
  const friendlyRole = (r) => (r === 'financial_officer' || r === 'finance') ? 'Finance' : (r === 'admin' ? 'Admin' : 'Viewer');

  const looksLikeEmail = (s) => typeof s === 'string' && s.includes('@');
  const looksLikeId = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{8,}$/.test(s) && s.length > 8;
  const safeOrgName = (name, fallback) => {
    if (name && typeof name === 'string' && !looksLikeEmail(name) && !looksLikeId(name) && name.trim().length) return name;
    if (fallback && typeof fallback === 'string' && !looksLikeEmail(fallback) && !looksLikeId(fallback) && fallback.trim().length) return fallback;
    return 'Organization';
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Try reading a top-level invite doc by token first
        let orgRefId = orgId;
        try {
          const topInviteRef = doc(db, 'invites', token);
          const topInviteSnap = await getDoc(topInviteRef);
          if (topInviteSnap.exists()) {
            const topData = topInviteSnap.data();
            // Check expiry of top-level invite
            if (topData?.expiresAt && new Date() > new Date(topData.expiresAt)) {
              setError('This invitation has expired.');
              setLoading(false);
              return;
            }
            orgRefId = topData.orgId || orgRefId;
            setResolvedOrgId(orgRefId);
          }
        } catch (e) {
          // ignore top-level invite read errors and fallback to org document
        }

        const ref = doc(db, 'orgs', orgRefId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          // If org doc is missing but top-level invite exists, still show invite details
          try {
            const topInviteRef = doc(db, 'invites', token);
            const topInviteSnap = await getDoc(topInviteRef);
            if (topInviteSnap.exists()) {
              const topData = topInviteSnap.data();
              if (topData?.expiresAt && new Date() > new Date(topData.expiresAt)) {
                setError('This invitation has expired.');
                setLoading(false);
                return;
              }
              setOrgName(safeOrgName(topData?.organization, orgRefId));
              setInvite(topData);
              setLoading(false);
              return;
            }
          } catch {}
          setError('Organization not found');
          setLoading(false);
          return;
        }
        const data = snap.data();
        setOrgName(safeOrgName(data?.name, orgRefId));
        const invs = Array.isArray(data.invites) ? data.invites : [];
        const found = invs.find((i) => i.token === token) || null;
        if (!found) {
          // Fall back to top-level invite if not present in org doc
          try {
            const topInviteRef = doc(db, 'invites', token);
            const topInviteSnap = await getDoc(topInviteRef);
            if (topInviteSnap.exists()) {
              const topData = topInviteSnap.data();
              if (topData?.expiresAt && new Date() > new Date(topData.expiresAt)) {
                setError('This invitation has expired.');
                setLoading(false);
                return;
              }
              setInvite(topData);
              setLoading(false);
              return;
            }
          } catch {}
          setError('Invalid or expired invite link');
          setLoading(false);
          return;
        }
        // If invite in org doc has expiry, validate it
        if (found?.expiresAt && new Date() > new Date(found.expiresAt)) {
          setError('This invitation has expired.');
          setLoading(false);
          return;
        }
        setInvite(found);
      } catch (e) {
        // Friendly handling for permission errors: if unauthenticated, prompt to sign in
        const msg = (e?.code === 'permission-denied' || (e?.message || '').toLowerCase().includes('permission'))
          ? 'Please sign in with the invited email to view and accept this invite.'
          : e?.message || 'Failed to load invite';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, token, user]);

  // Auto-accept invite for authenticated users to streamline the flow from invite -> login -> portal
  useEffect(() => {
    // Conditions to auto-accept:
    // - not loading
    // - we have an invite object
    // - user is authenticated
    // - we have not already attempted auto-accept
    // - no error present
    if (loading) return;
    if (!invite || !user) return;
    if (autoAcceptTried || accepted) return;
    if (error) return;

    // If invite specifies an email, ensure it matches the signed-in user
    if (invite?.email && user?.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      // Do not auto-accept on mismatch; user will see the mismatch UI
      return;
    }

    // Attempt auto-accept once
    setAutoAcceptTried(true);
    // Fire and forget; internal state and navigation are handled in accept()
    accept().catch(() => {
      // swallow errors here; the page already provides manual accept button and error messaging
    });
  }, [loading, invite, user, autoAcceptTried, accepted, error]);

  const accept = async () => {
    if (!user) {
      // For unauthenticated users, the create account button is already shown above
      return;
    }

    // Ensure the signed-in user matches the invited email
    if (invite?.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      setError('You must be signed in as the invited email to accept this invitation. Please sign out and sign in with the invited email.');
      return;
    }

    try {
      setLoading(true);
      const ref = doc(db, 'orgs', resolvedOrgId);
      let snap = await getDoc(ref);
      let data = snap.exists() ? (snap.data() || {}) : {};
      // If org doc doesn't exist, create a minimal one so the invite can be accepted
      if (!snap.exists()) {
        const base = {
        name: safeOrgName(invite?.organization, resolvedOrgId),
          createdAt: new Date().toISOString(),
          members: [],
          memberships: [],
          invites: invite ? [invite] : [],
        };
        await setDoc(ref, base);
        snap = await getDoc(ref);
        data = snap.exists() ? (snap.data() || {}) : base;
      }
      const invs = Array.isArray(data.invites) ? data.invites : [];
      const inv = invs.find((i) => i.token === token) || invite;
      if (!inv) throw new Error('Invalid or expired invite');
      const memberships = Array.isArray(data.memberships) ? data.memberships : [];
      const already = memberships.some((m) => m.userId === user.id);

      const roleNormalized = (inv.role === 'finance') ? 'financial_officer' : (inv.role || 'viewer');
      const newMembership = { userId: user.id, email: user.email || '', role: roleNormalized, addedAt: new Date().toISOString() };

      const nextMemberships = already
        ? memberships.map((m) => (m.userId === user.id ? { ...m, role: roleNormalized || m.role } : m))
        : [...memberships, newMembership];
      const nextMembers = Array.isArray(data.members) ? (already ? data.members : Array.from(new Set([...(data.members || []), user.id]))) : [user.id];
      const nextInvites = invs.filter((i) => i.token !== token);

      // create or update funder entry for this user so they have a portal
      // This ensures funder details are retained and can be matched by email in DonorDashboard
      try {
        const funderEmail = user?.email || invite?.email || '';
        const funderObj = {
          id: user?.id || `funder-${Date.now()}`,
          name: invite?.name || user?.displayName || funderEmail.split('@')[0] || 'Funder',
          email: funderEmail,
          contact: funderEmail, // Add contact field for matching in DonorDashboard (byFunder.find(f => f?.funder?.contact === user?.email))
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const existingFunders = Array.isArray(data.funders) ? data.funders : [];
        const nextFunders = [
          // keep other funders but replace any existing with same id
          ...existingFunders.filter((f) => f && f.id !== funderObj.id),
          funderObj,
        ];

        await updateDoc(ref, {
          memberships: nextMemberships,
          members: nextMembers,
          invites: nextInvites,
          funders: nextFunders,
          orgSettings: { ...(data.orgSettings || {}), currency: 'KES' },
        });

        // Also remove top-level invite doc if present
        try { await deleteDoc(doc(db, 'invites', token)); } catch (e) { /* non-fatal */ }

        // send confirmation email with direct portal link (if mail trigger configured)
        try {
          const portalLink = `${window.location.origin}/app/donor-dashboard/${funderObj.id}`;
          const subject = `${orgName}: your funder portal is ready`;
          const mail = {
            to: [funderObj.email || invite?.email].filter(Boolean),
            message: {
              subject,
              text: `Your funder portal is ready. Open: ${portalLink}`,
              html: `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <h3 style="color:#0f172a">Welcome to ${orgName}</h3>
                <p>Your funder portal has been created. Click the button below to open your portal and view contributions, projects, and invoices.</p>
                <p style="margin:18px 0"><a href="${portalLink}" style="background:#0ea5e9;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;">Open your funder portal</a></p>
                <p style="font-size:13px;color:#6b7280">If the button doesn't work, copy and paste this link into your browser: <br/><a href="${portalLink}" style="color:#0ea5e9">${portalLink}</a></p>
              </div>`,
            },
          };
          if ((mail.to || []).length) {
            await addDoc(collection(db, 'mail'), mail);
          }
        } catch (mailErr) {
          console.warn('Failed to enqueue funder portal email', mailErr);
        }

        // set active organization to ensure realtime data loads from the correct org
        try { switchOrg(resolvedOrgId); } catch {}
        // redirect funder directly to donor dashboard (no delay, use replace to prevent back navigation)
        setAccepted(true);
        // Use replace: true and immediate navigation to prevent any intermediate redirects
        navigate(`/donor/dashboard/${funderObj.id}`, { replace: true });
        return;
      } catch (e) {
        // If creating funder fails, still proceed with memberships update and redirect to dashboard
        try {
          await updateDoc(ref, {
            memberships: nextMemberships,
            members: nextMembers,
            invites: nextInvites,
            orgSettings: { ...(data.orgSettings || {}), currency: 'KES' },
          });
          try { await deleteDoc(doc(db, 'invites', token)); } catch (e2) { /* non-fatal */ }
        } catch (e2) {
          console.error('Failed to finalize invite acceptance', e2);
        }

        setAccepted(true);
        // Redirect immediately to prevent seeing admin dashboard
        navigate(`/donor/dashboard/${user?.id || 'me'}`, { replace: true });
        return;
      }
    } catch (e) {
      const msg = (e?.message || '').toLowerCase();
      const isPerm = e?.code === 'permission-denied' || msg.includes('permission') || msg.includes('insufficient');
      if (isPerm) {
        try {
          // Soft-accept fallback: switch org and redirect so the invited user can proceed.
          try { switchOrg(resolvedOrgId); } catch {}
          const fallbackFunderId = user?.id || `funder-${Date.now()}`;
          setAccepted(true);
          // Redirect immediately to prevent seeing admin dashboard
          navigate(`/donor/dashboard/${fallbackFunderId}`, { replace: true });
          return;
        } catch (_) {
          // If even fallback navigation fails, show a friendly error.
          setError('Invite accepted, but we could not finalize membership due to permissions. Please ask an admin to confirm your access.');
        }
      } else {
        setError(e?.message || 'Failed to accept invite');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      // After sign out redirect to register so they can sign in with invited email
      navigate(`/register?orgId=${orgId}&token=${token}${invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ''}${invite?.name ? `&name=${encodeURIComponent(invite.name)}` : ''}&redirect=${encodeURIComponent('/donor/funding')}`);
    } catch (e) {
      setError('Failed to sign out.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
          Accept Invitation
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          {invite ? `Join ${orgName || 'this organization'} to continue` : 'Join the organization and start collaborating.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading invitation details...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {!loading && (!error || !user) && (
            <div className="space-y-6">
              {!user ? (
                // Show this for unauthenticated users
                <div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      You're invited to join {orgName || 'this organization'}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {invite?.email 
                        ? `Sign in or create an account with ${invite.email} to accept this invitation.`
                        : 'Sign in or create an account to accept this invitation.'}
                    </p>
                    {invite?.email && (
                      <div className="mt-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded-md inline-block text-sm">
                        Invited email: <span className="font-medium">{invite.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3">
                    <Link
                      to={`/register?orgId=${orgId}&token=${token}${invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ''}${invite?.name ? `&name=${encodeURIComponent(invite.name)}` : ''}&redirect=${encodeURIComponent(window.location.pathname)}`}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                    >
                      Create account
                    </Link>
                    <div className="relative mt-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                          or
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              ) : (
                // Show this for authenticated users
                <div>
                  {invite ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          Accept Invitation
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          You're invited to join <span className="font-medium">{orgName}</span> as <span className="font-semibold">{friendlyRole(invite.role)}</span>.
                        </p>
                      </div>

                      {invite?.email && invite.email.toLowerCase() !== (user.email || '').toLowerCase() ? (
                        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                Email Mismatch
                              </h3>
                              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                                <p>
                                  You're signed in as <span className="font-medium">{user.email}</span>, but this invite was sent to <span className="font-medium">{invite.email}</span>.
                                </p>
                              </div>
                              <div className="mt-4">
                                <div className="-mx-2 -my-1.5 flex">
                                  <button
                                    type="button"
                                    onClick={handleSignOut}
                                    className="rounded-md bg-yellow-50 dark:bg-yellow-900/50 px-2 py-1.5 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/70 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50 dark:focus:ring-offset-yellow-900/30"
                                  >
                                    Sign out and use {invite.email}
                                  </button>
                                  <Link
                                    to="/login"
                                    className="ml-3 rounded-md bg-yellow-50 dark:bg-yellow-900/50 px-2 py-1.5 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/70 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50 dark:focus:ring-offset-yellow-900/30"
                                  >
                                    Switch account
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <button
                            onClick={accept}
                            disabled={accepted}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${accepted ? 'bg-green-600 hover:bg-green-700' : 'bg-sky-600 hover:bg-sky-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500`}
                          >
                            {accepted ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Accepting...
                              </>
                            ) : 'Accept Invitation'}
                          </button>
                          {accepted && (
                            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                              Invitation accepted! Redirecting you now...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // No invite data available
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Invitation Not Found
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        We couldn't find the invitation details. The link may be expired or invalid.
                      </p>
                      <div className="mt-6">
                        <Link
                          to="/"
                          className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
                        >
                          Return to home
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
