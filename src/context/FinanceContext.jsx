import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useOrg } from './OrgContext';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

import { formatAmount } from '../utils/format';

const FinanceContext = createContext(null);

const STORAGE_KEY = 'finTrackFinanceData';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Helper: avoid using email-like strings or opaque IDs as organization name in emails/templates
const looksLikeEmail = (s) => typeof s === 'string' && s.includes('@');
const looksLikeId = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{8,}$/.test(s) && s.length > 8;
const safeOrgName = (name, fallback) => {
  if (name && typeof name === 'string' && !looksLikeEmail(name) && !looksLikeId(name) && name.trim().length) return name;
  if (fallback && typeof fallback === 'string' && !looksLikeEmail(fallback) && !looksLikeId(fallback) && fallback.trim().length) return fallback;
  return 'Organization';
}

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const { activeOrgId, currency: orgCurrency, role: orgRole, activeOrg } = useOrg();
  const [state, setState] = useState({ funders: [], projects: [], incomes: [], expenses: [], logs: [], invites: [] });

  // Load from localStorage only if there is no activeOrgId (pure offline mode)
  useEffect(() => {
    if (activeOrgId) return; // When org is present, source of truth is Firestore
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // merge parsed saved state with defaults to avoid missing keys
          setState((prev) => ({
            funders: Array.isArray(parsed.funders) ? parsed.funders : (prev.funders || []),
            projects: Array.isArray(parsed.projects) ? parsed.projects : (prev.projects || []),
            incomes: Array.isArray(parsed.incomes) ? parsed.incomes : (prev.incomes || []),
            expenses: Array.isArray(parsed.expenses) ? parsed.expenses : (prev.expenses || []),
            logs: Array.isArray(parsed.logs) ? parsed.logs : (prev.logs || []),
            invites: Array.isArray(parsed.invites) ? parsed.invites : (prev.invites || [])
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load finance data', e);
    }
  }, [activeOrgId]);

  // Persist locally whenever state changes (still useful for offline)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist finance data', e);
    }
  }, [state]);

  // Helper to sync arrays back to Firestore if org is present
  // Returns true if the write succeeded, false otherwise
  const syncToFirestore = async (key, newArray) => {
    if (!activeOrgId) return true; // nothing to sync for offline/local mode
    try {
      const ref = doc(db, 'orgs', activeOrgId);
      await updateDoc(ref, { [key]: newArray });
      return true;
    } catch (e) {
      console.error('Failed to sync finance data to Firestore', e);
      return false;
    }
  };

  // Append immutable audit log
  const appendLog = (action, refId = null, payload = null) => {
    const entry = {
      id: uid(),
      action,
      refId: refId || null,
      payload: payload || null,
      by: user?.id || 'anonymous',
      byName: user?.name || user?.email || (user?.id || 'anonymous'),
      byEmail: user?.email || null,
      byRole: orgRole || null,
      at: new Date().toISOString(),
    };
    setState((s) => {
      const next = { ...s, logs: [entry, ...(s.logs || [])] };
      syncToFirestore('logs', next.logs);
      return next;
    });
    return entry;
  };

  // Create a new project linked to an organization or a specific funder
  // payload: { name, funderId: 'ORG' | <funderId>, allocation, description, startDate, endDate, status }
  const addProject = async (payload) => {
    if (!activeOrgId) return { success: false, error: 'No active organization selected' };
    try {
      const project = {
        id: `proj-${uid()}`,
        name: String(payload.name || 'Untitled Project'),
        funderId: payload.funderId || 'ORG',
        allocation: Number(payload.allocation || 0),
        description: payload.description || '',
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
        status: payload.status || 'active',
        createdAt: new Date().toISOString(),
        createdBy: user?.id || 'system',
      };

      // optimistic update
      const nextProjects = [...state.projects, project];
      setState((s) => ({ ...s, projects: nextProjects }));
      const ok = await syncToFirestore('projects', nextProjects);
      if (!ok) return { success: false, error: 'Failed to save project (permission/network)' };
      appendLog('project_created', project.id, project);
      return { success: true, project };
    } catch (e) {
      console.error('addProject failed', e);
      return { success: false, error: e?.message || 'Failed to create project' };
    }
  };

  // When an active org is present, reset and subscribe to its org document for real-time updates
  useEffect(() => {
    if (!activeOrgId) return;
    // Reset current state to avoid leaking stale local/offline data
    setState({ funders: [], projects: [], incomes: [], expenses: [], logs: [] });
    const ref = doc(db, 'orgs', activeOrgId);

    // Helper to normalize Firestore DocumentReference or object fields into plain string ids
    const normalizeRef = (val) => {
      if (val == null) return val;
      // Firestore DocumentReference has an 'id' property
      if (typeof val === 'object') {
        if ('id' in val && typeof val.id === 'string') return val.id;
        if ('path' in val && typeof val.path === 'string') return val.path;
      }
      return val;
    };

    const normalizeArray = (arr) => (Array.isArray(arr) ? arr.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const clone = { ...item };
      // normalize common reference keys that may come as DocumentReference
      ['projectId', 'walletId', 'funderId'].forEach((k) => {
        if (k in clone) clone[k] = normalizeRef(clone[k]);
      });
      // ensure id is a string (if provided as ref)
      if ('id' in clone) clone.id = normalizeRef(clone.id);
      return clone;
    }) : []);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setState({
        funders: Array.isArray(data.funders) ? normalizeArray(data.funders) : [],
        projects: normalizeArray(data.projects || []),
        incomes: normalizeArray(data.incomes || []),
        expenses: normalizeArray(data.expenses || []),
        logs: normalizeArray(data.logs || []),
        invites: Array.isArray(data.invites) ? normalizeArray(data.invites) : [],
      });
    }, (err) => {
      console.error('Realtime finance snapshot failed', err);
    });

    return () => unsub();
  }, [activeOrgId]);

  // Generate a unique token for the invitation
  const generateInviteToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // Send invitation to a funder (aligned with inviteFunder and AcceptInvite)
  const sendInvitation = async ({ email, role, funderId, funderName }) => {
    if (!activeOrgId) {
      console.error('No active organization selected');
      return false;
    }
    if (!email || !funderId) {
      console.error('Missing required fields for invitation');
      return false;
    }

    // Generate a unique token for this invitation
    const token = uid() + Date.now().toString(36);
    const ref = doc(db, 'orgs', activeOrgId);

    try {
      const snap = await getDoc(ref);
      // If org doc missing but activeOrgId equals the signed-in user, create a minimal org doc (owner flow)
      let data = {};
      if (!snap.exists()) {
        if (activeOrgId === user?.id) {
          const init = {
            name: user?.displayName || (user?.email ? user.email.split('@')[0] : activeOrgId),
            owner: user?.id || activeOrgId,
            createdAt: new Date().toISOString(),
            memberships: [{ userId: user?.id || activeOrgId, email: user?.email || '', role: 'admin', addedAt: new Date().toISOString() }],
            members: [user?.id || activeOrgId],
            invites: []
          };
          try {
            await setDoc(ref, init);
            console.debug('FinanceContext: created missing org doc for owner', activeOrgId);
            data = init;
          } catch (errCreate) {
            console.error('FinanceContext: failed to auto-create org doc', errCreate);
            throw new Error('Organization not found');
          }
        } else {
          console.error('FinanceContext: organization not found at', ref.path, 'activeOrgId:', activeOrgId, 'user:', user?.id);
          throw new Error('Organization not found');
        }
      } else {
        data = snap.data() || {};
      }

      const invs = Array.isArray(data.invites) ? data.invites : [];
      // Ensure we have a friendly org name. If the org doc lacks a usable name, derive from the owner profile and persist it.
      let resolvedOrgName = data?.name || null;
      if (!resolvedOrgName || looksLikeEmail(resolvedOrgName) || looksLikeId(resolvedOrgName)) {
        resolvedOrgName = user?.displayName || (user?.email ? user.email.split('@')[0] : null);
        if (resolvedOrgName) {
          try {
            // Persist a friendly name on the org doc so future invites have it
            await updateDoc(ref, { name: resolvedOrgName });
          } catch (e) {
            // non-fatal
            console.debug('Failed to persist derived org name', e?.message || e);
          }
        }
      }

      const inviteObj = {
        id: uid(),
        token,
        name: funderName || '',
        email: email || '',
        organization: safeOrgName(resolvedOrgName || data?.name || activeOrg?.name, activeOrgId),
        projectId: funderId || null,
        role: role || 'viewer',
        message: '',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        status: 'pending',
        invitedBy: user?.id || 'system',
      };

      const nextInvites = [...invs, inviteObj];
      await updateDoc(ref, { invites: nextInvites });

      // Mirror invite to a top-level 'invites' collection to allow public token lookup without needing org read permissions
      try {
        await setDoc(doc(db, 'invites', token), { ...inviteObj, orgId: activeOrgId });
      } catch (e) {
        console.warn('Failed to write top-level invite doc', e);
      }

      const inviteLink = `${window.location.origin}/invite/${activeOrgId}/${token}`;
      const funderLink = `${window.location.origin}/app/funders/${funderId}`;

      const subject = `${safeOrgName(data?.name || activeOrg?.name, activeOrgId)} invitation to join as ${inviteObj.role}`;
      const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <h3 style="margin:0 0 8px;">You're invited to join ${inviteObj.organization}</h3>
        <p style="margin:0 0 12px;">${inviteObj.message || `Hello ${inviteObj.name || ''},\n\nYou've been invited to join ${inviteObj.organization} as a ${inviteObj.role}. Click the button below to accept the invitation and complete your signup.`}</p>
        <p style="margin:0 0 12px;"> <a href="${inviteLink}" style="background:#0ea5e9;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">Accept invitation</a></p>
        <p style="margin:0 0 12px;">If you already have an account, you can view funders and details after signing in here: <a href="${funderLink}" style="color:#0ea5e9;text-decoration:underline;">Open Funders</a></p>
        <p style="margin:0;color:#6b7280;font-size:13px;">If the button doesn't work, copy and paste the following link into your browser:</p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;word-break:break-all;">${inviteLink}</p>
      </div>`;

      // Attempt to send via configured email path
      try {
        await sendApprovalEmails([inviteObj.email], subject, html, {
          org_name: inviteObj.organization,
          invite_link: inviteLink,
          funders_link: funderLink,
          invite_role: inviteObj.role,
          invite_name: inviteObj.name,
          invited_by: user?.email || ''
        });
      } catch (e) {
        console.warn('Failed to send invite email', e);
      }

      appendLog('funder_invited', inviteObj.id, inviteObj);
      return true;
    } catch (e) {
      console.error('Error sending invitation:', e);
      return false;
    }
  };

  // Lightweight EmailJS loader for optional client-side email sending
  let emailJsLoaded = false;
  const ensureEmailJs = () => new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.emailjs) { resolve(window.emailjs); return; }
    if (emailJsLoaded) { setTimeout(() => resolve(window.emailjs), 100); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.async = true;
    script.onload = () => { emailJsLoaded = true; resolve(window.emailjs); };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  const sendApprovalEmails = async (toList, subject, html, vars = {}) => {
    try {
      const list = (toList || []).filter(Boolean);
      if (!list.length) return;

      const fnUrl = import.meta.env.REACT_APP_EMAIL_FUNCTION_URL || import.meta.env.VITE_EMAIL_FUNCTION_URL;
      if (fnUrl) {
        try {
          await fetch(fnUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: list, subject, html, vars })
          });
          return;
        } catch (e) {
          // fallback
        }
      }

      if ((import.meta.env.REACT_APP_USE_FIREBASE_TRIGGER_EMAIL === 'true') || (import.meta.env.VITE_USE_FIREBASE_TRIGGER_EMAIL === 'true')) {
        try {
          const text = html.replace(/<[^>]+>/g, ' ');
          await addDoc(collection(db, 'mail'), { to: list, message: { subject, text, html, vars } });
          return;
        } catch (e) {
          // fallback
        }
      }

      if (
        (import.meta.env.REACT_APP_EMAILJS_PUBLIC_KEY || import.meta.env.VITE_EMAILJS_PUBLIC_KEY) &&
        (import.meta.env.REACT_APP_EMAILJS_SERVICE_ID || import.meta.env.VITE_EMAILJS_SERVICE_ID) &&
        (import.meta.env.REACT_APP_EMAILJS_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID)
      ) {
        const emailjs = await ensureEmailJs();
        if (emailjs && typeof emailjs.init === 'function') {
          emailjs.init(import.meta.env.REACT_APP_EMAILJS_PUBLIC_KEY || import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
          console.debug('EmailJS: sending template', (import.meta.env.REACT_APP_EMAILJS_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID), 'service', (import.meta.env.REACT_APP_EMAILJS_SERVICE_ID || import.meta.env.VITE_EMAILJS_SERVICE_ID), 'to', list);
          // ensure common template vars are present for EmailJS template editor
          const templateVars = {
            // prefer explicitly supplied vars, otherwise derive
            invite_link: vars?.invite_link || vars?.link || undefined,
            funders_link: vars?.funders_link || vars?.fundersLink || `${window.location.origin}/app/funders`,
            org_name: vars?.org_name || vars?.orgName || vars?.organization || undefined,
            invite_role: vars?.invite_role || vars?.role || undefined,
            invite_name: vars?.invite_name || vars?.name || undefined,
            invited_by: vars?.invited_by || vars?.inviter || vars?.from || undefined,
            support_email: vars?.support_email || vars?.supportEmail || undefined,
            // provide rendered HTML as fallback variable if your EmailJS template uses message_html
            message_html: html,
            // include subject as well
            subject,
            // include any other raw vars
            ...vars,
          };
          console.debug('EmailJS templateVars:', templateVars);
          const results = await Promise.all(
            list.map((to) =>
              emailjs.send(
                (import.meta.env.REACT_APP_EMAILJS_SERVICE_ID || import.meta.env.VITE_EMAILJS_SERVICE_ID),
                (import.meta.env.REACT_APP_EMAILJS_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID),
                { to_email: to, ...templateVars }
              )
            )
          );
          console.debug('EmailJS send results:', results);
          return true;
        }
      }
    } catch (e) {
      // non-blocking
    }
  };

  const approveIncome = (id) => {
    if (orgRole !== 'admin') {
      appendLog('income_approval_denied_insufficient_role', id, { byRole: orgRole });
      return;
    }
    setState((s) => {
      const exists = s.incomes.find((i) => i.id === id);
      if (!exists) return s;
      const updated = s.incomes.map((i) => (i.id === id ? { ...i, status: 'posted' } : i));
      const next = { ...s, incomes: updated };
      syncToFirestore('incomes', next.incomes);
      appendLog('income_approved_and_posted', id, exists);
      return next;
    });
  };

  const rejectIncome = (id, reason) => {
    if (orgRole !== 'admin') {
      appendLog('income_reject_denied_insufficient_role', id, { byRole: orgRole });
      return;
    }
    setState((s) => {
      const exists = s.incomes.find((i) => i.id === id);
      if (!exists) return s;
      const updated = s.incomes.map((i) => (i.id === id ? { ...i, status: 'rejected', rejectedReason: reason || null } : i));
      const next = { ...s, incomes: updated };
      syncToFirestore('incomes', next.incomes);
      appendLog('income_rejected', id, { reason });
      return next;
    });
  };

  // Utility: compute wallet available using current posted transactions
  const getWalletAvailable = (walletId) => {
    // walletId: funder id or 'ORG'
    const postedIncomes = state.incomes.filter((i) => i.status === 'posted');
    const postedExpenses = state.expenses.filter((e) => e.status === 'posted');
    let income = 0;
    postedIncomes.forEach((i) => {
      const project = state.projects.find((p) => p.id === i.projectId);
      const w = i.walletId || project?.funderId || 'ORG';
      if (w === walletId) income += i.amount;
    });
    let expenses = 0;
    postedExpenses.forEach((e) => {
      const w = e.walletId || (e.projectId ? (state.projects.find((p) => p.id === e.projectId)?.funderId || 'ORG') : 'ORG');
      if (w === walletId) expenses += e.amount;
    });
    return income - expenses;
  };

  // Public helpers to add income/expense with statuses
  const addIncome = (payload) => {
    const approvalsEnabled = (activeOrg?.orgSettings?.approvalsEnabled ?? true) === true;
    const isAdmin = (orgRole === 'admin');
    const canAdd = (orgRole === 'admin' || orgRole === 'financial_officer');
    if (!canAdd) {
      appendLog('income_create_denied_insufficient_role', null, { byRole: orgRole });
      return { success: false, error: 'You do not have permission to add income.' };
    }
    const income = {
      id: uid(),
      projectId: payload.projectId || null,
      walletId: payload.walletId || null,
      amount: Number(payload.amount || 0),
      date: payload.date || new Date().toISOString(),
      description: payload.description || '',
      status: approvalsEnabled && !isAdmin ? 'pending' : 'posted',
      attachments: payload.attachments || [],
      currency: payload.currency || orgCurrency || 'USD',
      fxRate: payload.fxRate || 1,
    };

    setState((s) => {
      const next = { ...s, incomes: [income, ...s.incomes] };
      syncToFirestore('incomes', next.incomes);
      appendLog('income_created', income.id, income);
      return next;
    });

    if (income.status === 'pending') {
      try {
        const admins = (Array.isArray(activeOrg?.memberships) ? activeOrg.memberships : [])
          .filter((m) => (m.role === 'admin' && m.email))
          .map((m) => m.email);
        if (admins.length) {
          const approvalsLink = `${window.location.origin}/approvals`;
          const subject = `Approval requested: Income ${income.amount} ${income.currency}`;
          const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.6;">
            <h3 style="margin:0 0 10px;">Income approval requested</h3>
            <p>An income entry requires your approval.</p>
            <ul>
              <li><strong>Amount:</strong> ${income.amount} ${income.currency}</li>
              <li><strong>Date:</strong> ${new Date(income.date).toLocaleDateString()}</li>
              <li><strong>Description:</strong> ${income.description || 'N/A'}</li>
            </ul>
            <p><a href="${approvalsLink}" style="background:#0ea5e9;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;display:inline-block;">Open approvals</a></p>
          </div>`;
          sendApprovalEmails(admins, subject, html, {
            org_name: safeOrgName(activeOrg?.name, activeOrgId),
            item_type: 'Income',
            amount: income.amount,
            currency: income.currency,
            date: income.date,
            description: income.description || '',
            requester_name: user?.name || '',
            requester_email: user?.email || '',
            approvals_link: approvalsLink,
            item_id: income.id,
          }).catch(() => {});
        }
      } catch {}
    }

    return { success: true, income };
  };

  const addExpense = (payload) => {
    // determine target wallet
    let walletId = payload.walletId || null;
    if (!walletId) {
      if (payload.projectId) {
        const project = state.projects.find((p) => p.id === payload.projectId);
        walletId = project?.funderId || 'ORG';
      } else {
        walletId = 'ORG';
      }
    }

    // determine if approvals are enabled via org doc
    const approvalsEnabled = (activeOrg?.orgSettings?.approvalsEnabled ?? true) === true;
    const isAdmin = (orgRole === 'admin');

    const expense = {
      id: uid(),
      scope: payload.scope || (payload.projectId ? 'project' : 'org'),
      projectId: payload.projectId || null,
      walletId,
      category: payload.category || 'General',
      amount: Number(payload.amount || 0),
      date: payload.date || new Date().toISOString(),
      description: payload.description || '',
      status: approvalsEnabled && !isAdmin ? 'pending' : 'posted',
      attachments: payload.attachments || [],
      currency: payload.currency || orgCurrency || 'USD',
      fxRate: payload.fxRate || 1,
      meta: payload.meta || null,
    };

    // Status is determined strictly by role and approvals setting above.

    // If we are about to post, ensure wallet has enough funds
    if (expense.status === 'posted') {
      const available = getWalletAvailable(expense.walletId);
      if (available < expense.amount) {
        // can't post, reject operation
        appendLog('expense_post_failed_insufficient_funds', null, { expense, available });
        return { success: false, error: 'Insufficient funds for this wallet' };
      }
    }

    setState((s) => {
      const next = { ...s, expenses: [expense, ...s.expenses] };
      syncToFirestore('expenses', next.expenses);
      appendLog('expense_created', expense.id, expense);
      return next;
    });

    if (expense.status === 'pending') {
      try {
        const admins = (Array.isArray(activeOrg?.memberships) ? activeOrg.memberships : [])
          .filter((m) => (m.role === 'admin' && m.email))
          .map((m) => m.email);
        if (admins.length) {
          const approvalsLink = `${window.location.origin}/approvals`;
          const subject = `Approval requested: Expense ${expense.amount} ${expense.currency}`;
          const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.6;">
            <h3 style="margin:0 0 10px;">Expense approval requested</h3>
            <p>An expense entry requires your approval.</p>
            <ul>
              <li><strong>Amount:</strong> ${expense.amount} ${expense.currency}</li>
              <li><strong>Date:</strong> ${new Date(expense.date).toLocaleDateString()}</li>
              <li><strong>Description:</strong> ${expense.description || 'N/A'}</li>
            </ul>
            <p><a href="${approvalsLink}" style="background:#0ea5e9;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none;display:inline-block;">Open approvals</a></p>
          </div>`;
          sendApprovalEmails(admins, subject, html, {
            org_name: safeOrgName(activeOrg?.name, activeOrgId),
            item_type: 'Expense',
            amount: expense.amount,
            currency: expense.currency,
            date: expense.date,
            description: expense.description || '',
            requester_name: user?.name || '',
            requester_email: user?.email || '',
            approvals_link: approvalsLink,
            item_id: expense.id,
          }).catch(() => {});
        }
      } catch {}
    }

    return { success: true, expense };
  };

  const approveExpense = (id) => {
    if (orgRole !== 'admin') {
      appendLog('expense_approval_denied_insufficient_role', id, { byRole: orgRole });
      return;
    }
    setState((s) => {
      const exists = s.expenses.find((e) => e.id === id);
      if (!exists) return s;
      const updated = s.expenses.map((e) => {
        if (e.id !== id) return e;
        // attempt to post on approval
        const available = getWalletAvailable(e.walletId);
        if (available < e.amount) {
          // insufficient funds -> mark rejected
          appendLog('expense_approval_failed_insufficient_funds', id, { expense: e, available });
          return { ...e, status: 'rejected' };
        }
        appendLog('expense_approved_and_posted', id, e);
        return { ...e, status: 'posted' };
      });
      const next = { ...s, expenses: updated };
      syncToFirestore('expenses', next.expenses);
      return next;
    });
  };

  const rejectExpense = (id, reason) => {
    if (orgRole !== 'admin') {
      appendLog('expense_reject_denied_insufficient_role', id, { byRole: orgRole });
      return;
    }
    setState((s) => {
      const exists = s.expenses.find((e) => e.id === id);
      if (!exists) return s;
      const updated = s.expenses.map((e) => (e.id === id ? { ...e, status: 'rejected', rejectedReason: reason || null } : e));
      const next = { ...s, expenses: updated };
      syncToFirestore('expenses', next.expenses);
      appendLog('expense_rejected', id, { reason });
      return next;
    });
  };

  const postPendingExpense = (id) => {
    // attempt to post a pending expense (used by approver or system)
    if (orgRole !== 'admin') {
      appendLog('expense_post_denied_insufficient_role', id, { byRole: orgRole });
      return;
    }
    setState((s) => {
      const exp = s.expenses.find((e) => e.id === id);
      if (!exp) return s;
      if (exp.status === 'posted') return s;
      const available = getWalletAvailable(exp.walletId);
      if (available < exp.amount) {
        appendLog('expense_post_failed_insufficient_funds', id, { expense: exp, available });
        return s;
      }
      const updated = s.expenses.map((e) => (e.id === id ? { ...e, status: 'posted' } : e));
      const next = { ...s, expenses: updated };
      syncToFirestore('expenses', next.expenses);
      appendLog('expense_posted', id, exp);
      return next;
    });
  };

  const removeItem = async (type, id) => {
    // Validate type to prevent accidental bulk updates
    const allowed = ['funders', 'projects', 'incomes', 'expenses', 'logs'];
    if (!type || !allowed.includes(type)) {
      console.warn('removeItem called with invalid type', type, id);
      try { window.alert('Failed to remove item: invalid type'); } catch {}
      return;
    }

    const existing = state[type] || [];
    const idx = existing.findIndex((x) => x && x.id === id);
    if (idx === -1) {
      console.warn('removeItem: item not found', type, id);
      try { window.alert('Item not found or already removed'); } catch {}
      return;
    }

    const prev = state;
    const next = { ...state, [type]: existing.filter((x) => x.id !== id) };
    // optimistic update
    setState(next);
    const ok = await syncToFirestore(type, next[type]);
    if (!ok) {
      // rollback
      setState(prev);
      try { window.alert('Failed to remove item: permission denied or network error'); } catch {}
      return;
    }
    appendLog('item_removed', id, { type });
  };

  // Soft-delete a log entry (mark deleted and allow undo) — ID-based full-array update to avoid index drift
  const softRemoveLog = async (id) => {
    const prev = state;
    const exists = (state.logs || []).some((l) => l.id === id);
    if (!exists) return;

    try {
      const markDeletedAt = new Date().toISOString();
      // optimistic local update by id
      setState((s) => ({
        ...s,
        logs: (s.logs || []).map((l) => (l.id === id ? { ...l, deleted: true, deletedBy: user?.id || 'system', deletedAt: markDeletedAt } : l))
      }));

      if (activeOrgId) {
        const ref = doc(db, 'orgs', activeOrgId);
        const serverSnap = await getDoc(ref).catch(() => null);
        if (serverSnap && serverSnap.exists()) {
          const serverLogs = serverSnap.data().logs || [];
          const updated = serverLogs.map((l) => (l && l.id === id ? { ...l, deleted: true, deletedBy: user?.id || 'system', deletedAt: markDeletedAt } : l));
          await updateDoc(ref, { logs: updated });
        } else {
          // fallback: push current state's mapped logs
          await updateDoc(ref, { logs: (state.logs || []).map((l) => (l.id === id ? { ...l, deleted: true, deletedBy: user?.id || 'system', deletedAt: markDeletedAt } : l)) });
        }
      } else {
        // local/offline org
        const ok = await syncToFirestore('logs', (state.logs || []).map((l) => (l.id === id ? { ...l, deleted: true, deletedBy: user?.id || 'system', deletedAt: markDeletedAt } : l)));
        if (!ok) throw new Error('sync failed');
      }

      appendLog('log_soft_removed', id, { by: user?.id });
    } catch (e) {
      console.error('softRemoveLog failed', e);
      setState(prev);
      try { window.alert('Failed to remove activity: permission denied or network error'); } catch {}
    }
  };

  // Restore a soft-deleted log — ID-based full-array update
  const restoreLog = async (id) => {
    const prev = state;
    const exists = (state.logs || []).some((l) => l.id === id);
    if (!exists) return;

    try {
      // optimistic local restore
      setState((s) => ({
        ...s,
        logs: (s.logs || []).map((l) => (l.id === id ? { ...l, deleted: false, deletedBy: null, deletedAt: null } : l))
      }));

      if (activeOrgId) {
        const ref = doc(db, 'orgs', activeOrgId);
        const serverSnap = await getDoc(ref).catch(() => null);
        if (serverSnap && serverSnap.exists()) {
          const serverLogs = serverSnap.data().logs || [];
          const updated = serverLogs.map((l) => (l && l.id === id ? { ...l, deleted: false, deletedBy: null, deletedAt: null } : l));
          await updateDoc(ref, { logs: updated });
        } else {
          await updateDoc(ref, { logs: (state.logs || []).map((l) => (l.id === id ? { ...l, deleted: false, deletedBy: null, deletedAt: null } : l)) });
        }
      } else {
        const ok = await syncToFirestore('logs', (state.logs || []).map((l) => (l.id === id ? { ...l, deleted: false, deletedBy: null, deletedAt: null } : l)));
        if (!ok) throw new Error('sync failed');
      }

      appendLog('log_restored', id, { by: user?.id });
    } catch (e) {
      console.error('restoreLog failed', e);
      setState(prev);
      try { window.alert('Failed to restore activity: permission denied or network error'); } catch {}
    }
  };

  // Finalize deletion of a log (hard remove) - used after undo window expires
  const finalizeRemoveLog = async (id) => {
    const current = state;
    const exists = (current.logs || []).find((l) => l.id === id);
    if (!exists || !exists.deleted) return;

    if (activeOrgId) {
      try {
        const ref = doc(db, 'orgs', activeOrgId);
        // fetch server copy to ensure removed item was already soft-deleted on server
        const snap = await (async () => { try { const { getDoc } = await import('firebase/firestore'); return await getDoc(ref); } catch (e) { return null; } })();
        if (snap && snap.exists()) {
          const serverLogs = snap.data().logs || [];
          const target = serverLogs.find((l) => l && l.id === id);
          if (!target || !target.deleted) {
            console.warn('Cannot finalize removal: server copy not marked deleted');
            return;
          }
          const newArr = serverLogs.filter((l) => !(l && l.id === id));
          await updateDoc(ref, { logs: newArr });
          setState((s) => ({ ...s, logs: (s.logs || []).filter((l) => l.id !== id) }));
          appendLog('log_finalized_removed', id, { by: user?.id });
        }
        return;
      } catch (e) {
        console.error('finalizeRemoveLog failed', e);
        return;
      }
    }

    const next = { ...current, logs: (current.logs || []).filter((l) => l.id !== id) };
    const ok = await syncToFirestore('logs', next.logs);
    if (!ok) {
      try { console.warn('Failed to finalize log removal'); } catch {}
      return;
    }
    setState(next);
    appendLog('log_finalized_removed', id, { by: user?.id });
  };

  // Derived totals and aggregations — ONLY count posted transactions for balances
  const totals = useMemo(() => {
    const totalIncome = state.incomes.filter((i) => i.status === 'posted').reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = state.expenses.filter((e) => e.status === 'posted').reduce((sum, e) => sum + e.amount, 0);
    const totalAvailable = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, totalAvailable };
  }, [state.incomes, state.expenses]);

  const byProject = useMemo(() => {
    const map = new Map();
    state.projects.forEach((p) => {
      map.set(p.id, { project: p, income: 0, expenses: 0, available: 0 });
    });
    state.incomes.filter((i) => i.status === 'posted').forEach((i) => {
      const e = map.get(i.projectId);
      if (e) e.income += i.amount;
    });
    state.expenses.filter((e) => e.status === 'posted' && e.scope === 'project').forEach((ex) => {
      const x = map.get(ex.projectId);
      if (x) x.expenses += ex.amount;
    });
    map.forEach((v) => { v.available = v.income - v.expenses; });
    return Array.from(map.values());
  }, [state.projects, state.incomes, state.expenses]);

  const byFunder = useMemo(() => {
    const map = new Map();
    // seed rows
    state.funders.forEach((f) => {
      map.set(f.id, { funder: f, income: 0, expenses: 0, available: 0, allocation: 0 });
    });

    // project budget allocations
    state.projects.forEach((p) => {
      const e = map.get(p.funderId);
      if (e) e.allocation += Number(p.allocation || 0);
    });

    // wallet-level incomes
    state.incomes
      .filter((i) => i.status === 'posted')
      .forEach((i) => {
        const proj = state.projects.find((p) => p.id === i.projectId);
        const wId = i.walletId || (proj?.funderId) || 'ORG';
        const row = map.get(wId);
        if (row) row.income += i.amount;
      });

    // wallet-level expenses
    state.expenses
      .filter((e) => e.status === 'posted')
      .forEach((ex) => {
        const proj = state.projects.find((p) => p.id === ex.projectId);
        const wId = ex.walletId || (ex.projectId ? (proj?.funderId || 'ORG') : 'ORG');
        const row = map.get(wId);
        if (row) row.expenses += ex.amount;
      });

    // derive available
    map.forEach((v) => { v.available = (v.income || 0) - (v.expenses || 0); });
    return Array.from(map.values());
  }, [state.funders, state.projects, state.incomes, state.expenses]);

  const wallets = useMemo(() => {
    const map = new Map();
    state.funders.forEach((f) => map.set(f.id, { id: f.id, name: f.name, type: 'funder', income: 0, expenses: 0, balance: 0 }));
    map.set('ORG', { id: 'ORG', name: 'Organization', type: 'org', income: 0, expenses: 0, balance: 0 });

    state.incomes.filter((i) => i.status === 'posted').forEach((i) => {
      const wId = i.walletId || (state.projects.find((p) => p.id === i.projectId)?.funderId) || 'ORG';
      const project = state.projects.find((p) => p.id === i.projectId);
      const w = map.get(wId) || { id: wId, name: project?.name || wId, type: 'project', income: 0, expenses: 0, balance: 0 };
      w.income = (w.income || 0) + i.amount;
      map.set(wId, w);
    });

    state.expenses.filter((e) => e.status === 'posted').forEach((e) => {
      const wId = e.walletId || (e.projectId ? (state.projects.find((p) => p.id === e.projectId)?.funderId || 'ORG') : 'ORG');
      const w = map.get(wId) || { id: wId, name: wId, type: 'unknown', income: 0, expenses: 0, balance: 0 };
      w.expenses = (w.expenses || 0) + e.amount;
      map.set(wId, w);
    });

    map.forEach((v) => { v.balance = (v.income || 0) - (v.expenses || 0); });
    return Array.from(map.values());
  }, [state.funders, state.projects, state.incomes, state.expenses]);

  // Invite a funder: create invite token, persist on org doc and send email via configured email path
  const inviteFunder = async (payload) => {
    if (!activeOrgId) throw new Error('No active organization selected');
    const token = uid() + Date.now().toString(36);
    const ref = doc(db, 'orgs', activeOrgId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Organization not found');
    const data = snap.data();
    const invs = Array.isArray(data.invites) ? data.invites : [];
    // Resolve a friendly organization name from the org doc or from the owner profile; persist if needed.
    let resolvedOrgName = data?.name || null;
    if (!resolvedOrgName || looksLikeEmail(resolvedOrgName) || looksLikeId(resolvedOrgName)) {
      resolvedOrgName = user?.displayName || (user?.email ? user.email.split('@')[0] : null);
      if (resolvedOrgName) {
        try {
          await updateDoc(ref, { name: resolvedOrgName });
        } catch (e) { console.debug('Failed to persist derived org name', e?.message || e); }
      }
    }

    const inviteObj = {
      id: uid(),
      token,
      name: payload.name || '',
      email: payload.email || '',
      organization: safeOrgName(resolvedOrgName || data?.name || activeOrg?.name, activeOrgId),
      projectId: payload.projectId || null,
      role: payload.role || 'funder',
      message: payload.message || '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiry
      invitedBy: user?.id || 'system',
    };
    const nextInvites = [...invs, inviteObj];
    await updateDoc(ref, { invites: nextInvites });

    // Mirror invite to top-level invites collection including expiry so public token lookup can validate
    try {
      await setDoc(doc(db, 'invites', token), { ...inviteObj, orgId: activeOrgId });
    } catch (e) {
      console.warn('Failed to write top-level invite doc', e);
    }

    // Compose email content using the org and invite data
    const inviteLink = `${window.location.origin}/invite/${activeOrgId}/${token}`;
    const fundersPageLink = `${window.location.origin}/app/funders`;
    const subject = `${safeOrgName(data?.name || activeOrg?.name, activeOrgId)} invitation to join as ${inviteObj.role}`;
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.5;">
      <h3 style="margin:0 0 8px;">You're invited to join ${inviteObj.organization}</h3>
      <p style="margin:0 0 12px;">${inviteObj.message || `Hello ${inviteObj.name || ''},\n\nYou've been invited to join ${inviteObj.organization} as a ${inviteObj.role}. Click the button below to accept the invitation and complete your signup.`}</p>
      <p style="margin:0 0 12px;"><a href="${inviteLink}" style="background:#0ea5e9;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">Accept invitation</a></p>
      <p style="margin:0 0 12px;">If you already have an account, you can view funders and details after signing in here: <a href="${fundersPageLink}" style="color:#0ea5e9;text-decoration:underline;">Open Funders</a></p>
      <p style="margin:0;color:#6b7280;font-size:13px;">If the button doesn't work, copy and paste the following link into your browser:</p>
      <p style="margin:8px 0 0;color:#6b7280;font-size:13px;word-break:break-all;">${inviteLink}</p>
    </div>`;

    // Attempt to send via the existing client-side email path (emailjs) or other configured fallback
    try {
      await sendApprovalEmails([inviteObj.email], subject, html, {
        org_name: inviteObj.organization,
        invite_link: inviteLink,
        funders_link: fundersPageLink,
        invite_role: inviteObj.role,
        invite_name: inviteObj.name,
      });
    } catch (e) {
      // non-blocking - invite still recorded in Firestore
      console.warn('Failed to send invite email', e);
    }

    appendLog('funder_invited', inviteObj.id, inviteObj);
    return inviteObj;
  };

  const sumAllocations = useMemo(() => {
    return (state.projects || []).reduce((s, p) => s + Number(p.allocation || 0), 0);
  }, [state.projects]);

  const seriesMap = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 365);

    const days = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      days.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    const incMap = new Map();
    (state.incomes || [])
      .filter((i) => i && i.status === 'posted')
      .forEach((i) => {
        const d = (i.date ? new Date(i.date) : new Date()).toISOString().slice(0, 10);
        incMap.set(d, (incMap.get(d) || 0) + Number(i.amount || 0));
      });

    const expMap = new Map();
    (state.expenses || [])
      .filter((e) => e && e.status === 'posted')
      .forEach((e) => {
        const d = (e.date ? new Date(e.date) : new Date()).toISOString().slice(0, 10);
        expMap.set(d, (expMap.get(d) || 0) + Number(e.amount || 0));
      });

    let incCum = 0;
    let expCum = 0;
    const funds = [];
    const expensesSeries = [];
    const balanceSeries = [];

    days.forEach((d) => {
      incCum += incMap.get(d) || 0;
      expCum += expMap.get(d) || 0;
      funds.push({ date: d, value: incCum });
      expensesSeries.push({ date: d, value: expCum });
      balanceSeries.push({ date: d, value: incCum - expCum });
    });

    const budgetSeries = days.map((d) => ({ date: d, value: sumAllocations }));

    return {
      'Total Funds': funds,
      'Total Expenses': expensesSeries,
      'Net Available': balanceSeries,
      Budget: budgetSeries,
    };
  }, [state.incomes, state.expenses, state.projects, sumAllocations]);

  const stats = useMemo(() => {
    return [
      { name: 'Total Funds', raw: totals.totalIncome, value: formatAmount(totals.totalIncome, orgCurrency), variant: 'funds' },
      { name: 'Total Expenses', raw: totals.totalExpenses, value: formatAmount(totals.totalExpenses, orgCurrency), variant: 'expenses' },
      { name: 'Net Available', raw: totals.totalAvailable, value: formatAmount(totals.totalAvailable, orgCurrency), variant: 'balance' },
      { name: 'Budget', raw: sumAllocations, value: formatAmount(sumAllocations, orgCurrency), variant: 'budget' },
    ];
  }, [totals, sumAllocations, orgCurrency]);

  const fundingRows = useMemo(() => {
    const rows = Array.isArray(byFunder) ? byFunder.map((r) => ({ ...r })) : [];
    const metric = 'available';
    const maxVal = rows.length ? Math.max(...rows.map((r) => Math.abs(Number(r[metric] || 0))), 1) : 1;
    return { rows, metric, maxVal };
  }, [byFunder]);

  // Add a funder
  const addFunder = async (funder) => {
    const newFunder = {
      id: `funder-${Date.now()}`,
      ...funder,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    const updatedFunders = [...state.funders, newFunder];
    
    setState(s => ({
      ...s,
      funders: updatedFunders
    }));
    
    await syncToFirestore('funders', updatedFunders);
    return newFunder.id; // Return the new funder's ID
  };

  // Explicit refresh function for payment webhooks and other async operations
  const refreshData = async () => {
    if (!activeOrgId) return;
    try {
      const ref = doc(db, 'orgs', activeOrgId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setState({
          funders: Array.isArray(data.funders) ? data.funders : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          incomes: Array.isArray(data.incomes) ? data.incomes : [],
          expenses: Array.isArray(data.expenses) ? data.expenses : [],
          logs: Array.isArray(data.logs) ? data.logs : [],
          invites: Array.isArray(data.invites) ? data.invites : [],
        });
      }
    } catch (error) {
      console.error('Failed to refresh finance data:', error);
    }
  };

  // Make sure all functions are properly defined before creating the context value
  const contextValue = useMemo(() => ({
    ...state,
    // creators
    addProject,
    addIncome,
    addFunder,
    sendInvitation,
    appendLog,
    inviteFunder,
    refreshData,
    logs: state.logs || [],
    // Other existing context values...
    stats,
    fundingRows,
    byFunder, // Use the memoized byFunder value directly
    byProject, // expose computed byProject
    seriesMap // expose computed seriesMap
  }), [
    state,
    addProject,
    addIncome,
    addFunder,
    sendInvitation,
    appendLog,
    inviteFunder,
    refreshData,
    stats,
    fundingRows,
    byFunder,
    byProject
  ]);

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider');
  return ctx;
}
