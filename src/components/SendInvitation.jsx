import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Button from './ui/Button';
import { Input } from './ui/Input';
import './SendInvitation.css';

export default function SendInvitation({ funderId, funderName, onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const { sendInvitation } = useFinance();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !role) {
      setError('Please fill in all fields');
      return;
    }
    
    setSending(true);
    setError('');
    
    try {
      const success = await sendInvitation({
        email,
        role,
        funderId,
        funderName,
      });
      
      if (success) {
        setEmail('');
        onSuccess?.();
      } else {
        setError('Failed to send invitation. Please try again.');
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError('An error occurred while sending the invitation.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h3 className="text-xl font-semibold mb-4">Invite Funder</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="funder@example.com"
            required
            className="w-full"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full"
            required
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        <div className="mt-6">
          <button 
            type="submit" 
            className="button button-primary w-full"
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </div>
  );
}
