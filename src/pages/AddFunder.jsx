import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import FormInput from '../components/FormInput';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import SendInvitation from '../components/SendInvitation';
import './AddFunder.css';

export default function AddFunder() {
  const { addFunder, byFunder } = useFinance();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', contact: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newFunderId, setNewFunderId] = useState(null);
  
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      // Add funder and get the new funder's ID
      const funderId = await addFunder(form);
      setNewFunderId(funderId);
      
      // Show the invitation dialog
      setShowInviteDialog(true);
      
      // Reset the form but don't navigate yet
      setForm({ name: '', contact: '', notes: '' });
    } catch (error) {
      console.error('Error adding funder:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleInviteSuccess = () => {
    setShowInviteDialog(false);
    navigate('/app/funders');
  };

  // List last 5 most recently created funders
  const recentFunders = (byFunder || [])
    .slice() // shallow copy
    .sort((a, b) => {
      const dateA = a.funder.createdAt ? new Date(a.funder.createdAt).getTime() : 0;
      const dateB = b.funder.createdAt ? new Date(b.funder.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  // Simple modal component
  const Modal = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>{title}</h3>
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
          <div className="modal-content">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Add Funder</h2>
          <p>Create a new funder profile to track their contributions and allocations.</p>
        </div>
        <Link to="/app/funders" className="back-button">
          Back to Funders
        </Link>
      </div>

      <div className="space-y-6">
        {/* Add Funder Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-semibold text-gray-900 dark:text-slate-100">Add New Funder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-4">
                <FormInput
                  id="name"
                  name="name"
                  label="Funder Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Enter funder name"
                  className="w-full"
                />
                <FormInput
                  id="contact"
                  name="contact"
                  label="Contact (email/phone)"
                  value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })}
                  placeholder="example@email.com or +1234567890"
                  className="w-full"
                />
                <FormInput
                  id="notes"
                  name="notes"
                  label="Notes"
                  type="textarea"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional information about the funder"
                  className="w-full"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-700 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Funder'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Funders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-semibold text-gray-900 dark:text-slate-100">Recently Created Funders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentFunders.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 py-4">No funders have been added yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentFunders.map(r => (
                  <li key={r.funder.id} className="py-3 px-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {r.funder.name}
                        </p>
                        {r.funder.contact && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                            {r.funder.contact}
                          </p>
                        )}
                      </div>
                      {r.funder.createdAt && (
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="text-xs text-slate-400">
                            {new Date(r.funder.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Invitation Modal */}
      <Modal 
        isOpen={showInviteDialog} 
        onClose={() => setShowInviteDialog(false)}
        title="Invite Funder"
      >
        {newFunderId ? (
          <SendInvitation 
            funderId={newFunderId} 
            funderName={form.name}
            onSuccess={handleInviteSuccess}
          />
        ) : (
          <div>Loading funder information...</div>
        )}
      </Modal>
    </div>
  );
}
