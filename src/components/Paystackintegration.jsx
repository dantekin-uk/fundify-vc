import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { toast } from 'react-toastify';
import {
  BanknotesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const PaystackIntegration = () => {
  const { user } = useAuth();
  const { activeOrgId } = useOrg();
  const [loading, setLoading] = useState(false);
  const [subaccount, setSubaccount] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    business_name: '',
    settlement_bank: '',
    account_number: '',
    currency: 'NGN' || 'USD' || 'KSH',
    contact_email: ''
  });

  // Fetch existing subaccount
  useEffect(() => {
    const fetchSubaccount = async () => {
      if (!activeOrgId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/subaccount?orgId=${activeOrgId}`);
        const data = await response.json();
        
        if (data.subaccount) {
          setSubaccount(data.subaccount);
          setFormData(prev => ({
            ...prev,
            business_name: data.subaccount.business_name || '',
            settlement_bank: data.subaccount.settlement_bank || '',
            account_number: data.subaccount.account_number ? '••••' + data.subaccount.account_number.slice(-4) : '',
            currency: data.subaccount.currency || 'NGN' || 'USD' || 'KSH',
            contact_email: data.subaccount.metadata?.primary_contact_email || user?.email || ''
          }));
        }
      } catch (err) {
        console.error('Error fetching subaccount:', err);
        toast.error('Failed to load payment settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSubaccount();
  }, [activeOrgId, user?.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrgId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/create-subaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          orgId: activeOrgId,
          ...formData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment settings');
      }

      setSubaccount(data.subaccount);
      toast.success('Payment settings updated successfully!');
    } catch (err) {
      console.error('Error updating payment settings:', err);
      setError(err.message || 'Failed to update payment settings');
      toast.error('Failed to update payment settings');
    } finally {
      setLoading(false);
    }
  };

  // List of Nigerian banks (you might want to fetch this from Paystack's API)
  const nigerianBanks = [
    { code: "044", name: "Access Bank" },
    { code: "063", name: "Access Bank (Diamond)" },
    { code: "035A", name: "Alat by WEMA" },
    { code: "023", name: "Citibank Nigeria" },
    // Add more banks as needed
  ];

  if (loading && !subaccount) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Paystack Payment Integration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Set up your Paystack subaccount to receive payments directly to your bank account.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {subaccount ? (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your Paystack subaccount is set up and {subaccount.active ? 'active' : 'pending activation'}.
              </p>
              <div className="mt-2 text-sm text-green-700">
                <p>Business: {subaccount.business_name}</p>
                <p>Bank: {subaccount.settlement_bank}</p>
                <p>Account: ••••{subaccount.account_number?.slice(-4)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Bank Account Details</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This information will be used to create your Paystack subaccount.
                </p>
              </div>
              <div className="mt-5 space-y-6 md:col-span-2 md:mt-0">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                      Business/Organization Name
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      id="business_name"
                      required
                      value={formData.business_name}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="settlement_bank" className="block text-sm font-medium text-gray-700">
                      Bank
                    </label>
                    <select
                      id="settlement_bank"
                      name="settlement_bank"
                      required
                      value={formData.settlement_bank}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a bank</option>
                      {nigerianBanks.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="account_number" className="block text-sm font-medium text-gray-700">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      id="account_number"
                      required
                      value={formData.account_number}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                      Currency
                    </label>
                    <select
                      id="currency"
                      name="currency"
                      required
                      value={formData.currency}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="NGN">Nigerian Naira (NGN)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="GBP">British Pound (GBP)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      name="contact_email"
                      id="contact_email"
                      required
                      value={formData.contact_email}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PaystackIntegration;