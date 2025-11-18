import React, { useEffect, useState } from 'react';
import { auth, db, testFirebaseConnection } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const FirebaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [user, setUser] = useState(null);
  const [testData, setTestData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Test Firebase connection
    const testConnection = async () => {
      try {
        // Test Firestore using modular API
        const ref = doc(db, '_test', 'connection');
        const snap = await getDoc(ref);

        // Test Auth
        const currentUser = auth.currentUser;

        // Update state
        setTestData(snap.exists() ? snap.data() : 'No test data found');
        setUser(currentUser);
        setConnectionStatus('✅ Connected to Firebase');
      } catch (err) {
        console.error('Firebase test failed:', err);
        setConnectionStatus('❌ Connection failed');
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  if (loading) {
    return <div>Testing Firebase connection...</div>;
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      maxWidth: '600px',
      margin: '20px auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Firebase Connection Test</h2>
      <div style={{ marginBottom: '15px' }}>
        <strong>Status:</strong> {connectionStatus}
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Firestore Test:</strong>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflowX: 'auto'
        }}>
          {JSON.stringify(testData, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Auth Status:</strong>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflowX: 'auto'
        }}>
          {user ? `Logged in as: ${user.email || user.uid}` : 'Not logged in'}
        </pre>
      </div>
      
      {error && (
        <div style={{ 
          color: 'red', 
          padding: '10px', 
          background: '#ffebee', 
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p>If you see a green checkmark (✅) above, Firebase is connected successfully!</p>
        <p>If you see a red X (❌), please check your console for detailed error messages.</p>
      </div>
    </div>
  );
};

export default FirebaseTest;
