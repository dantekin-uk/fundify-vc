import React, { useState } from 'react';
import { openPaystack } from '../utils/paystack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';

const ContributionForm = ({ onSuccess, onClose, funderId }) => {
  const { user } = useAuth();
  const { refreshData } = useFinance();
  const { activeOrgId, currency: orgCurrency } = useOrg();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!activeOrgId) {
      setError('Organization information is missing. Please refresh and try again.');
      return;
    }

    if (!user?.email) {
      setError('Your email is required to process payment. Please log in again.');
      return;
    }

    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);

    try {
      // Generate a unique reference
      const reference = `DONATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Lookup organization's Paystack subaccount
      let subaccountCode = null;
      try {
        const subRef = doc(db, 'subaccounts', activeOrgId);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
          subaccountCode = subSnap.data()?.paystack_subaccount_id || null;
        }
      } catch {}

      if (!subaccountCode) {
        setError('Payment subaccount not set for this organization. Please ask the admin to create it in Integration.');
        setLoading(false);
        return;
      }

      // Determine Paystack-supported currency (fallback to NGN if unsupported)
      const supported = ['NGN','GHS','ZAR','USD'];
      const desired = String(orgCurrency || 'NGN').toUpperCase();
      const paystackCurrency = supported.includes(desired) ? desired : 'NGN';

      // Open Paystack payment modal with complete metadata and subaccount routing
      await openPaystack({
        key: (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.REACT_APP_PAYSTACK_PUBLIC_KEY || import.meta.env.PAYSTACK_PUBLIC_KEY),
        email: user?.email || '',
        amount: amountValue * 100, // Convert to kobo (Paystack uses kobo)
        currency: paystackCurrency,
        reference,
        metadata: {
          orgId: activeOrgId,
          walletId: funderId || 'ORG',
          funderId: funderId || 'ORG',
          userId: user?.uid,
          email: user?.email,
          name: user?.displayName || 'Anonymous Donor',
          description: `Contribution from ${user?.displayName || user?.email}`,
          display_currency: desired
        },
        subaccount: subaccountCode,
        onSuccess: async (response) => {
          console.log('Payment successful:', response);
          // The webhook will handle the actual database updates
          if (onSuccess) onSuccess(response);
          if (onClose) onClose();

          // Refresh the data to show the new transaction
          if (refreshData) {
            setTimeout(() => {
              refreshData();
            }, 2000); // Wait 2 seconds for webhook to process
          }
        },
        onCancel: () => {
          console.log('Payment cancelled');
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'An error occurred while processing your payment');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Make a Contribution</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          disabled={loading}
        >
          &times;
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({orgCurrency || 'KES'})
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter amount"
            min="1"
            step="0.01"
            required
            disabled={loading}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading || !amount}
          >
            {loading ? 'Processing...' : 'Proceed to Pay'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContributionForm;
