import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeOrg, setActiveOrg] = useState(null);
  const [currency, setCurrency] = useState('KES');
  const [role, setRole] = useState('viewer');

  // EmailJS runtime loader (CDN) — avoids adding npm dependency
  let emailJsLoaded = false;
  const ensureEmailJs = () => new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.emailjs) {
      resolve(window.emailjs);
      return;
    }
    if (emailJsLoaded) {
      // give the global a moment
      const check = () => resolve(window.emailjs);
      setTimeout(check, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.async = true;
    script.onload = () => {
      emailJsLoaded = true;
      resolve(window.emailjs);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  // Helper to ensure org name is a friendly display name (avoid using emails or opaque IDs)
  const looksLikeEmail = (s) => typeof s === 'string' && s.includes('@');
  const looksLikeId = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{8,}$/.test(s) && s.length > 8;
  const safeOrgName = (name, fallback) => {
    if (name && typeof name === 'string' && !looksLikeEmail(name) && !looksLikeId(name) && name.trim().length) return name;
    if (fallback && typeof fallback === 'string' && !looksLikeEmail(fallback) && !looksLikeId(fallback) && fallback.trim().length) return fallback;
    return 'Organization';
  };

  useEffect(() => {
    if (!user?.id) {
      setOrgs([]);
      setActiveOrgId(null);
      setLoading(false);
      setActiveOrg(null);
      setCurrency('KES');
      return;
    }

    let unsubMain = null;
    (async () => {
      try {
        setLoading(true);
        // Try to load org doc with user's id first (legacy single-org flow)
        const primaryRef = doc(db, 'orgs', user.id);
        const primarySnap = await getDoc(primaryRef);
        const results = [];
        if (primarySnap.exists()) {
          const pd = primarySnap.data();
          // Avoid treating a user's personal profile document as an organization when flagged
          if (!pd?.isUserProfile) {
            results.push({ id: primarySnap.id, ...pd });
          }
        }

        // Query other orgs where the user is a member (supports multi-org)
        try {
          const q = query(collection(db, 'orgs'), where('members', 'array-contains', user.id));
          const snaps = await getDocs(q);
          console.log('OrgContext: Found member orgs:', snaps.docs.length);
          snaps.forEach((s) => {
            // avoid duplicate id
            if (!results.find((r) => r.id === s.id)) {
              console.log('OrgContext: Adding member org:', s.id, s.data().name);
              results.push({ id: s.id, ...s.data() });
            }
          });
        } catch (e) {
          // If security rules prevent querying, ignore and fallback to primary only
          console.debug('Member orgs query failed or not permitted', e.message || e);
        }

        setOrgs(results);
        // default active org to first result or user's id
        setActiveOrgId((prev) => prev || (results[0]?.id || user.id));

        // subscribe to active org if it's primary? Also keep fallback to updates of the primary doc
        unsubMain = onSnapshot(doc(db, 'orgs', user.id), (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (data?.isUserProfile) return; // ignore user profile docs
          setOrgs((prev) => {
            const exists = prev.find((p) => p.id === snap.id);
            if (exists) {
              return prev.map((p) => (p.id === snap.id ? { id: snap.id, ...snap.data() } : p));
            }
            return [{ id: snap.id, ...snap.data() }, ...prev];
          });
        });
      } catch (err) {
        console.error('Failed to load orgs for user', err);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (unsubMain) unsubMain();
    };
  }, [user?.id]);

  const switchOrg = (orgId) => {
    setActiveOrgId(orgId);
  };

  // Helper to check if user is a funder in the given org
  const isFunderInOrg = (orgId) => {
    if (!user?.id || !orgId) return false;
    const org = orgs.find(o => o.id === orgId);
    if (!org) return false;
    const funders = Array.isArray(org.funders) ? org.funders : [];
    return funders.some(f => f && f.id === user.id);
  };

  // Helper to check if user is an admin/finance officer in the given org
  const hasAdminRoleInOrg = (orgId) => {
    if (!user?.id || !orgId) return false;
    const org = orgs.find(o => o.id === orgId);
    if (!org) return false;
    const memberships = Array.isArray(org.memberships) ? org.memberships : [];
    const userMembership = memberships.find(m => m && m.userId === user.id);
    return userMembership && (userMembership.role === 'admin' || userMembership.role === 'financial_officer');
  };

  // Keep activeOrg and currency synced with the activeOrgId
  useEffect(() => {
    if (!activeOrgId) {
      setActiveOrg(null);
      return;
    }
    const ref = doc(db, 'orgs', activeOrgId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setActiveOrg(data);
      const cur = data?.orgSettings?.currency || 'KES';
      setCurrency(cur);
      try { localStorage.setItem('finTrackCurrency', cur); } catch (e) {}
      // keep list updated
      setOrgs((prev) => {
        const exists = prev.find((p) => p.id === data.id);
        if (exists) return prev.map((p) => (p.id === data.id ? data : p));
        return [data, ...prev];
      });
      // determine role
      const memberships = Array.isArray(data.memberships) ? data.memberships : [];
      const mine = memberships.find((m) => m.userId === user?.id);
      let computedRole = mine?.role || (data.id === user?.id ? 'admin' : 'viewer');
      if (computedRole === 'finance') computedRole = 'financial_officer';
      setRole(computedRole);
    }, (err) => {
      console.error('Active org subscription failed', err);
    });
    return () => unsub();
  }, [activeOrgId]);

  // Ensure the owner is an admin member of their primary org
  useEffect(() => {
    if (!user?.id || !activeOrg?.id) return;
    if (activeOrg.id !== user.id) return;
    const memberships = Array.isArray(activeOrg.memberships) ? activeOrg.memberships : [];
    const hasSelf = memberships.some((m) => m.userId === user.id);
    if (!hasSelf) {
      (async () => {
        try {
          const ref = doc(db, 'orgs', activeOrg.id);
          await updateDoc(ref, {
            memberships: arrayUnion({ userId: user.id, email: user.email || '', role: 'admin', addedAt: new Date().toISOString() }),
            members: arrayUnion(user.id),
          });
        } catch (e) {
          console.debug('ensureSelfMembership failed', e?.message || e);
        }
      })();
    }
  }, [user?.id, activeOrg?.id]);

  // Helpers for members & invites
  async function inviteMember(email, role = 'viewer') {
    if (!activeOrgId) return { success: false, error: 'No active organization' };
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const normalizedRole = role === 'finance' ? 'financial_officer' : role;
    const inv = { 
      id: token.slice(0, 12), 
      email: String(email).toLowerCase().trim(), 
      role: normalizedRole, 
      token, 
      status: 'pending', 
      invitedBy: user?.id || 'system', 
      createdAt: new Date().toISOString() 
    };

    try {
      const ref = doc(db, 'orgs', activeOrgId);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      
      // Check if user is already a member
      const members = Array.isArray(data.members) ? data.members : [];
      const memberships = Array.isArray(data.memberships) ? data.memberships : [];
      
      // Check if user is already a member with this email
      const existingMember = memberships.find(m => m.email?.toLowerCase() === inv.email);
      if (existingMember) {
        return { 
          success: false, 
          error: `This user is already a member with the role: ${existingMember.role}` 
        };
      }

      // Check for existing invite to this email
      const invites = Array.isArray(data.invites) ? data.invites : [];
      const existingInvite = invites.find(i => i.email === inv.email);
      if (existingInvite) {
        return { 
          success: false, 
          error: 'An invitation has already been sent to this email address' 
        };
      }

      // Add the new invite
      const nextInvites = [inv, ...invites];
      await updateDoc(ref, { invites: nextInvites });

      // Also write a top-level invite doc for unauthenticated acceptance (publicly readable via rules)
      try {
        await setDoc(doc(db, 'invites', inv.token), {
          id: inv.id,
          token: inv.token,
          email: inv.email,
          role: inv.role,
          orgId: activeOrgId,
          organization: safeOrgName(data?.name, activeOrgId),
          invitedBy: user?.email || 'an admin',
          createdAt: inv.createdAt,
          status: 'pending'
        });
      } catch (e) {
        console.debug('set top-level invite failed', e?.message || e);
      }
      
      // Generate the invitation link
      const link = `${window.location.origin}/invite/${activeOrgId}/${inv.token}`;
      const fundersPageLink = `${window.location.origin}/app/funders`;
      console.log('Invitation created - Link:', link, 'OrgId:', activeOrgId, 'Token:', inv.token);
      
      // Try to send email using available methods
      let emailSent = false;
      let emailError = null;
      
      // Method 1: EmailJS (preferred)
      if (
        (import.meta.env.REACT_APP_EMAILJS_PUBLIC_KEY || import.meta.env.VITE_EMAILJS_PUBLIC_KEY) &&
        (import.meta.env.REACT_APP_EMAILJS_SERVICE_ID || import.meta.env.VITE_EMAILJS_SERVICE_ID) &&
        (import.meta.env.REACT_APP_EMAILJS_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID)
      ) {
        try {
          const emailjs = await ensureEmailJs();
          if (emailjs && typeof emailjs.init === 'function') {
            emailjs.init(import.meta.env.REACT_APP_EMAILJS_PUBLIC_KEY || import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
            await emailjs.send(
              (import.meta.env.REACT_APP_EMAILJS_SERVICE_ID || import.meta.env.VITE_EMAILJS_SERVICE_ID),
              (import.meta.env.REACT_APP_EMAILJS_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID),
              {
                to_email: inv.email,
                org_name: safeOrgName(data?.name, activeOrgId),
                role: inv.role,
                link,
                funders_link: fundersPageLink,
                invited_by: user?.email || 'an admin',
                support_email: user?.email || 'support@example.com'
              }
            );
            emailSent = true;
            console.log('EmailJS invitation sent successfully to:', inv.email);
          }
        } catch (err) {
          emailError = err?.message || 'Failed to send email';
          console.error('EmailJS send error:', emailError);
        }
      }
      
      // Method 2: Fallback to Firebase Trigger Email
      if (!emailSent && ((import.meta.env.REACT_APP_USE_FIREBASE_TRIGGER_EMAIL === 'true') || (import.meta.env.VITE_USE_FIREBASE_TRIGGER_EMAIL === 'true'))) {
        try {
          const mail = {
            to: [inv.email],
            message: {
              subject: `You're invited to join ${safeOrgName(data?.name, activeOrgId)}`,
              text: `You've been invited by ${user?.email || 'an admin'} to join ${safeOrgName(data?.name, activeOrgId)} as ${inv.role}.\n\nClick here to accept: ${link}\n\nIf you didn't expect this invitation, you can safely ignore this email.`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #1e40af;">You're Invited!</h2>
                  <p><strong>${user?.email || 'An admin'}</strong> has invited you to join <strong>${safeOrgName(data?.name, activeOrgId)}</strong> as <strong>${inv.role}</strong>.</p>
                  <p>Click the button below to accept the invitation and get started:</p>
                  <div style="margin: 25px 0;">
                    <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                      Accept Invitation
                    </a>
                  </div>
                  <p style="margin:0 0 12px;">If you already have an account, you can view funders and details after signing in here: <a href="${fundersPageLink}" style="color:#0ea5e9;text-decoration:underline;">Open Funders</a></p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #2563eb;">${link}</p>
                  <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>
              `
            }
          };
          await addDoc(collection(db, 'mail'), mail);
          emailSent = true;
          console.log('Firebase trigger email sent successfully to:', inv.email);
        } catch (err) {
          emailError = emailError || err?.message || 'Failed to send fallback email';
          console.error('Firebase trigger email error:', err);
        }
      }
      
      // If no email method worked, return the direct link
      if (!emailSent) {
        return { 
          success: true, 
          invite: inv, 
          link,
          warning: 'Email could not be sent. Please share this invitation link manually:',
          manualCopyText: `You've been invited to join ${safeOrgName(data?.name, activeOrgId)} as ${inv.role}. Use this link to accept: ${link}`
        };
      }
      
      return { success: true, invite: inv, link, emailSent: true };
    } catch (e) {
      console.error('inviteMember failed', e);
      return { success: false, error: e?.message || 'Failed to invite member' };
    }
  }

  async function revokeInvite(inviteIdOrToken) {
    if (!activeOrgId) return { success: false };
    try {
      const ref = doc(db, 'orgs', activeOrgId);
      const snap = await getDoc(ref);
      const invs = (snap.exists() && Array.isArray(snap.data().invites)) ? snap.data().invites : [];
      const filtered = invs.filter((i) => i.id !== inviteIdOrToken && i.token !== inviteIdOrToken);
      await updateDoc(ref, { invites: filtered });
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to revoke invite' };
    }
  }

  async function updateMemberRole(targetUserId, newRole) {
    if (!activeOrgId) return { success: false };
    try {
      const ref = doc(db, 'orgs', activeOrgId);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const memberships = Array.isArray(data.memberships) ? data.memberships : [];
      const old = memberships.find((m) => m.userId === targetUserId)?.role || null;

      // update memberships
      const updated = memberships.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m));

      // append role history entry
      const entry = {
        id: Math.random().toString(36).slice(2, 10),
        userId: targetUserId,
        previousRole: old,
        newRole,
        by: user?.id || 'system',
        byEmail: user?.email || null,
        at: new Date().toISOString(),
      };

      const roleHistory = Array.isArray(data.roleHistory) ? data.roleHistory : [];
      const nextHistory = [entry, ...roleHistory];

      await updateDoc(ref, { memberships: updated, roleHistory: nextHistory });
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to update role' };
    }
  }

  async function setOrgCurrency(newCurrency) {
    if (!activeOrgId || !newCurrency) return { success: false };
    try {
      const ref = doc(db, 'orgs', activeOrgId);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const currentSettings = typeof data.orgSettings === 'object' && data.orgSettings !== null ? data.orgSettings : {};
      const nextSettings = { ...currentSettings, currency: newCurrency };
      await updateDoc(ref, { orgSettings: nextSettings });
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to update currency' };
    }
  }

  async function removeMember(targetUserId) {
    if (!activeOrgId) return { success: false };
    try {
      const ref = doc(db, 'orgs', activeOrgId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, error: 'Organization not found' };
      
      const data = snap.data();
      const memberships = (Array.isArray(data.memberships)) ? data.memberships : [];
      const members = (Array.isArray(data.members)) ? data.members : [];
      const funders = (Array.isArray(data.funders)) ? data.funders : [];
      
      // Remove from memberships
      const updatedMemberships = memberships.filter((m) => m.userId !== targetUserId);
      // Remove from members array
      const updatedMembers = members.filter((id) => id !== targetUserId);
      // Remove from funders array (clean up funder entry if exists)
      const updatedFunders = funders.filter((f) => f && f.id !== targetUserId);
      
      await updateDoc(ref, { 
        memberships: updatedMemberships, 
        members: updatedMembers,
        funders: updatedFunders
      });
      
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to remove member' };
    }
  }

  async function restoreMemberRole(targetUserId, historyEntryId) {
    if (!activeOrgId) return { success: false };
    try {
      const ref = doc(db, 'orgs', activeOrgId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, error: 'Org not found' };
      const data = snap.data();
      const roleHistory = Array.isArray(data.roleHistory) ? data.roleHistory : [];
      const entry = roleHistory.find((h) => h.id === historyEntryId && h.userId === targetUserId);
      if (!entry) return { success: false, error: 'History entry not found' };

      const prevRole = entry.previousRole || 'viewer';
      const memberships = Array.isArray(data.memberships) ? data.memberships : [];
      const updated = memberships.map((m) => (m.userId === targetUserId ? { ...m, role: prevRole } : m));

      const restoreEntry = {
        id: Math.random().toString(36).slice(2, 10),
        userId: targetUserId,
        previousRole: data.memberships.find((m) => m.userId === targetUserId)?.role || null,
        newRole: prevRole,
        by: user?.id || 'system',
        byEmail: user?.email || null,
        at: new Date().toISOString(),
        restoredFrom: historyEntryId,
      };
      const nextHistory = [restoreEntry, ...roleHistory];

      await updateDoc(ref, { memberships: updated, roleHistory: nextHistory });
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to restore role' };
    }
  }

  const value = { orgs, activeOrgId, switchOrg, loading, activeOrg, currency, role, inviteMember, revokeInvite, updateMemberRole, restoreMemberRole, removeMember, isFunderInOrg, hasAdminRoleInOrg };
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider');
  return ctx;
}
