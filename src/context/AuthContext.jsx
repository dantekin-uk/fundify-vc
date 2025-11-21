import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

// Development fallback: set REACT_APP_DEV_AUTH=true or VITE_DEV_AUTH=true in .env.local to enable a local dev user
const IS_DEV_AUTH = (import.meta.env.REACT_APP_DEV_AUTH === 'true') || (import.meta.env.VITE_DEV_AUTH === 'true');
const DEV_USER = {
  id: import.meta.env.REACT_APP_DEV_USER_ID || import.meta.env.VITE_DEV_USER_ID || 'dev-uid',
  email: import.meta.env.REACT_APP_DEV_USER_EMAIL || import.meta.env.VITE_DEV_USER_EMAIL || 'dev@local',
  name: import.meta.env.REACT_APP_DEV_USER_NAME || import.meta.env.VITE_DEV_USER_NAME || 'Developer',
  hasCompletedSetup: (import.meta.env.REACT_APP_DEV_USER_SETUP === 'true') || (import.meta.env.VITE_DEV_USER_SETUP === 'true') ? true : true,
  orgSettings: { currency: 'USD', fiscalYearStartMonth: 1 },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (IS_DEV_AUTH) {
      // Immediately use the dev user and skip Firebase
      setUser(DEV_USER);
      setLoading(false);
      return () => {};
    }


    // Add a safe, minimal fetch wrapper that only retries transient failures for the
    // Firebase securetoken endpoint. This avoids large global fetch overrides that break
    // HMR while providing resilience for token refresh network blips.
    try {
      if (typeof window !== 'undefined' && window.fetch && !window.fetch.__secureTokenWrapped) {
        const origFetch = window.fetch.bind(window);
        const wrappedFetch = async function(...args) {
          const url = args && args[0];
          // Only target Firebase STS token endpoint
          if (typeof url === 'string' && url.includes('securetoken.googleapis.com')) {
            const MAX_RETRIES = 2;
            const RETRY_DELAY = 500;
            for (let i = 0; i <= MAX_RETRIES; i++) {
              try {
                return await origFetch(...args);
              } catch (err) {
                // last attempt -> rethrow
                if (i === MAX_RETRIES) throw err;
                // small backoff
                await new Promise((r) => setTimeout(r, RETRY_DELAY * (i + 1)));
                console.warn('Retrying securetoken fetch attempt', i + 1, url);
              }
            }
          }
          // Other URLs: forward unmodified
          return origFetch(...args);
        };
        // preserve original fetch for restoration
        wrappedFetch.__secureTokenWrapped = true;
        wrappedFetch.__origFetch = origFetch;
        // attach original to window.fetch after install so cleanup can restore it
        window.fetch = wrappedFetch;
        window.fetch.__origFetch = origFetch;
      }
    } catch (e) {
      console.debug('Failed to install securetoken fetch wrapper', e);
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, 'orgs', u.uid);
        const snap = await getDoc(ref);
        
        // If the document doesn't exist, create it with default values
        if (!snap.exists()) {
          const defaultProfile = {
            name: u.email,
            isUserProfile: true,
            hasCompletedSetup: true, // Set to true by default for existing users
            orgSettings: {
              currency: 'USD',
              fiscalYearStartMonth: 1,
              // Add any other default settings here
            },
            createdAt: new Date().toISOString()
          };
          
          // Create the document with default values
          await setDoc(ref, defaultProfile);
          setUser({
            id: u.uid,
            email: u.email,
            ...defaultProfile
          });
        } else {
          // Document exists, use its values
          const profile = snap.data();
          const merged = {
            id: u.uid,
            email: u.email,
            name: profile.name || u.email,
            hasCompletedSetup: profile.hasCompletedSetup ?? true, // Default to true if not set
            orgSettings: profile.orgSettings || { currency: 'USD', fiscalYearStartMonth: 1 },
          };
          setUser(merged);
        }
      } catch (e) {
        console.error('Failed to load user profile', e);
        // Fallback with hasCompletedSetup: true to avoid setup loop
        setUser({ 
          id: u.uid, 
          email: u.email, 
          name: u.email, 
          hasCompletedSetup: true, 
          orgSettings: { currency: 'USD', fiscalYearStartMonth: 1 } 
        });
      } finally {
        setLoading(false);
      }
    });

    return () => {
      try {
        // restore original fetch if we wrapped it
        if (typeof window !== 'undefined' && window.fetch && window.fetch.__origFetch) {
          try { window.fetch = window.fetch.__origFetch; } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }

      try { unsub(); } catch (e) { /* ignore */ }
    };
  }, []);

  const login = async (email, password, retryCount = 0) => {
    if (IS_DEV_AUTH) {
      setUser(DEV_USER);
      return { success: true };
    }

    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1 second

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Verify email if required
      if (userCredential.user && !userCredential.user.emailVerified) {
        return { 
          success: false, 
          error: 'Please verify your email before logging in. Check your inbox for the verification link.' 
        };
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
          break;
        case 'auth/network-request-failed':
          if (retryCount < MAX_RETRIES) {
            // Auto-retry on network errors
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
            return login(email, password, retryCount + 1);
          }
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        case 'auth/api-key-not-valid':
        case 'auth/invalid-api-key':
          errorMessage = 'Configuration error. Please contact support.';
          console.error('Firebase API key issue. Check your .env file and Firebase configuration.');
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred during login.';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        code: error.code
      };
    }
  };

  const register = async ({ name, email, password }, options = {}) => {
    if (IS_DEV_AUTH) {
      // emulate creating a profile for the dev user
      setUser({ ...DEV_USER, name: name || DEV_USER.name, email: email || DEV_USER.email, hasCompletedSetup: false });
      return { success: true };
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;
      // allow callers to override profile creation behavior (useful for invite flow)
      const profileDefaults = { name: name || email, isUserProfile: true, hasCompletedSetup: false, orgSettings: { currency: 'USD', fiscalYearStartMonth: 1 }, createdAt: new Date().toISOString() };
      const profile = { ...profileDefaults, ...(options.profile || {}) };
      if (options.createProfile !== false) {
        await setDoc(doc(db, 'orgs', uid), profile);
      }
      return { success: true, user: { id: uid, email: res.user.email } };
    } catch (error) {
      console.error('Registration error:', error);
      const msg = (error?.code === 'auth/api-key-not-valid' || (error?.message || '').toLowerCase().includes('api key not valid'))
        ? 'Firebase API key invalid or missing. Copy .env.local.example to .env.local, set REACT_APP_FIREBASE_API_KEY and other values to your Firebase project settings, then restart the dev server.'
        : error.message || 'Registration failed';
      return { success: false, error: msg };
    }
  };


  const logout = async () => {
    try {
      if (IS_DEV_AUTH) {
        setUser(null);
        navigate('/login');
        return;
      }

      await signOut(auth);
      setUser(null);
      navigate('/login');
    } catch (e) {
      console.error('Sign out failed', e);
    }
  };

  const updateUser = async (updates) => {
    try {
      if (!user?.id) {
        setUser((prev) => ({ ...(prev || {}), ...(updates || {}) }));
        return;
      }
      const ref = doc(db, 'orgs', user.id);
      await updateDoc(ref, updates);
      setUser((prev) => ({ ...(prev || {}), ...(updates || {}) }));
    } catch (e) {
      console.error('Failed to update user', e);
      setUser((prev) => ({ ...(prev || {}), ...(updates || {}) }));
    }
  };

  const resetPassword = async (email) => {
    try {
      if (IS_DEV_AUTH) {
        return { success: true };
      }
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      const msg = error?.message || 'Failed to send password reset email';
      return { success: false, error: msg };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    resetPassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
