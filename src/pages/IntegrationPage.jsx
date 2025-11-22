import React, { useState, useEffect } from "react";
import axios from "axios";
import { useOrg } from "../context/OrgContext";
// Modern Inter font
import "@fontsource/inter";

export default function IntegrationPage() {
  const { activeOrgId } = useOrg();
  const API_BASE = (
    (import.meta.env.VITE_SERVERLESS_BASE_URL || import.meta.env.VITE_API_BASE_URL || "") ||
    (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost' ? 'https://fundify-vc.vercel.app' : '')
  ).trim();
  const [form, setForm] = useState({
    business_name: "",
    settlement_bank: "",
    account_number: "",
    currency: "NGN",
    contact_email: ""
  });
  const [loading, setLoading] = useState(false);
  const [subaccount, setSubaccount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSubaccount() {
      setLoading(true);
      setError("");
      try {
        const url = API_BASE ? `${API_BASE}/api/subaccount?orgId=${activeOrgId}` : `/api/subaccount?orgId=${activeOrgId}`;
        const res = await axios.get(url);
        setSubaccount(res.data?.subaccount ?? null);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to load integration details.";
        console.error("Error fetching subaccount:", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    if (activeOrgId) {
      fetchSubaccount();
    }
  }, [activeOrgId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const createSubaccount = async () => {
    setLoading(true); setError("");
    try {
      // Call Vercel serverless function for subaccount creation
      const url = API_BASE ? `${API_BASE}/api/create-subaccount` : "/api/create-subaccount";
      const res = await axios.post(url, { orgId: activeOrgId, ...form });
      setSubaccount(res.data.subaccount);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create subaccount";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-inter">
      <h1 className="text-3xl font-bold mb-2 text-blue-900">Payment Integration</h1>
      <p className="text-base text-gray-700 mb-6">
        Connect your bank account so funders pay directly to your organization.<br />
        <span className="font-bold text-green-600">Fundify never holds funds.</span>
      </p>

      <div className="bg-white shadow-lg rounded-2xl p-8 mb-8 border border-blue-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">Create Paystack Subaccount</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input name="business_name" onChange={onChange} value={form.business_name} placeholder="Business / Organization Name" className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input name="settlement_bank" onChange={onChange} value={form.settlement_bank} placeholder="Settlement Bank" className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input name="account_number" onChange={onChange} value={form.account_number} placeholder="Account Number" className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          <select name="currency" onChange={onChange} value={form.currency} className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="NGN">NGN</option>
            <option value="KES">KES</option>
            <option value="USD">USD</option>
          </select>
          <input name="contact_email" onChange={onChange} value={form.contact_email} placeholder="Contact Email" className="p-3 border rounded-lg col-span-1 md:col-span-2 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button disabled={loading} onClick={createSubaccount} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold shadow hover:bg-blue-700 transition-all">
            {loading ? "Creating..." : "Create Subaccount"}
          </button>
          <span className="text-sm text-red-600">{error}</span>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <span className="font-semibold text-blue-700">Security:</span> Your bank details are sent securely to Paystack. Fundify never stores sensitive account info except for reconciliation.
        </div>
      </div>

      {subaccount ? (
        <div className="bg-white shadow-lg rounded-2xl p-8 border border-green-200">
          <h3 className="font-semibold text-green-700 mb-2">Subaccount Connected</h3>
          <div className="mb-2 text-sm text-gray-700">Paystack ID: <span className="font-mono text-green-700">{subaccount.paystack_subaccount_id}</span></div>
          <div className="mb-2">Business: <span className="font-semibold">{subaccount.business_name}</span></div>
          <div className="mb-2">Bank: <span className="font-semibold">{subaccount.settlement_bank}</span> • Account: <span className="font-mono">{subaccount.account_number}</span></div>
          <div className="mb-2">Currency: <span className="font-semibold">{subaccount.currency}</span></div>
          <div className="mt-3">
            <a className="text-blue-600 hover:underline font-medium" href={`/admin/funders?filter=subaccount:${subaccount.paystack_subaccount_id}`}>View transactions</a>
          </div>
          <div className="mt-4 text-xs text-gray-500">Created: {subaccount.created_at ? new Date(subaccount.created_at).toLocaleString() : "-"}</div>
        </div>
      ) : null}

      <div className="mt-8 text-center">
        <button className="bg-green-600 text-white px-6 py-2 rounded-xl font-semibold shadow hover:bg-green-700 transition-all">
          Test Payment
        </button>
        <div className="mt-2 text-xs text-gray-500">Use Paystack sandbox to test payments. No real money will be moved.</div>
      </div>
    </div>
  )
}
