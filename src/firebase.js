// Firebase initialization for Fundify
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, getFirestore, doc, getDoc } from 'firebase/firestore';

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Log environment variables in development for debugging
if (isDev) {
  console.log('Firebase Config:', {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? '***' : 'Not set',
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'Not set',
    appId: process.env.REACT_APP_FIREBASE_APP_ID ? '***' : 'Not set'
  });
}

// Validate required environment variables
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_FIREBASE_MEASUREMENT_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required Firebase environment variables:', missingVars);
  if (!isDev) {
    throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
  }
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
let auth;
let db;

// Basic validation for API key
if (!firebaseConfig.apiKey || typeof firebaseConfig.apiKey !== 'string' || firebaseConfig.apiKey.length < 20) {
  console.error('Invalid or missing Firebase API key. Please ensure REACT_APP_FIREBASE_API_KEY is set in financial/.env or your environment. Current value:', firebaseConfig.apiKey ? '***' : 'Not set');
  if (!isDev) {
    throw new Error('Invalid Firebase API key. Aborting initialization.');
  }
}

// Initialize Firebase only once
if (!getApps().length) {
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);

    // Initialize Auth
    auth = getAuth(app);

    // Initialize Firestore with settings
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false
    });

    // Connect to emulators in development
    if (isDev && process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Using Firebase Emulators');
    }

    // Initialize Analytics (non-blocking)
    (async () => {
      try {
        const ok = await analyticsSupported();
        if (ok) {
          const analytics = getAnalytics(app);
          return analytics;
        }
      } catch (e) {
        console.warn('Analytics initialization failed:', e);
      }
      return null;
    })();

  } catch (error) {
    // Provide clearer guidance on invalid API key errors
    if (error && (error.code === 'auth/invalid-api-key' || (error.message && error.message.includes('invalid-api-key')))) {
      console.error('Firebase initialization failed with auth/invalid-api-key. Possible causes:');
      console.error('- The API key is incorrect or missing in financial/.env (REACT_APP_FIREBASE_API_KEY)');
      console.error('- The dev server was not restarted after updating .env');
      console.error('- You are running a different app instance that does not load financial/.env');
      console.error('Actions to fix:');
      console.error('1) Verify financial/.env contains the correct REACT_APP_FIREBASE_* values.');
      console.error('2) Restart the dev server so CRA picks up the env changes.');
      console.error('3) Ensure you are editing the same project that is running at the dev URL.');
    }
    console.error('Firebase initialization error', error);
    throw error; // Re-throw to prevent silent failures
  }
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

// Test Firebase connection
const testFirebaseConnection = async () => {
  try {
    // Test Firestore connection (modular v9)
    const ref = doc(db, '_test', 'connection');
    const snap = await getDoc(ref);
    console.log('Firebase connection successful!', {
      db: !!db,
      auth: !!auth,
      testDoc: snap.exists() ? 'exists' : 'does not exist'
    });
  } catch (error) {
    console.error('Firebase connection test failed:', error);
  }
};

// Run test in development
if (isDev) {
  testFirebaseConnection();
}

export { app, auth, db, testFirebaseConnection };
