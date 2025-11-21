import React, { useState } from 'react';
import axios from 'axios';

const NGOIntegrationPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bank: '',
    accountNumber: '',
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [error, setError] = useState(null);
  const [subaccountId, setSubaccountId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [value] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    try {
      // Replace with the actual NGO ID from your auth context or state
      const ngoId = 'ngo_xyz789'; 
      
      const response = await axios.post('/api/create-subaccount', { ...formData, ngoId });

      if (response.data.success) {
        setStatus('success');
        setSubaccountId(response.data.subaccountId);
      } else {
        throw new Error(response.data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      setStatus('error');
      setError(err.response ? err.response.data.error : err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          NGO Bank Integration
        </h2>

        {status === 'success' ? (
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Integration Successful!</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your Paystack subaccount has been created.
            </p>
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <p className="text-sm font-mono text-gray-700">
                Subaccount ID: {subaccountId}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Business Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                onChange={handleChange}
                value={formData.name}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                onChange={handleChange}
                value={formData.email}
              />
            </div>

            <div>
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
                Bank
              </label>
              <input
                type="text"
                name="bank"
                id="bank"
                required
                placeholder="e.g., 044 for Access Bank"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                onChange={handleChange}
                value={formData.bank}
              />
            </div>

            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                Account Number
              </label>
              <input
                type="text"
                name="accountNumber"
                id="accountNumber"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                onChange={handleChange}
                value={formData.accountNumber}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {status === 'loading' ? 'Integrating...' : 'Create Subaccount'}
              </button>
            </div>

            {status === 'error' && (
              <div className="p-4 bg-red-50 border-l-4 border-red-400">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default NGOIntegrationPage;
